#!/usr/bin/env node
// Quality checks for a styled project (see references/qa.md).
//   node engine/qa.mjs frames <project>   one snapshot per shot → projects/<name>/review/shots.png
//   node engine/qa.mjs sfx <project>      effects bus vs voice (re-mixes the SFX exactly as placed)
//   node engine/qa.mjs placement <project> where effects land vs cuts and each other (density, gaps, repeats)
//   node engine/qa.mjs seams <project>    rendered export: no seam line bleeding into non-split shots
//   node engine/qa.mjs all <project>
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { openProject, run, hyperframes, heading, ok, warn, log, UserError, readComposition, paletteMetaFile } from "./lib/util.mjs";

const ff = (args, opts) => run("ffmpeg", ["-hide_banner", "-nostats", "-loglevel", "error", ...args], opts);

function readIndex(project) {
  if (!fs.existsSync(project.index)) throw new UserError("No composition yet — build the project first.");
  return readComposition(project.index);
}

/** Shots from the generated composition: scene divs + talking-head videos, sorted by start. */
function shotsOf(html) {
  const byId = new Map();
  for (const m of html.matchAll(/<div id="(s\d+)" class="clip scene ([^"]+)" data-start="([\d.]+)" data-duration="([\d.]+)"/g)) {
    byId.set(m[1], { id: m[1], kind: m[2].includes("panel") ? "split" : m[2].match(/layout-(\w+)/)[1], start: +m[3], dur: +m[4] });
  }
  for (const m of html.matchAll(/<video id="v-(s\d+)"[^>]*data-start="([\d.]+)" data-duration="([\d.]+)"/g)) {
    if (!byId.has(m[1])) byId.set(m[1], { id: m[1], kind: "th", start: +m[2], dur: +m[3] });
  }
  return [...byId.values()].sort((a, b) => a.start - b.start);
}

async function frames(project) {
  heading("Frames — one snapshot per shot");
  const shots = shotsOf(readIndex(project));
  const at = shots.map((s) => (s.start + s.dur * 0.75).toFixed(2)); // late in the shot, after entrances
  const out = path.join(project.dir, "review", "frames");
  fs.rmSync(out, { recursive: true, force: true });
  await hyperframes(["snapshot", project.video, "--at", at.join(","), "--no-end", "-o", out, "--timeout", "15000"], { capture: true });
  const pngs = fs.readdirSync(out).filter((f) => f.startsWith("frame-") && f.endsWith(".png")).sort();
  const list = path.join(out, "list.txt");
  fs.writeFileSync(list, pngs.map((f) => `file '${path.join(out, f).replace(/\\/g, "/")}'`).join("\n"));
  const sheet = path.join(project.dir, "review", "shots.png");
  const cols = Math.min(8, pngs.length);
  await ff(["-y", "-f", "concat", "-safe", "0", "-i", list, "-vf", `scale=240:-2,tile=${cols}x${Math.ceil(pngs.length / cols)}:padding=4:color=gray`, "-frames:v", "1", sheet]);
  ok(`${pngs.length} shots → ${path.relative(process.cwd(), sheet)} (look at it: text overlaps, empty frames, cut-off graphics)`);
}

async function momentary(file) {
  const { stdout } = await ff(["-i", file, "-af", "ebur128=metadata=1,ametadata=mode=print:key=lavfi.r128.M:file=-", "-f", "null", "-"], { capture: true });
  const lines = stdout.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].match(/pts_time:([\d.]+)/);
    if (t) out.push({ t: +t[1], m: parseFloat((lines[i + 1] || "").split("=")[1]) });
  }
  return out;
}

async function integrated(file) {
  const { stderr } = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { capture: true });
  return { I: Number((stderr.match(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold/) ?? [])[1]), peak: Number((stderr.match(/Peak:\s+(-?[\d.]+) dBFS/) ?? [])[1]) };
}

async function sfx(project) {
  heading("SFX balance — effects bus vs voice");
  const html = readIndex(project);
  const els = [...html.matchAll(/<audio id="(sfx-\d+)" src="([^"]+)" data-start="([\d.]+)" data-duration="([\d.]+)"(?: data-media-start="([\d.]+)")? data-track-index="\d+" data-volume="([\d.]+)"/g)].map((m) => ({ src: m[2], start: +m[3], dur: +m[4], ms: +(m[5] || 0), vol: +m[6] }));
  if (!els.length) return warn("No SFX in this composition.");
  const D = Number(html.match(/data-composition-id="main"[^>]*data-duration="([\d.]+)"/)[1]);
  const stem = path.join(project.work, "qa-sfx-bus.wav");
  const graphFile = path.join(project.work, "qa-sfx-graph.txt");
  const chains = els.map((e, i) => `[${i}:a]aresample=48000,atrim=${e.ms}:${e.ms + e.dur},asetpts=PTS-STARTPTS,volume=${e.vol},adelay=${Math.round(e.start * 1000)}:all=1[s${i}]`);
  fs.writeFileSync(graphFile, chains.join(";") + ";" + els.map((_, i) => `[s${i}]`).join("") + `amix=inputs=${els.length}:normalize=0:duration=longest,apad=whole_dur=${D}[out]`);
  await ff(["-y", ...els.flatMap((e) => ["-i", path.join(project.video, e.src)]), "-/filter_complex", graphFile, "-map", "[out]", "-t", String(D), stem]);
  const voiceFile = path.join(project.video, "assets", "voice.m4a");
  const [vI, sI, vM, sM] = [await integrated(voiceFile), await integrated(stem), await momentary(voiceFile), await momentary(stem)];
  const vVals = vM.map((x) => x.m).filter((m) => m > -40).sort((a, b) => a - b);
  const vMedian = vVals[Math.floor(vVals.length / 2)];
  const peaks = sM.filter((x, i) => x.m > -45 && x.m >= (sM[i - 1]?.m ?? -99) && x.m >= (sM[i + 1]?.m ?? -99)).sort((a, b) => b.m - a.m);
  const names = (t) => els.filter((e) => t - 0.4 <= e.start + e.dur && t >= e.start).map((e) => path.basename(e.src, ".wav")).join("+");
  log(`${els.length} effects. Voice ${vI.I} LUFS (median momentary ${vMedian.toFixed(1)}), effects bus ${sI.I} LUFS → ${(vI.I - sI.I).toFixed(1)} LU under the voice`);
  for (const p of peaks.slice(0, 6)) console.log(`    ${p.t.toFixed(1)}s  ${p.m.toFixed(1)} LUFS (${(p.m - vMedian).toFixed(1)} dB vs voice median)  ${names(p.t)}`);
  const loudest = peaks[0]?.m ?? -99;
  const busGap = vI.I - sI.I;
  if (loudest > vMedian - 6 || busGap < 12) warn(`Effects are hot: target loudest moment ≤ ${(vMedian - 8).toFixed(1)} LUFS and bus ≥ 13 LU under the voice. Lower the mix bus or the loudest sounds above.`);
  else ok(`Effects complement the voice (loudest ${(loudest - vMedian).toFixed(1)} dB under its median; bus ${busGap.toFixed(1)} LU under).`);
  const perSec = els.length / D;
  log(`Density: ${(perSec * 10).toFixed(1)} effects per 10 s (~18 felt "very over"); see the placement check for moments, cuts and spacing.`);
  fs.rmSync(graphFile, { force: true });
}

// Placement targets — from the three style references (L−R channel) and sound-design practice; see
// references/sound-placement.md for the reasoning behind each number.
const PLACE = { perTen: [3, 6], cutCover: 0.7, minGap: 0.4, bigMax: 5, sameWithin: 4 };

async function placement(project) {
  heading("SFX placement — where sounds land relative to cuts and each other");
  const html = readIndex(project);
  const style = project.config.style;
  const metaFile = paletteMetaFile(style);
  const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, "utf8")) : {};
  const fx = [...html.matchAll(/<audio id="sfx-\d+" src="assets\/audio\/([^"]+)\.wav" data-start="([\d.]+)"/g)]
    .map((m) => ({ name: m[1], start: +m[2], hit: +m[2] + (meta[m[1]]?.peak ?? 0) }))
    .sort((a, b) => a.hit - b.hit);
  if (!fx.length) return warn("No SFX in this composition.");
  const D = Number(html.match(/data-composition-id="main"[^>]*data-duration="([\d.]+)"/)[1]);
  const cuts = shotsOf(html).map((s) => s.start).filter((t) => t > 0.05);
  // a "moment" = sounds landing within 0.3 s of each other, or one run of list pops
  const moments = [];
  for (const f of fx) {
    const last = moments.at(-1);
    const popRun = last && f.name.startsWith("pop-step") && last.names.at(-1).startsWith("pop-step") && f.hit - last.end < 0.7;
    if (last && (f.hit - last.end < 0.3 || popRun)) { last.names.push(f.name); last.end = f.hit; }
    else moments.push({ t: f.hit, end: f.hit, names: [f.name] });
  }
  const per10 = (moments.length / D) * 10;
  const windows = [];
  for (let t = 0; t < D - 1; t += 10) windows.push(moments.filter((m) => m.t >= t && m.t < t + 10).length);
  // a cut carries a sound when one lands on it, starts on it (typing, swishes) or a riser peaks into it
  const covered = cuts.filter((c) => fx.some((f) => Math.abs(f.hit - c) <= 0.35 || Math.abs(f.start - c) <= 0.2 || (f.name.startsWith("rise-") && Math.abs(f.hit + 0.08 - c) < 0.2)));
  const gaps = moments.slice(1).map((m, i) => +(m.t - moments[i].end).toFixed(2));
  const tight = moments.slice(1).filter((m, i) => m.t - moments[i].end < PLACE.minGap);
  const big = fx.filter((f) => /^(boom|hit)-/.test(f.name));
  const repeats = fx.filter((f, i) => !f.name.startsWith("pop-step") && fx.some((g, j) => j < i && g.name === f.name && f.hit - g.hit < PLACE.sameWithin));
  const uses = {};
  fx.forEach((f) => { const k = f.name.replace(/-\d$/, ""); uses[k] = (uses[k] || 0) + 1; });

  log(`${fx.length} effects in ${moments.length} moments → ${per10.toFixed(1)} moments per 10 s (target ${PLACE.perTen.join("–")}; references 3.2–5.4). Per 10 s: ${windows.join(" · ")}`);
  const medGap = [...gaps].sort((a, b) => a - b)[gaps.length >> 1];
  log(`Gaps between moments: min ${Math.min(...gaps).toFixed(2)} s, median ${medGap?.toFixed(2)} s (references: min 0.43, median 1.3–2.4 s)`);
  log(`Cuts carrying a sound: ${covered.length}/${cuts.length} (${Math.round((100 * covered.length) / cuts.length)}%; references 77–92%)`);
  log(`Impacts (boom/hit): ${big.length} (references reserve 3–4 big moments per reel)`);
  log(`Most used: ${Object.entries(uses).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => `${k}×${n}`).join(", ")}`);
  let issues = 0;
  if (per10 < PLACE.perTen[0]) { issues++; warn("Underkill: too few sound moments — graphics will land in silence."); }
  if (per10 > PLACE.perTen[1]) { issues++; warn("Overkill: too many sound moments — merge or drop the weakest."); }
  if (covered.length / cuts.length < PLACE.cutCover) {
    issues++;
    warn(`Bare cuts: ${cuts.filter((c) => !covered.includes(c)).map((c) => c.toFixed(2)).join(", ")} — give most cuts a soft transition or a landing sound.`);
  }
  for (const m of tight) { issues++; warn(`Crowded: ${m.names.join("+")} @${m.t.toFixed(2)} s lands < ${PLACE.minGap} s after the previous sound.`); }
  if (big.length > PLACE.bigMax) { issues++; warn(`${big.length} impacts — keep the big hits for ≤ ${PLACE.bigMax} moments so they stay big.`); }
  for (const r of repeats) { issues++; warn(`Repeat: ${r.name} @${r.hit.toFixed(2)} s again within ${PLACE.sameWithin} s — vary it.`); }
  if (!issues) ok("Placement matches the targets.");
}

async function seams(project) {
  heading("Seams — no split-screen line on other shots");
  const exportFile = path.join(project.exports, `${project.name}.mp4`);
  if (!fs.existsSync(exportFile)) throw new UserError("Render first — seams are checked on the exported video.");
  const html = readIndex(project);
  if (!html.includes("aroll-panel")) return ok("No 50/50 panel split in this project — nothing to check.");
  const shots = shotsOf(html).filter((s) => s.kind !== "split" && s.kind !== "th");
  let bad = 0;
  for (const s of shots) {
    const t = (s.start + s.dur / 2).toFixed(2);
    const rows = [];
    for (const y of [890, 950, 1010]) {
      // raw bytes (the shared run() helper decodes text, which would corrupt pixel values)
      const px = execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-ss", t, "-i", exportFile, "-frames:v", "1", "-vf", `crop=1000:2:40:${y},scale=1:1:flags=area,format=gray`, "-f", "rawvideo", "-"]);
      rows.push(px[0]);
    }
    const dip = Math.min(rows[0], rows[2]) - rows[1];
    if (dip > 6) {
      bad++;
      warn(`${s.id} @${t}s: dark line at the seam (rows 890/950/1010 = ${rows.join("/")})`);
    }
  }
  if (!bad) ok(`No seam line on any of ${shots.length} non-split graphic shots.`);
}

const [cmd, target] = process.argv.slice(2);
const project = openProject(target);
const jobs = { frames, sfx, placement, seams };
try {
  if (cmd === "all") for (const j of Object.values(jobs)) await j(project);
  else if (jobs[cmd]) await jobs[cmd](project);
  else throw new UserError("Usage: node engine/qa.mjs frames|sfx|placement|seams|all <project>");
} catch (err) {
  console.error(`\n✗ ${err instanceof UserError ? err.message : err.stack ?? err}`);
  process.exit(1);
}
