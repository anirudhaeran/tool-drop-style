// Build the edit decision list (work/edl.json): which ranges of the source to cut
// (pauses, filler words, manual cuts) and which to keep.
import { readJson, writeJson, saveMeta, UserError, ok, log, warn, bareWord, round3 } from "./util.mjs";
import { getLevels, autoThreshold, detectSilences } from "./silence.mjs";

// --- interval helpers (all lists sorted by start, non-overlapping after union) ---

function union(ranges) {
  const sorted = ranges.filter((r) => r.end - r.start > 1e-6).sort((a, b) => a.start - b.start);
  const out = [];
  for (const r of sorted) {
    const last = out.at(-1);
    if (last && r.start <= last.end + 1e-6) {
      last.end = Math.max(last.end, r.end);
      for (const why of r.reasons) if (!last.reasons.includes(why)) last.reasons.push(why);
    } else out.push({ start: r.start, end: r.end, reasons: [...r.reasons] });
  }
  return out;
}

function subtract(ranges, holes) {
  let out = ranges;
  for (const h of holes) {
    out = out.flatMap((r) => {
      if (h.end <= r.start || h.start >= r.end) return [r];
      const parts = [];
      if (h.start > r.start) parts.push({ ...r, end: h.start });
      if (h.end < r.end) parts.push({ ...r, start: h.end });
      return parts;
    });
  }
  return out;
}

function complement(cuts, start, end) {
  const keep = [];
  let t = start;
  for (const c of cuts) {
    if (c.start > t) keep.push({ start: t, end: c.start });
    t = Math.max(t, c.end);
  }
  if (end > t) keep.push({ start: t, end });
  return keep;
}

/** Resolve one manualCuts entry: {start, end} in seconds or {words: [from, to]} by index. */
function resolveManualCut(m, words, duration) {
  if (Array.isArray(m.words)) {
    const [a, b] = m.words;
    if (!(a >= 0 && b >= a && b < words.length)) {
      throw new UserError(`manualCuts: word range [${a}, ${b}] is outside the transcript (0–${words.length - 1})`);
    }
    const next = words[b + 1];
    const end = next ? next.start - 0.02 : Math.min(duration, words[b].end);
    return { start: Math.max(0, words[a].start - 0.02), end };
  }
  if (typeof m.start === "number" && typeof m.end === "number" && m.end > m.start) return { start: m.start, end: m.end };
  throw new UserError(`manualCuts entry needs {"start","end"} seconds or {"words":[from,to]}: ${JSON.stringify(m)}`);
}

export async function plan(project) {
  const { config, meta } = project;
  const words = readJson(project.transcript);
  const { duration, fps } = meta.probe;
  const fillerSet = new Set(config.fillers.words.map((w) => w.toLowerCase()));
  const isFiller = (w) => fillerSet.has(bareWord(w.text));

  let silenceInfo = null;
  let silenceCuts = [];
  if (config.silence.enabled) {
    const { levels, window } = await getLevels(project);
    const calib =
      config.silence.thresholdDb === "auto"
        ? autoThreshold(levels, window, words)
        : { threshold: Number(config.silence.thresholdDb) };
    const silences = detectSilences(levels, window, calib.threshold, config.silence.minSilence);
    silenceInfo = { ...calib, minSilence: config.silence.minSilence, silences };
    writeJson(project.silences, silenceInfo);

    const { keepAfterSpeech, keepBeforeSpeech } = config.silence;
    silenceCuts = silences.map((s) => ({
      start: s.start <= window ? 0 : s.start + keepAfterSpeech,
      end: s.end >= duration - 2 * window ? duration : s.end - keepBeforeSpeech,
      reasons: ["pause"],
    }));
    // Never let a pause-cut swallow the onset of a real word (quiet syllables can read as silence).
    const onsets = words.filter((w) => !isFiller(w)).map((w) => ({ start: w.start - 0.06, end: w.start + 0.2 }));
    // Slivers left over after protecting onsets aren't worth a jump cut.
    silenceCuts = subtract(silenceCuts, onsets).filter((c) => c.end - c.start >= 0.12);
  } else {
    writeJson(project.silences, { silences: [] });
  }

  const fillerCuts = [];
  if (config.fillers.enabled) {
    words.forEach((w, i) => {
      if (!isFiller(w)) return;
      const next = words[i + 1];
      const end = Math.min(w.end, next ? next.start : w.end) - 0.03;
      fillerCuts.push({ start: w.start, end, reasons: [`filler "${w.text}" (#${i})`] });
    });
  }

  const edgeCuts = [];
  if (config.trimEnds && words.length) {
    const first = words.find((w) => !isFiller(w)) ?? words[0];
    const last = words.at(-1);
    edgeCuts.push({ start: 0, end: Math.max(0, first.start - 0.3), reasons: ["lead-in"] });
    // word end-times run long, so bound the last word by a generous 1.5 s
    const lastEnd = Math.min(last.end, last.start + 1.5) + 0.4;
    if (lastEnd < duration) edgeCuts.push({ start: lastEnd, end: duration, reasons: ["tail"] });
  }

  const manualCuts = (config.manualCuts ?? []).map((m) => ({
    ...resolveManualCut(m, words, duration),
    reasons: [m.note ? `manual: ${m.note}` : "manual"],
  }));
  const keeps = (config.keep ?? []).map((k) => resolveManualCut(k, words, duration));

  let cuts = union([...silenceCuts, ...fillerCuts, ...edgeCuts, ...manualCuts]);
  cuts = subtract(cuts, keeps);

  // Snap to the frame grid so audio and video segment lengths match exactly.
  const snap = (t) => Math.min(duration, Math.max(0, Math.round(t * fps) / fps));
  let keep = complement(cuts, 0, duration)
    .map((k) => ({ start: snap(k.start), end: snap(k.end) }))
    .filter((k) => k.end - k.start >= 1 / fps);
  // Drop slivers (< 0.2 s) that contain no word onset — they read as glitches.
  keep = keep.filter((k) => k.end - k.start >= 0.2 || words.some((w) => w.start >= k.start && w.start < k.end));
  if (!keep.length) throw new UserError("Every part of the video would be cut — check edit.json (manualCuts / silence threshold).");

  let offset = 0;
  keep = keep.map((k) => {
    const seg = { start: round3(k.start), end: round3(k.end), offset: round3(offset) };
    offset += k.end - k.start;
    return seg;
  });

  const removed = duration - offset;
  const count = (prefix) => cuts.filter((c) => c.reasons.some((r) => r.startsWith(prefix))).length;
  const edl = {
    source: meta.source,
    fps: meta.probe.fpsStr,
    sourceDuration: round3(duration),
    outputDuration: round3(offset),
    silenceThresholdDb: silenceInfo?.threshold ?? null,
    cuts: cuts.map((c) => ({ start: round3(c.start), end: round3(c.end), reason: c.reasons.join(", ") })),
    keep,
  };
  writeJson(project.edl, edl);
  saveMeta(project, { plan: { at: new Date().toISOString(), outputDuration: edl.outputDuration } });

  if (silenceInfo) {
    log(
      `Silence threshold ${silenceInfo.threshold} dB` +
        (silenceInfo.speechLevel !== undefined
          ? ` (speech ≈ ${silenceInfo.speechLevel} dB, noise floor ≈ ${silenceInfo.noiseFloor} dB)`
          : ""),
    );
  }
  ok(
    `Plan: ${edl.sourceDuration.toFixed(1)}s → ${edl.outputDuration.toFixed(1)}s ` +
      `(removed ${removed.toFixed(1)}s, ${((removed / duration) * 100).toFixed(0)}%) — ` +
      `${count("pause")} pauses, ${count("filler")} fillers, ${count("manual")} manual, ${keep.length} segments kept`,
  );
  if (removed / duration > 0.6) warn("More than 60% removed — if speech got clipped, raise silence.minSilence or set silence.thresholdDb lower (e.g. -50).");
  return edl;
}
