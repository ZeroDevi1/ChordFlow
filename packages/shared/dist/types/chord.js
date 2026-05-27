/**
 * 大三和弦定义
 */
export const MAJOR_TRIAD = {
    root: 'C',
    type: 'major',
    intervals: [0, 4, 7] // 根音、大三度、纯五度
};
/**
 * 小三和弦定义
 */
export const MINOR_TRIAD = {
    root: 'A',
    type: 'minor',
    intervals: [0, 3, 7] // 根音、小三度、纯五度
};
/**
 * 获取和弦的音符列表
 */
export function getChordNotes(chord, octave) {
    // 简化实现，返回和弦音名称
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const rootIndex = noteNames.indexOf(chord.root);
    return chord.intervals.map(interval => {
        const noteIndex = (rootIndex + interval) % 12;
        return noteNames[noteIndex];
    });
}
/**
 * 获取和弦转位
 */
export function getChordInversion(chord, inversion) {
    const notes = getChordNotes(chord, 4);
    if (inversion === 0)
        return notes;
    // 转位：将低音移到高八度
    const rotated = [...notes.slice(inversion), ...notes.slice(0, inversion)];
    return rotated;
}
//# sourceMappingURL=chord.js.map