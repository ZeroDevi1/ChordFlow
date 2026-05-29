import { useState, useCallback, useEffect, useRef } from 'react';
import { getNoteFromMidi } from '@chordflow/shared';
import { midiService, MidiNoteEvent, MidiDeviceInfo, MidiInitResult } from '../services';

/** 检测状态 */
export type DetectionStatus = 'idle' | 'listening' | 'correct' | 'wrong' | 'completed';

/** 单个音符的检测结果 */
export interface NoteDetectionResult {
  /** 音符索引 */
  index: number;
  /** 是否正确 */
  isCorrect: boolean;
  /** 用户弹奏的音符名称（可能是错误的） */
  playedNoteName?: string;
}

/** useMidiDetection Hook 的参数 */
interface UseMidiDetectionOptions {
  /** 期望的音符列表（MIDI 音符号数组） */
  expectedNotes: number[];
  /** 是否启用严格顺序检测 */
  strictOrder?: boolean;
  /** 八度容差（0 = 忽略八度，1 = ±1 八度，-1 = 严格八度） */
  octaveTolerance?: number;
  /** 防抖时间（毫秒） */
  debounceMs?: number;
  /** 是否启用检测 */
  enabled?: boolean;
}

/** useMidiDetection Hook 的返回值 */
interface UseMidiDetectionReturn {
  /** 当前检测状态 */
  status: DetectionStatus;
  /** 当前待检测的音符索引 */
  currentIndex: number;
  /** 检测结果列表 */
  results: NoteDetectionResult[];
  /** 设备列表 */
  devices: MidiDeviceInfo[];
  /** 当前选中的设备 */
  selectedDevice: MidiDeviceInfo | null;
  /** 是否已初始化 */
  isInitialized: boolean;
  /** 初始化错误类型 */
  initError: MidiInitResult | null;
  /** 初始化 MIDI 服务 */
  initialize: () => Promise<boolean>;
  /** 选择设备 */
  selectDevice: (deviceId: string) => void;
  /** 重置检测状态 */
  reset: () => void;
}

/**
 * MIDI 检测 Hook
 * 检测用户弹奏的音符是否与期望的音符匹配
 */
export function useMidiDetection({
  expectedNotes,
  octaveTolerance = 0,
  debounceMs = 100,
  enabled = true,
}: UseMidiDetectionOptions): UseMidiDetectionReturn {
  // 状态
  const [status, setStatus] = useState<DetectionStatus>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<NoteDetectionResult[]>([]);
  const [devices, setDevices] = useState<MidiDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<MidiDeviceInfo | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<MidiInitResult | null>(null);

  // 引用
  const debounceTimerRef = useRef<number | null>(null);
  const lastNoteTimeRef = useRef(0);
  const expectedNotesRef = useRef(expectedNotes);

  // 更新期望音符引用
  useEffect(() => {
    expectedNotesRef.current = expectedNotes;
  }, [expectedNotes]);

  /**
   * 比较两个音符是否匹配（考虑八度容差）
   */
  const compareNotes = useCallback(
    (playedMidi: number, expectedMidi: number): boolean => {
      // 获取音符名称（不含八度）
      const playedNote = getNoteFromMidi(playedMidi);
      const expectedNote = getNoteFromMidi(expectedMidi);

      // 忽略八度容差：只比较音名
      if (octaveTolerance === 0) {
        return playedNote.name === expectedNote.name;
      }

      // 严格八度：必须完全匹配
      if (octaveTolerance === -1) {
        return playedMidi === expectedMidi;
      }

      // 灵活八度：允许 ±octaveTolerance 范围
      const octaveDiff = Math.abs(playedNote.octave - expectedNote.octave);
      return playedNote.name === expectedNote.name && octaveDiff <= octaveTolerance;
    },
    [octaveTolerance]
  );

  /**
   * 处理 MIDI 音符事件
   */
  const handleNoteEvent = useCallback(
    (event: MidiNoteEvent) => {
      if (!enabled || status === 'completed') return;

      // 防抖处理
      const now = event.timestamp;
      if (now - lastNoteTimeRef.current < debounceMs) {
        return;
      }
      lastNoteTimeRef.current = now;

      const expectedNotes = expectedNotesRef.current;
      if (expectedNotes.length === 0) return;

      // 获取当前待检测的音符索引
      const targetIndex = currentIndex;
      if (targetIndex >= expectedNotes.length) {
        setStatus('completed');
        return;
      }

      const expectedMidi = expectedNotes[targetIndex];
      const isCorrect = compareNotes(event.note, expectedMidi);

      // 记录检测结果
      const result: NoteDetectionResult = {
        index: targetIndex,
        isCorrect,
        playedNoteName: getNoteFromMidi(event.note).name,
      };

      setResults((prev) => [...prev, result]);

      if (isCorrect) {
        setStatus('correct');
        // 正确后前进到下一个音符
        const nextIndex = targetIndex + 1;
        if (nextIndex >= expectedNotes.length) {
          setCurrentIndex(nextIndex);
          setStatus('completed');
        } else {
          setCurrentIndex(nextIndex);
          // 短暂显示正确状态后恢复监听
          setTimeout(() => {
            setStatus('listening');
          }, 200);
        }
      } else {
        setStatus('wrong');
        // 错误后自动前进到下一个音符
        const nextIndex = targetIndex + 1;
        if (nextIndex >= expectedNotes.length) {
          setCurrentIndex(nextIndex);
          setStatus('completed');
        } else {
          setCurrentIndex(nextIndex);
          // 短暂显示错误状态后恢复监听
          setTimeout(() => {
            setStatus('listening');
          }, 300);
        }
      }
    },
    [enabled, status, currentIndex, compareNotes, debounceMs]
  );

  /**
   * 初始化 MIDI 服务
   */
  const initialize = useCallback(async (): Promise<boolean> => {
    const result = await midiService.initialize();
    const success = result === 'success';
    setIsInitialized(success);
    setInitError(success ? null : result);

    if (success) {
      // 获取设备列表
      setDevices(midiService.getDevices());
      setSelectedDevice(midiService.getSelectedDevice());

      // 监听设备变化
      midiService.onDeviceChange((newDevices) => {
        setDevices(newDevices);
        setSelectedDevice(midiService.getSelectedDevice());
      });
    }

    return success;
  }, []);

  /**
   * 选择 MIDI 设备
   */
  const selectDevice = useCallback(
    (deviceId: string) => {
      midiService.selectDevice(deviceId);
      setSelectedDevice(midiService.getSelectedDevice());
      // 开始监听
      setStatus('listening');
    },
    []
  );

  /**
   * 重置检测状态
   */
  const reset = useCallback(() => {
    setCurrentIndex(0);
    setResults([]);
    setStatus('idle');
  }, []);

  // 监听 MIDI 音符事件
  useEffect(() => {
    if (!enabled || !isInitialized) return;

    const unsubscribe = midiService.onNoteEvent(handleNoteEvent);
    return unsubscribe;
  }, [enabled, isInitialized, handleNoteEvent]);

  // 当期望音符变化时重置
  useEffect(() => {
    reset();
  }, [expectedNotes, reset]);

  // 当启用状态变化时更新状态
  useEffect(() => {
    if (enabled && isInitialized && selectedDevice) {
      setStatus('listening');
    } else if (!enabled) {
      setStatus('idle');
    }
  }, [enabled, isInitialized, selectedDevice]);

  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    status,
    currentIndex,
    results,
    devices,
    selectedDevice,
    isInitialized,
    initError,
    initialize,
    selectDevice,
    reset,
  };
}
