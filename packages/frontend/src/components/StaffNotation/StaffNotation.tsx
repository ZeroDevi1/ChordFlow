import { useEffect, useRef } from 'react';
import { Note, NoteName } from '@chordflow/shared';
import { Renderer, Stave, StaveNote, Voice, Formatter, Beam, Accidental, Annotation, StaveConnector, Barline, BarlineType } from 'vexflow';
import './StaffNotation.css';

/** 音符时值类型 */
export type NoteDuration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

/** 带时值的音符 */
export interface NoteWithDuration {
  note: Note;
  duration: NoteDuration;
}

/** 低音和弦 */
export interface BassChord {
  notes: Note[];
  name: string;
  duration?: NoteDuration;
}

/** 低音谱表舒适范围：G2 (MIDI 43) 到 A3 (MIDI 57) */
const BASS_STAFF_LOW = 43;  // G2
const BASS_STAFF_HIGH = 57; // A3

/**
 * 调整左手和弦八度，使音符保持在低音谱表舒适范围内。
 *
 * 规则：
 * - 若 2 个及以上音符超出谱表上方（A3 以上），整体降低一个八度
 * - 若 2 个及以上音符超出谱表下方（G2 以下），整体升高一个八度
 */
export function adjustBassChordOctave(chord: BassChord): BassChord {
  const aboveCount = chord.notes.filter(n => n.midiNumber > BASS_STAFF_HIGH).length;
  const belowCount = chord.notes.filter(n => n.midiNumber < BASS_STAFF_LOW).length;

  let shift = 0;
  if (aboveCount >= 2) shift = -1;
  else if (belowCount >= 2) shift = 1;

  if (shift === 0) return chord;

  return {
    ...chord,
    notes: chord.notes.map(n => ({
      name: n.name,
      octave: n.octave + shift,
      midiNumber: n.midiNumber + shift * 12,
    })),
  };
}

/** StaffNotation 组件属性 */
interface StaffNotationProps {
  /** 高音谱音符列表 */
  notes: NoteWithDuration[];
  /** 低音谱和弦列表 */
  bassChords?: BassChord[];
  /** 根音名称（用于显示调号） */
  rootName?: NoteName;
  /** 谱面调号名称 */
  keySignature?: string;
  /** 每小节拍数 */
  beatsPerMeasure?: number;
  /** 每行展示的小节数 */
  measuresPerRow?: number;
  /** 是否显示逐音临时升降号；使用调号时应关闭 */
  showInlineAccidentals?: boolean;
  /** 是否移除残留八分音符旗尾；PDF 音阶谱面中所有八分音符均使用连音梁 */
  suppressEighthFlags?: boolean;
  /** 渲染宽度 */
  width?: number;
  /** 渲染高度 */
  height?: number;
}

/** 时值到 VexFlow duration 的映射 */
const DURATION_MAP: Record<NoteDuration, string> = {
  whole: 'w',
  half: 'h',
  quarter: 'q',
  eighth: '8',
  sixteenth: '16',
};

/** 时值对应的拍数（以四分音符为一拍） */
const DURATION_BEATS: Record<NoteDuration, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
};

/**
 * 将音符名称转换为 VexFlow 格式
 * VexFlow 格式: "c/4", "c#/4", "d/4" 等
 */
function toVexFlowKey(note: Note): string {
  const nameMap: Record<NoteName, string> = {
    'C': 'c', 'C#': 'c#', 'Db': 'db', 'D': 'd', 'D#': 'd#', 'Eb': 'eb', 'E': 'e',
    'F': 'f', 'F#': 'f#', 'Gb': 'gb', 'G': 'g', 'G#': 'g#', 'Ab': 'ab', 'A': 'a',
    'A#': 'a#', 'Bb': 'bb', 'B': 'b', 'Cb': 'cb',
  };
  return `${nameMap[note.name]}/${note.octave}`;
}

/**
 * 判断音符是否需要显示升降号
 */
function needsAccidental(noteName: NoteName): boolean {
  return noteName.includes('#') || noteName.includes('b');
}

/**
 * 获取音符拼写对应的临时升降号。
 */
function getAccidental(noteName: NoteName): '#' | 'b' | null {
  if (noteName.includes('#')) return '#';
  if (noteName.includes('b')) return 'b';
  return null;
}
/**
 * 估算调号占用的额外宽度（每行左侧一次）。
 * 每个升降号约 12px，基础 20px。
 */
function getKeySignatureWidth(keySignature?: string): number {
  if (!keySignature) return 0;
  const sharps = ['G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
  const flats = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
  const sharpCount = sharps.indexOf(keySignature);
  const flatCount = flats.indexOf(keySignature);
  const count = sharpCount >= 0 ? sharpCount + 1 : flatCount >= 0 ? flatCount + 1 : 0;
  if (count <= 0) return 0;
  return 20 + count * 12;
}

/**
 * 将音符列表按小节分割
 */
function splitIntoMeasures(notes: NoteWithDuration[], beatsPerMeasure: number): NoteWithDuration[][] {
  const measures: NoteWithDuration[][] = [];
  let currentMeasure: NoteWithDuration[] = [];
  let currentBeats = 0;

  for (const note of notes) {
    const noteBeats = DURATION_BEATS[note.duration];
    if (currentBeats + noteBeats > beatsPerMeasure && currentMeasure.length > 0) {
      measures.push(currentMeasure);
      currentMeasure = [];
      currentBeats = 0;
    }
    currentMeasure.push(note);
    currentBeats += noteBeats;
  }
  if (currentMeasure.length > 0) {
    measures.push(currentMeasure);
  }
  return measures;
}

/**
 * 五线谱渲染组件（大谱表 Grand Staff 布局）
 * 高音谱显示右手音阶，低音谱显示左手七和弦，中间用大括号连接
 */
export function StaffNotation({
  notes,
  bassChords = [],
  keySignature,
  beatsPerMeasure = 4,
  measuresPerRow = 4,
  showInlineAccidentals = true,
  suppressEighthFlags = false,
  width = 520,
}: StaffNotationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || notes.length === 0) return;
    containerRef.current.innerHTML = '';

    const measures = splitIntoMeasures(notes, beatsPerMeasure);
    const measureCount = measures.length;

    // 使用容器实际宽度
    const containerWidth = containerRef.current.clientWidth || width;
    // 每小节最少宽度：8 个八分音符需要足够呼吸空间，避免符尾折返。
    const minMeasureWidth = 220;
    // 每行最多小节数：音阶练习按 PDF 固定为 4 小节一行。
    // 调号额外宽度（每行左侧一次）
    const keySigExtraWidth = getKeySignatureWidth(keySignature);
    // 每行最多小节数：考虑调号占用后容器内合理换行
    const maxMeasuresPerRow = Math.max(1, Math.min(measureCount, measuresPerRow, Math.floor((containerWidth - keySigExtraWidth) / minMeasureWidth) || 1));
    const rows = Math.ceil(measureCount / maxMeasuresPerRow);

    // 每行高度：给右手低位音和左手和弦保留垂直空间，避免 G 谱表与 F 谱表互相压住。
    const rowHeight = 280;
    const totalHeight = rows * rowHeight + 30;

    // SVG 宽度 = 容器宽度（每行独立渲染）
    const svgWidth = containerWidth;

    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    renderer.resize(svgWidth, totalHeight);
    const context = renderer.getContext();

    // 按行渲染大谱表
    for (let row = 0; row < rows; row++) {
      const startMeasure = row * maxMeasuresPerRow;
      const endMeasure = Math.min(startMeasure + maxMeasuresPerRow, measureCount);
      const rowMeasureCount = endMeasure - startMeasure;

      const rowY = 15 + row * rowHeight;
      const trebleY = rowY;
      const bassY = rowY + 145;

      // 计算该行宽度：每小节最小宽度 + 调号额外宽度（每行左侧）
      const rowContentWidth = rowMeasureCount * minMeasureWidth + keySigExtraWidth;
      const staveWidth = Math.min(rowContentWidth, svgWidth - 40);
      const startX = (svgWidth - staveWidth) / 2;

      // 高音谱
      const trebleStave = new Stave(startX, trebleY, staveWidth);
      if (row === 0) {
        trebleStave.addClef('treble');
        trebleStave.addTimeSignature(`${beatsPerMeasure}/4`);
      }
      if (keySignature) {
        trebleStave.addKeySignature(keySignature);
      }
      trebleStave.setContext(context).draw();

      // 低音谱
      const bassStave = new Stave(startX, bassY, staveWidth);
      if (row === 0) {
        bassStave.addClef('bass');
        bassStave.addTimeSignature(`${beatsPerMeasure}/4`);
      }
      if (keySignature) {
        bassStave.addKeySignature(keySignature);
      }
      bassStave.setContext(context).draw();

      // 大括号连接高音谱和低音谱
      const connector = new StaveConnector(trebleStave, bassStave);
      connector.setType('brace');
      connector.setContext(context);
      connector.draw();

      // 收集该行的高音音符，同时记录每小节的音符索引范围用于单独生成 beam
      const rowTrebleNotes: InstanceType<typeof StaveNote>[] = [];
      const measureNoteRanges: { start: number; end: number }[] = [];
      let rowTotalBeats = 0;

      for (let m = startMeasure; m < endMeasure; m++) {
        const measureNotes = measures[m];
        const rangeStart = rowTrebleNotes.length;
        measureNotes.forEach(({ note, duration }) => {
          const staveNote = new StaveNote({
            keys: [toVexFlowKey(note)],
            duration: DURATION_MAP[duration],
            clef: 'treble',
          });
          if (showInlineAccidentals && needsAccidental(note.name)) {
            const accidental = getAccidental(note.name);
            if (accidental) {
              staveNote.addModifier(new Accidental(accidental));
            }
          }
          rowTrebleNotes.push(staveNote);
        });
        measureNoteRanges.push({ start: rangeStart, end: rowTrebleNotes.length });
        rowTotalBeats += measureNotes.reduce((sum, n) => sum + DURATION_BEATS[n.duration], 0);
      }

      // 收集该行的低音和弦
      const rowBassNotes: InstanceType<typeof StaveNote>[] = [];
      if (bassChords.length > 0) {
        for (let m = startMeasure; m < endMeasure; m++) {
          const chord = bassChords[Math.min(m, bassChords.length - 1)];
          const staveNote = new StaveNote({
            keys: chord.notes.map(toVexFlowKey),
            duration: DURATION_MAP[chord.duration ?? 'whole'], // 默认全音符，覆盖整个小节
            clef: 'bass',
          });
          // 在低音谱表上方标注和弦名称
          if (chord.name) {
            const annotation = new Annotation(chord.name);
            annotation.setVerticalJustification(Annotation.VerticalJustify.TOP);
            staveNote.addModifier(annotation);
          }
          chord.notes.forEach((note, i) => {
            if (showInlineAccidentals && needsAccidental(note.name)) {
              const accidental = getAccidental(note.name);
              if (accidental) {
                staveNote.addModifier(new Accidental(accidental), i);
              }
            }
          });
          rowBassNotes.push(staveNote);
        }
      }

      // 高音 Voice
      if (rowTrebleNotes.length > 0) {
        // 连音梁必须在音符绘制前绑定，否则八分音符 flag 会先画出，视觉上像出现双音尾。
        const rowBeams = measureNoteRanges.flatMap(range => {
          const measureEighths = rowTrebleNotes.slice(range.start, range.end).filter(n => n.getDuration() === '8');
          const groups: InstanceType<typeof Beam>[] = [];

          for (let i = 0; i < measureEighths.length; i += 4) {
            const group = measureEighths.slice(i, i + 4);
            if (group.length >= 2) {
              groups.push(new Beam(group));
            }
          }
          return groups;
        });

        const trebleVoice = new Voice({ numBeats: rowTotalBeats, beatValue: 4 });
        trebleVoice.setStrict(false);
        trebleVoice.addTickables(rowTrebleNotes);
        // 连音梁已通过 new Beam 自动设置 note.beam，shouldDrawFlag() 已返回 false，
        // 无需再将 Beam 加入 Voice tickables（VexFlow 5 类型不兼容）。

        // 低音 Voice（如果有）
        if (rowBassNotes.length > 0) {
          const bassVoice = new Voice({ numBeats: rowTotalBeats, beatValue: 4 });
          bassVoice.setStrict(false);
          bassVoice.addTickables(rowBassNotes);

          // 一起格式化，保证对齐
          const formatter = new Formatter();
          formatter.joinVoices([trebleVoice, bassVoice]).format([trebleVoice, bassVoice], staveWidth - 60);
          trebleVoice.draw(context, trebleStave);
          bassVoice.draw(context, bassStave);
        } else {
          const formatter = new Formatter();
          formatter.joinVoices([trebleVoice]).format([trebleVoice], staveWidth - 60);
          trebleVoice.draw(context, trebleStave);
        }

        // 按小节绘制符尾连线，避免跨小节 beam。
        rowBeams.forEach(b => b.setContext(context).draw());
      }

      // 画小节线（行内分隔）
      if (rowMeasureCount > 1) {
        const noteStartX = trebleStave.getNoteStartX();
        const noteEndX = trebleStave.getNoteEndX();
        const availableWidth = noteEndX - noteStartX;
        for (let i = 1; i < rowMeasureCount; i++) {
          const x = noteStartX + (availableWidth / rowMeasureCount) * i;
          const barline = new Barline(BarlineType.SINGLE);
          barline.drawVerticalBar(trebleStave, x, false);
          barline.drawVerticalBar(bassStave, x, false);
        }
      }
    }

    // 连音梁已通过 new Beam 设置 note.beam，shouldDrawFlag() 自动返回 false，
    // flag 不再被重复绘制，无需事后移除。
    // suppressEighthFlags prop 保留以向后兼容，但内部不再依赖 CSS hack
  }, [notes, bassChords, keySignature, beatsPerMeasure, measuresPerRow, showInlineAccidentals, suppressEighthFlags, width]);

  return (
    <div className="staff-notation">
      <div ref={containerRef} className="vexflow-container" />
    </div>
  );
}
