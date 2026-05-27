import { NoteName } from './note';

/**
 * 和弦类型
 */
export type ChordType = 'major' | 'minor';

/**
 * 和弦定义
 */
export interface Chord {
  /** 根音 */
  root: NoteName;
  /** 和弦类型 */
  type: ChordType;
  /** 和弦音（相对于根音的半音数） */
  intervals: number[];
}

/**
 * 和弦转位
 */
export type ChordInversion = 0 | 1 | 2;

/**
 * 大三和弦定义
 */
export const MAJOR_TRIAD: Chord = {
  root: 'C',
  type: 'major',
  intervals: [0, 4, 7] // 根音、大三度、纯五度
};

/**
 * 小三和弦定义
 */
export const MINOR_TRIAD: Chord = {
  root: 'A',
  type: 'minor',
  intervals: [0, 3, 7] // 根音、小三度、纯五度
};

/**
 * 获取和弦的音符列表
 */
export function getChordNotes(chord: Chord, octave: number): NoteName[] {
  // 简化实现，返回和弦音名称
  const noteNames: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const rootIndex = noteNames.indexOf(chord.root);
  return chord.intervals.map(interval => {
    const noteIndex = (rootIndex + interval) % 12;
    return noteNames[noteIndex];
  });
}

/**
 * 获取和弦转位
 */
export function getChordInversion(chord: Chord, inversion: ChordInversion): NoteName[] {
  const notes = getChordNotes(chord, 4);
  if (inversion === 0) return notes;
  
  // 转位：将低音移到高八度
  const rotated = [...notes.slice(inversion), ...notes.slice(0, inversion)];
  return rotated;
}
