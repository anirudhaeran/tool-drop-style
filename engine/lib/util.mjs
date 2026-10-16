// Shared helpers: paths, process spawning, config, ffprobe, time formatting.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** This skill's folder (the engine, kit, config and the pinned renderer live here). */
export const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const inside = (dir, p) => { const r = path.relative(dir, p); return !r.startsWith("..") && !path.isAbsolute(r); };
/** The videos folder (inbox/, projects/): the folder Claude Code runs in, or TD_WORKSPACE. Run from inside the
 *  skill folder, it is the folder that holds .claude/skills/. */
export const ROOT = process.env.TD_WORKSPACE ? path.resolve(process.env.TD_WORKSPACE)
  : inside(SKILL_DIR, process.cwd()) ? path.resolve(SKILL_DIR, "..", "..", "..") : process.cwd();
export const PROJECTS_DIR = path.join(ROOT, "projects");
export const HF_BIN = path.join(SKILL_DIR, "node_modules", "hyperframes", "bin", "hyperframes.mjs");

const paint = (code, s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
export const log = (m) => console.log(`${paint(36, "›")} ${m}`);
export const ok = (m) => console.log(`${paint(32, "✓")} ${m}`);
export const warn = (m) => console.warn(`${paint(33, "!")} ${m}`);
export const heading = (m) => console.log(`\n${paint(1, m)}`);

/** An error caused by input or setup, printed without a stack trace. */
export class UserError extends Error {}

export const rel = (p) => path.relative(ROOT, p) || ".";

/**
 * Spawn a process without a shell. With `capture`, stdout/stderr are collected and
 * returned; otherwise they stream to the terminal (ffmpeg progress, render logs).
 */
export function run(cmd, args, { cwd = ROOT, capture = false, env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...env },
      windowsHide: true,
      stdio: ["ignore", capture ? "pipe" : "inherit", capture ? "pipe" : "inherit"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => (stdout += d));
    child.stderr?.on("data", (d) => (stderr += d));
    child.on("error", (err) =>
      reject(err.code === "ENOENT" ? new UserError(`"${cmd}" was not found on PATH — run td doctor`) : err),
    );
    child.on("close", (code) => {
      if (code === 0) return resolve({ stdout, stderr });
      const tail = stderr.trim().split("\n").slice(-15).join("\n");
      reject(new Error(`${path.basename(cmd)} ${args[0] ?? ""} failed (exit ${code})${tail ? "\n" + tail : ""}`));
    });
  });
}

/** Run the HyperFrames CLI installed in this skill folder (pinned in its package.json). */
export function hyperframes(args, opts) {
  if (!fs.existsSync(HF_BIN)) throw new UserError("The renderer is not installed — run: node .claude/skills/style-tool-drop/engine/td.mjs setup");
  return run(process.execPath, [HF_BIN, ...args], opts);
}

/** A built composition (video/index.html) as the kit wrote it. HyperFrames Studio tags every element
 *  with data-hf-id="…" when it opens the project; those tags are dropped so the tools' parsers keep working. */
export function readComposition(file) {
  return fs.readFileSync(file, "utf8").replace(/ data-hf-id="[^"]*"/g, "");
}

/** sfx.json (duration + peak per sound) of this style's palette, built by `td setup`. */
export function paletteMetaFile() {
  return path.join(SKILL_DIR, "kit", "audio", "sfx.json");
}

export function readJson(file, fallback) {
  if (!fs.existsSync(file)) {
    if (fallback !== undefined) return fallback;
    throw new UserError(`Missing ${rel(file)}`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
}

export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

export function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

const isPlainObject = (v) => v && typeof v === "object" && !Array.isArray(v);

/** Deep merge where arrays and scalars from `over` replace those in `base`. */
export function deepMerge(base, over) {
  if (!isPlainObject(base) || !isPlainObject(over)) return over === undefined ? base : over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = deepMerge(base[k], v);
  return out;
}

export const defaultConfig = () => readJson(path.join(SKILL_DIR, "config.json"));

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export function projectPaths(dir) {
  const work = path.join(dir, "work");
  const video = path.join(dir, "video");
  const exportsDir = path.join(dir, "exports");
  return {
    dir,
    metaFile: path.join(dir, "project.json"),
    editFile: path.join(dir, "edit.json"),
    sourceDir: path.join(dir, "source"),
    work,
    video,
    exports: exportsDir,
    transcript: path.join(work, "transcript.json"),
    transcriptTxt: path.join(work, "transcript.txt"),
    levels: path.join(work, "levels.json"),
    silences: path.join(work, "silences.json"),
    edl: path.join(work, "edl.json"),
    cutFilter: path.join(work, "cut-filter.txt"),
    cutTranscript: path.join(work, "cut-transcript.json"),
    cutTranscriptTxt: path.join(work, "cut-transcript.txt"),
    footage: path.join(video, "assets", "footage.mp4"),
    index: path.join(video, "index.html"),
    captions: path.join(video, "compositions", "captions.html"),
    master: path.join(exportsDir, "master.mp4"),
  };
}

export function openProject(ref) {
  if (!ref) throw new UserError("Which project? Pass a project name (see `td list`).");
  const dir = [path.resolve(ref), path.join(PROJECTS_DIR, ref)].find((d) =>
    fs.existsSync(path.join(d, "project.json")),
  );
  if (!dir) throw new UserError(`No project "${ref}". Create one with: td new <video file>`);
  const p = projectPaths(dir);
  const meta = readJson(p.metaFile);
  const config = deepMerge(defaultConfig(), readJson(p.editFile, {}));
  return { ...p, name: meta.name, meta, config, sourceFile: path.join(dir, meta.source) };
}

/** Merge `patch` into project.json (records what each pipeline step produced). */
export function saveMeta(project, patch) {
  project.meta = { ...project.meta, ...patch };
  writeJson(project.metaFile, project.meta);
}

// ---------------------------------------------------------------------------
// Media probing
// ---------------------------------------------------------------------------

const STANDARD_RATES = [
  [24000, 1001], [24, 1], [25, 1], [30000, 1001], [30, 1],
  [48, 1], [50, 1], [60000, 1001], [60, 1], [120, 1],
];

function parseRate(r) {
  const [n, d] = String(r || "").split("/").map(Number);
  if (!(n > 0)) return 0;
  return d > 0 ? n / d : n;
}

/** Snap a measured (possibly variable) frame rate to the nearest standard rate. */
function snapFps(rate) {
  const err = ([n, d]) => Math.abs(rate - n / d) / (n / d);
  const [n, d] = STANDARD_RATES.reduce((best, r) => (err(r) < err(best) ? r : best));
  if (err([n, d]) < 0.005) return { value: n / d, str: d === 1 ? String(n) : `${n}/${d}` };
  const r = Math.max(1, Math.round(rate));
  return { value: r, str: String(r) };
}

export async function probe(file) {
  const { stdout } = await run(
    "ffprobe",
    ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file],
    { capture: true },
  );
  const info = JSON.parse(stdout);
  const v = info.streams.find((s) => s.codec_type === "video" && s.disposition?.attached_pic !== 1);
  const a = info.streams.find((s) => s.codec_type === "audio");
  if (!v) throw new UserError(`${path.basename(file)} has no video stream`);
  const fps = snapFps(parseRate(v.avg_frame_rate) || parseRate(v.r_frame_rate) || 30);
  const rotation = Number(v.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? v.tags?.rotate ?? 0);
  const sideways = Math.abs(rotation) % 180 === 90;
  return {
    duration: Number(info.format.duration || v.duration),
    width: sideways ? v.height : v.width,
    height: sideways ? v.width : v.height,
    fps: fps.value,
    fpsStr: fps.str,
    videoCodec: v.codec_name,
    pixFmt: v.pix_fmt,
    hasAudio: Boolean(a),
    audioCodec: a?.codec_name ?? null,
  };
}

// ---------------------------------------------------------------------------
// Time formatting
// ---------------------------------------------------------------------------

export const round3 = (t) => Math.round(t * 1000) / 1000;

export function fmtTime(t) {
  const m = Math.floor(t / 60);
  return `${String(m).padStart(2, "0")}:${(t - m * 60).toFixed(2).padStart(5, "0")}`;
}

export function srtTime(t) {
  const ms = Math.max(0, Math.round(t * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms % 1000, 3)}`;
}

export const bareWord = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
