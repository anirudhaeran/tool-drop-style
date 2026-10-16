#!/usr/bin/env node
// Builds bed.wav into kit/audio/: a synthesized soft ambient pad, a placeholder until a real track is fitted.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run, writeText } from "../engine/lib/util.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "audio");
fs.mkdirSync(OUT, { recursive: true });

const ff = (args) => run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);
const wav = ["-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le"];


// Ambient bed: 73 BPM, one chord per bar (≈3.29 s, matching the references), soft pad + plucked arpeggio.
const BAR = (4 * 60) / 73;
const BEAT = BAR / 4;
const chords = [
  [130.81, 196.0, 246.94, 329.63], // Cmaj7
  [110.0, 164.81, 196.0, 261.63], // Am7
  [87.31, 174.61, 220.0, 329.63], // Fmaj7
  [98.0, 146.83, 196.0, 293.66], // G6
];
const B = BAR.toFixed(5);
const chordIdx = `mod(floor(t/${B}),4)`;
const beatIdx = `mod(floor(t/${BEAT.toFixed(5)}),4)`;
const sel = (idx, values) => values.slice(0, -1).reduceRight((acc, v, i) => `if(eq(${idx},${i}),${v},${acc})`, String(values.at(-1)));
const tone = (k) => sel(chordIdx, chords.map((c) => c[k])); // frequency of chord voice k in the current bar
const env = `(min(1,mod(t,${B})/0.9)*min(1,(${B}-mod(t,${B}))/0.9))`;
const pad = (detune) => [0, 1, 2, 3].map((k) => `(sin(2*PI*${tone(k)}*${detune}*t)+0.25*sin(4*PI*${tone(k)}*${detune}*t))`).join("+");
const arp = [3, 2, 1, 2]; // which chord voice the pluck plays on each beat (an octave up)
const pluckF = sel(beatIdx, arp.map((k) => tone(k)));
const pluck = `(sin(4*PI*${pluckF}*t)*exp(-5*mod(t,${BEAT.toFixed(5)})))`;
const channel = (detune) => `(0.055*${env}*(${pad(detune)})+0.06*${pluck})`;
const graph =
  `aevalsrc=exprs='${channel(1)}|${channel(1.004)}':s=48000:d=60,` +
  `highpass=f=120,lowpass=f=3200,aecho=0.8:0.6:190|370:0.28|0.16,` +
  `afade=t=in:d=1.5,loudnorm=I=-20:TP=-3:LRA=7[out]`;
const graphFile = path.join(OUT, "bed-graph.txt");
writeText(graphFile, graph);
await ff(["-/filter_complex", graphFile, "-map", "[out]", ...wav, path.join(OUT, "bed.wav")]);
fs.rmSync(graphFile);
console.log(`audio kit → ${OUT}`);
for (const f of fs.readdirSync(OUT)) console.log("  " + f);
