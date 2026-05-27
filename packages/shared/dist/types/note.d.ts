/**
 * 音符名称（不含八度）
 * 包含自然大调谱面需要的升号与降号等音拼写。
 */
export type NoteName = 'C' | 'C#' | 'Db' | 'D' | 'D#' | 'Eb' | 'E' | 'F' | 'F#' | 'Gb' | 'G' | 'G#' | 'Ab' | 'A' | 'A#' | 'Bb' | 'B' | 'Cb';
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
export declare const CIRCLE_OF_FIFTHS_DESCENDING: NoteName[];
/**
 * 自然大调音程模式（全全半全全全半）
 */
export declare const NATURAL_MAJOR_INTERVALS: number[];
/**
 * 自然小调音程模式（全半全全半全全）
 */
export declare const NATURAL_MINOR_INTERVALS: number[];
/**
 * 获取指定根音和类型的音阶音符序列
 */
export declare function getScaleNotes(root: NoteName, type: ScaleType, octave?: number): Note[];
/**
 * 获取音符的 MIDI 编号
 */
export declare function getMidiNumber(name: NoteName, octave: number): number;
/**
 * 从 MIDI 编号获取音符
 */
export declare function getNoteFromMidi(midiNumber: number): Note;
//# sourceMappingURL=note.d.ts.map