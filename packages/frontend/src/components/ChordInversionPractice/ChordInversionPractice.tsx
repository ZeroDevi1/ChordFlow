import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CIRCLE_OF_FIFTHS_DESCENDING, getMidiNumber, Note, NoteName } from '@chordflow/shared';
import { MetronomeConfig } from '../MetronomeConfig';
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

interface ChordInversionPracticeProps {
  onBack: () => void;
}

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
export function ChordInversionPractice({ onBack }: ChordInversionPracticeProps) {
  const [chordType, setChordType] = useState<ChordInversionType>('major');
  const [isPracticing, setIsPracticing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMeasure, setCurrentMeasure] = useState(0);
  const measureTimerRef = useRef<number | null>(null);

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
  }, []);

  const stopPractice = useCallback(() => {
    setIsPracticing(false);
    setCurrentIndex(0);
    setCurrentMeasure(0);
    if (measureTimerRef.current) {
      clearInterval(measureTimerRef.current);
      measureTimerRef.current = null;
    }
  }, []);

  const nextExercise = useCallback(() => {
    if (currentIndex < totalItems - 1) {
      setCurrentIndex(currentIndex + 1);
      setCurrentMeasure(0);
      return;
    }
    stopPractice();
  }, [currentIndex, stopPractice, totalItems]);

  const onMeasureComplete = useCallback(() => {
    nextExercise();
  }, [nextExercise]);

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
        <button className="back-button" onClick={onBack}>
          ← 返回
        </button>
        <h2>和弦转位</h2>
      </div>

      {!isPracticing ? (
        <div className="scale-settings">
          <MetronomeConfig />

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
          <MetronomeConfig onMeasureComplete={onMeasureComplete} />

          <div className="scale-display">
            <div className="scale-top-bar">
              <div className="scale-progress">
                {currentIndex + 1} / {totalItems}
              </div>
              <div className="scale-measure-info">
                第 {currentMeasure + 1} / {measuresPerItem} 小节
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
