import { NoteName } from './note';
import { ChordType } from './chord';
import { MetronomeArrangement } from './meter';
/**
 * 练习类型
 */
export type PracticeType = 'scale' | 'arpeggio' | 'chord-inversion';
/**
 * 练习项
 */
export interface PracticeExercise {
    /** 练习类型 */
    type: PracticeType;
    /** 根音 */
    root: NoteName;
    /** 和弦类型（仅琶音练习） */
    chordType?: ChordType;
    /** 节拍器编排 */
    metronome?: MetronomeArrangement;
    /** 是否使用就近连接（仅琶音练习） */
    voiceLeading?: boolean;
}
/**
 * 练习配置
 */
export interface PracticePreset {
    /** 配置名称 */
    name: string;
    /** 练习项列表 */
    exercises: PracticeExercise[];
    /** 是否随机顺序 */
    randomOrder: boolean;
    /** 随机抽取数量（0 表示全部） */
    randomCount: number;
}
/**
 * 练习进度记录
 */
export interface PracticeRecord {
    /** 记录 ID */
    id: string;
    /** 用户 ID */
    userId: string;
    /** 练习配置名称 */
    presetName: string;
    /** 练习时间 */
    timestamp: number;
    /** 练习时长（秒） */
    duration: number;
    /** 完成的练习项数量 */
    completedCount: number;
    /** 总练习项数量 */
    totalCount: number;
}
/**
 * 练习会话状态
 */
export interface PracticeSession {
    /** 当前练习配置 */
    preset: PracticePreset;
    /** 当前练习项索引 */
    currentIndex: number;
    /** 开始时间 */
    startTime: number;
    /** 是否正在练习 */
    isActive: boolean;
    /** 已完成的练习项 */
    completed: number[];
}
/**
 * 练习模式
 */
export type PracticeMode = 'sequential' | 'random' | 'mixed';
//# sourceMappingURL=practice.d.ts.map