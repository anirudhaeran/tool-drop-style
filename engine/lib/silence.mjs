// Audio-level silence detection. Parakeet's word end-times stretch across the pause that
// follows a word, so pauses are found from the audio itself (20 ms RMS windows), and the
// transcript is only used to calibrate the threshold and to protect word onsets.
import fs from "node:fs";
import { run, readJson, writeJson, log } from "./util.mjs";

const WINDOW = 0.02; // seconds per RMS window (320 samples at 16 kHz)

/** Per-window RMS level in dBFS for the whole source, cached in work/levels.json. */
export async function getLevels(project) {
  if (fs.existsSync(project.levels)) {
    const cached = readJson(project.levels);
    if (cached.source === project.meta.source && cached.window === WINDOW) return cached;
  }
  log("Measuring audio levels (FFmpeg astats)...");
  const af = [
    "aresample=16000",
    "aformat=channel_layouts=mono",
    "asetnsamples=n=320:p=0",
    "astats=metadata=1:reset=1",
    "ametadata=mode=print:key=lavfi.astats.Overall.RMS_level:file=-",
  ].join(",");
  const { stdout } = await run(
    "ffmpeg",
    ["-hide_banner", "-nostats", "-loglevel", "error", "-i", project.sourceFile, "-vn", "-af", af, "-f", "null", "-"],
    { capture: true },
  );
  const levels = [];
  for (const line of stdout.split(/\r?\n/)) {
    const eq = line.indexOf("RMS_level=");
    if (eq < 0) continue;
    const v = Number.parseFloat(line.slice(eq + 10));
    levels.push(Number.isFinite(v) ? Math.max(-120, Math.round(v * 10) / 10) : -120);
  }
  const result = { source: project.meta.source, window: WINDOW, levels };
  writeJson(project.levels, result);
  return result;
}

const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)))];

/**
 * Pick a silence threshold between the room-noise floor and the speech level.
 * Speech level = median RMS over the first 350 ms of each transcribed word.
 */
export function autoThreshold(levels, window, words) {
  const noise = percentile([...levels].sort((a, b) => a - b), 0.05);
  const speechVals = [];
  for (const w of words) {
    const a = Math.floor(w.start / window);
    const b = Math.min(levels.length - 1, Math.floor(Math.min(w.end, w.start + 0.35) / window));
    for (let i = a; i <= b; i++) speechVals.push(levels[i]);
  }
  const speech = speechVals.length ? percentile(speechVals.sort((a, b) => a - b), 0.5) : -20;
  let threshold = speech - 20;
  threshold = Math.max(threshold, noise + 6); // stay clear of the noise floor
  threshold = Math.min(threshold, speech - 8); // ...but always well below speech
  return { threshold: Math.round(threshold * 10) / 10, noiseFloor: noise, speechLevel: speech };
}

/** Runs of windows below `threshold` lasting at least `minSilence` seconds. */
export function detectSilences(levels, window, threshold, minSilence) {
  const runs = [];
  let start = -1;
  for (let i = 0; i <= levels.length; i++) {
    const quiet = i < levels.length && levels[i] < threshold;
    if (quiet && start < 0) start = i;
    if (!quiet && start >= 0) {
      runs.push({ start: start * window, end: i * window });
      start = -1;
    }
  }
  // Bridge single-window blips (clicks, breaths' edges) inside a pause.
  const merged = [];
  for (const r of runs) {
    const last = merged.at(-1);
    if (last && r.start - last.end <= window * 2 + 1e-9) last.end = r.end;
    else merged.push({ ...r });
  }
  return merged
    .filter((r) => r.end - r.start >= minSilence)
    .map((r) => ({ start: Math.round(r.start * 1000) / 1000, end: Math.round(r.end * 1000) / 1000 }));
}
