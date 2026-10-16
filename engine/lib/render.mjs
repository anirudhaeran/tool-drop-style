// Render the HyperFrames composition, then master the audio loudness with FFmpeg.
import fs from "node:fs";
import path from "node:path";
import { hyperframes, run, saveMeta, ok, log, warn, rel, UserError } from "./util.mjs";

/** Two-pass EBU R128 loudness normalisation; video stream is copied untouched. */
async function loudnorm(input, output, { loudness, truePeak }) {
  const base = `loudnorm=I=${loudness}:TP=${truePeak}:LRA=11`;
  const { stderr } = await run(
    "ffmpeg",
    ["-hide_banner", "-nostats", "-i", input, "-vn", "-af", `${base}:print_format=json`, "-f", "null", "-"],
    { capture: true },
  );
  const m = JSON.parse(stderr.slice(stderr.lastIndexOf("{"), stderr.lastIndexOf("}") + 1));
  const af =
    `${base}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}` +
    `:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`;
  await run("ffmpeg", [
    "-hide_banner", "-y", "-loglevel", "error", "-stats",
    "-i", input,
    "-map", "0:v:0", "-map", "0:a:0",
    "-c:v", "copy",
    "-af", af,
    "-c:a", "aac", "-b:a", "256k",
    "-movflags", "+faststart",
    output,
  ]);
  return Number(m.input_i);
}

export async function render(project, { draft = false, quality, gpu } = {}) {
  const cfg = project.config.export;
  if (!fs.existsSync(project.index)) throw new UserError("No composition yet — run: td build " + project.name);
  fs.mkdirSync(project.exports, { recursive: true });

  const out = draft ? path.join(project.exports, "draft.mp4") : project.master;
  const args = ["render", project.video, "-o", out, "--quality", draft ? "draft" : quality ?? cfg.quality];
  const fps = project.meta.cut?.fps;
  if (fps) args.push("--fps", fps);
  if (gpu ?? cfg.gpuEncode) args.push("--gpu");
  log(`Rendering with HyperFrames (${draft ? "draft" : quality ?? cfg.quality})...`);
  const started = Date.now();
  await hyperframes(args);
  const secs = ((Date.now() - started) / 1000).toFixed(0);

  if (draft) {
    ok(`Draft rendered in ${secs}s → ${rel(out)}`);
    return out;
  }

  const final = path.join(project.exports, `${project.name}.mp4`);
  if (cfg.loudness === null || cfg.loudness === false) {
    fs.copyFileSync(project.master, final);
  } else {
    log(`Normalising loudness to ${cfg.loudness} LUFS (true peak ${cfg.truePeak} dBTP)...`);
    try {
      const before = await loudnorm(project.master, final, cfg);
      log(`Loudness ${before.toFixed(1)} → ${cfg.loudness} LUFS`);
    } catch (err) {
      warn(`Loudness pass failed (${err.message.split("\n")[0]}); exporting the render as-is.`);
      fs.copyFileSync(project.master, final);
    }
  }
  saveMeta(project, { render: { at: new Date().toISOString(), file: path.relative(project.dir, final), seconds: Number(secs) } });
  ok(`Rendered in ${secs}s → ${rel(final)}`);
  return final;
}
