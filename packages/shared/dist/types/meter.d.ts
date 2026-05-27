/**
 * 拍号
 */
export interface TimeSignature {
    /** 每小节拍数 */
    beatsPerMeasure: number;
    /** 拍号分母（以几分音符为一拍） */
    beatUnit: number;
}
/**
 * 细分类型
 */
export type SubdivisionType = 'basic' | 'eighth' | 'triplet' | 'mixed';
/**
 * 混合编排中的单拍细分
 */
export interface BeatSubdivision {
    /** 拍位（从 1 开始） */
    beat: number;
    /** 细分类型 */
    subdivision: SubdivisionType;
}
/**
 * 节拍器编排
 */
export interface MetronomeArrangement {
    /** 拍号 */
    timeSignature: TimeSignature;
    /** 细分类型（非混合模式） */
    subdivision: SubdivisionType;
    /** 混合编排（仅混合模式） */
    mixedArrangement?: BeatSubdivision[];
}
/**
 * 预设拍号
 */
export declare const COMMON_TIME_SIGNATURES: TimeSignature[];
/**
 * 计算每小节的总拍数（考虑细分）
 */
export declare function getBeatsPerMeasure(arrangement: MetronomeArrangement): number;
//# sourceMappingURL=meter.d.ts.map