#!/usr/bin/env node
// Builds the SFX palette into kit/audio/ from the curated Mixkit library
// (sfx-library/raw, Mixkit Sound Effects Free License — commercial use, no attribution).
// Every file is trimmed so its useful part starts at 0, peak-normalised to -3 dBFS, and its
// duration + peak time are written to audio/sfx.json so plans can place sounds by their hit point.
//   node .claude/skills/style-tool-drop/kit/make-sfx.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "../engine/lib/util.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(HERE, "sfx-library", "raw");
const OUT = path.join(HERE, "audio");
// Sonniss GDC bundle (royalty-free, no attribution; not for AI/ML training; never redistribute raw files)
const SONNISS = path.join(HERE, "sfx-library", "sonniss");
const raw = (id) => {
  if (typeof id === "string") {
    const f = path.join(SONNISS, id);
    if (!fs.existsSync(f)) throw new Error(`Sonniss file missing: ${id}`);
    return f;
  }
  const f = fs.readdirSync(RAW).find((n) => n.includes(`-${id}-`));
  if (!f) throw new Error(`raw sfx ${id} missing — run td setup`);
  return path.join(RAW, f);
};
const pitch = (st) => `asetrate=48000*${Math.pow(2, st / 12).toFixed(5)},aresample=48000`;
const hasSonniss = (id) => typeof id !== "string" || fs.existsSync(path.join(SONNISS, id));

// name: [mixkit id | Sonniss path, filter chain (after resample to 48k), role note, options]
// options.phone: parallel-saturate the lows so a sub hit still reads on phone speakers (they roll off
//   below ~250 Hz; the harmonics at 150–900 Hz make the ear infer the missing fundamental).
// options.layer: [source, delay s, gain dB] — a short mid-range transient mixed onto a low hit so its attack
//   reads on small speakers (click/body/sub layering)
const BURST = "Epic Stock Media - Fantasy Game 2 - Sound Kit for Enchanted Realms/UIAlert_Collect Scifi Futuristic Electronic Bass Burst Sweep Heavy 04_ESM_FG2.wav";
// Sustained sounds that play under speech (risers, whooshes, sparkles, glitches, typing) get a gentle dip
// where consonants live (1–4 kHz, centred 2.5 kHz) so the voice stays intelligible; short transients don't need it.
const VOICE_DIP = "equalizer=f=2500:t=q:w=1.2:g=-3";
const SUSTAINED = /^(rise|swish|slide|zoom|sparkle-sweep|glitch|typing|tick)/;
const PHONE = "[0:a]asplit[d][w];[w]lowpass=f=160,volume=24dB,asoftclip=type=atan,highpass=f=170:poles=2,highpass=f=170:poles=2,lowpass=f=900,volume=2dB[hm];[d][hm]amix=inputs=2:normalize=0,alimiter=limit=0.89:level=0";
const PALETTE = {
  // risers — each ends on its peak (place with align:"end" so it stops dead on the cut)
  "rise-air": [1492, "atrim=0:1.1,afade=t=in:d=0.25", "whoosh that builds into a cut"],
  "rise-whip": [1516, "atrim=0.25:1.32,asetpts=PTS-STARTPTS,afade=t=in:d=0.3", "magic whip swell"],
  "rise-reverse": [784, "atrim=0:1.6,areverse,atrim=0:1.22,afade=t=in:d=0.4", "reversed cinematic impact → swell into the hit"],
  "rise-electric": [2670, "atrim=5.9:7.15,asetpts=PTS-STARTPTS,afade=t=in:d=0.35", "electronic noise swell"],
  "rise-stutter": [1144, "atrim=5.2:6.45,asetpts=PTS-STARTPTS,afade=t=in:d=0.35", "stutter riser"],
  "rise-cine": [790, "atrim=1.3:2.6,asetpts=PTS-STARTPTS,afade=t=in:d=0.35", "cinematic trailer riser (CTA)"],
  // impacts — place with align:"peak" on the cut / reveal
  "boom-sub": [2299, "atrim=0:1.1,afade=t=out:st=0.7:d=0.4", "sub-bass hit + mid transient, saturated so it reads on phones", { phone: true, layer: [BURST, 0.05, -8] }],
  "boom-deep": [1143, "atrim=0:2.2,afade=t=out:st=1.4:d=0.8", "whoosh into deep impact (peak 0.6 s) + mid transient, saturated for phones", { phone: true, layer: [BURST, 0.57, -8] }],
  "hit-logo": [2903, "atrim=0:2.4,afade=t=out:st=1.6:d=0.8", "presentation logo hit"],
  "hit-chord": ["Cinematic Sound Design - Ultra Transitions & Impacts/Impact Hit Rapid Chord Reverb.wav", "atrim=0.18:2.2,asetpts=PTS-STARTPTS,afade=t=out:st=1.7:d=0.5", "rapid chord build into a hit (CTA hero, peak 0.68 s)"],
  "hit-zoom": [772, "atrim=0:1.0", "quick zoom impact (peak 0.5 s)"],
  // whooshes / swishes for small cuts and things landing
  "swish-a": [3115, "atrim=0:0.6", "short bright swoosh"],
  "swish-b": [166, "atrim=0:0.8", "small sweep"],
  "swish-c": [2637, "atrim=0:0.95", "air sweep"],
  "swish-d": [175, "atrim=0:0.65", "short sweep"],
  "swish-e": [1490, "atrim=0:0.95,afade=t=out:st=0.75:d=0.2", "fast whoosh"],
  "swish-info": ["Cinematic Sound Design - Ultra Transitions & Impacts/Woosh Sweep Slide Infographics Basic.wav", "atrim=0:0.44,afade=t=out:st=0.3:d=0.14", "infographic slide (short, bright, made for motion graphics)"],
  "swish-cloth": ["Epic Stock Media - Fantasy Game 2 - Sound Kit for Enchanted Realms/CLOTHFlp_Action Inventory Open Flip Cloth Canvas Bag Slide Light 02_ESM_FG2.wav", "atrim=0.04:0.7,asetpts=PTS-STARTPTS,afade=t=out:st=0.5:d=0.16", "soft organic flip (gentle cut)"],
  "swish-freeze": ["Epic Stock Media - Tower Defense Game/ICEBrk_Skill Freeze Whoosh Break Impact Layered Movement Shatter 03_ESM_TDG.wav", "atrim=0.04:1.76,asetpts=PTS-STARTPTS,afade=t=out:st=1.4:d=0.32", "layered whoosh with a crisp break (section lead-in, peak 0.3 s)"],
  "slide-tech": [3120, "atrim=0:0.8,afade=t=out:st=0.5:d=0.3", "tech slide (cards flying in)"],
  // UI
  "pop-explainer": [3005, "anull", "explainer light pop"],
  "pop-hard": [2364, "atrim=0:0.3", "hard pop click"],
  "pop-dry": [2356, "anull", "dry pop-up"],
  "pop-bubble": [2357, "anull", "bubble pop-up"],
  "pop-step-1": [2356, "anull", "ascending pop sequence, step 1"],
  "pop-step-2": [2356, pitch(2), "step 2 (+2 st)"],
  "pop-step-3": [2356, pitch(4), "step 3 (+4 st)"],
  "pop-step-4": [2356, pitch(7), "step 4 (+7 st)"],
  "pop-step-5": [2356, pitch(9), "step 5 (+9 st)"],
  "pop-kalimba": ["CB_Sounddesign - Applicable Sounds - Organic UI and Building Games SFX/UIMisc_Kalimba 3 Up_CB Sounddesign_APPlicable Sounds.wav", "atrim=0:0.56,afade=t=out:st=0.4:d=0.16", "warm rising kalimba pluck (logo / clean reveal)"],
  "deny-ui": ["Cinematic Sound Design - System & UI Feedback Elements/Interface Deny Low Fat Dark.wav", "atrim=0:0.76,afade=t=out:st=0.6:d=0.16", "UI deny tone (negative: strike-throughs, wrong answers)"],
  "click-tone": [2568, "anull", "interface click tone"],
  "click-select": [3124, "atrim=0:0.4", "modern select"],
  "click-check": [1120, "anull", "checkbox click"],
  "success-correct": [2870, "atrim=0:1.2,afade=t=out:st=0.7:d=0.5", "correct / done tone"],
  "success-confirm": [2867, "anull", "confirmation tone"],
  "success-bleep": [2520, "anull", "high-tech confirmation"],
  "tick-run": [1054, "atrim=0:0.8,afade=t=out:st=0.6:d=0.2", "fast counter ticking (count-ups)"],
  "ding-crystal": [3108, "atrim=0:1.4,afade=t=out:st=0.9:d=0.5", "crystal ding (number lands)"],
  "ding-bell": [3109, "atrim=0:1.4,afade=t=out:st=0.9:d=0.5", "soft bell"],
  "ding-bell-low": [3109, `${pitch(-2)},atrim=0:1.4,afade=t=out:st=0.9:d=0.5`, "soft bell −2 st (first number of a video)"],
  "ding-bell-mid": [3109, `${pitch(1.5)},atrim=0:1.3,afade=t=out:st=0.8:d=0.5`, "soft bell +1.5 st"],
  "ding-crystal-up": [3108, `${pitch(3)},atrim=0:1.3,afade=t=out:st=0.8:d=0.5`, "crystal ding +3 st (a later, bigger number)"],
  "ding-bell-up": [3109, `${pitch(3)},atrim=0:1.3,afade=t=out:st=0.8:d=0.5`, "soft bell +3 st"],
  "sparkle-hit": [3060, "anull", "sparkle hit"],
  "sparkle-touch": [3083, "atrim=0:1.5,afade=t=out:st=1.0:d=0.5", "sparkle touch"],
  "sparkle-sweep": [2633, "atrim=0:2.0,afade=t=out:st=1.4:d=0.6", "sweeping sparkle (peak 0.9 s)"],
  "glitch-break": [2951, "atrim=0:0.6,afade=t=out:st=0.4:d=0.2", "digital glitch (strike-throughs, errors)"],
  "glitch-scifi": [1022, "anull", "sci-fi glitch"],
  "shutter": [1432, "atrim=0:0.6", "camera shutter (screenshots)"],
  "zoom-swipe": [2627, "anull", "swipe zoom (zoom-ins)"],
  "zoom-ui": [2617, "anull", "UI zoom-in"],
  "typing-elec": [1376, "atrim=0:1.3,afade=t=out:st=1.1:d=0.2", "electronic typing"],
  "marker": [1530, "anull", "paper/marker swipe (highlighter sweeps)"],
};

const ff = (args, capture) => run("ffmpeg", ["-hide_banner", "-nostats", "-loglevel", capture ? "info" : "error", ...args], { capture });
fs.mkdirSync(OUT, { recursive: true });
const meta = {};
// Without the Sonniss bundle (it can't be redistributed), these sounds fall back to the closest Mixkit source, so the
// palette always builds from the free, re-downloadable Mixkit set alone.
const FALLBACK = {
  "hit-chord": [2903, "atrim=0:1.6,afade=t=out:st=1.1:d=0.5"],
  "swish-info": [3115, `${pitch(-1)},atrim=0:0.5,afade=t=out:st=0.35:d=0.15`],
  "swish-cloth": [175, "atrim=0:0.6,afade=t=out:st=0.45:d=0.15"],
  "swish-freeze": [1490, "atrim=0:1.0,afade=t=out:st=0.8:d=0.2"],
  "pop-kalimba": [3109, `${pitch(5)},atrim=0:0.6,afade=t=out:st=0.4:d=0.2`],
  "deny-ui": [2568, `${pitch(-5)},atrim=0:0.5`],
};
for (let [name, [id, chain, note, opts = {}]] of Object.entries(PALETTE)) {
  if (!hasSonniss(id)) {
    if (!FALLBACK[name]) throw new Error(`Sonniss file missing and no fallback for ${name}`);
    [id, chain] = FALLBACK[name];
    note += " (Mixkit fallback)";
  }
  if (opts.layer && !hasSonniss(opts.layer[0])) opts = { ...opts, layer: null };
  const out = path.join(OUT, name + ".wav");
  const tmp = out + ".tmp.wav";
  await ff(["-y", "-i", raw(id), "-af", `aresample=48000,${chain}${SUSTAINED.test(name) ? "," + VOICE_DIP : ""}`, "-ac", "2", "-c:a", "pcm_s16le", tmp]);
  if (opts.phone) {
    const sat = out + ".sat.wav";
    await ff(["-y", "-i", tmp, "-filter_complex", PHONE, "-c:a", "pcm_s16le", sat]);
    fs.renameSync(sat, tmp);
  }
  if (opts.layer) {
    const [src, delay, gain] = opts.layer;
    const mix = out + ".mix.wav";
    await ff(["-y", "-i", tmp, "-i", raw(src), "-filter_complex", `[1:a]aresample=48000,aformat=channel_layouts=stereo,volume=${gain}dB,adelay=${Math.round(delay * 1000)}:all=1[l];[0:a][l]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.89:level=0`, "-c:a", "pcm_s16le", mix]);
    fs.renameSync(mix, tmp);
  }
  const { stderr } = await ff(["-i", tmp, "-af", "volumedetect", "-f", "null", "-"], true);
  const max = Number(stderr.match(/max_volume: (-?[\d.]+) dB/)[1]);
  await ff(["-y", "-i", tmp, "-af", `volume=${(-3 - max).toFixed(2)}dB`, "-c:a", "pcm_s16le", out]);
  fs.rmSync(tmp);
  // duration + loudest 20 ms window = the sound's hit point
  const { stdout } = await run("ffmpeg", ["-hide_banner", "-nostats", "-loglevel", "error", "-i", out, "-af", "aresample=16000,aformat=channel_layouts=mono,asetnsamples=n=320:p=0,astats=metadata=1:reset=1,ametadata=mode=print:key=lavfi.astats.Overall.RMS_level:file=-", "-f", "null", "-"], { capture: true });
  const lv = stdout.split(/\r?\n/).filter((l) => l.includes("RMS_level=")).map((l) => parseFloat(l.split("=")[1]) || -120);
  meta[name] = { duration: +(lv.length * 0.02).toFixed(3), peak: +(lv.indexOf(Math.max(...lv)) * 0.02).toFixed(3), source: typeof id === "string" ? `sonniss:${id.split("/")[0]}` : `mixkit:${id}`, note };
}
fs.writeFileSync(path.join(OUT, "sfx.json"), JSON.stringify(meta, null, 2) + "\n");
console.log(`${Object.keys(meta).length} SFX → ${OUT}`);
for (const [n, m] of Object.entries(meta)) console.log(`  ${n.padEnd(16)} ${String(m.duration).padStart(5)}s  peak@${m.peak}`);
