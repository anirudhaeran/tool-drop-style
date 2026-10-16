// Transcription via HyperFrames' built-in Parakeet engine (sherpa-onnx, runs on CPU).
// Output: work/transcript.json — HyperFrames' own format, [{text, start, end}, ...].
import fs from "node:fs";
import { hyperframes, readJson, writeText, saveMeta, fmtTime, UserError, log, ok, rel } from "./util.mjs";

export async function transcribe(project) {
  const { config, meta } = project;
  if (!meta.probe.hasAudio) throw new UserError("The source video has no audio track to transcribe.");
  fs.mkdirSync(project.work, { recursive: true });

  const args = ["transcribe", project.sourceFile, "--dir", project.work, "--engine", config.transcribe.engine, "--json"];
  if (config.transcribe.language) args.push("--language", config.transcribe.language);
  log(`Transcribing with ${config.transcribe.engine} (roughly 5–10 s per minute of audio)...`);
  const started = Date.now();
  let result;
  try {
    const { stdout } = await hyperframes(args, { capture: true });
    result = JSON.parse(stdout.trim().split(/\r?\n/).filter((l) => l.startsWith("{")).pop());
  } catch (err) {
    if (/parakeet/i.test(String(err.message)) && /install/i.test(String(err.message))) {
      throw new UserError("Parakeet isn't installed yet — run: npx hyperframes models install parakeet");
    }
    throw err;
  }
  if (!result?.ok) throw new Error(`Transcription failed: ${result?.error ?? "unknown error"}`);

  // HyperFrames writes transcript.json into --dir; that is our canonical file.
  const words = readJson(project.transcript);
  writeText(project.transcriptTxt, transcriptText(words, "source"));
  saveMeta(project, {
    transcription: {
      at: new Date().toISOString(),
      engine: result.engine,
      model: result.model,
      language: result.detectedLanguage ?? config.transcribe.language ?? null,
      words: words.length,
    },
  });
  ok(
    `Transcribed ${words.length} words in ${((Date.now() - started) / 1000).toFixed(1)}s ` +
      `(${result.engine}/${result.model}) → ${rel(project.transcript)}, ${rel(project.transcriptTxt)}`,
  );
  return words;
}

/**
 * Human/agent-readable transcript: one sentence per line with its time range and the
 * word indices to use in edit.json -> manualCuts {"words": [from, to]}.
 */
export function transcriptText(words, timeline, indexKey = null) {
  const header =
    timeline === "source"
      ? "# Transcript - SOURCE timeline (original video).\n" +
        "# #a-#b are word indices: cut a range with edit.json -> manualCuts: [{\"words\": [a, b], \"note\": \"...\"}]\n"
      : "# Transcript - CUT timeline (times match video/index.html and the final export).\n" +
        "# Use these times for overlay data-start values. #n = source word index.\n";
  const lines = [header];
  let sentence = [];
  const flush = () => {
    if (!sentence.length) return;
    const first = sentence[0];
    const last = sentence.at(-1);
    const idx = (w, i) => (indexKey ? w[indexKey] : i);
    const end = Math.min(last.end, last.start + 1.2);
    lines.push(
      `[${fmtTime(first.start)}-${fmtTime(end)}] #${idx(first, first.__i)}-#${idx(last, last.__i)}  ` +
        sentence.map((w) => w.text).join(" "),
    );
    sentence = [];
  };
  words.forEach((w, i) => {
    sentence.push({ ...w, __i: i });
    if (/[.?!…]["')\]]?$/.test(w.text) || sentence.length >= 30) flush();
  });
  flush();
  return lines.join("\n") + "\n";
}
