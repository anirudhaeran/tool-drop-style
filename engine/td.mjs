#!/usr/bin/env node
// td — the Tool-Drop style's own pipeline: Parakeet (transcribe) → FFmpeg (cut) → the style kit (HyperFrames
// composition) → render + −14 LUFS master. Lives inside the skill folder; projects live in the videos folder
// Claude Code runs in (inbox/, projects/<name>/).
//   node .claude/skills/style-tool-drop/engine/td.mjs <command> [project] [options]
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  ROOT, SKILL_DIR, PROJECTS_DIR, HF_BIN, UserError, run, hyperframes, probe, readJson, writeJson, defaultConfig,
  projectPaths, openProject, heading, log, ok, warn, rel,
} from "./lib/util.mjs";
import { transcribe } from "./lib/transcribe.mjs";
import { plan } from "./lib/plan.mjs";
import { cut } from "./lib/cut.mjs";
import { render } from "./lib/render.mjs";
import { verify } from "./lib/verify.mjs";

const TD = `node ${path.relative(ROOT, path.join(SKILL_DIR, "engine", "td.mjs")).split(path.sep).join("/")}`;
const HELP = `
td — Tool-Drop style pipeline (run from your videos folder; td = ${TD})

  td setup                      one time: renderer, sounds, transcription model, Chrome
  td doctor                     check the toolchain
  td new "<video>" [--name n] [--aspect 9:16]
                                create projects/<name> (the source is hard-linked, never modified)
  td transcribe <project>       Parakeet word timestamps → work/transcript.json + .txt
  td plan <project>             find pauses/fillers + apply edit.json → work/edl.json
  td cut <project>              FFmpeg cut → video/assets/footage.mp4 + work/cut-transcript.*
  td verify <project> [--apply] re-transcribe the cut: clipped words? missed "uh"s?
  td recut <project>            plan + cut (+ build when plan.mjs exists), after editing edit.json
  td build <project>            projects/<name>/plan.mjs → video/index.html (the style kit)
  td qa <project> [frames|sfx|placement|seams]
  td music-fit <project> "<audio file>" [--from s] [--at s] [--length s] [--under 20] [--vocals]
  td preview <project> [--stop] HyperFrames Studio, a timeline editor in the browser
  td render <project> [--draft] render → projects/<name>/exports/<name>.mp4 at −14 LUFS
  td status <project> | td list
`;

const slug = (s) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "video";

async function cmdNew(file, opts) {
  if (!file) throw new UserError(`Usage: td new "<video file>" [--name my-video] [--aspect 9:16]`);
  const src = path.resolve(ROOT, file);
  if (!fs.existsSync(src) || !fs.statSync(src).isFile()) throw new UserError(`File not found: ${file}`);
  const info = await probe(src);
  const base = slug(opts.name ?? path.parse(src).name);
  let name = base;
  if (opts.name && fs.existsSync(path.join(PROJECTS_DIR, name))) throw new UserError(`Project "${name}" already exists.`);
  for (let n = 2; fs.existsSync(path.join(PROJECTS_DIR, name)); n++) name = `${base}-${n}`;

  const dir = path.join(PROJECTS_DIR, name);
  const p = projectPaths(dir);
  for (const d of [p.sourceDir, p.work, p.exports]) fs.mkdirSync(d, { recursive: true });
  const dest = path.join(p.sourceDir, path.basename(src));
  try {
    fs.linkSync(src, dest); // instant, no extra disk space (same drive)
  } catch {
    log(`Copying source into ${rel(p.sourceDir)} ...`);
    await fs.promises.copyFile(src, dest);
  }
  const edit = defaultConfig();
  edit.style = "tool-drop";
  if (opts.aspect) edit.format.aspect = opts.aspect;
  writeJson(p.editFile, edit);
  writeJson(p.metaFile, { name, createdAt: new Date().toISOString(), source: path.relative(dir, dest).split(path.sep).join("/"), original: src, probe: info });
  ok(`Project ${rel(dir)}: ${info.width}x${info.height} @ ${info.fpsStr} fps, ${info.duration.toFixed(1)}s` + (info.hasAudio ? "" : " (no audio!)"));
}

function cmdStatus(project) {
  const m = project.meta;
  const when = (s) => (s ? new Date(s.at).toLocaleString() : "—");
  console.log(`\n${project.name}  (${rel(project.dir)})`);
  console.log(`  source      ${m.source}  ${m.probe.width}x${m.probe.height} @ ${m.probe.fpsStr}, ${m.probe.duration.toFixed(1)}s`);
  console.log(`  transcribe  ${when(m.transcription)}${m.transcription ? `  ${m.transcription.words} words` : ""}`);
  console.log(`  plan        ${when(m.plan)}${m.plan ? `  → ${m.plan.outputDuration.toFixed(1)}s` : ""}`);
  console.log(`  cut         ${when(m.cut)}${m.cut ? `  ${m.cut.duration.toFixed(1)}s (${m.cut.encoder})` : ""}`);
  console.log(`  plan.mjs    ${fs.existsSync(path.join(project.dir, "plan.mjs")) ? "written" : "—"}`);
  console.log(`  render      ${when(m.render)}${m.render ? `  ${m.render.file}` : ""}`);
}

function cmdList() {
  const dirs = fs.existsSync(PROJECTS_DIR) ? fs.readdirSync(PROJECTS_DIR).filter((d) => fs.existsSync(path.join(PROJECTS_DIR, d, "project.json"))) : [];
  if (!dirs.length) return console.log(`No projects yet. Start one with: td new "inbox/<video file>"`);
  for (const d of dirs) {
    const m = readJson(path.join(PROJECTS_DIR, d, "project.json"));
    const stage = m.render ? "rendered" : m.cut ? "cut" : m.plan ? "planned" : m.transcription ? "transcribed" : "new";
    console.log(`  ${d.padEnd(32)} ${stage.padEnd(12)} ${m.probe.duration.toFixed(1)}s → ${m.cut ? m.cut.duration.toFixed(1) + "s" : "?"}`);
  }
}

const parakeetModels = () => {
  const dir = path.join(os.homedir(), ".cache", "hyperframes", "parakeet");
  return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
};
const palette = path.join(SKILL_DIR, "kit", "audio", "sfx.json");

async function cmdDoctor() {
  const check = (good, label, detail, fix) => {
    console.log(`  ${good ? "✓" : "✗"} ${label.padEnd(18)} ${detail}`);
    if (!good && fix) console.log(`      → ${fix}`);
    return good;
  };
  heading("td doctor");
  let allGood = true;
  const major = Number(process.versions.node.split(".")[0]);
  allGood &= check(major >= 22, "Node.js", process.version, "Install Node 22+ from https://nodejs.org");
  for (const bin of ["ffmpeg", "ffprobe"]) {
    try {
      const { stdout } = await run(bin, ["-version"], { capture: true });
      check(true, bin, stdout.split("\n")[0].slice(0, 70));
    } catch {
      allGood &= check(false, bin, "not found", "Mac: brew install ffmpeg · Windows: winget install Gyan.FFmpeg (then open a new terminal)");
    }
  }
  const hfOk = fs.existsSync(HF_BIN);
  allGood &= check(hfOk, "Renderer", hfOk ? `HyperFrames ${readJson(path.join(SKILL_DIR, "node_modules", "hyperframes", "package.json")).version}` : "not installed", `${TD} setup`);
  const models = parakeetModels();
  allGood &= check(models.length > 0, "Parakeet model", models.join(", ") || "not installed", `${TD} setup`);
  const sfxOk = fs.existsSync(palette);
  allGood &= check(sfxOk, "Sound palette", sfxOk ? `${Object.keys(readJson(palette)).length} sounds` : "not built", `${TD} setup`);
  console.log(allGood ? "\nAll required tools are ready." : `\nFix the ✗ items above, then run \`${TD} doctor\` again.`);
  return allGood;
}

/** npm through a shell (npm is a .cmd script on Windows, which Node can't spawn directly). */
const npm = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn("npm", args, { cwd: SKILL_DIR, stdio: "inherit", shell: true, windowsHide: true });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new UserError(`npm ${args[0]} failed (exit ${code})`))));
  });

async function cmdSetup() {
  heading("1/4 Renderer (HyperFrames, pinned in package.json)");
  if (fs.existsSync(HF_BIN)) ok("already installed");
  else await npm(["install", "--no-audit", "--no-fund"]);
  heading("2/4 Transcription model (Parakeet, on your computer)");
  if (parakeetModels().length) ok(`already installed (${parakeetModels().join(", ")})`);
  else await hyperframes(["models", "install", "parakeet"]);
  heading("3/4 Chrome for rendering");
  await hyperframes(["browser", "ensure"]);
  heading("4/4 Sound palette (free Mixkit sounds, downloaded to this computer)");
  for (const f of ["sfx-library/download.mjs", "make-sfx.mjs", "make-audio.mjs"]) await run(process.execPath, [path.join(SKILL_DIR, "kit", f)], { cwd: SKILL_DIR });
  for (const d of ["inbox", path.join("inbox", "music")]) fs.mkdirSync(path.join(ROOT, d), { recursive: true });
  if (await cmdDoctor()) console.log(`\nReady. Put a clip in inbox/ and tell Claude: Edit inbox/<clip>.mp4 in the tool-drop style.`);
}

async function main() {
  const { values: opts, positionals } = parseArgs({
    allowPositionals: true,
    allowNegative: true,
    strict: false,
    options: {
      name: { type: "string", short: "n" },
      aspect: { type: "string" },
      draft: { type: "boolean" },
      quality: { type: "string" },
      gpu: { type: "boolean" },
      encoder: { type: "string" },
      apply: { type: "boolean" },
      stop: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  const [command, target] = positionals;
  if (!command || opts.help || command === "help") return console.log(HELP);
  const node = (file, args) => run(process.execPath, [path.join(SKILL_DIR, file), ...args]);

  switch (command) {
    case "setup":
      return cmdSetup();
    case "doctor":
      return void (await cmdDoctor());
    case "new":
      return cmdNew(target, opts);
    case "transcribe":
      return void (await transcribe(openProject(target)));
    case "plan":
      return void (await plan(openProject(target)));
    case "cut":
      return void (await cut(openProject(target), opts));
    case "verify": {
      const result = await verify(openProject(target), opts);
      if (result.applied) console.log(`\nApply them with: td recut ${target}`);
      return;
    }
    case "recut": {
      const project = openProject(target);
      await plan(project);
      await cut(project, opts);
      if (fs.existsSync(path.join(project.dir, "plan.mjs"))) await node("kit/build.mjs", [project.dir]);
      return;
    }
    case "build":
      return void (await node("kit/build.mjs", [openProject(target).dir]));
    case "qa":
      return void (await node("engine/qa.mjs", [positionals[2] ?? "all", openProject(target).dir]));
    case "music-fit":
      return void (await node("engine/music-fit.mjs", process.argv.slice(process.argv.indexOf("music-fit") + 1)));
    case "preview": {
      const project = openProject(target);
      if (opts.stop) return void (await hyperframes(["preview", project.video, "--stop"]));
      if (!fs.existsSync(project.index)) throw new UserError(`Nothing to preview yet — run: td build ${project.name}`);
      log(`Starting HyperFrames Studio — stop it with Ctrl+C, or: td preview ${project.name} --stop`);
      return void (await hyperframes(["preview", project.video]));
    }
    case "render":
      return void (await render(openProject(target), opts));
    case "status":
      return cmdStatus(openProject(target));
    case "list":
      return cmdList();
    default:
      throw new UserError(`Unknown command "${command}".\n${HELP}`);
  }
}

main().catch((err) => {
  if (err instanceof UserError) console.error(`\n✗ ${err.message}`);
  else console.error(`\n✗ ${err.stack ?? err}`);
  process.exit(1);
});
