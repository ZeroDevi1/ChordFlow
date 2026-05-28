import { createContext, useContext, useReducer, useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  TimeSignature,
  SubdivisionType,
  BeatSubdivision,
  MultiMeasureArrangement,
  COMMON_TIME_SIGNATURES,
  getBeatsPerMeasure,
} from '@chordflow/shared';

// ==================== 类型定义 ====================

/** 节拍器状态 */
interface MetronomeState {
  /** 当前 BPM */
  bpm: number;
  /** 当前拍号 */
  timeSignature: TimeSignature;
  /** 当前细分类型 */
  subdivision: SubdivisionType;
  /** 混合编排配置（仅 subdivision='mixed' 时使用，单小节模式） */
  mixedArrangement: BeatSubdivision[];
  /** 多小节编排配置（仅 subdivision='mixed' 时使用） */
  multiMeasureArrangement: MultiMeasureArrangement | null;
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 当前拍位（从 1 开始） */
  currentBeat: number;
  /** 当前小节索引（多小节编排时使用） */
  currentMeasureIndex: number;
}

/** 节拍器 Action 类型 */
type MetronomeAction =
  | { type: 'SET_BPM'; payload: number }
  | { type: 'SET_TIME_SIGNATURE'; payload: TimeSignature }
  | { type: 'SET_SUBDIVISION'; payload: SubdivisionType }
  | { type: 'SET_MIXED_ARRANGEMENT'; payload: BeatSubdivision[] }
  | { type: 'SET_MULTI_MEASURE_ARRANGEMENT'; payload: MultiMeasureArrangement | null }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_CURRENT_BEAT'; payload: number }
  | { type: 'SET_CURRENT_MEASURE'; payload: number }
  | { type: 'RESET' };

/** 节拍器 Context 类型 */
interface MetronomeContextType {
  /** 当前状态 */
  state: MetronomeState;
  /** 设置 BPM */
  setBpm: (bpm: number) => void;
  /** 设置拍号 */
  setTimeSignature: (ts: TimeSignature) => void;
  /** 设置细分类型 */
  setSubdivision: (subdivision: SubdivisionType) => void;
  /** 设置混合编排（单小节模式） */
  setMixedArrangement: (arrangement: BeatSubdivision[]) => void;
  /** 设置多小节编排 */
  setMultiMeasureArrangement: (arrangement: MultiMeasureArrangement | null) => void;
  /** 切换播放/停止 */
  togglePlay: () => void;
  /** 开始播放 */
  startPlay: () => void;
  /** 停止播放 */
  stopPlay: () => void;
  /** 获取每小节总拍数 */
  getBeatsPerMeasure: () => number;
  /** 小节完成回调注册 */
  onMeasureComplete: (callback: () => void) => () => void;
}

// ==================== 初始状态 ====================

const initialState: MetronomeState = {
  bpm: 120,
  timeSignature: COMMON_TIME_SIGNATURES[0], // 4/4
  subdivision: 'basic',
  mixedArrangement: [],
  multiMeasureArrangement: null,
  isPlaying: false,
  currentBeat: 0,
  currentMeasureIndex: 0,
};

// ==================== Reducer ====================

function metronomeReducer(state: MetronomeState, action: MetronomeAction): MetronomeState {
  switch (action.type) {
    case 'SET_BPM':
      return { ...state, bpm: action.payload };
    case 'SET_TIME_SIGNATURE':
      return { ...state, timeSignature: action.payload };
    case 'SET_SUBDIVISION':
      return { ...state, subdivision: action.payload };
    case 'SET_MIXED_ARRANGEMENT':
      return { ...state, mixedArrangement: action.payload };
    case 'SET_MULTI_MEASURE_ARRANGEMENT':
      return { ...state, multiMeasureArrangement: action.payload };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload, currentBeat: action.payload ? state.currentBeat : 0 };
    case 'SET_CURRENT_BEAT':
      return { ...state, currentBeat: action.payload };
    case 'SET_CURRENT_MEASURE':
      return { ...state, currentMeasureIndex: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// ==================== Context ====================

const MetronomeContext = createContext<MetronomeContextType | null>(null);

// ==================== Provider ====================

interface MetronomeProviderProps {
  children: ReactNode;
}

/**
 * 节拍器全局状态 Provider
 * 管理节拍器的播放、BPM、拍号、细分等状态
 */
export function MetronomeProvider({ children }: MetronomeProviderProps) {
  const [state, dispatch] = useReducer(metronomeReducer, initialState);
  
  // 音频上下文引用
  const audioContextRef = useRef<AudioContext | null>(null);
  // 定时器引用
  const timerRef = useRef<number | null>(null);
  // 拍计数器引用
  const beatCountRef = useRef(0);
  // 小节完成回调列表
  const measureCompleteCallbacksRef = useRef<Set<() => void>>(new Set());

  // 初始化音频上下文
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  // 播放节拍音效（音量放大 3 倍）
  const playBeat = useCallback((isAccent: boolean) => {
    const ctx = initAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // 强拍音调更高，音量放大 3 倍（原 0.5/0.3 → 1.0/0.9，上限 1.0）
    oscillator.frequency.value = isAccent ? 1000 : 800;
    oscillator.type = 'sine';
    
    gainNode.gain.value = isAccent ? 1.0 : 0.9;
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }, [initAudioContext]);

  // 计算每拍间隔（毫秒）
  const getBeatInterval = useCallback(() => {
    const beatsPerSecond = state.bpm / 60;
    let subdivisionMultiplier = 1;
    
    if (state.subdivision === 'mixed' && state.mixedArrangement.length > 0) {
      // 混合模式：计算平均每拍间隔
      const totalSubBeats = state.mixedArrangement.reduce((total, beat) => {
        switch (beat.subdivision) {
          case 'eighth': return total + 2;
          case 'triplet': return total + 3;
          default: return total + 1;
        }
      }, 0);
      const avgMultiplier = totalSubBeats / state.mixedArrangement.length;
      return 1000 / (beatsPerSecond * avgMultiplier);
    }
    
    switch (state.subdivision) {
      case 'eighth':
        subdivisionMultiplier = 2;
        break;
      case 'triplet':
        subdivisionMultiplier = 3;
        break;
      case 'basic':
      default:
        subdivisionMultiplier = 1;
    }
    
    return 1000 / (beatsPerSecond * subdivisionMultiplier);
  }, [state.bpm, state.subdivision, state.mixedArrangement]);

  // 获取每小节总拍数
  const getBeatsPerMeasureValue = useCallback(() => {
    return getBeatsPerMeasure({
      timeSignature: state.timeSignature,
      subdivision: state.subdivision,
      mixedArrangement: state.mixedArrangement,
    });
  }, [state.timeSignature, state.subdivision, state.mixedArrangement]);

  // 触发小节完成回调
  const triggerMeasureComplete = useCallback(() => {
    measureCompleteCallbacksRef.current.forEach(callback => callback());
  }, []);

  // 注册小节完成回调
  const onMeasureComplete = useCallback((callback: () => void) => {
    measureCompleteCallbacksRef.current.add(callback);
    return () => {
      measureCompleteCallbacksRef.current.delete(callback);
    };
  }, []);

  // 开始播放
  const startPlay = useCallback(() => {
    if (state.isPlaying) return;
    
    const interval = getBeatInterval();
    const totalBeats = getBeatsPerMeasureValue();
    let beat = 0;
    
    // 立即播放第一拍
    playBeat(true);
    dispatch({ type: 'SET_CURRENT_BEAT', payload: 1 });
    beat = 1;
    
    timerRef.current = window.setInterval(() => {
      const isAccent = beat % totalBeats === 0;
      
      playBeat(isAccent);
      dispatch({ type: 'SET_CURRENT_BEAT', payload: (beat % totalBeats) + 1 });
      beat++;
      
      // 检测小节完成
      if (beat % totalBeats === 0) {
        triggerMeasureComplete();
      }
    }, interval);
    
    dispatch({ type: 'SET_PLAYING', payload: true });
  }, [state.isPlaying, getBeatInterval, playBeat, getBeatsPerMeasureValue, triggerMeasureComplete]);

  // 停止播放
  const stopPlay = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    dispatch({ type: 'SET_PLAYING', payload: false });
    dispatch({ type: 'SET_CURRENT_BEAT', payload: 0 });
    beatCountRef.current = 0;
  }, []);

  // 切换播放/停止
  const togglePlay = useCallback(() => {
    if (state.isPlaying) {
      stopPlay();
    } else {
      startPlay();
    }
  }, [state.isPlaying, startPlay, stopPlay]);

  // 设置 BPM
  const setBpm = useCallback((bpm: number) => {
    dispatch({ type: 'SET_BPM', payload: Math.max(40, Math.min(208, bpm)) });
  }, []);

  // 设置拍号
  const setTimeSignature = useCallback((ts: TimeSignature) => {
    dispatch({ type: 'SET_TIME_SIGNATURE', payload: ts });
  }, []);

  // 设置细分类型
  const setSubdivision = useCallback((subdivision: SubdivisionType) => {
    dispatch({ type: 'SET_SUBDIVISION', payload: subdivision });
  }, []);

  // 设置混合编排
  const setMixedArrangement = useCallback((arrangement: BeatSubdivision[]) => {
    dispatch({ type: 'SET_MIXED_ARRANGEMENT', payload: arrangement });
  }, []);

  // 设置多小节编排
  const setMultiMeasureArrangement = useCallback((arrangement: MultiMeasureArrangement | null) => {
    dispatch({ type: 'SET_MULTI_MEASURE_ARRANGEMENT', payload: arrangement });
  }, []);

  // 参数变化时重启节拍器
  useEffect(() => {
    if (state.isPlaying) {
      stopPlay();
      // 延迟重启，确保状态已更新
      const timeout = setTimeout(() => {
        startPlay();
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [state.bpm, state.timeSignature, state.subdivision, state.mixedArrangement]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const contextValue: MetronomeContextType = {
    state,
    setBpm,
    setTimeSignature,
    setSubdivision,
    setMixedArrangement,
    setMultiMeasureArrangement,
    togglePlay,
    startPlay,
    stopPlay,
    getBeatsPerMeasure: getBeatsPerMeasureValue,
    onMeasureComplete,
  };

  return (
    <MetronomeContext.Provider value={contextValue}>
      {children}
    </MetronomeContext.Provider>
  );
}

// ==================== Hook ====================

/**
 * 使用节拍器全局状态
 * 必须在 MetronomeProvider 内部使用
 */
export function useMetronome(): MetronomeContextType {
  const context = useContext(MetronomeContext);
  if (!context) {
    throw new Error('useMetronome 必须在 MetronomeProvider 内部使用');
  }
  return context;
}
