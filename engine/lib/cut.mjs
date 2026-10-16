// Render the edit decision list with FFmpeg (one pass: trim/atrim per kept segment →
// concat), then remap the transcript onto the cut timeline for captions and overlays.
import fs from "node:fs";
import path from "node:path";
import { run, readJson, writeJson, writeText, saveMeta, probe, srtTime, round3, bareWord, log, ok, warn, rel, UserError } from "./util.mjs";
import { transcriptText } from "./transcribe.mjs";

const FADE = 0.006; // seconds of audio fade at every join — removes clicks, inaudible otherwise

function buildFilter(keep, fpsStr, { speed = 1, voiceChain = null } = {}) {
  const n = keep.length;
  const lines = [
    `[0:v]fps=${fpsStr},format=yuv420p,split=${n}${keep.map((_, i) => `[vs${i}]`).join("")};`,
    `[0:a]aresample=48000,asplit=${n}${keep.map((_, i) => `[as${i}]`).join("")};`,
  ];
  keep.forEach((k, i) => {
    const s = k.start.toFixed(6);
    const e = k.end.toFixed(6);
    const fadeOut = Math.max(0, k.end - k.start - FADE).toFixed(6);
    lines.push(`[vs${i}]trim=start=${s}:end=${e},setpts=PTS-STARTPTS[v${i}];`);
    lines.push(
      `[as${i}]atrim=start=${s}:end=${e},asetpts=PTS-STARTPTS,` +
        `afade=t=in:st=0:d=${FADE},afade=t=out:st=${fadeOut}:d=${FADE}[a${i}];`,
    );
  });
  lines.push(`${keep.map((_, i) => `[v${i}][a${i}]`).join("")}concat=n=${n}:v=1:a=1[vcat][acat];`);
  // Optional global speed-up (pitch-preserving) and voice processing (compression etc.).
  const vPost = speed !== 1 ? `setpts=PTS/${speed},fps=${fpsStr}` : "null";
  const aPost = [speed !== 1 ? `atempo=${speed}` : null, voiceChain].filter(Boolean).join(",") || "anull";
  lines.push(`[vcat]${vPost}[vout];`);
  lines.push(`[acat]${aPost}[aout]`);
  return lines.join("\n");
}

function videoEncoderArgs(encoder, cfg, fps) {
  const gop = ["-g", String(Math.max(1, Math.round(fps * 2)))]; // 2 s GOP → snappy scrubbing in Studio
  if (encoder === "h264_nvenc") {
    return ["-c:v", "h264_nvenc", "-preset", "p5", "-tune", "hq", "-rc", "vbr", "-cq", String(cfg.nvencCq), "-b:v", "0", "-profile:v", "high", ...gop];
  }
  return ["-c:v", "libx264", "-preset", "medium", "-crf", String(cfg.crf), "-profile:v", "high", ...gop];
}

async function encode(project, edl, encoder) {
  const { fps } = project.meta.probe;
  const tmp = project.footage.replace(/\.mp4$/, ".tmp.mp4");
  const args = [
    "-hide_banner", "-y", "-loglevel", "error", "-stats",
    "-i", project.sourceFile,
    "-/filter_complex", project.cutFilter,
    "-map", "[vout]", "-map", "[aout]",
    ...videoEncoderArgs(encoder, project.config.cut, fps),
    "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "256k", "-ar", "48000",
    "-movflags", "+faststart",
    tmp,
  ];
  await run("ffmpeg", args);
  try {
    fs.rmSync(project.footage, { force: true });
    fs.renameSync(tmp, project.footage);
  } catch (err) {
    throw new UserError(
      `Couldn't replace ${rel(project.footage)} (${err.code}). Close any HyperFrames preview/Studio or player using it, then re-run.`,
    );
  }
}

export async function cut(project, { encoder: encoderOverride } = {}) {
  if (!fs.existsSync(project.edl)) throw new UserError("No edit plan yet — run: td plan " + project.name);
  const edl = readJson(project.edl);
  if (edl.source !== project.meta.source) throw new UserError("edl.json was planned for a different source — re-run plan.");
  fs.mkdirSync(path.dirname(project.footage), { recursive: true });
  const speed = Number(project.config.cut.speed) || 1;
  writeText(project.cutFilter, buildFilter(edl.keep, edl.fps, { speed, voiceChain: project.config.cut.voiceChain }));
  const expected = edl.outputDuration / speed;

  let encoder = encoderOverride ?? project.config.cut.encoder;
  if (encoder === "auto") encoder = "h264_nvenc";
  log(`Cutting ${edl.keep.length} segments → ${rel(project.footage)} (${encoder})`);
  const started = Date.now();
  try {
    await encode(project, edl, encoder);
  } catch (err) {
    if (encoder !== "h264_nvenc" || err instanceof UserError) throw err;
    warn("NVIDIA encoder unavailable — falling back to libx264 (CPU).");
    encoder = "libx264";
    await encode(project, edl, encoder);
  }

  const out = await probe(project.footage);
  if (Math.abs(out.duration - expected) > 0.25) {
    warn(`Cut duration ${out.duration.toFixed(2)}s differs from the plan (${expected.toFixed(2)}s).`);
  }

  // Remap the transcript onto the cut timeline.
  const words = readJson(project.transcript);
  const { silences = [] } = readJson(project.silences, {});
  const cutWords = remapWords(words, edl.keep, silences, speed);
  writeJson(project.cutTranscript, cutWords);
  writeText(project.cutTranscriptTxt, transcriptText(cutWords, "cut", "source"));

  const fillerSet = new Set(project.config.fillers.words.map((w) => w.toLowerCase()));
  const srtWords = cutWords.filter((w) => !fillerSet.has(bareWord(w.text)));
  fs.mkdirSync(project.exports, { recursive: true });
  writeText(path.join(project.exports, `${project.name}.srt`), toSrt(srtWords));

  saveMeta(project, {
    cut: { at: new Date().toISOString(), duration: round3(out.duration), fps: edl.fps, width: out.width, height: out.height, encoder, speed },
  });
  ok(
    `Cut done in ${((Date.now() - started) / 1000).toFixed(1)}s: ${out.duration.toFixed(1)}s, ${out.width}x${out.height} ` +
      `→ ${rel(project.cutTranscriptTxt)}, exports/${project.name}.srt`,
  );
}

/**
 * Map source-timeline words onto the cut timeline. Word end-times are first clamped at the
 * start of any detected pause (Parakeet stretches them across pauses). Words whose onset
 * was cut (fillers, manual cuts) are dropped. `source` keeps the original word index.
 */
export function remapWords(words, keep, silences, speed = 1) {
  const out = [];
  let capitalizeNext = false; // a cut sentence-opener ("Um, today…") → "Today…"
  words.forEach((w, i) => {
    const sentenceStart = i === 0 || /[.?!…]["')\]]?$/.test(words[i - 1].text);
    let end = w.end;
    for (const s of silences) {
      if (s.start > w.start + 0.05 && s.start < end) {
        end = s.start;
        break;
      }
    }
    const onset = w.start + Math.min(0.05, (end - w.start) / 2);
    const seg = keep.find((k) => onset >= k.start && onset < k.end);
    if (!seg) {
      if (sentenceStart) capitalizeNext = true;
      return;
    }
    const text = capitalizeNext ? w.text.replace(/^\p{Ll}/u, (c) => c.toUpperCase()) : w.text;
    capitalizeNext = false;
    const start = seg.offset + Math.max(0, w.start - seg.start);
    const stop = seg.offset + (Math.min(end, seg.end) - seg.start);
    out.push({ text, start: round3(start / speed), end: round3(Math.max(stop, start + 0.08) / speed), source: i });
  });
  return out;
}

function toSrt(words) {
  // Subtitle cues: up to ~84 chars / 6 s, broken at sentence ends.
  const cues = [];
  let cur = [];
  const flush = () => {
    if (cur.length) cues.push(cur);
    cur = [];
  };
  for (const w of words) {
    const text = cur.map((x) => x.text).join(" ");
    if (cur.length && (text.length + w.text.length > 84 || w.end - cur[0].start > 6)) flush();
    cur.push(w);
    if (/[.?!…]$/.test(w.text)) flush();
  }
  flush();
  return cues
    .map((c, i) => {
      const next = cues[i + 1];
      const end = Math.min(c.at(-1).end + 0.3, next ? next[0].start : Infinity);
      const text = c.map((w) => w.text).join(" ");
      const mid = text.length > 42 ? text.lastIndexOf(" ", Math.ceil(text.length / 2) + 6) : -1;
      const body = mid > 0 ? `${text.slice(0, mid)}\n${text.slice(mid + 1)}` : text;
      return `${i + 1}\n${srtTime(c[0].start)} --> ${srtTime(end)}\n${body}\n`;
    })
    .join("\n");
}
