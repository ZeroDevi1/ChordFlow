import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  TimeSignature, 
  COMMON_TIME_SIGNATURES, 
  SubdivisionType 
} from '@chordflow/shared';
import './MetronomeConfig.css';

interface MetronomeConfigProps {
  /** 初始 BPM */
  initialBpm?: number;
  /** 初始拍号 */
  initialTimeSignature?: TimeSignature;
  /** 初始细分类型 */
  initialSubdivision?: SubdivisionType;
  /** BPM 变化回调 */
  onBpmChange?: (bpm: number) => void;
  /** 拍号变化回调 */
  onTimeSignatureChange?: (ts: TimeSignature) => void;
  /** 小节完成回调 */
  onMeasureComplete?: () => void;
}

/**
 * 节拍器配置组件（嵌入式）
 * 用于在练习页面中配置节拍器参数
 */
export function MetronomeConfig({
  initialBpm = 120,
  initialTimeSignature = COMMON_TIME_SIGNATURES[0],
  initialSubdivision = 'basic',
  onBpmChange,
  onTimeSignatureChange,
  onMeasureComplete
}: MetronomeConfigProps) {
  const [bpm, setBpm] = useState(initialBpm);
  const [timeSignature, setTimeSignature] = useState(initialTimeSignature);
  const [subdivision, setSubdivision] = useState<SubdivisionType>(initialSubdivision);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [beatCountInMeasure, setBeatCountInMeasure] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  // 初始化音频上下文
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  // 播放节拍音效
  const playBeat = useCallback((isAccent: boolean) => {
    const ctx = initAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = isAccent ? 1000 : 800;
    oscillator.type = 'sine';
    
    gainNode.gain.value = isAccent ? 0.5 : 0.3;
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }, [initAudioContext]);

  // 计算每拍间隔
  const getBeatInterval = useCallback(() => {
    const beatsPerSecond = bpm / 60;
    let multiplier = 1;
    if (subdivision === 'eighth') multiplier = 2;
    if (subdivision === 'triplet') multiplier = 3;
    return 1000 / (beatsPerSecond * multiplier);
  }, [bpm, subdivision]);

  // 获取每小节拍数
  const getBeatsPerMeasure = useCallback(() => {
    let multiplier = 1;
    if (subdivision === 'eighth') multiplier = 2;
    if (subdivision === 'triplet') multiplier = 3;
    return timeSignature.beatsPerMeasure * multiplier;
  }, [timeSignature, subdivision]);

  // 切换播放状态
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsPlaying(false);
      setCurrentBeat(0);
      setBeatCountInMeasure(0);
    } else {
      const interval = getBeatInterval();
      let beat = 0;
      
      playBeat(true);
      setCurrentBeat(1);
      setBeatCountInMeasure(1);
      beat = 1;
      
      timerRef.current = window.setInterval(() => {
        const totalBeats = getBeatsPerMeasure();
        const isAccent = beat % totalBeats === 0;
        playBeat(isAccent);
        setCurrentBeat((beat % totalBeats) + 1);
        beat++;
        
        // 检测小节完成
        if (beat % totalBeats === 0) {
          onMeasureComplete?.();
        }
      }, interval);
      
      setIsPlaying(true);
    }
  }, [isPlaying, getBeatInterval, playBeat, getBeatsPerMeasure, onMeasureComplete]);

  // 参数变化时重启节拍器
  useEffect(() => {
    if (isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      
      const interval = getBeatInterval();
      let beat = 0;
      
      timerRef.current = window.setInterval(() => {
        const totalBeats = getBeatsPerMeasure();
        const isAccent = beat % totalBeats === 0;
        playBeat(isAccent);
        setCurrentBeat((beat % totalBeats) + 1);
        beat++;
      }, interval);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [bpm, timeSignature, subdivision, isPlaying, getBeatInterval, playBeat, getBeatsPerMeasure]);

  // 通知外部 BPM 变化
  useEffect(() => {
    onBpmChange?.(bpm);
  }, [bpm, onBpmChange]);

  // 通知外部拍号变化
  useEffect(() => {
    onTimeSignatureChange?.(timeSignature);
  }, [timeSignature, onTimeSignatureChange]);

  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return (
    <div className="metronome-config">
      <div className="config-header">
        <h4>节拍器</h4>
        <button 
          className={`play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlay}
        >
          {isPlaying ? '■' : '▶'}
        </button>
      </div>
      
      <div className="config-body">
        <div className="config-row">
          <label>BPM</label>
          <input
            type="range"
            min={40}
            max={208}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
          />
          <span className="bpm-display">{bpm}</span>
        </div>
        
        <div className="config-row">
          <label>拍号</label>
          <div className="time-sig-inputs">
            <select
              value={timeSignature.beatsPerMeasure}
              onChange={(e) => {
                const newTs = { ...timeSignature, beatsPerMeasure: Number(e.target.value) };
                setTimeSignature(newTs);
              }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>/</span>
            <select
              value={timeSignature.beatUnit}
              onChange={(e) => {
                const newTs = { ...timeSignature, beatUnit: Number(e.target.value) };
                setTimeSignature(newTs);
              }}
            >
              {[1, 2, 4, 8, 16].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="config-row">
          <label>细分</label>
          <select
            value={subdivision}
            onChange={(e) => setSubdivision(e.target.value as SubdivisionType)}
          >
            <option value="basic">基础拍</option>
            <option value="eighth">八分音符</option>
            <option value="triplet">三连音</option>
          </select>
        </div>
        
        {isPlaying && (
          <div className="beat-indicator">
            {Array.from({ length: getBeatsPerMeasure() }, (_, i) => (
              <div
                key={i}
                className={`beat-dot ${currentBeat === i + 1 ? 'active' : ''} ${
                  i % (getBeatsPerMeasure() / timeSignature.beatsPerMeasure) === 0 ? 'accent' : ''
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
