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
 * 小节节奏型模式
 * 定义一个小节内的节奏编排
 */
export interface MeasurePattern {
    /** 模式名称（如 "基础拍"、"八分音符"、"前3拍基础+第4拍三连音"） */
    name: string;
    /** 该小节的拍位细分配置 */
    beats: BeatSubdivision[];
}
/**
 * 多小节编排配置
 * 支持不同小节使用不同的节奏型
 */
export interface MultiMeasureArrangement {
    /** 总小节数 */
    measureCount: number;
    /** 各小节的节奏型索引（指向 patterns 数组） */
    measurePatternIndices: number[];
    /** 可用的节奏型模式列表 */
    patterns: MeasurePattern[];
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
    /** 多小节编排（仅混合模式） */
    multiMeasureArrangement?: MultiMeasureArrangement;
}
/**
 * 预设拍号
 */
export declare const COMMON_TIME_SIGNATURES: TimeSignature[];
/**
 * 计算单个节奏型模式的总拍数
 */
export declare function getPatternBeats(pattern: MeasurePattern): number;
/**
 * 计算每小节的总拍数（考虑细分）
 */
export declare function getBeatsPerMeasure(arrangement: MetronomeArrangement): number;
/**
 * 获取多小节编排中指定小节的节奏型
 */
export declare function getMeasurePattern(arrangement: MultiMeasureArrangement, measureIndex: number): MeasurePattern | null;
//# sourceMappingURL=meter.d.ts.map