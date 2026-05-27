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
export const COMMON_TIME_SIGNATURES: TimeSignature[] = [
  { beatsPerMeasure: 4, beatUnit: 4 }, // 4/4
  { beatsPerMeasure: 3, beatUnit: 4 }, // 3/4
  { beatsPerMeasure: 6, beatUnit: 8 }, // 6/8
];

/**
 * 计算每小节的总拍数（考虑细分）
 */
export function getBeatsPerMeasure(arrangement: MetronomeArrangement): number {
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
