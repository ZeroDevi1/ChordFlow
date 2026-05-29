import { useEffect, useRef, useState, useCallback } from 'react';
import * as alphaTab from '@coderline/alphatab';
import { NoteName } from '@chordflow/shared';
import type { NoteWithDuration, BassChord, TrebleChord } from './StaffNotation';
import { toAlphaTex } from './noteToAlphaTex';

/** alphaTab 字体文件目录（public 目录下） */
const FONT_DIRECTORY = '/alphatab-font/';

/** 单个音符的检测结果 */
export interface NoteHighlightResult {
  /** 音符索引 */
  index: number;
  /** 是否正确 */
  isCorrect: boolean;
}

/** beat 渲染边界（alphaTab Bounds 未直接导出，内联定义） */
interface BeatBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 收集到的 beat 渲染位置 */
interface BeatPosition {
  /** beat 在期望音符列表中的索引 */
  noteIndex: number;
  /** 渲染边界 */
  bounds: BeatBounds;
  /** 音符中心 X 坐标（cursor 位置） */
  onNotesX: number;
}

/** AlphaTabStaffNotation 组件属性（与 StaffNotation 保持一致） */
interface AlphaTabStaffNotationProps {
  /** 高音谱音符列表（单音旋律） */
  notes?: NoteWithDuration[];
  /** 高音谱和弦列表（右手柱式和弦，与 notes 二选一） */
  trebleChords?: TrebleChord[];
  /** 低音谱和弦列表 */
  bassChords?: BassChord[];
  /** 根音名称（用于显示调号） */
  rootName?: NoteName;
  /** 谱面调号名称 */
  keySignature?: string;
  /** 每小节拍数 */
  beatsPerMeasure?: number;
  /** 每行展示的小节数 */
  measuresPerRow?: number;
  /** 是否显示逐音临时升降号 */
  showInlineAccidentals?: boolean;
  /** 是否移除残留八分音符旗尾（alphaTab 自动处理，保留参数兼容） */
  suppressEighthFlags?: boolean;
  /** 渲染宽度 */
  width?: number;
  /** 渲染高度 */
  height?: number;
  /** 当前待检测的音符索引（用于高亮） */
  activeNoteIndex?: number;
  /** 已检测音符的结果列表 */
  results?: NoteHighlightResult[];
}

/**
 * 基于 alphaTab 的五线谱渲染组件（大谱表 Grand Staff 布局）。
 *
 * 驱动 alphaTab 渲染引擎，支持更准确的音符排版和响应式布局。
 * 新增 MIDI 检测高亮：通过 boundsLookup 获取音符渲染位置，
 * 叠加绝对定位的 div 实现当前音符（黄色脉冲）、正确（绿色）、错误（红色）视觉反馈。
 */
export function AlphaTabStaffNotation({
  notes = [],
  trebleChords,
  bassChords = [],
  keySignature,
  beatsPerMeasure = 4,
  measuresPerRow = 4,
  showInlineAccidentals = true,
  activeNoteIndex,
  results = [],
}: AlphaTabStaffNotationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<alphaTab.AlphaTabApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  /** 高音谱 beat 的渲染位置列表 */
  const [beatPositions, setBeatPositions] = useState<BeatPosition[]>([]);

  // 用 JSON.stringify 创建稳定的依赖字符串，避免数组引用变化触发重复渲染
  const tex = toAlphaTex({
    notes,
    trebleChords,
    bassChords,
    keySignature,
    beatsPerMeasure,
    showInlineAccidentals,
  });

  /**
   * 从 alphaTab boundsLookup 中提取高音谱（staff.index === 0）所有 beat 的位置。
   *
   * 遍历 staffSystems -> bars -> beats，按 beat 在乐谱中的出现顺序编号，
   * 只保留属于高音谱表（右手）的 beat，用于和 expectedNotes 索引对齐。
   */
  const collectBeatPositions = useCallback((api: alphaTab.AlphaTabApi) => {
    const lookup = api.boundsLookup;
    if (!lookup) return;

    const positions: BeatPosition[] = [];
    let noteIndex = 0;

    for (const system of lookup.staffSystems) {
      for (const masterBar of system.bars) {
        for (const bar of masterBar.bars) {
          // 只收集高音谱（staff.index === 0）的 beat
          if (bar.bar?.staff?.index !== 0) continue;

          for (const beat of bar.beats) {
            positions.push({
              noteIndex: noteIndex++,
              bounds: beat.visualBounds,
              onNotesX: beat.onNotesX,
            });
          }
        }
      }
    }

    setBeatPositions(positions);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !tex) return;

    // 清理上一次的 api 实例
    if (apiRef.current) {
      apiRef.current.destroy();
      apiRef.current = null;
    }

    // 清空容器内容
    containerRef.current.innerHTML = '';

    // 创建 alphaTab API 实例
    const api = new alphaTab.AlphaTabApi(containerRef.current, {
      core: {
        tex: false,
        useWorkers: false,
        logLevel: alphaTab.LogLevel.Warning,
        fontDirectory: FONT_DIRECTORY,
        includeNoteBounds: true,
      },
      display: {
        scale: 1.0,
        layoutMode: alphaTab.LayoutMode.Page,
        barsPerRow: measuresPerRow,
        padding: [10, 10],
      },
      notation: {
        notationMode: alphaTab.NotationMode.SongBook,
        rhythmMode: alphaTab.TabRhythmMode.ShowWithBeams,
        elements: new Map([
          [alphaTab.NotationElement.ScoreTitle, false],
          [alphaTab.NotationElement.TrackNames, false],
          [alphaTab.NotationElement.ChordDiagrams, false],
          [alphaTab.NotationElement.GuitarTuning, false],
        ]),
      },
      player: {
        playerMode: alphaTab.PlayerMode.Disabled,
      },
    });

    apiRef.current = api;
    setIsLoading(true);
    setBeatPositions([]);

    // 加载完成后隐藏力度标记（如 "f"）
    api.scoreLoaded.on(score => {
      score.stylesheet.hideDynamics = true;
    });

    // 监听渲染完成（初步渲染完成，但 boundsLookup 可能还未就绪）
    api.renderFinished.on(() => {
      setIsLoading(false);
    });

    // 监听后处理渲染完成（boundsLookup 在此事件后完整可用）
    api.postRenderFinished.on(() => {
      collectBeatPositions(api);
    });

    // 监听错误
    api.error.on((err: Error) => {
      console.error('[AlphaTabStaffNotation] 渲染错误:', err);
      setIsLoading(false);
    });

    // 推送 alphaTex 数据
    api.tex(tex);

    return () => {
      api.destroy();
      apiRef.current = null;
    };
  }, [tex, measuresPerRow, collectBeatPositions]);

  // 当 activeNoteIndex 或 results 变化时，如果 boundsLookup 已存在则重新收集位置
  // （应对窗口 resize 等导致位置变化的情况）
  useEffect(() => {
    const api = apiRef.current;
    if (api && api.boundsLookup) {
      collectBeatPositions(api);
    }
  }, [activeNoteIndex, results, collectBeatPositions]);

  return (
    <div className="staff-notation alpha-tab-notation" style={{ position: 'relative' }}>
      {isLoading && (
        <div className="alphatab-loading">加载乐谱中…</div>
      )}
      <div
        ref={containerRef}
        className="alphatab-container"
        style={{ width: '100%', overflow: 'hidden' }}
      />

      {/* MIDI 检测高亮覆盖层 */}
      {beatPositions.length > 0 && (
        <div
          className="alphatab-highlight-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {beatPositions.map((pos) => {
            const result = results.find(r => r.index === pos.noteIndex);
            const isActive = activeNoteIndex === pos.noteIndex;
            const isCorrect = result?.isCorrect;
            const isWrong = result && !result.isCorrect;

            // 只渲染有状态的 beat：当前待检测、已正确、已错误
            if (!isActive && !isCorrect && !isWrong) return null;

            const centerX = pos.onNotesX;
            const centerY = pos.bounds.y + pos.bounds.h / 2;

            let className = 'note-highlight';
            if (isActive) className += ' active';
            if (isCorrect) className += ' correct';
            if (isWrong) className += ' wrong';

            return (
              <div
                key={pos.noteIndex}
                className={className}
                style={{
                  position: 'absolute',
                  left: `${centerX}px`,
                  top: `${centerY - 10}px`,
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  transition: 'all 0.2s ease',
                }}
                data-note-index={pos.noteIndex}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
