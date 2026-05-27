import { Note } from '@chordflow/shared';
import type { NoteDuration, NoteWithDuration, BassChord } from './StaffNotation';

/** 时值到 alphaTex duration 编码的映射 */
const DURATION_TEX: Record<NoteDuration, number> = {
  whole: 1,
  half: 2,
  quarter: 4,
  eighth: 8,
  sixteenth: 16,
};

/**
 * 将 Note 转换为 alphaTex 音符字符串
 * 例: { name: 'C#', octave: 4 } → "C#4"
 */
function noteToTex(note: Note): string {
  return `${note.name}${note.octave}`;
}

/**
 * 将一组音符按时值分割为小节
 */
function splitIntoMeasures(notes: NoteWithDuration[], beatsPerMeasure: number): NoteDuration[][] {
  // 复用 StaffNotation 的分割逻辑，但只保留时值序列
  const measures: NoteDuration[][] = [];
  let current: NoteDuration[] = [];
  let beats = 0;

  const beatsMap: Record<NoteDuration, number> = {
    whole: 4, half: 2, quarter: 1, eighth: 0.5, sixteenth: 0.25,
  };

  for (const { duration } of notes) {
    const noteBeats = beatsMap[duration];
    if (beats + noteBeats > beatsPerMeasure && current.length > 0) {
      measures.push(current);
      current = [];
      beats = 0;
    }
    current.push(duration);
    beats += noteBeats;
  }
  if (current.length > 0) {
    measures.push(current);
  }
  return measures;
}

export interface AlphaTexOptions {
  /** 高音谱音符列表 */
  notes: NoteWithDuration[];
  /** 低音谱和弦列表 */
  bassChords?: BassChord[];
  /** 调号名称 */
  keySignature?: string;
  /** 每小节拍数 */
  beatsPerMeasure?: number;
  /** 是否显示临时升降号（alphaTex 自动处理时关闭） */
  showInlineAccidentals?: boolean;
}

/**
 * 将音符数据转换为 alphaTex 格式字符串。
 *
 * 生成大谱表布局：高音谱（右手音阶）+ 低音谱（左手和弦），
 * 用 \staff 分隔两个谱表，\clef F4 指定低音谱号。
 */
export function toAlphaTex(options: AlphaTexOptions): string {
  const {
    notes,
    bassChords = [],
    keySignature,
    beatsPerMeasure = 4,
  } = options;

  if (notes.length === 0) return '';

  const lines: string[] = [];

  // 头部：拍号（调号移到每个谱表上单独设置）
  lines.push(`\\ts ${beatsPerMeasure} 4`);

  // 高音谱（右手）：逐音符输出
  const trebleNotes = notes.map(({ note, duration }) => {
    const tex = noteToTex(note);
    const dur = DURATION_TEX[duration];
    return `${tex}.${dur}`;
  });

  // 将高音谱音符按小节分割，插入小节线
  const measures = splitIntoMeasures(notes, beatsPerMeasure);
  let offset = 0;
  const trebleLines: string[] = [];
  for (const measure of measures) {
    const measureNotes = trebleNotes.slice(offset, offset + measure.length);
    trebleLines.push(measureNotes.join(' ') + ' |');
    offset += measure.length;
  }

  // 低音谱（左手）：每小节一个和弦（全音符或指定时值）
  const bassLines: string[] = [];
  if (bassChords.length > 0) {
    for (let i = 0; i < measures.length; i++) {
      const chord = bassChords[Math.min(i, bassChords.length - 1)];
      const dur = DURATION_TEX[chord.duration ?? 'whole'];
      // 和弦语法：(C3 E3 G3).1 — 括号内多个音符表示同时发声
      const chordNotes = chord.notes.map(noteToTex).join(' ');
      bassLines.push(`(${chordNotes}).${dur} |`);
    }
  }

  // 组装 alphaTex：大谱表
  // 每个谱表独立设置调号，避免只有高音谱显示调号
  lines.push('\\track "Piano"');
  lines.push(`  \\staff{score}${keySignature ? ` \\ks ${keySignature}` : ''}`);
  lines.push('  ' + trebleLines.join(' '));

  if (bassLines.length > 0) {
    lines.push(`  \\staff{score} \\clef F4${keySignature ? ` \\ks ${keySignature}` : ''}`);
    lines.push('  ' + bassLines.join(' '));
  }

  return lines.join('\n');
}
