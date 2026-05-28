import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CIRCLE_OF_FIFTHS_DESCENDING, getMidiNumber, Note, NoteName } from '@chordflow/shared';
import { useMetronome } from '../../contexts';
import { useMidiDetection } from '../../hooks/useMidiDetection';
import { BassChord, NoteWithDuration, AlphaTabStaffNotation as StaffNotation, adjustBassChordOctave } from '../StaffNotation';
import './ArpeggioPractice.css';

/** 三和弦性质 */
type ArpeggioChordType = 'major' | 'minor';

/** 琶音连接方式 */
type ArpeggioMode = 'standard' | 'nearby';

/** 三和弦练习项 */
interface ArpeggioExercise {
  /** 展示名称 */
  name: string;
  /** 根音 */
  root: NoteName;
  /** 三和弦性质 */
  chordType: ArpeggioChordType;
  /** 谱面调号 */
  keySignature?: string;
}

/** 大三和弦五度圈顺序，与 PDF 第 1 页和第 3 页一致 */
const MAJOR_ROOTS: NoteName[] = CIRCLE_OF_FIFTHS_DESCENDING;

/** 小三和弦普通五度圈顺序，与 PDF 第 2 页一致 */
const MINOR_STANDARD_ROOTS: NoteName[] = ['A', 'D', 'G', 'C', 'F', 'Bb', 'Eb', 'G#', 'C#', 'F#', 'B', 'E'];

/** 小三和弦就近连接顺序，与 PDF 第 3 页一致 */
const MINOR_NEARBY_ROOTS: NoteName[] = ['C', 'F', 'Bb', 'Eb', 'G#', 'C#', 'F#', 'B', 'E', 'A', 'D', 'G'];

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

/** 普通琶音右手起始八度 */
const STANDARD_START_OCTAVES: Record<NoteName, number> = {
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

/**
 * 构造带八度的音符。
 */
function makeNote(name: NoteName, octave: number): Note {
  return { name, octave, midiNumber: getMidiNumber(name, octave) };
}

/**
 * 获取三和弦音级拼写。
 */
function getTriadNames(root: NoteName, chordType: ArpeggioChordType): NoteName[] {
  const triadNames = chordType === 'major' ? MAJOR_TRIADS[root] : MINOR_TRIADS[root];
  if (!triadNames) {
    throw new Error(`Unsupported ${chordType} triad root: ${root}`);
  }
  return triadNames;
}

/**
 * 按音高顺序生成跨八度的三和弦音。
 */
function buildTriadAcrossOctaves(root: NoteName, chordType: ArpeggioChordType, octave: number, count: number): Note[] {
  const names = getTriadNames(root, chordType);
  const notes: Note[] = [];
  let currentOctave = octave;
  let previousMidi = -1;

  for (let i = 0; i < count; i++) {
    const name = names[i % names.length];
    let note = makeNote(name, currentOctave);

    while (note.midiNumber <= previousMidi) {
      currentOctave += 1;
      note = makeNote(name, currentOctave);
    }

    notes.push(note);
    previousMidi = note.midiNumber;
  }

  return notes;
}

/**
 * 生成普通五度下行琶音，两小节一个和弦。
 */
function buildStandardNotes(exercise: ArpeggioExercise): NoteWithDuration[] {
  const octave = STANDARD_START_OCTAVES[exercise.root];
  // 上行：8个八分音符（1 3 5 1 3 5 1 5）
  const ascending = buildTriadAcrossOctaves(exercise.root, exercise.chordType, octave, 8);
  // 下行：4个八分音符（3 1 5 3）
  const descending = ascending.slice(2, 6).reverse();
  // 结尾根音：二分音符
  const endingRoot = makeNote(exercise.root, octave);

  return [
    ...ascending.map(note => ({ note, duration: 'eighth' as const })),
    ...descending.map(note => ({ note, duration: 'eighth' as const })),
    { note: endingRoot, duration: 'half' as const },
  ];
}

/**
 * 生成就近连接琶音，一小节一个和弦并上下行交替。
 */
function buildNearbyMeasureNotes(exercise: ArpeggioExercise, index: number): NoteWithDuration[] {
  const octave = STANDARD_START_OCTAVES[exercise.root];
  const ascending = buildTriadAcrossOctaves(exercise.root, exercise.chordType, octave, 8);
  const notes = index % 2 === 0 ? ascending : [...ascending].reverse();
  return notes.map(note => ({ note, duration: 'eighth' as const }));
}

/**
 * 生成左手三和弦（自动调整八度避免音符超出谱表）。
 */
function buildBassChord(exercise: ArpeggioExercise, duration: 'whole' | 'half' = 'whole'): BassChord {
  const names = getTriadNames(exercise.root, exercise.chordType);
  const chord: BassChord = {
    name: exercise.name,
    duration,
    notes: names.map(name => makeNote(name, 3)),
  };
  return adjustBassChordOctave(chord);
}

/**
 * 三和弦琶音练习组件
 * 支持普通五度下行和就近连接两种 PDF 谱面。
 */
export function ArpeggioPractice() {
  const navigate = useNavigate();
  const [chordType, setChordType] = useState<ArpeggioChordType>('major');
  const [mode, setMode] = useState<ArpeggioMode>('standard');
  const [isPracticing, setIsPracticing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMeasure, setCurrentMeasure] = useState(0);
  const measureTimerRef = useRef<number | null>(null);

  // 混合模式：防止 MIDI 检测与小节计时重复触发前进的锁
  const hasAdvancedRef = useRef(false);

  const exercises = useMemo<ArpeggioExercise[]>(() => {
    const roots = chordType === 'major' ? MAJOR_ROOTS : mode === 'standard' ? MINOR_STANDARD_ROOTS : MINOR_NEARBY_ROOTS;

    return roots.map(root => ({
      root,
      chordType,
      name: `${root}${chordType === 'major' ? '' : 'm'}`,
      keySignature: chordType === 'major' ? root : MINOR_KEY_SIGNATURES[root] ?? root,
    }));
  }, [chordType, mode]);

  const currentGroup = useMemo(() => {
    if (mode === 'standard') return [exercises[currentIndex]].filter(Boolean);
    return exercises.slice(currentIndex * 4, currentIndex * 4 + 4);
  }, [currentIndex, exercises, mode]);

  const totalItems = mode === 'standard' ? exercises.length : Math.ceil(exercises.length / 4);
  const measuresPerItem = mode === 'standard' ? 2 : 4;

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
    setCurrentMeasure(prev => {
      const nextMeasure = prev + 1;
      if (nextMeasure >= measuresPerItem) {
        nextExercise();
        return 0;
      }
      return nextMeasure;
    });
  }, [measuresPerItem, nextExercise]);

  // 注册小节完成回调
  useEffect(() => {
    const unsubscribe = registerMeasureCallback(handleMeasureComplete);
    return unsubscribe;
  }, [registerMeasureCallback, handleMeasureComplete]);

  const notes = useMemo<NoteWithDuration[]>(() => {
    if (mode === 'standard') {
      return currentGroup[0] ? buildStandardNotes(currentGroup[0]) : [];
    }

    return currentGroup.flatMap((exercise, index) => buildNearbyMeasureNotes(exercise, index));
  }, [currentGroup, mode]);

  const bassChords = useMemo<BassChord[]>(() => {
    if (mode === 'standard') {
      return currentGroup[0] ? [buildBassChord(currentGroup[0]), buildBassChord(currentGroup[0])] : [];
    }

    return currentGroup.map(exercise => buildBassChord(exercise));
  }, [currentGroup, mode]);

  const title = mode === 'standard'
    ? currentGroup[0]?.name ?? ''
    : currentGroup.map(exercise => exercise.name).join(' → ');

  // MIDI 检测（混合模式：弹对所有音符 OR 时值耗尽，取先满足者）
  const {
    status: midiStatus,
    devices: midiDevices,
    selectedDevice: midiSelectedDevice,
    isInitialized: midiIsInitialized,
    initialize: midiInitialize,
    selectDevice: midiSelectDevice,
    reset: midiReset,
  } = useMidiDetection({
    expectedNotes: notes.map(n => n.note.midiNumber),
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
    <div className="arpeggio-practice">
      <div className="practice-header">
        <button className="back-button" onClick={() => navigate('/')}>← 返回</button>
        <h2>和弦琶音</h2>
      </div>

      {!isPracticing ? (
        <div className="scale-settings">
          <div className="practice-options">
            <h4>练习设置</h4>

            <div className="setting-group">
              <label>和弦类型</label>
              <select value={chordType} onChange={event => setChordType(event.target.value as ArpeggioChordType)}>
                <option value="major">大三和弦</option>
                <option value="minor">小三和弦</option>
              </select>
            </div>

            <div className="setting-group">
              <label>连接方式</label>
              <select value={mode} onChange={event => setMode(event.target.value as ArpeggioMode)}>
                <option value="standard">普通五度下行</option>
                <option value="nearby">就近连接</option>
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
              <button className="display-toggle-btn" title="五线谱模式">
                ♪
              </button>
              {/* MIDI 设备状态 */}
              <div className="midi-status">
                {!midiIsInitialized ? (
                  <button className="midi-btn" onClick={midiInitialize}>连接 MIDI</button>
                ) : midiDevices.length === 0 ? (
                  <span className="midi-text">无 MIDI 设备</span>
                ) : !midiSelectedDevice ? (
                  <select className="midi-select" onChange={e => midiSelectDevice(e.target.value)} value="">
                    <option value="">选择 MIDI 设备</option>
                    {midiDevices.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                ) : (
                  <span className="midi-connected">MIDI: {midiSelectedDevice.name}</span>
                )}
              </div>
            </div>

            <div className="current-scale">
              <div className="arpeggio-title">{title}</div>
              <StaffNotation
                notes={notes}
                bassChords={bassChords}
                keySignature={mode === 'standard' ? currentGroup[0]?.keySignature : undefined}
                beatsPerMeasure={4}
                measuresPerRow={mode === 'standard' ? 2 : 4}
                showInlineAccidentals={mode === 'nearby'}
                suppressEighthFlags
                width={520}
                height={320}
              />
              <div className="arpeggio-subtitle">
                {mode === 'standard' ? '按五度圈下行完成两小节琶音' : '按就近连接完成四个连续和弦'}
              </div>
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
