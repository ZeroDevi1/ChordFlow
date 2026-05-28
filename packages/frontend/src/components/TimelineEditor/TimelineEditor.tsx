import { useCallback, useState } from 'react';
import {
  BeatSubdivision,
  SubdivisionType,
  MeasurePattern,
  MultiMeasureArrangement,
  getPatternBeats,
} from '@chordflow/shared';
import './TimelineEditor.css';

interface TimelineEditorProps {
  /** 每小节拍数 */
  beatsPerMeasure: number;
  /** 总小节数 */
  measureCount?: number;
  /** 当前多小节编排配置 */
  arrangement: MultiMeasureArrangement | null;
  /** 配置变化回调 */
  onChange: (arrangement: MultiMeasureArrangement) => void;
}

/** 细分类型选项 */
const SUBDIVISION_OPTIONS: { value: SubdivisionType; label: string }[] = [
  { value: 'basic', label: '基础拍' },
  { value: 'eighth', label: '八分音符' },
  { value: 'triplet', label: '三连音' },
];

/** 预设节奏型模板 */
const PRESET_PATTERNS: { name: string; beats: BeatSubdivision[] }[] = [
  { name: '全部基础拍', beats: [] }, // 动态生成
  { name: '全部八分音符', beats: [] }, // 动态生成
  { name: '全部三连音', beats: [] }, // 动态生成
  { name: '前3拍基础+第4拍三连音', beats: [] }, // 动态生成
];

/**
 * 生成预设节奏型
 */
function generatePresetBeats(presetIndex: number, beatsPerMeasure: number): BeatSubdivision[] {
  switch (presetIndex) {
    case 0: // 全部基础拍
      return Array.from({ length: beatsPerMeasure }, (_, i) => ({
        beat: i + 1,
        subdivision: 'basic' as SubdivisionType,
      }));
    case 1: // 全部八分音符
      return Array.from({ length: beatsPerMeasure }, (_, i) => ({
        beat: i + 1,
        subdivision: 'eighth' as SubdivisionType,
      }));
    case 2: // 全部三连音
      return Array.from({ length: beatsPerMeasure }, (_, i) => ({
        beat: i + 1,
        subdivision: 'triplet' as SubdivisionType,
      }));
    case 3: // 前3拍基础+第4拍三连音
      return Array.from({ length: beatsPerMeasure }, (_, i) => ({
        beat: i + 1,
        subdivision: (i < 3 ? 'basic' : 'triplet') as SubdivisionType,
      }));
    default:
      return Array.from({ length: beatsPerMeasure }, (_, i) => ({
        beat: i + 1,
        subdivision: 'basic' as SubdivisionType,
      }));
  }
}

/**
 * 混合编排时间线编辑器
 * 支持不同小节使用不同的节奏型
 */
export function TimelineEditor({
  beatsPerMeasure,
  measureCount = 4,
  arrangement,
  onChange,
}: TimelineEditorProps) {
  // 当前编辑的节奏型索引
  const [editingPatternIndex, setEditingPatternIndex] = useState<number | null>(null);
  // 当前编辑的小节索引
  const [editingMeasureIndex, setEditingMeasureIndex] = useState<number | null>(null);

  // 初始化默认编排
  const getDefaultArrangement = useCallback((): MultiMeasureArrangement => {
    const defaultBeats = Array.from({ length: beatsPerMeasure }, (_, i) => ({
      beat: i + 1,
      subdivision: 'basic' as SubdivisionType,
    }));
    return {
      measureCount,
      measurePatternIndices: Array(measureCount).fill(0),
      patterns: [{ name: '基础拍', beats: defaultBeats }],
    };
  }, [beatsPerMeasure, measureCount]);

  const currentArrangement = arrangement || getDefaultArrangement();

  // 添加新节奏型
  const addPattern = useCallback(() => {
    const defaultBeats = Array.from({ length: beatsPerMeasure }, (_, i) => ({
      beat: i + 1,
      subdivision: 'basic' as SubdivisionType,
    }));
    const newPattern: MeasurePattern = {
      name: `节奏型 ${currentArrangement.patterns.length + 1}`,
      beats: defaultBeats,
    };
    const newArrangement: MultiMeasureArrangement = {
      ...currentArrangement,
      patterns: [...currentArrangement.patterns, newPattern],
    };
    onChange(newArrangement);
    setEditingPatternIndex(newArrangement.patterns.length - 1);
  }, [beatsPerMeasure, currentArrangement, onChange]);

  // 删除节奏型
  const removePattern = useCallback(
    (patternIndex: number) => {
      if (currentArrangement.patterns.length <= 1) return;
      
      const newPatterns = currentArrangement.patterns.filter((_, i) => i !== patternIndex);
      // 更新小节引用：将引用被删除模式的小节改为引用第一个模式
      const newIndices = currentArrangement.measurePatternIndices.map((idx) =>
        idx === patternIndex ? 0 : idx > patternIndex ? idx - 1 : idx
      );
      const newArrangement: MultiMeasureArrangement = {
        ...currentArrangement,
        patterns: newPatterns,
        measurePatternIndices: newIndices,
      };
      onChange(newArrangement);
      if (editingPatternIndex === patternIndex) {
        setEditingPatternIndex(null);
      }
    },
    [currentArrangement, editingPatternIndex, onChange]
  );

  // 更新节奏型名称
  const updatePatternName = useCallback(
    (patternIndex: number, name: string) => {
      const newPatterns = [...currentArrangement.patterns];
      newPatterns[patternIndex] = { ...newPatterns[patternIndex], name };
      onChange({ ...currentArrangement, patterns: newPatterns });
    },
    [currentArrangement, onChange]
  );

  // 更新节奏型的某个拍位细分
  const updatePatternBeat = useCallback(
    (patternIndex: number, beatIndex: number, subdivision: SubdivisionType) => {
      const newPatterns = [...currentArrangement.patterns];
      const newBeats = [...newPatterns[patternIndex].beats];
      newBeats[beatIndex] = { beat: beatIndex + 1, subdivision };
      newPatterns[patternIndex] = { ...newPatterns[patternIndex], beats: newBeats };
      onChange({ ...currentArrangement, patterns: newPatterns });
    },
    [currentArrangement, onChange]
  );

  // 设置小节使用的节奏型
  const setMeasurePattern = useCallback(
    (measureIndex: number, patternIndex: number) => {
      const newIndices = [...currentArrangement.measurePatternIndices];
      newIndices[measureIndex] = patternIndex;
      onChange({ ...currentArrangement, measurePatternIndices: newIndices });
    },
    [currentArrangement, onChange]
  );

  // 应用预设节奏型
  const applyPreset = useCallback(
    (patternIndex: number, presetIndex: number) => {
      const presetBeats = generatePresetBeats(presetIndex, beatsPerMeasure);
      const newPatterns = [...currentArrangement.patterns];
      newPatterns[patternIndex] = {
        name: PRESET_PATTERNS[presetIndex].name,
        beats: presetBeats,
      };
      onChange({ ...currentArrangement, patterns: newPatterns });
    },
    [beatsPerMeasure, currentArrangement, onChange]
  );

  // 渲染节奏型编辑器
  const renderPatternEditor = (pattern: MeasurePattern, patternIndex: number) => {
    const isEditing = editingPatternIndex === patternIndex;
    const patternBeats = Array.from(
      { length: beatsPerMeasure },
      (_, i) => pattern.beats[i] || { beat: i + 1, subdivision: 'basic' as SubdivisionType }
    );
    const totalBeats = getPatternBeats({ ...pattern, beats: patternBeats });

    return (
      <div key={patternIndex} className={`pattern-card ${isEditing ? 'editing' : ''}`}>
        <div className="pattern-header">
          <input
            className="pattern-name-input"
            value={pattern.name}
            onChange={(e) => updatePatternName(patternIndex, e.target.value)}
            onFocus={() => setEditingPatternIndex(patternIndex)}
          />
          <div className="pattern-actions">
            <button
              className="pattern-edit-btn"
              onClick={() => setEditingPatternIndex(isEditing ? null : patternIndex)}
            >
              {isEditing ? '收起' : '编辑'}
            </button>
            {currentArrangement.patterns.length > 1 && (
              <button
                className="pattern-delete-btn"
                onClick={() => removePattern(patternIndex)}
              >
                删除
              </button>
            )}
          </div>
        </div>

        {/* 节奏型预览 */}
        <div className="pattern-preview">
          {patternBeats.map((beat, beatIndex) => {
            const subCount =
              beat.subdivision === 'eighth' ? 2 : beat.subdivision === 'triplet' ? 3 : 1;
            return (
              <div key={beatIndex} className="preview-beat-group">
                {Array.from({ length: subCount }, (_, subIndex) => (
                  <div
                    key={subIndex}
                    className={`preview-dot ${subIndex === 0 ? 'beat-start' : 'sub-beat'}`}
                  />
                ))}
              </div>
            );
          })}
          <span className="preview-stats">{totalBeats} 下/小节</span>
        </div>

        {/* 展开的编辑器 */}
        {isEditing && (
          <div className="pattern-editor">
            <div className="preset-buttons">
              <span className="preset-label">快速预设：</span>
              {PRESET_PATTERNS.map((preset, presetIndex) => (
                <button
                  key={presetIndex}
                  className="preset-btn"
                  onClick={() => applyPreset(patternIndex, presetIndex)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
            <div className="beat-selectors">
              {patternBeats.map((beat, beatIndex) => (
                <div key={beatIndex} className="beat-selector">
                  <span className="beat-label">第 {beatIndex + 1} 拍</span>
                  <select
                    value={beat.subdivision}
                    onChange={(e) =>
                      updatePatternBeat(patternIndex, beatIndex, e.target.value as SubdivisionType)
                    }
                  >
                    {SUBDIVISION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="timeline-editor">
      {/* 节奏型列表 */}
      <div className="patterns-section">
        <div className="section-header">
          <h4>节奏型定义</h4>
          <button className="add-pattern-btn" onClick={addPattern}>
            + 添加节奏型
          </button>
        </div>
        <div className="patterns-list">
          {currentArrangement.patterns.map((pattern, index) =>
            renderPatternEditor(pattern, index)
          )}
        </div>
      </div>

      {/* 小节分配 */}
      <div className="measures-section">
        <h4>小节分配</h4>
        <div className="measures-grid">
          {Array.from({ length: measureCount }, (_, measureIndex) => {
            const patternIndex = currentArrangement.measurePatternIndices[measureIndex] || 0;
            const pattern = currentArrangement.patterns[patternIndex];
            return (
              <div
                key={measureIndex}
                className={`measure-card ${editingMeasureIndex === measureIndex ? 'editing' : ''}`}
                onClick={() => setEditingMeasureIndex(measureIndex)}
              >
                <div className="measure-number">小节 {measureIndex + 1}</div>
                <select
                  className="measure-pattern-select"
                  value={patternIndex}
                  onChange={(e) => setMeasurePattern(measureIndex, Number(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                >
                  {currentArrangement.patterns.map((p, i) => (
                    <option key={i} value={i}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {pattern && (
                  <div className="measure-preview">
                    {pattern.beats.map((beat, beatIndex) => {
                      const subCount =
                        beat.subdivision === 'eighth'
                          ? 2
                          : beat.subdivision === 'triplet'
                          ? 3
                          : 1;
                      return (
                        <div key={beatIndex} className="mini-beat-group">
                          {Array.from({ length: subCount }, (_, subIndex) => (
                            <div
                              key={subIndex}
                              className={`mini-dot ${subIndex === 0 ? 'accent' : ''}`}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
