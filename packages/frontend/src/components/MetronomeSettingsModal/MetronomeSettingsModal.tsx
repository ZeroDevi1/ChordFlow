import { useState, useCallback } from 'react';
import { MultiMeasureArrangement } from '@chordflow/shared';
import { useMetronome } from '../../contexts';
import { TimelineEditor } from '../TimelineEditor';
import './MetronomeSettingsModal.css';

interface MetronomeSettingsModalProps {
  /** 是否显示模态框 */
  isOpen: boolean;
  /** 关闭模态框回调 */
  onClose: () => void;
}

/**
 * 节拍器设置模态框
 * 包含 BPM、拍号、细分、混合编排时间线编辑器
 */
export function MetronomeSettingsModal({ isOpen, onClose }: MetronomeSettingsModalProps) {
  const {
    state,
    setBpm,
    setTimeSignature,
    setSubdivision,
    setMultiMeasureArrangement,
  } = useMetronome();

  // 本地状态用于编辑混合编排
  const [localArrangement, setLocalArrangement] = useState<MultiMeasureArrangement | null>(
    state.multiMeasureArrangement
  );

  // 处理 BPM 变化
  const handleBpmChange = useCallback((value: number) => {
    setBpm(value);
  }, [setBpm]);

  // 处理拍号分子变化
  const handleBeatsPerMeasureChange = useCallback((beats: number) => {
    setTimeSignature({
      ...state.timeSignature,
      beatsPerMeasure: beats,
    });
  }, [state.timeSignature, setTimeSignature]);

  // 处理拍号分母变化
  const handleBeatUnitChange = useCallback((unit: number) => {
    setTimeSignature({
      ...state.timeSignature,
      beatUnit: unit,
    });
  }, [state.timeSignature, setTimeSignature]);

  // 处理细分类型变化
  const handleSubdivisionChange = useCallback((subdivision: string) => {
    setSubdivision(subdivision as 'basic' | 'eighth' | 'triplet' | 'mixed');
  }, [setSubdivision]);

  // 处理混合编排变化
  const handleArrangementChange = useCallback((arrangement: MultiMeasureArrangement) => {
    setLocalArrangement(arrangement);
    setMultiMeasureArrangement(arrangement);
  }, [setMultiMeasureArrangement]);

  // 如果模态框未打开，不渲染
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>节拍器设置</h2>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          {/* BPM 设置 */}
          <div className="setting-group">
            <label htmlFor="bpm-input">BPM</label>
            <div className="bpm-control">
              <input
                id="bpm-input"
                type="range"
                min={40}
                max={208}
                value={state.bpm}
                onChange={(e) => handleBpmChange(Number(e.target.value))}
              />
              <span className="bpm-value">{state.bpm}</span>
            </div>
          </div>

          {/* 拍号设置 */}
          <div className="setting-group">
            <label>拍号</label>
            <div className="time-signature-control">
              <select
                aria-label="拍号分子"
                value={state.timeSignature.beatsPerMeasure}
                onChange={(e) => handleBeatsPerMeasureChange(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((beats) => (
                  <option key={beats} value={beats}>{beats}</option>
                ))}
              </select>
              <span className="time-signature-divider">/</span>
              <select
                aria-label="拍号分母"
                value={state.timeSignature.beatUnit}
                onChange={(e) => handleBeatUnitChange(Number(e.target.value))}
              >
                {[1, 2, 4, 8, 16].map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 细分设置 */}
          <div className="setting-group">
            <label htmlFor="subdivision-select">细分</label>
            <select
              id="subdivision-select"
              value={state.subdivision}
              onChange={(e) => handleSubdivisionChange(e.target.value)}
            >
              <option value="basic">基础拍</option>
              <option value="eighth">半拍（八分音符）</option>
              <option value="triplet">三连音</option>
              <option value="mixed">混合编排</option>
            </select>
          </div>

          {/* 混合编排时间线编辑器（仅在混合模式下显示） */}
          {state.subdivision === 'mixed' && (
            <div className="setting-group">
              <label>混合编排</label>
              <TimelineEditor
                beatsPerMeasure={state.timeSignature.beatsPerMeasure}
                measureCount={4}
                arrangement={localArrangement}
                onChange={handleArrangementChange}
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-confirm-btn" onClick={onClose}>
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
