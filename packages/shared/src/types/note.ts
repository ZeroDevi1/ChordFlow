/**
 * 音符名称（不含八度）
 * 包含自然大调谱面需要的升号与降号等音拼写。
 */
export type NoteName =
  | 'C'
  | 'C#'
  | 'Db'
  | 'D'
  | 'D#'
  | 'Eb'
  | 'E'
  | 'F'
  | 'F#'
  | 'Gb'
  | 'G'
  | 'G#'
  | 'Ab'
  | 'A'
  | 'A#'
  | 'Bb'
  | 'B'
  | 'Cb';

/**
 * 音符（含八度）
 */
export interface Note {
  /** 音符名称 */
  name: NoteName;
  /** 八度（0-8） */
  octave: number;
  /** MIDI 音符号（0-127） */
  midiNumber: number;
}

/**
 * 音阶类型
 */
export type ScaleType = 'natural-major' | 'natural-minor';

/**
 * 音阶定义
 */
export interface Scale {
  /** 根音 */
  root: NoteName;
  /** 音阶类型 */
  type: ScaleType;
  /** 音程模式（全全半全全全半 = [2,2,1,2,2,2,1]） */
  intervals: number[];
}

/**
 * 五度圈顺序（下行）
 */
export const CIRCLE_OF_FIFTHS_DESCENDING: NoteName[] = [
  'C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'B', 'E', 'A', 'D', 'G'
];

/**
 * 自然大调音程模式（全全半全全全半）
 */
export const NATURAL_MAJOR_INTERVALS = [2, 2, 1, 2, 2, 2, 1];

/**
 * 自然小调音程模式（全半全全半全全）
 */
export const NATURAL_MINOR_INTERVALS = [2, 1, 2, 2, 1, 2, 2];

/**
 * 自然大调音级拼写表
 * 按 PDF 的调号体系保留 Bb / Eb / Db / Gb 等降号调写法。
 */
const NATURAL_MAJOR_SPELLINGS: Partial<Record<NoteName, NoteName[]>> = {
  C: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  F: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
  Bb: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
  Eb: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
  Ab: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
  Db: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'],
  Gb: ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'],
  B: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
  E: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
  A: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
  D: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
  G: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
};

/**
 * 依据音级拼写和起始八度生成连续上行音符。
 */
function buildAscendingNotes(degreeNames: NoteName[], octave: number): Note[] {
  const notes: Note[] = [];
  let currentOctave = octave;
  let previousMidi = -1;

  for (let i = 0; i <= degreeNames.length * 2; i++) {
    const degreeName = degreeNames[i % degreeNames.length];
    let midiNumber = getMidiNumber(degreeName, currentOctave);

    while (midiNumber <= previousMidi) {
      currentOctave += 1;
      midiNumber = getMidiNumber(degreeName, currentOctave);
    }

    notes.push({ name: degreeName, octave: currentOctave, midiNumber });
    previousMidi = midiNumber;
  }

  return notes;
}

/**
 * 获取指定根音和类型的音阶音符序列
 */
export function getScaleNotes(root: NoteName, type: ScaleType, octave: number = 4): Note[] {
  if (type === 'natural-major' && NATURAL_MAJOR_SPELLINGS[root]) {
    const notes = buildAscendingNotes(NATURAL_MAJOR_SPELLINGS[root], octave);
    const descendingNotes = [...notes].reverse().slice(1);
    return [...notes, ...descendingNotes];
  }

  const intervals = type === 'natural-major' ? NATURAL_MAJOR_INTERVALS : NATURAL_MINOR_INTERVALS;

  const notes: Note[] = [];
  let currentMidi = getMidiNumber(root, octave);

  // 上行两个八度：根据累计 MIDI 号反推正确音名，避免误用 chromatic 索引
  for (let i = 0; i < intervals.length * 2; i++) {
    notes.push(getNoteFromMidi(currentMidi));
    currentMidi += intervals[i % intervals.length];
  }

  // 添加高八度根音
  notes.push(getNoteFromMidi(currentMidi));

  // 下行（反向，去掉重复的顶点音）
  const descendingNotes = [...notes].reverse().slice(1);

  return [...notes, ...descendingNotes];
}

/**
 * 获取音符的 MIDI 编号
 */
export function getMidiNumber(name: NoteName, octave: number): number {
  const noteIndex: Record<NoteName, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
    'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11
  };
  return (octave + 1) * 12 + noteIndex[name];
}

/**
 * 从 MIDI 编号获取音符
 */
export function getNoteFromMidi(midiNumber: number): Note {
  const noteNames: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNumber / 12) - 1;
  const name = noteNames[midiNumber % 12];
  return { name, octave, midiNumber };
}
