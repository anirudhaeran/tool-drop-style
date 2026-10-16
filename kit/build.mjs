#!/usr/bin/env node
// Build a Tool-Drop-style HyperFrames composition from projects/<name>/plan.mjs.
//   td build <project>   (or: node <this skill>/kit/build.mjs <project dir>)
// The plan holds the creative decisions (shots, scene HTML/animation, captions, SFX); this file
// turns them into video/index.html using the shared kit (kit.css / kit.js / audio/).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { openProject, run, writeText, ok, log, warn, UserError } from "../engine/lib/util.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FONTS =
  "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=block";
const CAP_Y = { th: 1300, split: 1075, full: 1330, shot: 1330 };
const CAP_LEAD = 0.15; // captions appear this long before the word is spoken
const r3 = (n) => Math.round(n * 1000) / 1000;

const project = openProject(process.argv[2]);
const planFile = path.join(project.dir, "plan.mjs");
if (!fs.existsSync(planFile)) throw new UserError(`No plan at ${planFile}`);
const plan = await import(pathToFileURL(planFile).href + "?t=" + Date.now());
const PANEL = plan.speaker?.mode === "panel"; // clone variant: hard split instead of the floating card
const D = project.meta.cut?.duration;
if (!D) throw new UserError("Run the cut step first (td cut <project>).");

// ---- validate shot timing (on the plan's own timebase) -----------------------
plan.shots.forEach((s, i) => {
  // the first shot must cover composition time 0 (after timeScale and shift)
  const at0 = s.start * (Number(plan.timeScale) || 1) - (Number(plan.shift) || 0);
  if (i === 0 && at0 > 0.02) throw new UserError(`First shot must start at 0 (starts at ${at0.toFixed(3)}s after timeScale/shift)`);
  if (i > 0 && Math.abs(plan.shots[i - 1].end - s.start) > 1e-6) throw new UserError(`Gap/overlap between ${plan.shots[i - 1].id} and ${s.id}`);
});

// ---- timebase: a plan authored on another cut (e.g. sped up) is rescaled here --
// Every time position in the plan (shots, captions, SFX, music drops, animation positions)
// is multiplied by timeScale; tween durations stay as authored.
// plan.shift: cut seconds removed from the front after the plan was written (e.g. a hook re-cut that drops
// the opening line). Every position moves earlier by it; shots, captions and sounds that end before 0 drop out.
const TS = Number(plan.timeScale) || 1;
const SHIFT = Number(plan.shift) || 0;
const k = (t) => r3(t * TS - SHIFT);
const shots = plan.shots.map((s, i, all) => ({
  ...s,
  planStart: s.start,
  start: k(s.start),
  end: i === all.length - 1 ? D : k(s.end),
  caps: (s.caps || []).map(([t, text, opts = {}]) => [
    k(t),
    text,
    {
      ...opts,
      until: opts.until != null ? k(opts.until) : undefined,
      emph: opts.emph ? { ...opts.emph, at: k(opts.emph.at) } : undefined,
      count: opts.count ? { ...opts.count, t: k(opts.count.t), d: r3(opts.count.d * TS) } : undefined,
    },
  ]).filter(([t]) => t >= 0),
}))
  .filter((s) => s.end > 0.02)
  .map((s, i) => (i === 0 ? { ...s, start: 0 } : s));
if (Math.abs(k(plan.shots.at(-1).end) - D) > 0.08 && Math.abs(plan.shots.at(-1).end - D) > 0.08) {
  warn(`Last shot ends at ${k(plan.shots.at(-1).end)}s but footage is ${D}s`);
}
// SFX entries: legacy [name, t, vol] (t = start) or { s, at, align, lead, v } where the sound's
// start / peak / end is placed at `at` (plan time), minus `lead` real seconds. Peaks and durations
// come from audio/sfx.json (written by make-sfx.mjs).
const sfxMeta = fs.existsSync(path.join(HERE, "audio", "sfx.json")) ? JSON.parse(fs.readFileSync(path.join(HERE, "audio", "sfx.json"), "utf8")) : {};
const sfxEntries = (plan.sfx || []).map((e) => (Array.isArray(e) ? { s: e[0], at: e[1], v: e[2], align: "start" } : { align: "start", lead: 0, ...e }));
const drops = (plan.music?.drops || []).map(([a, b]) => [k(a), k(b)]);

// ---- assets -----------------------------------------------------------------
const assets = path.join(project.video, "assets");
fs.mkdirSync(path.join(assets, "audio"), { recursive: true });
const voice = path.join(assets, "voice.m4a");
if (!fs.existsSync(voice) || fs.statSync(voice).mtimeMs < fs.statSync(project.footage).mtimeMs) {
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", project.footage, "-vn", "-c:a", "copy", voice]);
}
const usedAudio = new Set([...sfxEntries.map((e) => e.s), plan.music?.file?.replace(/\.wav$/, "")].filter(Boolean));
const musicName = plan.music?.file?.replace(/.wav$/, "");
for (const name of usedAudio) {
  // a project's own music bed (plan.music.src, relative to the project folder) wins over the kit's audio
  const own = name === musicName && plan.music.src ? path.join(project.dir, plan.music.src) : null;
  const src = own || path.join(HERE, "audio", name + ".wav");
  if (!fs.existsSync(src)) throw new UserError(`Unknown audio "${name}" — run td setup`);
  fs.copyFileSync(src, path.join(assets, "audio", name + ".wav"));
}
const audioLen = {};
for (const name of usedAudio) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.join(assets, "audio", name + ".wav")], { capture: true });
  audioLen[name] = Number(stdout);
}
// Mix bus: gain per sound family (longest matching name prefix wins). Calibrated so effects
// complement rather than compete: the loudest effect moment sits ~8 dB under the voice's median
// momentary loudness (user feedback: "it should not disturb the video"). Plans can override via `mix`.
const MIX = { default: 0.45, "rise-": 0.33, "boom-": 0.37, "hit-": 0.35, "sparkle-sweep": 0.37, "ding-": 0.42, ...(plan.mix || {}) };
const mixGain = (name) => {
  const key = Object.keys(MIX).filter((p) => p !== "default" && name.startsWith(p)).sort((a, b) => b.length - a.length)[0];
  return key ? MIX[key] : MIX.default;
};
const sfxList = sfxEntries.map((e) => {
  const len = audioLen[e.s];
  const offset = e.align === "peak" ? sfxMeta[e.s]?.peak ?? 0 : e.align === "end" ? len : 0;
  let start = k(e.at) - (e.lead || 0) - offset;
  let mediaStart = 0;
  if (start < 0) [mediaStart, start] = [-start, 0]; // sound would begin before 0: skip its head
  return { name: e.s, start: r3(start), mediaStart: r3(mediaStart), dur: r3(Math.min(len - mediaStart, D - start)), vol: r3(e.v * mixGain(e.s)) };
});

// ---- captions ---------------------------------------------------------------
const captions = [];
for (const s of shots) {
  const pos = s.layout === "item" ? "full" : s.layout;
  const dark = ["dark", "black"].includes(s.theme) || s.layout === "shot" || s.layout === "th";
  const entries = (s.caps || []).map(([t, text, opts = {}]) => ({ t, text, ...opts }));
  entries.forEach((c, i) => {
    const show = Math.max(s.start, c.t - CAP_LEAD);
    const next = entries[i + 1];
    const hide = c.until ?? (next ? Math.max(show + 0.05, next.t - CAP_LEAD) : s.end);
    const font = c.font || (["th", "split"].includes(s.layout) ? "sans" : "serif");
    captions.push({
      text: c.text,
      font,
      tone: c.tone || (dark ? "light" : "dark"),
      pos,
      y: c.y ?? s.capY ?? (pos === "split" && PANEL ? 885 : CAP_Y[pos]),
      show: r3(show),
      hide: r3(Math.min(hide, s.end)),
      emph: c.emph ? { lead: c.emph.lead, key: c.emph.key, at: c.emph.at } : undefined,
      count: c.count,
    });
  });
}

// ---- markup -------------------------------------------------------------------
// speaker.mode "card" (default, Nick's floating card) or "panel" (clone variant: hard 50/50 split,
// speaker kept full size and moved down into the bottom half).
const speaker = { mode: "card", zoom: 1.22, shift: 577, ...(plan.speaker || {}) };
const panel = PANEL;
const video = (s, track) =>
  `<video id="v-${s.id}" class="clip" muted playsinline src="assets/footage.mp4" data-start="${s.start}" data-duration="${r3(s.end - s.start)}" data-media-start="${s.start}" data-track-index="${track}"></video>`;
const scenes = shots
  .filter((s) => s.layout !== "th")
  .map(
    (s) => `
      <div id="${s.id}" class="clip scene layout-${s.layout === "item" ? "full" : s.layout}${panel && s.layout === "split" ? " panel" : ""} theme-${s.theme || "white"}" data-start="${s.start}" data-duration="${r3(s.end - s.start)}" data-track-index="1">
        ${s.layout === "split" ? (panel ? '<div class="panel-seam"></div>' : '<div class="card-fill"></div>') : ""}
        <div class="stage">${s.html || ""}</div>
      </div>`,
  )
  .join("\n");
const splitVideo = (s) =>
  panel
    ? `<div class="aroll-panel" id="sp-${s.id}"><div class="frame" style="--panel-zoom:${speaker.zoom};--panel-shift:${speaker.shift}px">${video(s, 2)}</div></div>`
    : `<div class="aroll-split" id="sp-${s.id}"><div class="feather">${video(s, 2)}</div></div>`;
const arolls = shots
  .filter((s) => s.layout === "th" || s.layout === "split")
  .map((s) =>
    s.layout === "th"
      ? `<div class="aroll-th" id="th-${s.id}"><div class="zoom"${s.zoom ? ` style="transform: scale(${s.zoom})"` : ""}>${video(s, 2)}</div></div>`
      : splitVideo(s),
  )
  .join("\n      ");

const audio = [`<audio id="voice" src="assets/voice.m4a" data-start="0" data-duration="${D}" data-track-index="10" data-volume="1"></audio>`];
if (plan.music) {
  const cuts = [0, ...drops.flat(), D];
  for (let i = 0; i < cuts.length; i += 2) {
    const a = cuts[i];
    const b = cuts[i + 1];
    if (b - a < 0.05) continue;
    audio.push(
      `<audio id="music-${i / 2}" src="assets/audio/${plan.music.file}" data-start="${r3(a)}" data-duration="${r3(b - a)}" data-media-start="${r3(a)}" data-track-index="11" data-volume="${plan.music.volume}"></audio>`,
    );
  }
}
// Overlapping sounds go on separate tracks (first free track, from 12 up).
const trackEnds = [];
sfxList.forEach(({ name, start, mediaStart, dur, vol }, i) => {
  if (dur <= 0.02) return;
  let track = trackEnds.findIndex((end) => end <= start + 1e-6);
  if (track < 0) track = trackEnds.push(0) - 1;
  trackEnds[track] = start + dur;
  audio.push(
    `<audio id="sfx-${i}" src="assets/audio/${name}.wav" data-start="${start}" data-duration="${dur}"${mediaStart ? ` data-media-start="${mediaStart}"` : ""} data-track-index="${12 + track}" data-volume="${vol}"></audio>`,
  );
});

// ---- timeline script ----------------------------------------------------------
const anims = shots
  .filter((s) => s.anim)
  .map((s) => `  (${s.anim.toString()})(tlPlan, NS, ${s.planStart}, document.getElementById("${s.id}"));`)
  .join("\n");
const pushes = shots
  .filter((s) => s.layout === "th" && s.push)
  .map((s) => `  tl.fromTo("#th-${s.id}", { scale: 1 }, { scale: ${s.push}, duration: ${r3(s.end - s.start)}, ease: "sine.inOut", transformOrigin: "50% 42%" }, ${s.start});`)
  .join("\n");
const flashes = shots
  .filter((s) => s.layout !== "th" && s.start > 0) // no fade on frame 0 (it is the feed thumbnail)
  .map((s) => `  tl.fromTo("#${s.id} > .stage", { opacity: 0.35 }, { opacity: 1, duration: 0.07, ease: "none" }, ${s.start});`)
  .join("\n");

const kitCss = fs.readFileSync(path.join(HERE, "kit.css"), "utf8");
const kitJs = fs.readFileSync(path.join(HERE, "kit.js"), "utf8");
const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>${project.name}</title>
    <!-- Generated by the style-tool-drop kit (build.mjs) from plan.mjs — edit the plan, then rebuild. -->
    <link rel="stylesheet" href="${FONTS}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
${kitCss}
/* ---- plan.css ---- */
${plan.css || ""}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${D}" data-width="1080" data-height="1920">
${scenes}

      ${arolls}

      <div id="caps"></div>

      ${audio.join("\n      ")}
    </div>
    <script>
${kitJs}
    </script>
    <script>
  const tl = gsap.timeline({ paused: true });
  const CAPTIONS = ${JSON.stringify(captions)};
  NS.captions(tl, CAPTIONS);
  const tlPlan = NS.scaled(tl, ${TS}, ${SHIFT}); // scene animations were authored on the plan's timebase
${flashes}
${pushes}
${anims}
  window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
writeText(project.index, html);
fs.writeFileSync(
  path.join(project.video, "hyperframes.json"),
  JSON.stringify({ $schema: "https://hyperframes.heygen.com/schema/hyperframes.json", paths: { blocks: "compositions", components: "compositions/components", assets: "assets" }, media: { autoProxy: true } }, null, 2) + "\n",
);
ok(`Built ${path.relative(process.cwd(), project.index)}: ${shots.length} shots, ${captions.length} captions, ${sfxList.length} SFX, ${D}s${TS !== 1 ? ` (plan timebase ×${TS})` : ""}`);
