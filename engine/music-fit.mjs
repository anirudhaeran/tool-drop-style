#!/usr/bin/env node
// Fit a music track (the user's own, from inbox/music/, or a library bed) under a project's voice:
// map the song, pick its steadiest stretch that avoids breakdowns, start it on a strong low-end onset,
// level + voice-carve it, normalise it to −20 LUFS and print the plan.mjs `music` line.
//   td music-fit <project> "<audio file>" [--from <s>] [--under 20] [--vocals]
// --from   start here instead of searching (seconds into the song; still snapped to the nearest onset)
// --at     start exactly here (no search, no snapping) — e.g. to reuse an approved bed's downbeat
// --length bed length in seconds (default: the whole reel) — e.g. music that enters after the hook
// --under  LU under the voice (default 20; 17–20 is the usual range)
// --vocals transcribe the chosen stretch with Parakeet and report any sung words (they fight speech)
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { openProject, hyperframes, readComposition } from "./lib/util.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const project = openProject(args[0]);
const src = args[1];
if (!src || !fs.existsSync(src)) { console.error("usage: music-fit.mjs <project> <audio file> [--from s] [--under 20] [--vocals]"); process.exit(1); }
const UNDER = Number(opt("--under", 20));
const BED_LUFS = -20;

const integrated = (file, af = "") => Number((String(spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", `${af}ebur128`, "-f", "null", "-"]).stderr).match(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold/) || [])[1]);
const shortTerm = (af = "") => {
  const out = execFileSync("ffmpeg", ["-hide_banner", "-nostats", "-i", src, "-af", `${af}ebur128=metadata=1,ametadata=mode=print:key=lavfi.r128.S:file=-`, "-f", "null", "-"], { maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }).toString().split(/\r?\n/);
  const perSec = [];
  for (let i = 0; i < out.length; i++) {
    const t = out[i].match(/pts_time:([\d.]+)/);
    if (!t) continue;
    const v = parseFloat((out[i + 1] || "").split("=")[1]);
    const s = Math.floor(+t[1]);
    if (Number.isFinite(v) && v > -70) perSec[s] = v; // last value in each second
  }
  return perSec;
};
const D = opt("--length") != null ? Number(opt("--length")) : (() => {
  if (fs.existsSync(project.index)) return Number(readComposition(project.index).match(/data-composition-id="main"[^>]*data-duration="([\d.]+)"/)[1]);
  return project.meta.cut.duration;
})();

// 1. map: loudness and voice-band (1–4 kHz) share per second
const full = shortTerm();
const band = shortTerm("highpass=f=1000,lowpass=f=4000,");
const len = full.length;
const sorted = full.filter(Number.isFinite).sort((a, b) => a - b);
const median = sorted[sorted.length >> 1];
// 2. steadiest window: low spread, no breakdowns (> 6 dB under the song's median), little voice-band energy
let best = null;
const W = Math.ceil(D) + 1;
for (let a = 0; a + W <= len; a++) {
  const win = full.slice(a, a + W).filter(Number.isFinite);
  if (win.length < W * 0.9) continue;
  const m = win.reduce((s, v) => s + v, 0) / win.length;
  const sd = Math.sqrt(win.reduce((s, v) => s + (v - m) ** 2, 0) / win.length);
  const drops = win.filter((v) => v < median - 6).length;
  const gaps = full.slice(a, a + W).map((v, i) => v - band[a + i]).filter(Number.isFinite);
  const voiceGap = gaps.reduce((s, v) => s + v, 0) / gaps.length; // bigger = less energy where consonants live
  const score = sd + drops * 1.5 + Math.max(0, 8 - voiceGap) * 0.5;
  if (!best || score < best.score) best = { a, sd, drops, voiceGap, score };
}
let from = opt("--from") != null ? Number(opt("--from")) : best ? best.a : 0;
// 3. snap to the strongest low-end onset within ±1.5 s
const lowFrom = Math.max(0, from - 1.5);
const low = execFileSync("ffmpeg", ["-hide_banner", "-nostats", "-loglevel", "error", "-ss", String(lowFrom), "-t", "3", "-i", src, "-af", "lowpass=f=150,aresample=16000,aformat=channel_layouts=mono,asetnsamples=n=160:p=0,astats=metadata=1:reset=1,ametadata=mode=print:key=lavfi.astats.Overall.RMS_level:file=-", "-f", "null", "-"]).toString()
  .split(/\r?\n/).filter((l) => l.includes("RMS_level=")).map((l) => { const v = parseFloat(l.split("=")[1]); return Number.isFinite(v) ? v : -120; });
let onset = 0, rise = -1e9;
for (let i = 3; i < low.length; i++) { const r = low[i] - Math.min(low[i - 1], low[i - 2], low[i - 3]); if (low[i - 3] > -100 && r > rise) { rise = r; onset = i; } }
const start = opt("--at") != null ? Number(opt("--at")) : +(lowFrom + onset * 0.01 - 0.02).toFixed(2);

// 4. cut, level, carve, fade, normalise
const outDir = path.join(project.dir, "music");
fs.mkdirSync(outDir, { recursive: true });
const slug = path.basename(src).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const out = path.join(outDir, `${slug}-bed.wav`);
const tmp = out + ".tmp.wav";
execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(start), "-t", (D + 0.05).toFixed(3), "-i", src, "-af",
  `aresample=48000,highpass=f=35,acompressor=threshold=-22dB:ratio=2:attack=300:release=1500:knee=6,equalizer=f=2500:t=q:w=0.8:g=-3,afade=t=in:d=0.03,afade=t=out:st=${(D - 0.8).toFixed(2)}:d=0.8,atrim=0:${D}`,
  "-ac", "2", "-c:a", "pcm_s16le", tmp]);
execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", tmp, "-af", `volume=${(BED_LUFS - integrated(tmp)).toFixed(2)}dB`, "-c:a", "pcm_s16le", out]);
fs.rmSync(tmp);

// 5. level under the voice + phone check
const voice = path.join(project.video, "assets", "voice.m4a");
const vI = fs.existsSync(voice) ? integrated(voice) : -18.9;
const volume = +(10 ** ((vI - UNDER - BED_LUFS) / 20)).toFixed(3);
const PHONE = "highpass=f=400:poles=2,highpass=f=400:poles=2,";
const phoneShift = fs.existsSync(voice) ? (integrated(voice) - integrated(voice, PHONE)) - (integrated(out) - integrated(out, PHONE)) : 0;

console.log(`song ${len}s, median ${median.toFixed(1)} LUFS-S; reel ${D}s`);
if (best) console.log(`steadiest stretch from ${best.a}s (spread ${best.sd.toFixed(1)} dB, ${best.drops} breakdown s, voice-band −${best.voiceGap.toFixed(1)} dB)`);
console.log(`start ${start}s (${opt("--at") != null ? "exact" : "onset-snapped"}) → ${path.relative(process.cwd(), out)} at ${BED_LUFS} LUFS`);
console.log(`on phone speakers the bed sits ${phoneShift >= 0 ? phoneShift.toFixed(1) + " dB more" : (-phoneShift).toFixed(1) + " dB less"} present than on headphones`);
if (args.includes("--vocals")) {
  const dir = path.join(project.work, "music-vocals");
  fs.mkdirSync(dir, { recursive: true });
  const clip = path.join(dir, "window.wav");
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(start), "-t", String(D), "-i", src, "-ac", "1", "-ar", "16000", clip]);
  await hyperframes(["transcribe", clip, "--dir", dir, "--engine", "parakeet", "--json"], { capture: true });
  const words = JSON.parse(fs.readFileSync(path.join(dir, "transcript.json"), "utf8"));
  const list = (Array.isArray(words) ? words : words.words || []).map((w) => w.text);
  console.log(list.length ? `sung words in this stretch (${list.length}): ${list.slice(0, 20).join(" ")}` : "no sung words detected in this stretch");
}
console.log(`\nplan.mjs:\nexport const music = { file: "${slug}-bed.wav", src: "music/${slug}-bed.wav", volume: ${volume}, drops: [] }; // ${UNDER} LU under the voice`);
