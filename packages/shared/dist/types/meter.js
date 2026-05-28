/**
 * 预设拍号
 */
export const COMMON_TIME_SIGNATURES = [
    { beatsPerMeasure: 4, beatUnit: 4 }, // 4/4
    { beatsPerMeasure: 3, beatUnit: 4 }, // 3/4
    { beatsPerMeasure: 6, beatUnit: 8 }, // 6/8
];
/**
 * 计算单个节奏型模式的总拍数
 */
export function getPatternBeats(pattern) {
    return pattern.beats.reduce((total, beat) => {
        switch (beat.subdivision) {
            case 'eighth': return total + 2;
            case 'triplet': return total + 3;
            default: return total + 1;
        }
    }, 0);
}
/**
 * 计算每小节的总拍数（考虑细分）
 */
export function getBeatsPerMeasure(arrangement) {
    const { timeSignature, subdivision, mixedArrangement } = arrangement;
    if (subdivision === 'mixed' && mixedArrangement) {
        // 混合模式：计算每拍的实际拍数
        return mixedArrangement.reduce((total, beat) => {
            switch (beat.subdivision) {
                case 'basic': return total + 1;
                case 'eighth': return total + 2;
                case 'triplet': return total + 3;
                default: return total + 1;
            }
        }, 0);
    }
    // 非混合模式
    switch (subdivision) {
        case 'basic': return timeSignature.beatsPerMeasure;
        case 'eighth': return timeSignature.beatsPerMeasure * 2;
        case 'triplet': return timeSignature.beatsPerMeasure * 3;
        default: return timeSignature.beatsPerMeasure;
    }
}
/**
 * 获取多小节编排中指定小节的节奏型
 */
export function getMeasurePattern(arrangement, measureIndex) {
    const patternIndex = arrangement.measurePatternIndices[measureIndex];
    if (patternIndex === undefined || patternIndex < 0 || patternIndex >= arrangement.patterns.length) {
        return null;
    }
    return arrangement.patterns[patternIndex];
}
//# sourceMappingURL=meter.js.map