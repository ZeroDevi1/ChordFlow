import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  NoteName,
  Note,
  ScaleType,
  CIRCLE_OF_FIFTHS_DESCENDING,
  getScaleNotes,
} from '@chordflow/shared';
import { useMetronome } from '../../contexts';
import { useMidiDetection } from '../../hooks/useMidiDetection';
import { AlphaTabStaffNotation as StaffNotation, NoteWithDuration, BassChord, adjustBassChordOctave } from '../StaffNotation';
import './ScalePractice.css';

/** 音阶练习模式 */
type ScalePracticeMode = 'sequential' | 'random';

/** 显示模式 */
type DisplayMode = 'name' | 'staff';

/** PDF 中自然大调右手两八度练习的舒适起始八度 */
const NATURAL_MAJOR_START_OCTAVES: Record<NoteName, number> = {
  C: 4,
  'C#': 4,
  Db: 4,
  D: 4,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 3,
  'F#': 3,
  Gb: 3,
  G: 3,
  'G#': 3,
  Ab: 3,
  A: 3,
  'A#': 3,
  Bb: 3,
  B: 3,
  Cb: 3,
};
/** PDF 中自然小调右手两八度练习的舒适起始八度（按关系大调推导） */
const NATURAL_MINOR_START_OCTAVES: Partial<Record<NoteName, number>> = {
  C: 3,
  'C#': 4,
  Db: 4,
  D: 3,
  'D#': 3,
  Eb: 3,
  E: 3,
  F: 3,
  'F#': 3,
  Gb: 3,
  G: 3,
  'G#': 3,
  Ab: 3,
  A: 4,
  'A#': 4,
  Bb: 4,
  B: 4,
  Cb: 4,
};

/** 自然小调调号对应的关系大调 */
const MINOR_KEY_SIGNATURES: Partial<Record<NoteName, string>> = {
  C: 'Eb',
  'C#': 'E',
  Db: 'E',
  D: 'F',
  'D#': 'F#',
  Eb: 'Gb',
  E: 'G',
  F: 'Ab',
  'F#': 'A',
  Gb: 'A',
  G: 'Bb',
  'G#': 'B',
  Ab: 'Cb',
  A: 'C',
  'A#': 'C#',
  Bb: 'Db',
  B: 'D',
  Cb: 'D',
};

/**
 * 音阶练习组件
 * 支持自然大调/小调、五度圈顺序、随机练习
 */
export function ScalePractice() {
  const navigate = useNavigate();
  const [scaleType, setScaleType] = useState<ScaleType>('natural-major');
  const [practiceMode, setPracticeMode] = useState<ScalePracticeMode>('sequential');
  const [randomCount, setRandomCount] = useState(3);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('staff');
  const [measuresPerScale, setMeasuresPerScale] = useState(4);
  const [currentScales, setCurrentScales] = useState<NoteName[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPracticing, setIsPracticing] = useState(false);
  const [currentMeasure, setCurrentMeasure] = useState(0);
  const measureTimerRef = useRef<number | null>(null);

  // 混合模式：防止 MIDI 检测与小节计时重复触发前进的锁
  const hasAdvancedRef = useRef(false);

  // 获取五度圈下行顺序的音阶列表
  const getSequentialScales = useCallback((): NoteName[] => {
    return [...CIRCLE_OF_FIFTHS_DESCENDING];
  }, []);

  // 获取随机音阶列表
  const getRandomScales = useCallback((): NoteName[] => {
    const allScales = [...CIRCLE_OF_FIFTHS_DESCENDING];
    const startIndex = Math.floor(Math.random() * allScales.length);
    const result: NoteName[] = [];
    
    // 从随机起点开始，取连续的 N 个调
    for (let i = 0; i < randomCount; i++) {
      const index = (startIndex + i) % allScales.length;
      result.push(allScales[index]);
    }
    
    return result;
  }, [randomCount]);

  // 切换到下一个音阶
  const nextScale = useCallback(() => {
    if (hasAdvancedRef.current) return;
    hasAdvancedRef.current = true;

    if (currentIndex < currentScales.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setCurrentMeasure(0);
      // 混合模式：下一帧重置前进锁，允许下一个练习项再次触发
      requestAnimationFrame(() => {
        hasAdvancedRef.current = false;
      });
    } else {
      // 练习完成
      setIsPracticing(false);
      setCurrentScales([]);
      setCurrentIndex(0);
      setCurrentMeasure(0);
      hasAdvancedRef.current = false;
    }
  }, [currentIndex, currentScales]);

  // 获取全局节拍器状态
  const { state: metronomeState, togglePlay, getBeatsPerMeasure, onMeasureComplete: registerMeasureCallback } = useMetronome();

  // 计算细分后的总拍数
  const getTotalBeats = useCallback(() => {
    return getBeatsPerMeasure();
  }, [getBeatsPerMeasure]);

  // 小节计时器回调
  const handleMeasureComplete = useCallback(() => {
    setCurrentMeasure(prev => prev + 1);
  }, []);

  // 注册小节完成回调
  useEffect(() => {
    const unsubscribe = registerMeasureCallback(handleMeasureComplete);
    return unsubscribe;
  }, [registerMeasureCallback, handleMeasureComplete]);

  // 开始练习
  const startPractice = useCallback(() => {
    const scales = practiceMode === 'sequential' ? getSequentialScales() : getRandomScales();
    setCurrentScales(scales);
    setCurrentIndex(0);
    setCurrentMeasure(0);
    setIsPracticing(true);
    hasAdvancedRef.current = false;
  }, [practiceMode, getSequentialScales, getRandomScales]);

  // 停止练习
  const stopPractice = useCallback(() => {
    setIsPracticing(false);
    setCurrentScales([]);
    setCurrentIndex(0);
    setCurrentMeasure(0);
    hasAdvancedRef.current = false;
    if (measureTimerRef.current) {
      clearInterval(measureTimerRef.current);
      measureTimerRef.current = null;
    }
  }, []);

  // 获取当前音阶的音符（带时值）
  const getCurrentScaleNotes = useCallback((): NoteWithDuration[] => {
    if (currentScales.length === 0) return [];
    const root = currentScales[currentIndex];
    const startOctave = scaleType === 'natural-major' ? NATURAL_MAJOR_START_OCTAVES[root] : (NATURAL_MINOR_START_OCTAVES[root] ?? 4);
    const scaleNotes = getScaleNotes(root, scaleType, startOctave);
    
    // 音阶节奏：上行14个八分音符 + 下行13个八分音符 + 最后1个二分音符
    // 总共 28 个八分音符 + 1 个二分音符 = 32 个八分音符位置 = 4 小节
    const result: NoteWithDuration[] = [];
    
    scaleNotes.forEach((note, index) => {
      // 最后一个音符是二分音符
      if (index === scaleNotes.length - 1) {
        result.push({ note, duration: 'half' });
      } else {
        result.push({ note, duration: 'eighth' });
      }
    });
    
    return result;
  }, [currentScales, currentIndex, scaleType]);

  // 获取当前音阶的左手七和弦
  const getCurrentBassChords = useCallback((): BassChord[] => {
    if (currentScales.length === 0) return [];
    const root = currentScales[currentIndex];

    // 大调：从当前调的自然大调音级取 1、3、5、7，保持 PDF 的升降号拼写。
    const chordType = scaleType === 'natural-major' ? 'maj7' : 'm7';
    const scaleNotes = getScaleNotes(root, scaleType, 3);
    const chordNotes: Note[] = [scaleNotes[0], scaleNotes[2], scaleNotes[4], scaleNotes[6]];

    // 每小节一个和弦，共 4 小节（自动调整八度避免音符超出谱表）
    const chordName = `${root}${chordType}`;
    const adjustedChord = adjustBassChordOctave({ notes: chordNotes, name: chordName });
    return Array.from({ length: measuresPerScale }, () => adjustedChord);
  }, [currentScales, currentIndex, scaleType, measuresPerScale]);

  // 获取音阶显示名称
  const getScaleDisplayName = useCallback((root: NoteName) => {
    const typeName = scaleType === 'natural-major' ? '大调' : '小调';
    return `${root} ${typeName}`;
  }, [scaleType]);

  // 切换显示模式
  const toggleDisplayMode = useCallback(() => {
    setDisplayMode(prev => prev === 'name' ? 'staff' : 'name');
  }, []);

  // 当前练习项的期望音符（用于 MIDI 检测）
  const expectedNotes = useMemo(() => {
    if (currentScales.length === 0) return [];
    const root = currentScales[currentIndex];
    const startOctave = scaleType === 'natural-major' ? NATURAL_MAJOR_START_OCTAVES[root] : (NATURAL_MINOR_START_OCTAVES[root] ?? 4);
    const scaleNotes = getScaleNotes(root, scaleType, startOctave);
    return scaleNotes.map(n => n.midiNumber);
  }, [currentScales, currentIndex, scaleType]);

  // MIDI 检测（混合模式：弹对所有音符 OR 时值耗尽，取先满足者）
  const {
    status: midiStatus,
    devices: midiDevices,
    selectedDevice: midiSelectedDevice,
    isInitialized: midiIsInitialized,
    initError: midiInitError,
    initialize: midiInitialize,
    selectDevice: midiSelectDevice,
    reset: midiReset,
  } = useMidiDetection({
    expectedNotes,
    enabled: isPracticing,
  });

  // 混合模式：MIDI 检测完成时立即前进（以弹对所有音符为主）
  useEffect(() => {
    if (midiStatus === 'completed' && isPracticing) {
      if (!hasAdvancedRef.current) {
        hasAdvancedRef.current = true;
        nextScale();
      }
    }
  }, [midiStatus, isPracticing, nextScale]);

  // 练习停止时重置 MIDI 检测状态
  useEffect(() => {
    if (!isPracticing) {
      midiReset();
    }
  }, [isPracticing, midiReset]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (measureTimerRef.current) {
        clearInterval(measureTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="scale-practice">
      <div className="practice-header">
        <button className="back-button" onClick={() => navigate('/')}>← 返回</button>
        <h2>音阶练习</h2>
      </div>

      {!isPracticing ? (
        <div className="scale-settings">
          <div className="practice-options">
            <h4>练习设置</h4>

            <div className="setting-group">
              <label>音阶类型</label>
              <select
                value={scaleType}
                onChange={(e) => setScaleType(e.target.value as ScaleType)}
              >
                <option value="natural-major">自然大调</option>
                <option value="natural-minor">自然小调</option>
              </select>
            </div>

            <div className="setting-group">
              <label>练习模式</label>
              <select
                value={practiceMode}
                onChange={(e) => setPracticeMode(e.target.value as ScalePracticeMode)}
              >
                <option value="sequential">顺序（五度圈下行）</option>
                <option value="random">随机</option>
              </select>
            </div>

            {practiceMode === 'random' && (
              <div className="setting-group">
                <label>随机数量</label>
                <select
                  value={randomCount}
                  onChange={(e) => setRandomCount(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6].map((count) => (
                    <option key={count} value={count}>{count} 个调</option>
                  ))}
                </select>
              </div>
            )}

            <div className="setting-group">
              <label>每调小节数</label>
              <select
                value={measuresPerScale}
                onChange={(e) => setMeasuresPerScale(Number(e.target.value))}
              >
                {[1, 2, 4, 8].map((count) => (
                  <option key={count} value={count}>{count} 小节</option>
                ))}
              </select>
            </div>

            <div className="setting-group">
              <label>显示模式</label>
              <select
                value={displayMode}
                onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
              >
                <option value="name">调性名称</option>
                <option value="staff">五线谱</option>
              </select>
            </div>

            <button className="start-button" onClick={startPractice}>
              开始练习
            </button>
          </div>
        </div>
      ) : (
        <div className="scale-practice-area">
          {/* 节拍器控制条（只读显示） */}
          <div className="metronome-bar">
            <button
              className={`play-btn ${metronomeState.isPlaying ? 'playing' : ''}`}
              onClick={togglePlay}
            >
              {metronomeState.isPlaying ? '■' : '▶'}
            </button>
            <span className="bpm-display">{metronomeState.bpm} BPM</span>
            <span className="time-sig-display">
              {metronomeState.timeSignature.beatsPerMeasure}/{metronomeState.timeSignature.beatUnit}
            </span>
            <span className="subdivision-display">
              {metronomeState.subdivision === 'basic' ? '基础拍' :
               metronomeState.subdivision === 'eighth' ? '八分' :
               metronomeState.subdivision === 'triplet' ? '三连音' : '混合'}
            </span>
            <div className="beat-indicators">
              {Array.from({ length: metronomeState.currentBeat > 0 ? getTotalBeats() : 0 }, (_, i) => (
                <div
                  key={i}
                  className={`beat-dot ${metronomeState.currentBeat === i + 1 ? 'active' : ''}`}
                />
              ))}
            </div>
          </div>

          <div className="scale-display">
            <div className="scale-top-bar">
              <div className="scale-progress">
                {currentIndex + 1} / {currentScales.length}
              </div>
              <div className="scale-measure-info">
                第 {currentMeasure + 1} / {measuresPerScale} 小节
              </div>
              <button
                className="display-toggle-btn"
                onClick={toggleDisplayMode}
                title={displayMode === 'name' ? '切换到五线谱' : '切换到调性名称'}
              >
                {displayMode === 'name' ? '𝄞' : '♪'}
              </button>
              {/* MIDI 设备状态 */}
              <div className="midi-status">
                {!midiIsInitialized ? (
                  <>
                    <button className="midi-btn" onClick={midiInitialize}>连接 MIDI</button>
                    {midiInitError === 'notSupported' && (
                      <span className="midi-error">当前浏览器不支持 Web MIDI API，请使用 Chrome 或 Safari</span>
                    )}
                    {midiInitError === 'permissionDenied' && (
                      <span className="midi-error">MIDI 权限被拒绝，请在 Safari 设置 &gt; 网站设置中重置 MIDI 权限后刷新页面</span>
                    )}
                    {midiInitError === 'insecureContext' && (
                      <span className="midi-error">当前页面未使用 HTTPS，无法访问 MIDI 设备。请使用 https:// 地址访问</span>
                    )}
                  </>
                ) : midiDevices.filter(d => d.type === 'input').length === 0 ? (
                  <>
                    <span className="midi-text">无 MIDI 输入设备</span>
                    {midiDevices.some(d => d.type === 'output') && (
                      <span className="midi-hint">检测到 MIDI 输出设备但无输入设备，请检查设备连接或重新插拔</span>
                    )}
                  </>
                ) : !midiSelectedDevice ? (
                  <select className="midi-select" onChange={e => midiSelectDevice(e.target.value)} value="">
                    <option value="">选择 MIDI 设备</option>
                    {midiDevices.filter(d => d.type === 'input').map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                ) : (
                  <span className="midi-connected">MIDI: {midiSelectedDevice.name}</span>
                )}
              </div>
            </div>

            <div className="current-scale">
              {displayMode === 'name' ? (
                <>
                  <div className="scale-name">{getScaleDisplayName(currentScales[currentIndex])}</div>
                  <div className="scale-hint">在键盘上弹奏该调的两个八度音阶</div>
                </>
              ) : (
                <>
                  <div className="scale-name-staff">{getScaleDisplayName(currentScales[currentIndex])}</div>
                  <StaffNotation
                    notes={getCurrentScaleNotes()}
                    bassChords={getCurrentBassChords()}
                    rootName={currentScales[currentIndex]}
                    keySignature={scaleType === 'natural-major' ? currentScales[currentIndex] : MINOR_KEY_SIGNATURES[currentScales[currentIndex]]}
                    beatsPerMeasure={4}
                    measuresPerRow={4}
                    showInlineAccidentals={false}
                    suppressEighthFlags={true}
                    width={520}
                    height={280}
                  />
                  <div className="scale-hint">参照五线谱在键盘上弹奏</div>
                </>
              )}
            </div>

            <div className="scale-actions">
              <button className="next-button" onClick={nextScale}>
                {currentIndex < currentScales.length - 1 ? '跳过' : '完成练习'}
              </button>
              <button className="stop-button" onClick={stopPractice}>
                停止练习
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
