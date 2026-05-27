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
export declare const MAJOR_TRIAD: Chord;
/**
 * 小三和弦定义
 */
export declare const MINOR_TRIAD: Chord;
/**
 * 获取和弦的音符列表
 */
export declare function getChordNotes(chord: Chord, octave: number): NoteName[];
/**
 * 获取和弦转位
 */
export declare function getChordInversion(chord: Chord, inversion: ChordInversion): NoteName[];
//# sourceMappingURL=chord.d.ts.map