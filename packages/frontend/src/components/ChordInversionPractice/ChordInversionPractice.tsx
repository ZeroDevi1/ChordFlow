import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CIRCLE_OF_FIFTHS_DESCENDING, getMidiNumber, Note, NoteName } from '@chordflow/shared';
import { useMetronome } from '../../contexts';
import { useMidiDetection } from '../../hooks/useMidiDetection';
import {
  BassChord,
  TrebleChord,
  AlphaTabStaffNotation as StaffNotation,
} from '../StaffNotation';
import './ChordInversionPractice.css';

/** 三和弦性质 */
type ChordInversionType = 'major' | 'minor';

/** 三和弦练习项 */
interface ChordInversionExercise {
  /** 展示名称 */
  name: string;
  /** 根音 */
  root: NoteName;
  /** 三和弦性质 */
  chordType: ChordInversionType;
  /** 谱面调号 */
  keySignature?: string;
}

/** 大三和弦五度圈顺序 */
const MAJOR_ROOTS: NoteName[] = CIRCLE_OF_FIFTHS_DESCENDING;

/** 小三和弦五度圈顺序（从 Am 开始） */
const MINOR_ROOTS: NoteName[] = [
  'A', 'D', 'G', 'C', 'F', 'Bb', 'Eb', 'G#', 'C#', 'F#', 'B', 'E',
];

/** 小调调号对应的关系大调 */
const MINOR_KEY_SIGNATURES: Partial<Record<NoteName, string>> = {
  C: 'Eb',
  'C#': 'E',
  D: 'F',
  Eb: 'Gb',
  E: 'G',
  F: 'Ab',
  'F#': 'A',
  Gb: 'A',
  G: 'Bb',
  'G#': 'B',
  A: 'C',
  Bb: 'Db',
  B: 'D',
};

/** 大三和弦音级拼写 */
const MAJOR_TRIADS: Partial<Record<NoteName, NoteName[]>> = {
  C: ['C', 'E', 'G'],
  Db: ['Db', 'F', 'Ab'],
  D: ['D', 'F#', 'A'],
  Eb: ['Eb', 'G', 'Bb'],
  E: ['E', 'G#', 'B'],
  F: ['F', 'A', 'C'],
  Gb: ['Gb', 'Bb', 'Db'],
  G: ['G', 'B', 'D'],
  Ab: ['Ab', 'C', 'Eb'],
  A: ['A', 'C#', 'E'],
  Bb: ['Bb', 'D', 'F'],
  B: ['B', 'D#', 'F#'],
};

/** 小三和弦音级拼写 */
const MINOR_TRIADS: Partial<Record<NoteName, NoteName[]>> = {
  C: ['C', 'Eb', 'G'],
  'C#': ['C#', 'E', 'G#'],
  D: ['D', 'F', 'A'],
  Eb: ['Eb', 'Gb', 'Bb'],
  E: ['E', 'G', 'B'],
  F: ['F', 'Ab', 'C'],
  'F#': ['F#', 'A', 'C#'],
  G: ['G', 'Bb', 'D'],
  'G#': ['G#', 'B', 'D#'],
  A: ['A', 'C', 'E'],
  Bb: ['Bb', 'Db', 'F'],
  B: ['B', 'D', 'F#'],
};

/** 右手起始八度 */
const START_OCTAVES: Record<NoteName, number> = {
  C: 4,
  'C#': 4,
  Db: 4,
  D: 4,
  'D#': 3,
  Eb: 4,
  E: 4,
  F: 4,
  'F#': 3,
  Gb: 3,
  G: 3,
  'G#': 3,
  Ab: 4,
  A: 3,
  'A#': 3,
  Bb: 3,
  B: 3,
  Cb: 3,
};

/**
 * 构造带八度的音符。
 */
function makeNote(name: NoteName, octave: number): Note {
  return { name, octave, midiNumber: getMidiNumber(name, octave) };
}

/**
 * 获取三和弦音级拼写。
 */
function getTriadNames(root: NoteName, chordType: ChordInversionType): NoteName[] {
  const triadNames = chordType === 'major' ? MAJOR_TRIADS[root] : MINOR_TRIADS[root];
  if (!triadNames) {
    throw new Error(`Unsupported ${chordType} triad root: ${root}`);
  }
  return triadNames;
}

/**
 * 构建严格上行的三和弦。
 * 从起始八度开始，每个音确保高于前一个音（如 F3 A3 C4）。
 */
function buildChordAscending(names: NoteName[], startOctave: number): Note[] {
  const notes: Note[] = [];
  let currentOctave = startOctave;
  let previousMidi = -1;

  for (const name of names) {
    let note = makeNote(name, currentOctave);
    while (note.midiNumber <= previousMidi) {
      currentOctave++;
      note = makeNote(name, currentOctave);
    }
    notes.push(note);
    previousMidi = note.midiNumber;
  }

  return notes;
}

/**
 * 生成一个和弦的转位序列（4 个四分音符柱式和弦）。
 *
 * 右手弹奏完整三和弦转位，音符严格上行且紧凑：
 * - 原位 → F3 A3 C4
 * - 第一转位 → A3 C4 F4
 * - 第二转位 → C4 F4 A4
 * - 高八度原位 → F4 A4 C5
 */
function buildInversionChords(exercise: ChordInversionExercise): TrebleChord[] {
  const names = getTriadNames(exercise.root, exercise.chordType);
  const octave = START_OCTAVES[exercise.root];

  // 原位：从起始八度构建严格上行和弦
  const rootPos = buildChordAscending(names, octave);

  // 第一转位：3rd, 5th, root — 从原位的第二个音开始
  const firstInv = buildChordAscending(
    [names[1], names[2], names[0]],
    rootPos[1].octave,
  );

  // 第二转位：5th, root, 3rd — 从原位的第三个音开始
  const secondInv = buildChordAscending(
    [names[2], names[0], names[1]],
    rootPos[2].octave,
  );

  // 高八度原位：从原位根音高八度开始
  const rootPosOctUp = buildChordAscending(names, rootPos[0].octave + 1);

  return [
    { notes: rootPos, duration: 'quarter' },
    { notes: firstInv, duration: 'quarter' },
    { notes: secondInv, duration: 'quarter' },
    { notes: rootPosOctUp, duration: 'quarter' },
  ];
}

/**
 * 生成左手转位和弦序列，保持在低音谱表范围内（G2-A3）。
 * 与右手同步：原位 → 第一转位 → 第二转位 → 高八度原位。
 * 起始八度比右手低 2，确保转位后不超出谱表。
 */
function buildBassInversionChords(exercise: ChordInversionExercise): BassChord[] {
  const names = getTriadNames(exercise.root, exercise.chordType);
  // 左手起始八度比右手低 2，确保转位后仍在低音谱表内
  const octave = START_OCTAVES[exercise.root] - 2;

  // 原位
  const rootPos = buildChordAscending(names, octave);

  // 第一转位
  const firstInv = buildChordAscending(
    [names[1], names[2], names[0]],
    rootPos[1].octave,
  );

  // 第二转位
  const secondInv = buildChordAscending(
    [names[2], names[0], names[1]],
    rootPos[2].octave,
  );

  // 高八度原位
  const rootPosOctUp = buildChordAscending(names, rootPos[0].octave + 1);

  return [
    { name: exercise.name, notes: rootPos, duration: 'quarter' },
    { name: exercise.name, notes: firstInv, duration: 'quarter' },
    { name: exercise.name, notes: secondInv, duration: 'quarter' },
    { name: exercise.name, notes: rootPosOctUp, duration: 'quarter' },
  ];
}

/**
 * 和弦转位练习组件
 * 五度圈下行，每个和弦一小节，4 个四分音符依次弹奏原位、第一转位、第二转位、高八度原位。
 */
export function ChordInversionPractice() {
  const navigate = useNavigate();
  const [chordType, setChordType] = useState<ChordInversionType>('major');
  const [isPracticing, setIsPracticing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMeasure, setCurrentMeasure] = useState(0);
  const measureTimerRef = useRef<number | null>(null);

  // 混合模式：防止 MIDI 检测与小节计时重复触发前进的锁
  const hasAdvancedRef = useRef(false);

  const exercises = useMemo<ChordInversionExercise[]>(() => {
    const roots = chordType === 'major' ? MAJOR_ROOTS : MINOR_ROOTS;
    return roots.map(root => ({
      root,
      chordType,
      name: `${root}${chordType === 'major' ? '' : 'm'}`,
      keySignature: chordType === 'major' ? root : MINOR_KEY_SIGNATURES[root] ?? root,
    }));
  }, [chordType]);

  const totalItems = exercises.length;
  const measuresPerItem = 1; // 每个和弦一小节

  const startPractice = useCallback(() => {
    setCurrentIndex(0);
    setCurrentMeasure(0);
    setIsPracticing(true);
    hasAdvancedRef.current = false;
  }, []);

  const stopPractice = useCallback(() => {
    setIsPracticing(false);
    setCurrentIndex(0);
    setCurrentMeasure(0);
    hasAdvancedRef.current = false;
    if (measureTimerRef.current) {
      clearInterval(measureTimerRef.current);
      measureTimerRef.current = null;
    }
  }, []);

  const nextExercise = useCallback(() => {
    if (hasAdvancedRef.current) return;
    hasAdvancedRef.current = true;

    if (currentIndex < totalItems - 1) {
      setCurrentIndex(currentIndex + 1);
      setCurrentMeasure(0);
      // 混合模式：下一帧重置前进锁，允许下一个练习项再次触发
      requestAnimationFrame(() => {
        hasAdvancedRef.current = false;
      });
      return;
    }
    stopPractice();
  }, [currentIndex, stopPractice, totalItems]);

  // 获取全局节拍器状态
  const { state: metronomeState, togglePlay, getBeatsPerMeasure, onMeasureComplete: registerMeasureCallback } = useMetronome();

  // 计算细分后的总拍数
  const getTotalBeats = useCallback(() => {
    return getBeatsPerMeasure();
  }, [getBeatsPerMeasure]);

  const handleMeasureComplete = useCallback(() => {
    setCurrentMeasure(prev => prev + 1);
  }, []);

  // 注册小节完成回调
  useEffect(() => {
    const unsubscribe = registerMeasureCallback(handleMeasureComplete);
    return unsubscribe;
  }, [registerMeasureCallback, handleMeasureComplete]);

  const currentExercise = exercises[currentIndex];

  /** 右手转位和弦序列 */
  const trebleChords = useMemo<TrebleChord[]>(() => {
    return currentExercise ? buildInversionChords(currentExercise) : [];
  }, [currentExercise]);

  /** 左手转位和弦序列（低八度） */
  const bassChords = useMemo<BassChord[]>(() => {
    return currentExercise ? buildBassInversionChords(currentExercise) : [];
  }, [currentExercise]);

  const title = currentExercise?.name ?? '';

  // 当前练习项的期望音符（用于 MIDI 检测）：将柱式和和弦序列扁平化为单音序列
  const expectedNotes = useMemo(() => {
    return trebleChords.flatMap(chord => chord.notes.map(n => n.midiNumber));
  }, [trebleChords]);

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
        nextExercise();
      }
    }
  }, [midiStatus, isPracticing, nextExercise]);

  // 练习停止时重置 MIDI 检测状态
  useEffect(() => {
    if (!isPracticing) {
      midiReset();
    }
  }, [isPracticing, midiReset]);

  useEffect(() => {
    return () => {
      if (measureTimerRef.current) {
        clearInterval(measureTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="chord-inversion-practice">
      <div className="practice-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← 返回
        </button>
        <h2>和弦转位</h2>
      </div>

      {!isPracticing ? (
        <div className="scale-settings">
          <div className="practice-options">
            <h4>练习设置</h4>

            <div className="setting-group">
              <label>和弦类型</label>
              <select value={chordType} onChange={event => setChordType(event.target.value as ChordInversionType)}>
                <option value="major">大三和弦</option>
                <option value="minor">小三和弦</option>
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
                {currentIndex + 1} / {totalItems}
              </div>
              <div className="scale-measure-info">
                第 {currentMeasure + 1} / {measuresPerItem} 小节
              </div>
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
              <div className="inversion-title">{title}</div>
              <StaffNotation
                trebleChords={trebleChords}
                bassChords={bassChords}
                beatsPerMeasure={4}
                measuresPerRow={1}
                showInlineAccidentals={true}
                width={520}
                height={320}
              />
              <div className="inversion-labels">
                <span>原位</span>
                <span>第一转位</span>
                <span>第二转位</span>
                <span>高八度原位</span>
              </div>
              <div className="inversion-subtitle">双手弹奏完整三和弦转位</div>
            </div>

            <div className="scale-actions">
              <button className="next-button" onClick={nextExercise}>
                {currentIndex < totalItems - 1 ? '跳过' : '完成练习'}
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
