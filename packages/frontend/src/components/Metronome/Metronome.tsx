import { useState, useEffect, useRef, useCallback } from 'react';
import { TimeSignature, COMMON_TIME_SIGNATURES, SubdivisionType } from '@chordflow/shared';
import './Metronome.css';

/**
 * 节拍器组件
 * 支持 BPM 调节、拍号选择、细分类型选择
 */
export function Metronome() {
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>(COMMON_TIME_SIGNATURES[0]);
  const [subdivision, setSubdivision] = useState<SubdivisionType>('basic');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const beatCountRef = useRef(0);

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
    
    // 强拍音调更高
    oscillator.frequency.value = isAccent ? 1000 : 800;
    oscillator.type = 'sine';
    
    gainNode.gain.value = isAccent ? 0.5 : 0.3;
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }, [initAudioContext]);

  // 计算每拍间隔（毫秒）
  const getBeatInterval = useCallback(() => {
    const beatsPerSecond = bpm / 60;
    let subdivisionMultiplier = 1;
    
    switch (subdivision) {
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
  }, [bpm, subdivision]);

  // 开始/停止节拍器
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      // 停止
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsPlaying(false);
      setCurrentBeat(0);
      beatCountRef.current = 0;
    } else {
      // 开始
      const interval = getBeatInterval();
      let beat = 0;
      
      // 立即播放第一拍
      playBeat(true);
      setCurrentBeat(1);
      beat = 1;
      
      timerRef.current = window.setInterval(() => {
        const totalBeats = getSubdivisionBeats();
        const isAccent = beat % totalBeats === 0;
        
        playBeat(isAccent);
        setCurrentBeat((beat % totalBeats) + 1);
        beat++;
      }, interval);
      
      setIsPlaying(true);
    }
  }, [isPlaying, getBeatInterval, playBeat]);

  // 获取细分后的每小节拍数
  const getSubdivisionBeats = useCallback(() => {
    switch (subdivision) {
      case 'eighth':
        return timeSignature.beatsPerMeasure * 2;
      case 'triplet':
        return timeSignature.beatsPerMeasure * 3;
      case 'basic':
      default:
        return timeSignature.beatsPerMeasure;
    }
  }, [timeSignature, subdivision]);

  // BPM 变化时重新启动节拍器
  useEffect(() => {
    if (isPlaying) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      const interval = getBeatInterval();
      let beat = 0;
      
      timerRef.current = window.setInterval(() => {
        const totalBeats = getSubdivisionBeats();
        const isAccent = beat % totalBeats === 0;
        
        playBeat(isAccent);
        setCurrentBeat((beat % totalBeats) + 1);
        beat++;
      }, interval);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [bpm, timeSignature, subdivision, isPlaying, getBeatInterval, playBeat, getSubdivisionBeats]);

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

  return (
    <div className="metronome">
      <h2>节拍器</h2>
      
      <div className="metronome-display">
        <div className="beat-indicators">
          {Array.from({ length: getSubdivisionBeats() }, (_, i) => (
            <div
              key={i}
              className={`beat-dot ${currentBeat === i + 1 ? 'active' : ''} ${i % (getSubdivisionBeats() / timeSignature.beatsPerMeasure) === 0 ? 'accent' : ''}`}
            />
          ))}
        </div>
      </div>
      
      <div className="metronome-controls">
        <div className="control-group">
          <label htmlFor="bpm">BPM</label>
          <div className="bpm-slider">
            <input
              id="bpm"
              type="range"
              min={40}
              max={208}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
            />
            <span className="bpm-value">{bpm}</span>
          </div>
        </div>
        
        <div className="control-group">
          <label>拍号</label>
          <div className="time-signature-selectors">
            <select
              aria-label="拍号分子"
              value={timeSignature.beatsPerMeasure}
              onChange={(e) => {
                setTimeSignature({ ...timeSignature, beatsPerMeasure: Number(e.target.value) });
              }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((beats) => (
                <option key={beats} value={beats}>{beats}</option>
              ))}
            </select>
            <span className="time-signature-divider">/</span>
            <select
              aria-label="拍号分母"
              value={timeSignature.beatUnit}
              onChange={(e) => {
                setTimeSignature({ ...timeSignature, beatUnit: Number(e.target.value) });
              }}
            >
              {[1, 2, 4, 8, 16].map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="control-group">
          <label htmlFor="subdivision">细分</label>
          <select
            id="subdivision"
            value={subdivision}
            onChange={(e) => setSubdivision(e.target.value as SubdivisionType)}
          >
            <option value="basic">基础拍</option>
            <option value="eighth">半拍（八分音符）</option>
            <option value="triplet">三连音</option>
          </select>
        </div>
        
        <button
          className={`play-button ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlay}
        >
          {isPlaying ? '停止' : '开始'}
        </button>
      </div>
    </div>
  );
}
