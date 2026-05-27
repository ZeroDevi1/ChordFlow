import { useEffect, useRef, useState } from 'react';
import * as alphaTab from '@coderline/alphatab';
import { NoteName } from '@chordflow/shared';
import type { NoteWithDuration, BassChord } from './StaffNotation';
import { toAlphaTex } from './noteToAlphaTex';

/** alphaTab 字体文件目录（public 目录下） */
const FONT_DIRECTORY = '/alphatab-font/';

/** AlphaTabStaffNotation 组件属性（与 StaffNotation 保持一致） */
interface AlphaTabStaffNotationProps {
  /** 高音谱音符列表 */
  notes: NoteWithDuration[];
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
}

/**
 * 基于 alphaTab 的五线谱渲染组件（大谱表 Grand Staff 布局）。
 *
 * 与 VexFlow 版 StaffNotation 接口一致，内部通过 alphaTex 格式
 * 驱动 alphaTab 渲染引擎，支持更准确的音符排版和响应式布局。
 */
export function AlphaTabStaffNotation({
  notes,
  bassChords = [],
  keySignature,
  beatsPerMeasure = 4,
  measuresPerRow = 4,
  showInlineAccidentals = true,
  width = 520,
}: AlphaTabStaffNotationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<alphaTab.AlphaTabApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current || notes.length === 0) return;

    // 清理上一次的 api 实例
    if (apiRef.current) {
      apiRef.current.destroy();
      apiRef.current = null;
    }

    // 清空容器内容
    containerRef.current.innerHTML = '';

    // 生成 alphaTex 字符串
    const tex = toAlphaTex({
      notes,
      bassChords,
      keySignature,
      beatsPerMeasure,
      showInlineAccidentals,
    });

    if (!tex) return;

    console.log('[AlphaTabStaffNotation] alphaTex:', tex);

    // 创建 alphaTab API 实例
    const api = new alphaTab.AlphaTabApi(containerRef.current, {
      core: {
        tex: false,
        useWorkers: false,
        logLevel: alphaTab.LogLevel.Warning,
        fontDirectory: FONT_DIRECTORY,
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

    // 监听渲染完成
    api.renderFinished.on(() => {
      setIsLoading(false);
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
  }, [notes, bassChords, keySignature, beatsPerMeasure, measuresPerRow, showInlineAccidentals, width]);

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
    </div>
  );
}
