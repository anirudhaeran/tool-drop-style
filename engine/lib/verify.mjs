// QA pass: re-transcribe the CUT footage and compare with what we expected to keep.
//  • expected words that are no longer heard → the cut may have clipped speech
//  • fillers heard in the cut → Parakeet often skips "uh"/"um" in the first pass; these
//    are mapped back to source time and (with --apply) added to edit.json manualCuts.
import fs from "node:fs";
import path from "node:path";
import { hyperframes, readJson, writeJson, fmtTime, bareWord, round3, ok, warn, log, rel, UserError } from "./util.mjs";

/** Greedy word alignment with a small look-ahead; returns pairs [i|null, j|null]. */
function align(a, b, lookahead = 6) {
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      pairs.push([i++, j++]);
      continue;
    }
    let skipA = -1;
    let skipB = -1;
    for (let k = 1; k <= lookahead; k++) {
      if (skipB < 0 && i < a.length && b[j + k] === a[i]) skipB = k; // extra words heard
      if (skipA < 0 && j < b.length && a[i + k] === b[j]) skipA = k; // expected words missing
    }
    if (skipB > 0 && (skipA < 0 || skipB <= skipA)) for (let k = 0; k < skipB; k++) pairs.push([null, j++]);
    else if (skipA > 0) for (let k = 0; k < skipA; k++) pairs.push([i++, null]);
    else {
      // substitution (or tail): consume one of each
      if (i < a.length && j < b.length) pairs.push([i++, j++]);
      else if (i < a.length) pairs.push([i++, null]);
      else pairs.push([null, j++]);
    }
  }
  return pairs;
}

function cutToSource(cutT, keep, speed = 1) {
  const t = cutT * speed;
  const seg = keep.find((k) => t >= k.offset && t < k.offset + (k.end - k.start)) ?? keep.at(-1);
  return seg.start + Math.min(t - seg.offset, seg.end - seg.start);
}

export async function verify(project, { apply = false } = {}) {
  if (!fs.existsSync(project.footage)) throw new UserError("Nothing to verify — run cut first.");
  const dir = path.join(project.work, "verify");
  fs.mkdirSync(dir, { recursive: true });
  log("Re-transcribing the cut footage to check it...");
  await hyperframes(["transcribe", project.footage, "--dir", dir, "--engine", project.config.transcribe.engine, "--json"], { capture: true });
  const heard = readJson(path.join(dir, "transcript.json"));
  const expected = readJson(project.cutTranscript);
  const edl = readJson(project.edl);
  const fillerSet = new Set(project.config.fillers.words.map((w) => w.toLowerCase()));
  const speed = Number(project.config.cut.speed) || 1;

  const sourceWords = readJson(project.transcript);
  const pairs = align(expected.map((w) => bareWord(w.text)), heard.map((w) => bareWord(w.text)));
  const missing = [];
  const fillers = [];
  pairs.forEach(([i, j], p) => {
    if (i !== null && j === null && !fillerSet.has(bareWord(expected[i].text))) missing.push(expected[i]);
    if (j === null || !fillerSet.has(bareWord(heard[j].text))) return;
    if (i !== null && fillerSet.has(bareWord(expected[i].text))) return; // already known
    const next = heard[j + 1];
    const cutEnd = Math.min(heard[j].end, next ? next.start : heard[j].end, heard[j].start + 0.8);
    const start = cutToSource(heard[j].start, edl.keep, speed);
    let end = cutToSource(cutEnd, edl.keep, speed) - 0.03;
    // Never run into the next real word: the two transcriptions time onsets differently.
    const nextKept = pairs.slice(p + 1).find(([ii]) => ii !== null)?.[0];
    if (nextKept !== undefined) end = Math.min(end, sourceWords[expected[nextKept].source].start - 0.04);
    if (end - start < 0.08) return;
    fillers.push({ text: heard[j].text, cutStart: heard[j].start, start: round3(start), end: round3(end) });
  });

  // The cut is deterministic, so only words touching a join can actually be clipped;
  // anything else missing is the two transcriptions disagreeing.
  const joins = edl.keep.slice(1).map((k) => k.offset / speed);
  const nearJoin = (w) => joins.some((j) => w.start - 0.25 <= j && j <= w.end + 0.25);
  const clipped = missing.filter(nearJoin);
  const asrNoise = missing.length - clipped.length;

  const report = { at: new Date().toISOString(), expectedWords: expected.length, heardWords: heard.length, clipped, asrDifferences: asrNoise, fillers };
  writeJson(path.join(project.work, "verify.json"), report);

  if (clipped.length) {
    warn(`${clipped.length} word(s) next to a cut weren't heard in the cut — listen at these points (cut timeline):`);
    for (const w of clipped.slice(0, 15)) console.log(`    ${fmtTime(w.start)}  "${w.text}"  (source word #${w.source})`);
    console.log(`    If a word is clipped, protect it in edit.json → "keep": [{"words": [n, n]}] and run recut.`);
  } else {
    ok(`No clipped words at any of the ${joins.length} cut points` + (asrNoise ? ` (${asrNoise} mid-segment transcription difference(s) ignored).` : "."));
  }

  if (fillers.length) {
    log(`${fillers.length} filler(s) the first transcription missed: ${fillers.map((f) => `"${f.text}" @ ${fmtTime(f.cutStart)}`).join(", ")}`);
    if (apply) {
      const edit = readJson(project.editFile, {});
      edit.manualCuts = [...(edit.manualCuts ?? []), ...fillers.map((f) => ({ start: f.start, end: f.end, note: `filler "${f.text}" (verify)` }))];
      writeJson(project.editFile, edit);
      project.config.manualCuts = edit.manualCuts;
      ok(`Added ${fillers.length} filler cut(s) to ${rel(project.editFile)}.`);
    } else {
      console.log(`    Run \`td verify ${project.name} --apply\` to cut them (then recut).`);
    }
  }
  fs.rmSync(dir, { recursive: true, force: true });
  return { ...report, applied: apply && fillers.length > 0 };
}
