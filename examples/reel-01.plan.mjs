// EXAMPLE plan (23 shots, Tool-Drop style): a "5 Claude skills" reel. The images and logos it references are not
// included: copy it to projects/<name>/plan.mjs, then swap in your own shots, assets and word times
// (from work/cut-transcript.json). Build: td build <name>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const END = JSON.parse(fs.readFileSync(path.join(DIR, "project.json"), "utf8")).cut.duration;
const logo = (name, color) =>
  fs
    .readFileSync(path.join(DIR, "video", "assets", "logos", name + ".svg"), "utf8")
    .replace(/fill="#[0-9A-Fa-f]{3,6}"/g, 'fill="currentColor"')
    .replace(/\s(width|height)="[^"]*"/g, "")
    .replace("<svg", `<svg style="color:${color}"`);

// ---------- art ----------
const MASCOT = (w, color = "#D97757") =>
  `<svg class="mascot" width="${w}" height="${(w * 7) / 14}" viewBox="0 0 14 7" xmlns="http://www.w3.org/2000/svg"><g fill="${color}"><rect x="2" y="0" width="10" height="5"/><rect x="0" y="2" width="2" height="2"/><rect x="12" y="2" width="2" height="2"/><rect x="3" y="5" width="1" height="2"/><rect x="5" y="5" width="1" height="2"/><rect x="8" y="5" width="1" height="2"/><rect x="10" y="5" width="1" height="2"/></g><g fill="#2b1a12"><rect x="4" y="1" width="1" height="2"/><rect x="9" y="1" width="1" height="2"/></g></svg>`;
const ICON = {
  triangle: `<svg viewBox="0 0 100 100"><polygon points="50,14 90,84 10,84" fill="#fff"/></svg>`,
  bolt: `<svg viewBox="0 0 100 100"><path d="M58 6 L20 56 H46 L38 94 L80 40 H54 Z" fill="#FFD43B"/></svg>`,
  frontend: `<svg viewBox="0 0 100 100" fill="none"><rect x="10" y="18" width="80" height="64" rx="10" stroke="#fff" stroke-width="6"/><line x1="10" y1="36" x2="90" y2="36" stroke="#fff" stroke-width="6"/><circle cx="21" cy="27" r="3" fill="#fff"/><circle cx="31" cy="27" r="3" fill="#fff"/><rect x="22" y="47" width="30" height="24" rx="4" fill="#fff"/><rect x="58" y="47" width="20" height="9" rx="3" fill="#fff" opacity=".7"/><rect x="58" y="62" width="20" height="9" rx="3" fill="#fff" opacity=".7"/></svg>`,
  megaphone: `<svg viewBox="0 0 100 100" fill="none"><path d="M16 42v18a6 6 0 0 0 6 6h8l28 16V20L30 36h-8a6 6 0 0 0-6 6z" fill="#fff"/><path d="M36 66l6 18h10l-6-16z" fill="#fff"/><path d="M70 36q10 14 0 28" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M79 26q18 24 0 48" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".6"/></svg>`,
  eye: `<svg viewBox="0 0 100 100"><path d="M6 50Q50 8 94 50Q50 92 6 50Z" fill="#fff" stroke="#1d1d1f" stroke-width="5"/><circle cx="50" cy="50" r="20" fill="#8a5a2b"/><circle cx="50" cy="50" r="9" fill="#111"/><circle cx="56" cy="44" r="4" fill="#fff"/></svg>`,
  plan: `<svg viewBox="0 0 48 48" fill="none" stroke="#D97757" stroke-width="4" stroke-linecap="round"><path d="M14 14h22M14 24h22M14 34h14"/><circle cx="8" cy="14" r="1.5" fill="#D97757"/><circle cx="8" cy="24" r="1.5" fill="#D97757"/><circle cx="8" cy="34" r="1.5" fill="#D97757"/></svg>`,
  test: `<svg viewBox="0 0 48 48" fill="none" stroke="#D97757" stroke-width="4" stroke-linejoin="round"><path d="M18 6h12M20 6v12L9 38a4 4 0 0 0 3.5 6h23a4 4 0 0 0 3.5-6L28 18V6"/><path d="M14 30h20"/></svg>`,
  check: `<svg viewBox="0 0 48 48" fill="none" stroke="#D97757" stroke-width="4" stroke-linecap="round"><circle cx="21" cy="21" r="12"/><path d="M30 30l10 10"/><path d="M15 21l4 4 8-8"/></svg>`,
};
const TILE = {
  one: { bg: "#000", icon: ICON.triangle },
  two: { bg: "linear-gradient(135deg,#2a1b5e,#5b2bd1)", icon: ICON.bolt },
  three: { bg: "linear-gradient(135deg,#e39577,#c35a3c)", icon: ICON.frontend },
  four: { bg: "linear-gradient(135deg,#ffa24a,#ef4e2a)", icon: ICON.megaphone },
  five: { bg: "#fff", icon: ICON.eye, border: "3px solid #ececec" },
};
const tile = (k, cls = "tile") => `<div class="${cls}" style="background:${TILE[k].bg};${TILE[k].border ? `border:${TILE[k].border}` : ""}">${TILE[k].icon}</div>`;
const item = (word, k) => `<div class="item"><div class="item-head">${word}</div>${tile(k)}</div>`;
const genericSite = () =>
  `<div class="site generic"><div class="site-nav"><i></i><i></i><i></i></div><div class="site-hero"><div class="bar" style="width:70%"></div><div class="bar" style="width:46%"></div><div class="btns"><span></span><span></span></div></div><div class="strike"></div></div>`;

// The times below were authored on a 1.12× cut and the footage was re-cut at 1.06×,
// so timeScale rescales every time position by 1.12 / 1.06. Delete it when your times match your cut.
export const timeScale = 1.12 / 1.06;

// Head-and-shoulders footage (an AI avatar with a faded bottom): hard 50/50 split, speaker kept full size.
export const speaker = { mode: "panel", zoom: 1.0, shift: 570 };

// Music: bed.wav is the kit's synthesized placeholder. Replace this line with the one `td music-fit <name> "<file>"`
// prints for a licensed track (it adds `src`). volume 0.114 sits about 20 LU under the voice. No music stops with a real song.
export const music = { file: "bed.wav", volume: 0.114, drops: [] };

// ---------- sound design (palette: .claude/skills/style-tool-drop/kit/audio/sfx.json) ----------
// Rules: references/sound-placement.md. Every sound has a job — a sync point
// (something lands, a count finishes, a logo resolves, a section changes), never mere motion.
//   HERO (2): a big hit with quiet before it — s04 ONE, s19 "cherry-pick".
//   CTA: no hit — one light accent on the keyword ("SKILLS"); big finishes there tend to feel heavy.
//   PRIMARY: list pops as one rising run per list (start pitch rotates), number landings = dings rising in
//            pitch through the video, one positive / one negative accent.
//   SECONDARY: a soft whoosh peaking on a cut INTO a new graphic; cuts back to the talking head stay dry.
//   Section cards TWO–FIVE get their own riser only (no boom), so the heroes stay big.
// at()     — the sound starts at t
// hitOn()  — the sound's loudest point lands on t (impacts, dings, whooshes peaking on the cut)
// riseInto — a riser crests 0.08 s before the cut and the cut silences it (measured in the references)
const at = (s, t, v) => ({ s, at: t, v });
const hitOn = (s, t, v) => ({ s, at: t, v, align: "peak" });
const riseInto = (s, cut, v = 0.28) => ({ s, at: cut, v, align: "peak", lead: 0.08 });
const steps = (times, v = 0.2, from = 1) => times.map((t, i) => at(`pop-step-${((from - 1 + i) % 5) + 1}`, t, v)); // rising pop run
const whoosh = (s, cut, v = 0.18) => hitOn(s, cut, v); // secondary: peaks on the cut into a new graphic

export const sfx = [
  hitOn("ding-bell-low", 0.92, 0.18), // s01 count lands on 3,000,000 (hook)
  ...steps([1.96, 2.18, 2.4]), // s02 five tiles fan in → one rising run
  // s03 "top 1%" stays dry: quiet before the first hero
  riseInto("rise-air", 4.38, 0.22), hitOn("boom-deep", 4.4, 0.3), // s04 ONE — HERO
  at("zoom-swipe", 5.42, 0.22), // s05 screenshot cuts in, whoosh crests as the zoom starts (5.72)
  at("typing-elec", 6.86, 0.14), // s06 prompt being typed
  ...steps([9.21, 9.33, 9.45], 0.18, 3), // s06 "Installed ✓" ×3 — higher run (success)
  riseInto("rise-whip", 10.0), // s07 TWO
  whoosh("swish-info", 11.0), // s08 GitHub card cuts in
  hitOn("ding-bell", 11.93, 0.16), // s08 star lights at 200K
  ...steps([14.01, 14.36, 14.93], 0.2, 1), // s09 plan / test / check ✓
  whoosh("swish-freeze", 17.0, 0.13), // s11 THREE
  hitOn("pop-kalimba", 18.16, 0.2), // s12 Anthropic logo resolves — light, warm
  hitOn("ding-bell-mid", 19.96, 0.16), // s13 count lands on 1,000,000
  whoosh("swish-cloth", 20.36), // s14 site cuts in
  hitOn("deny-ui", 22.42, 0.17), // s14 strike-through on AI-built sites (negative, non-meme)
  riseInto("rise-electric", 23.12, 0.26), // s15 FOUR
  at("zoom-ui", 24.08, 0.2), // s16 screenshot cuts in + zoom
  hitOn("ding-bell-up", 25.78, 0.15), // s17 count lands on 66
  ...steps([26.87, 27.44, 28.01, 28.37], 0.19, 2), // s18 SEO / copywriting / ads / cold email
  hitOn("boom-sub", 29.57, 0.52), // s19 "cherry-pick" — HERO (the music plays through; no stop)
  riseInto("rise-stutter", 31.28, 0.26), // s20 FIVE
  whoosh("swish-c", 32.72), // s21 terminal cuts in
  at("success-confirm", 34.29, 0.15), // s21 "correction captured" (positive)
  whoosh("swish-e", 36.28, 0.16), // s22 chart card cuts in
  hitOn("sparkle-hit", 37.95, 0.14), // s22 line reaches the top
  hitOn("pop-kalimba", 39.36, 0.2), // s23 CTA — no hit: a light warm accent as "SKILLS" lands
];

export const css = `
.row { display:flex; align-items:center; justify-content:center; }
.col { display:flex; flex-direction:column; align-items:center; }
.tile.sm { width:160px; height:160px; border-radius:42px; margin:0; }
/* s01 */ .s01 { gap:30px; } .s01-num { font-size:150px; color:var(--ns-ink); }
/* s02 */ .s02 { gap:22px; }
/* s05/s16 */ .s05-hl { left:76.5%; top:22%; width:11.5%; height:16%; }
/* s06 */ .s06 { width:900px; gap:34px; align-items:stretch; }
.s06-input { height:150px; display:flex; align-items:center; gap:24px; padding:0 40px; font:500 44px var(--ns-sans); color:#2b2723; }
.s06-star { color:var(--ns-accent); font-size:60px; line-height:1; }
.s06-caret { width:4px; height:52px; background:var(--ns-accent); }
.s06-row { height:124px; display:flex; align-items:center; gap:26px; padding:0 30px; }
.s06-name { flex:1; font:600 38px var(--ns-mono); color:#222; }
/* s08 */ .s08 { width:920px; gap:50px; }
.s08-gh svg { width:140px; height:140px; }
.s08-repo { width:100%; padding:44px 48px; }
.s08-title { font:500 46px var(--ns-sans); color:#58a6ff; display:flex; align-items:center; gap:14px; }
.s08-public { border:2px solid #30363d; color:#8b949e; font-size:24px; padding:6px 16px; }
.s08-desc { margin-top:18px; font:400 32px/1.4 var(--ns-sans); color:#8b949e; }
.s08-stars { margin-top:30px; display:flex; align-items:center; gap:22px; }
.s08-star { width:84px; height:84px; fill:none; stroke:#8b949e; stroke-width:1.6; }
.s08-num { font:800 120px/1 var(--ns-sans); color:#fff; letter-spacing:-0.04em; }
.s08-lbl { font:500 40px var(--ns-sans); color:#8b949e; align-self:flex-end; padding-bottom:16px; }
/* s09 */ .s09 { gap:60px; }
.s09-steps { gap:18px; }
.s09-step { width:270px; height:300px; position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:26px; }
.s09-step svg { width:96px; height:96px; }
.s09-name { font:700 50px var(--ns-sans); letter-spacing:-0.03em; color:#1b1b1b; }
.s09-ok { position:absolute; top:-22px; right:-22px; width:64px; height:64px; border-radius:50%; background:var(--ns-green); color:#fff; font:800 36px/64px var(--ns-sans); text-align:center; box-shadow:0 8px 20px rgba(48,164,108,.4); }
.s09-arrow { width:60px; height:40px; }
.s09-pass { font-size:38px; padding:16px 30px; }
/* s12 */ .s12 { gap:44px; } .s12-mark svg { width:330px; height:auto; } .s12-word { font:600 92px/1 var(--ns-sans); letter-spacing:0.08em; color:#191919; }
/* s13 */ .s13 { gap:30px; } .s13-num { font-size:165px; color:var(--ns-red); } .s13-src .pill { font-size:30px; }
/* s14 */ .s14 { gap:56px; }
.site { position:relative; border-radius:20px; overflow:hidden; background:#fff; box-shadow:0 18px 44px rgba(0,0,0,.14); }
.site-nav { height:16%; display:flex; align-items:center; gap:8px; padding:0 6%; background:#fff; }
.site-nav i { width:9%; height:22%; border-radius:6px; background:#e3e3ea; }
.site.generic { width:290px; height:200px; }
.site.generic .site-hero { height:84%; background:linear-gradient(135deg,#6d5dfc,#b06ab3); padding:12% 10%; display:flex; flex-direction:column; gap:9%; }
.site.generic .bar { height:12%; border-radius:6px; background:rgba(255,255,255,.85); }
.site.generic .btns { display:flex; gap:8px; margin-top:4%; } .site.generic .btns span { width:26%; height:22px; border-radius:11px; background:#fff; }
.site.generic .btns span + span { background:rgba(255,255,255,.35); }
.strike { position:absolute; left:-6%; top:47%; width:112%; height:12px; border-radius:6px; background:var(--ns-red); }
.s14-yours { width:600px; height:420px; background:#f6f1e7; padding:42px 48px; display:flex; flex-direction:column; gap:22px; }
.s14-yours .y-nav { display:flex; justify-content:space-between; font:600 22px var(--ns-sans); color:#6b5d50; letter-spacing:.12em; }
.s14-yours .y-title { font-family:var(--ns-serif); font-style:italic; font-size:104px; line-height:.95; color:#1d1a16; }
.s14-yours .y-line { width:150px; height:8px; border-radius:4px; background:var(--ns-accent); }
.s14-yours .y-img { position:absolute; right:42px; bottom:42px; width:200px; height:150px; border-radius:16px; background:linear-gradient(135deg,#d97757,#7a3b25); }
.s14-frame { position:absolute; inset:-14px; border:7px solid var(--ns-accent); border-radius:30px; }
.s14-row { gap:24px; } .s14-wrap { position:relative; }
/* s17 */ .s17 { gap:46px; } .s17-num { font-size:190px; color:var(--ns-ink); }
.s17-box { position:relative; padding:34px; }
.s17-grid { display:grid; grid-template-columns:repeat(11,56px); gap:12px; }
.s17-grid i { width:56px; height:56px; border-radius:14px; background:var(--ns-accent); }
.s17-grid i:nth-child(3n) { background:#e9a184; } .s17-grid i:nth-child(5n) { background:#b9563a; }
.s17-outline { position:absolute; inset:0; border:5px solid #111; border-radius:34px; }
.s17-tag { position:absolute; top:-34px; right:-20px; font-size:34px; }
/* s18 */ .s18 { position:relative; width:1080px; height:1060px; }
.s18 svg.links { position:absolute; inset:0; }
.s18-node { position:absolute; left:540px; top:530px; width:0; height:0; }
.s18-node > div { position:absolute; left:-190px; top:-70px; width:380px; height:140px; display:flex; align-items:center; justify-content:center; gap:18px; font:600 36px var(--ns-mono); color:#222; }
.s18-node .tile.xs { width:72px; height:72px; border-radius:20px; margin:0; box-shadow:none; }
.s18-chip { position:absolute; width:0; height:0; }
.s18-chip > div { position:absolute; transform-origin:50% 50%; white-space:nowrap; }
.s18-chip.main > div { left:-170px; top:-50px; width:340px; height:100px; display:flex; align-items:center; justify-content:center; gap:16px; font:700 44px var(--ns-sans); letter-spacing:-.02em; color:#1b1b1b; }
.s18-chip.main i { width:18px; height:18px; border-radius:50%; background:var(--ns-accent); }
.s18-chip.small > div { left:-110px; top:-34px; width:220px; height:68px; display:flex; align-items:center; justify-content:center; font:600 30px var(--ns-sans); color:#6d655f; background:#f3f0ec; border-radius:999px; }
/* s21 */ .s21 { width:880px; gap:16px; align-items:stretch; }
.s21-term { padding:24px 32px 26px; }
.s21-head { display:flex; align-items:center; gap:22px; padding-bottom:16px; border-bottom:1px solid #eee; }
.s21-dots { display:flex; gap:10px; } .s21-dots i { width:18px; height:18px; border-radius:50%; background:#e2ddd7; }
.s21-title { flex:1; font-size:28px; color:#8a8079; }
.s21-watch { font-size:26px; padding:10px 18px; }
.s21-lines { padding-top:16px; display:flex; flex-direction:column; gap:10px; font-size:32px; color:#2b2723; }
.s21-l { position:relative; padding:8px 14px; } .s21-who { color:var(--ns-accent); margin-right:14px; }
.s21-hl { position:absolute; inset:0; border-radius:10px; background:rgba(217,119,87,.22); }
.s21-cap { margin-top:16px; font-size:28px; }
.s21-file { height:78px; display:flex; align-items:center; justify-content:space-between; padding:0 28px; font-size:30px; }
.s21-up { font-size:28px; }
/* s22 */ .s22 { width:940px; padding:40px 44px 50px; position:relative; }
.s22 svg { width:100%; height:auto; overflow:visible; }
.s22-tag { position:absolute; right:56px; top:46px; font-size:32px; }
`;

export const shots = [
  {
    id: "s01", start: 0, end: 1.8, layout: "split", theme: "beige",
    html: `<div class="col s01"><div class="s01-mascot">${MASCOT(230)}</div><div class="big-num s01-num">0</div><div class="label s01-label">Claude skills</div></div>`,
    anim: (tl, NS, t, el) => {
      // visible from frame 0 (first frame = feed thumbnail); the number counts up as it is said
      NS.count(tl, el.querySelector(".s01-num"), 0, 3000000, t + 0.02, 0.9, "int", "", "+");
      tl.to(el.querySelector(".s01-mascot"), { y: -14, duration: 0.25, yoyo: true, repeat: 3, ease: "sine.inOut" }, t + 0.5);
    },
    caps: [[0, "there are"], [0.36, "over 3"], [0.71, "million"], [0.93, "Claude"], [1.36, "skills now"]],
  },
  {
    id: "s02", start: 1.8, end: 2.72, layout: "full", theme: "white",
    html: `<div class="row s02">${["one", "two", "three", "four", "five"].map((k) => tile(k, "tile sm s02-t")).join("")}</div>`,
    anim: (tl, NS, t, el) => {
      const tiles = el.querySelectorAll(".s02-t");
      const rot = [-9, -4, 0, 4, 9];
      const dy = [34, 10, 0, 10, 34];
      tiles.forEach((n, i) => tl.fromTo(n, { opacity: 0, y: 140, rotation: 0, scale: 0.7 }, { opacity: 1, y: dy[i], rotation: rot[i], scale: 1, duration: 0.34, ease: "back.out(1.8)" }, t + 0.16 + i * 0.11));
    },
    caps: [[1.86, "but you"], [2.14, "just need"], [2.36, "these five"]],
  },
  {
    id: "s03", start: 2.72, end: 4.38, layout: "th", push: 1.07,
    caps: [[2.79, "to be a"], [3.07, "", { emph: { lead: "top", key: "1%", at: 3.29 } }], [3.71, "Claude user"]],
  },
  {
    id: "s04", start: 4.38, end: 5.42, layout: "item", theme: "white",
    html: item("One", "one"),
    anim: (tl, NS, t, el) => NS.item(tl, el.querySelector(".item"), t + 0.02),
    caps: [[4.79, "find skills"]],
  },
  {
    id: "s05", start: 5.42, end: 6.72, layout: "shot", theme: "black",
    html: `<div class="shot-bg" style="background-image:url(assets/img/findskills.png)"></div><div class="shot-card s05-card"><img src="assets/img/findskills.png" /><div class="hl-box s05-hl"></div></div>`,
    anim: (tl, NS, t, el) => {
      const card = el.querySelector(".s05-card");
      NS.pop(tl, card, t + 0.02, { y: 50, scale: 1 });
      NS.bounce(tl, el.querySelector(".s05-hl"), 5.8);
      NS.zoom(tl, card, 5.72, 0.5, 2.3, "82% 30%");
    },
    caps: [[5.5, "3.7 million", { count: { from: 0.4, to: 3.7, t: 5.5, d: 0.6, fmt: "dec1", post: " MILLION" } }], [6.36, "installs"]],
  },
  {
    id: "s06", start: 6.72, end: 10.0, layout: "split", theme: "beige",
    html: `<div class="col s06">
      <div class="ui-card s06-input"><span class="s06-star">✳</span><span class="s06-text"></span><span class="s06-caret"></span></div>
      <div class="col s06-list" style="gap:20px;align-items:stretch">
        ${["frontend-design", "seo-audit", "copywriting"].map((n) => `<div class="ui-card s06-row">${MASCOT(64)}<div class="s06-name">${n}</div><div class="pill green s06-ok">Installed ✓</div></div>`).join("")}
      </div></div>`,
    anim: (tl, NS, t, el) => {
      NS.pop(tl, el.querySelector(".s06-input"), t + 0.03);
      NS.type(tl, el.querySelector(".s06-text"), "I'm building a SaaS landing page", 6.86, 1.1);
      tl.fromTo(el.querySelector(".s06-caret"), { opacity: 1 }, { opacity: 0, duration: 0.25, repeat: 11, yoyo: true, ease: "steps(1)" }, t);
      NS.fly(tl, el.querySelectorAll(".s06-row"), { x: -80 }, 8.36, { stagger: 0.12 });
      NS.bounce(tl, el.querySelectorAll(".s06-ok"), 9.21, { stagger: 0.12 });
    },
    caps: [[6.79, "tell Claude"], [7.5, "what you're"], [7.79, "building"], [8.07, "and it"], [8.36, "finds the"], [8.64, "right skills"], [9.07, "and installs"], [9.57, "them for you"]],
  },
  {
    id: "s07", start: 10.0, end: 11.0, layout: "item", theme: "white",
    html: item("Two", "two"),
    anim: (tl, NS, t, el) => NS.item(tl, el.querySelector(".item"), t + 0.02),
    caps: [[10.36, "superpowers"]],
  },
  {
    id: "s08", start: 11.0, end: 12.72, layout: "split", theme: "dark",
    html: `<div class="col s08"><div class="s08-gh">${logo("github", "#ffffff")}</div>
      <div class="dark-card s08-repo"><div class="s08-title"><span>obra</span><span style="color:#8b949e">/</span><b>superpowers</b><span class="pill s08-public">Public</span></div>
      <div class="s08-desc">An agentic skills framework &amp; software development methodology that works.</div>
      <div class="s08-stars"><svg class="s08-star" viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 17.3 6.1 20.5l1.3-6.6L2.5 9.4l6.6-.8z"/></svg><span class="s08-num">0</span><span class="s08-lbl">stars</span></div></div></div>`,
    anim: (tl, NS, t, el) => {
      NS.bounce(tl, el.querySelector(".s08-gh"), t + 0.02);
      NS.pop(tl, el.querySelector(".s08-repo"), t + 0.18, { y: 40 });
      NS.count(tl, el.querySelector(".s08-num"), 0, 200000, 11.29, 0.62, "int", "", "+");
      tl.to(el.querySelector(".s08-star"), { fill: "#e3b341", stroke: "#e3b341", duration: 0.15 }, 11.93);
      tl.fromTo(el.querySelector(".s08-star"), { scale: 1 }, { scale: 1.35, duration: 0.14, yoyo: true, repeat: 1, ease: "power2.out", transformOrigin: "50% 50%" }, 11.93);
    },
    caps: [[11.07, "over 200,000", { count: { from: 0, to: 200000, t: 11.29, d: 0.62, fmt: "int", pre: "over " } }], [11.93, "GitHub"], [12.43, "stars"]],
  },
  {
    id: "s09", start: 12.72, end: 15.62, layout: "full", theme: "white",
    html: `<div class="col s09"><div class="s09-mascot">${MASCOT(190)}</div>
      <div class="row s09-steps">
        ${[["plan", "Plan"], ["test", "Test"], ["check", "Check"]]
          .map(([k, n], i) => `${i ? `<svg class="s09-arrow" viewBox="0 0 60 40"><path class="s09-ar" d="M4 20 H50 M40 10 L52 20 L40 30" fill="none" stroke="#c9c1b9" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ""}<div class="ui-card s09-step s09-${k}">${ICON[k]}<div class="s09-name">${n}</div><div class="s09-ok">✓</div></div>`)
          .join("")}
      </div><div class="pill green s09-pass">✓ Verified before it touches your code</div></div>`,
    anim: (tl, NS, t, el) => {
      NS.bounce(tl, el.querySelector(".s09-mascot"), t + 0.04);
      tl.to(el.querySelector(".s09-mascot"), { y: -22, duration: 0.14, yoyo: true, repeat: 1, ease: "power2.out" }, 12.93);
      [["plan", 13.79], ["test", 14.14], ["check", 14.71]].forEach(([k, at]) => {
        NS.pop(tl, el.querySelector(".s09-" + k), at, { y: 40 });
        NS.bounce(tl, el.querySelector(".s09-" + k + " .s09-ok"), at + 0.22);
      });
      const arrows = el.querySelectorAll(".s09-ar");
      NS.draw(tl, arrows[0], 14.02, 0.22);
      NS.draw(tl, arrows[1], 14.52, 0.22);
      NS.pop(tl, el.querySelector(".s09-pass"), 15.21, { y: 20 });
    },
    caps: [[12.79, "it forces"], [13.21, "Claude to", { tone: "accent" }], [13.79, "plan"], [14.14, "test and"], [14.57, "then check"], [15.0, "its own"], [15.43, "work"]],
  },
  {
    id: "s10", start: 15.62, end: 17.0, layout: "th",
    caps: [[15.71, "before it"], [16.21, "touches"], [16.5, "your project"]],
  },
  {
    id: "s11", start: 17.0, end: 18.12, layout: "item", theme: "white",
    html: item("Three", "three"),
    anim: (tl, NS, t, el) => NS.item(tl, el.querySelector(".item"), t + 0.02),
    caps: [[17.43, "frontend"], [17.86, "design"]],
  },
  {
    id: "s12", start: 18.12, end: 19.08, layout: "full", theme: "white",
    html: `<div class="col s12"><div class="s12-mark">${logo("anthropic", "#191919")}</div><div class="s12-word">ANTHROP\\C</div></div>`,
    anim: (tl, NS, t, el) => {
      NS.pop(tl, el.querySelector(".s12-mark"), t + 0.03, { y: 0, scale: 0.75, d: 0.32 });
      NS.fly(tl, el.querySelector(".s12-word"), { y: 40 }, 18.44);
    },
    caps: [[18.21, "made by"], [18.5, "Anthropic"]],
  },
  {
    id: "s13", start: 19.08, end: 20.36, layout: "full", theme: "white",
    html: `<div class="col s13"><div class="s13-src"><span class="pill grey mono">anthropics/skills · frontend-design</span></div><div class="big-num s13-num">0</div><div class="label">installs</div></div>`,
    anim: (tl, NS, t, el) => {
      NS.pop(tl, el.querySelector(".s13-src"), t + 0.03, { y: 16 });
      NS.pop(tl, el.querySelector(".s13-num"), t + 0.08);
      NS.count(tl, el.querySelector(".s13-num"), 0, 1000000, 19.36, 0.6, "int", "", "+");
    },
    caps: [[19.14, "with over"], [19.5, "a million"], [19.86, "installs"]],
  },
  {
    id: "s14", start: 20.36, end: 23.12, layout: "split", theme: "grey",
    html: `<div class="col s14">
      <div class="s14-wrap"><div class="site s14-yours"><div class="y-nav"><span>STUDIO</span><span>WORK · ABOUT</span></div><div class="y-title">Made by hand.</div><div class="y-line"></div><div class="y-img"></div></div><div class="s14-frame"></div></div>
      <div class="row s14-row">${genericSite()}${genericSite()}${genericSite()}</div></div>`,
    anim: (tl, NS, t, el) => {
      NS.pop(tl, el.querySelector(".s14-wrap"), t + 0.05, { y: 50 });
      NS.fly(tl, el.querySelectorAll(".site.generic"), { y: 80 }, 21.95, { stagger: 0.1 });
      NS.sweep(tl, el.querySelectorAll(".strike"), 22.36, 0.28);
      NS.bounce(tl, el.querySelector(".s14-frame"), 22.62);
    },
    caps: [[20.43, "your site"], [20.93, "will finally"], [21.36, "stop looking"], [21.86, "like every"], [22.21, "other"], [22.36, "AI-built"], [22.93, "site"]],
  },
  {
    id: "s15", start: 23.12, end: 24.08, layout: "item", theme: "white",
    html: item("Four", "four"),
    anim: (tl, NS, t, el) => NS.item(tl, el.querySelector(".item"), t + 0.02),
    caps: [[23.57, "marketing"], [23.93, "skills"]],
  },
  {
    id: "s16", start: 24.08, end: 25.02, layout: "shot", theme: "black",
    html: `<div class="shot-bg" style="background-image:url(assets/img/marketingskills.png)"></div><div class="shot-card s16-card" style="top:300px"><img src="assets/img/marketingskills.png" /><div class="hl-sweep s16-hl" style="left:2%;top:37.5%;width:8.6%;height:6%"></div></div>`,
    anim: (tl, NS, t, el) => {
      const card = el.querySelector(".s16-card");
      NS.pop(tl, card, t + 0.02, { y: 50, scale: 1 });
      NS.zoom(tl, card, 24.14, 0.5, 2.4, "6.3% 40%", { x: 330 });
      NS.sweep(tl, el.querySelector(".s16-hl"), 24.5, 0.3);
    },
    caps: [[24.14, "by Corey"], [24.64, "Haines"]],
  },
  {
    id: "s17", start: 25.02, end: 26.72, layout: "full", theme: "beige",
    html: `<div class="col s17"><div class="big-num s17-num">0</div><div class="s17-box"><div class="s17-grid">${"<i></i>".repeat(66)}</div>
      <div class="s17-outline"></div>
      <div class="pill orange s17-tag">1 pack</div></div></div>`,
    anim: (tl, NS, t, el) => {
      NS.pop(tl, el.querySelector(".s17-num"), t + 0.03);
      NS.count(tl, el.querySelector(".s17-num"), 0, 66, 25.14, 0.62, "int");
      tl.fromTo(el.querySelectorAll(".s17-grid i"), { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.18, ease: "back.out(2)", stagger: 0.009 }, 25.14);
      tl.fromTo(el.querySelector(".s17-outline"), { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 0.25, ease: "power3.out" }, 26.0);
      NS.bounce(tl, el.querySelector(".s17-tag"), 26.14);
    },
    caps: [[25.14, "66 skills", { count: { from: 0, to: 66, t: 25.14, d: 0.62, fmt: "int", post: " SKILLS" } }], [26.0, "in one pack"]],
  },
  {
    id: "s18", start: 26.72, end: 29.26, layout: "full", theme: "white",
    html: (() => {
      const main = [["SEO", 270, 250], ["Copywriting", 810, 250], ["Ads", 270, 810], ["Cold email", 810, 810]];
      const small = [["CRO", 540, 110], ["Analytics", 540, 960], ["Pricing", 130, 530], ["Launch", 950, 530], ["Referrals", 120, 120], ["Onboarding", 960, 960]];
      const links = main.map(([, x, y], i) => `<path class="s18-link s18-link-${i}" d="M540 530 Q ${(540 + x) / 2 + (i % 2 ? 60 : -60)} ${(530 + y) / 2} ${x} ${y}" fill="none" stroke="#e6c4b6" stroke-width="5" stroke-linecap="round"/>`).join("");
      return `<div class="s18"><svg class="links" viewBox="0 0 1080 1060">${links}</svg>
        <div class="s18-node"><div class="ui-card">${tile("four", "tile xs")}marketingskills</div></div>
        ${main.map(([n, x, y], i) => `<div class="s18-chip main s18-m${i}" style="left:${x}px;top:${y}px"><div class="ui-card"><i></i>${n}</div></div>`).join("")}
        ${small.map(([n, x, y]) => `<div class="s18-chip small" style="left:${x}px;top:${y}px"><div class="s18-s">${n}</div></div>`).join("")}</div>`;
    })(),
    anim: (tl, NS, t, el) => {
      NS.bounce(tl, el.querySelector(".s18-node > div"), t + 0.03);
      [26.79, 27.36, 27.93, 28.29].forEach((at, i) => {
        NS.draw(tl, el.querySelector(".s18-link-" + i), at - 0.04, 0.2);
        NS.bounce(tl, el.querySelector(".s18-m" + i + " > div"), at + 0.08);
      });
      NS.bounce(tl, el.querySelectorAll(".s18-s"), 28.93, { stagger: 0.04 });
    },
    caps: [[26.79, "SEO"], [27.36, "copywriting"], [27.93, "ads"], [28.29, "cold email"], [28.93, "everything"]],
  },
  {
    id: "s19", start: 29.26, end: 31.28, layout: "th", push: 1.07,
    caps: [[29.36, "", { emph: { lead: "don't", key: "cherry-pick", at: 29.57 } }], [30.5, "install all"], [31.07, "of them"]],
  },
  {
    id: "s20", start: 31.28, end: 32.72, layout: "item", theme: "white",
    html: item("Five", "five"),
    anim: (tl, NS, t, el) => NS.item(tl, el.querySelector(".item"), t + 0.06),
    caps: [[31.93, "task"], [32.21, "observer"]],
  },
  {
    id: "s21", start: 32.72, end: 36.28, layout: "split", theme: "beige",
    html: `<div class="col s21">
      <div class="ui-card s21-term"><div class="s21-head"><span class="s21-dots"><i></i><i></i><i></i></span><span class="s21-title mono">claude — session</span><span class="pill orange s21-watch">● task-observer</span></div>
        <div class="s21-lines mono">
          <div class="s21-l s21-l1"><span class="s21-who">❯</span>add a login page</div>
          <div class="s21-l s21-l2"><span class="s21-who">✳</span>installing with npm…</div>
          <div class="s21-l s21-l3"><div class="s21-hl"></div><span class="s21-who">❯</span>no, always use pnpm</div>
        </div><div class="pill green s21-cap">✓ correction captured</div></div>
      ${["deploy", "frontend", "testing"].map((n) => `<div class="ui-card s21-file"><span class="mono">${n}/SKILL.md</span><span class="pill green s21-up">updated</span></div>`).join("")}
    </div>`,
    anim: (tl, NS, t, el) => {
      NS.pop(tl, el.querySelector(".s21-term"), t + 0.03, { y: 40 });
      NS.bounce(tl, el.querySelector(".s21-watch"), 32.93);
      NS.pop(tl, el.querySelector(".s21-l1"), 33.21, { y: 14 });
      NS.pop(tl, el.querySelector(".s21-l2"), 33.5, { y: 14 });
      NS.pop(tl, el.querySelector(".s21-l3"), 33.79, { y: 14 });
      NS.sweep(tl, el.querySelector(".s21-hl"), 34.14, 0.3);
      NS.bounce(tl, el.querySelector(".s21-cap"), 34.29);
      NS.fly(tl, el.querySelectorAll(".s21-file"), { x: 90 }, 34.93, { stagger: 0.14 });
      NS.bounce(tl, el.querySelectorAll(".s21-up"), 35.5, { stagger: 0.14 });
    },
    caps: [[32.79, "it watches"], [33.21, "how you"], [33.5, "work"], [33.79, "picks up"], [34.14, "your corrections"], [34.79, "and rewrites"], [35.36, "your other"], [35.64, "skills to"], [36.07, "match"]],
  },
  {
    id: "s22", start: 36.28, end: 38.42, layout: "full", theme: "white",
    html: `<div class="ui-card s22"><svg viewBox="0 0 860 560">
        <g stroke="#eee" stroke-width="2">${[100, 200, 300, 400].map((y) => `<line x1="70" y1="${y}" x2="840" y2="${y}"/>`).join("")}</g>
        <line x1="70" y1="480" x2="840" y2="480" stroke="#c9c1b9" stroke-width="3"/><line x1="70" y1="40" x2="70" y2="480" stroke="#c9c1b9" stroke-width="3"/>
        <text x="455" y="535" text-anchor="middle" font-family="Inter" font-size="30" fill="#8a8079">sessions</text>
        <text x="30" y="260" text-anchor="middle" font-family="Inter" font-size="30" fill="#8a8079" transform="rotate(-90 30 260)">skill quality</text>
        <path class="s22-line" d="M70 450 C 200 440, 260 400, 360 360 S 520 300, 600 230 S 760 110, 830 70" fill="none" stroke="#D97757" stroke-width="9" stroke-linecap="round"/>
        <circle class="s22-dot" cx="830" cy="70" r="18" fill="#D97757"/>
      </svg><div class="pill green s22-tag">↑ smarter every session</div></div>`,
    anim: (tl, NS, t, el) => {
      NS.pop(tl, el.querySelector(".s22"), t + 0.03, { y: 40 });
      NS.draw(tl, el.querySelector(".s22-line"), 36.42, 1.55);
      NS.bounce(tl, el.querySelector(".s22-dot"), 37.95);
      NS.bounce(tl, el.querySelector(".s22-tag"), 37.1);
    },
    caps: [[36.36, "your setup"], [36.86, "gets"], [37.07, "smarter", { tone: "accent" }], [37.5, "every time"], [37.93, "you use it"]],
  },
  {
    id: "s23", start: 38.42, end: END, layout: "th", push: 1.1,
    caps: [[38.5, "follow and"], [39.07, "", { emph: { lead: "comment", key: "“SKILLS”", at: 39.36 } }]],
  },
];
