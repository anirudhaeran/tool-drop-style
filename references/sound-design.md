# Sound design (style-tool-drop)

## What the references do

Measured on the voice-removed channel of three reels:

- **A riser into every major section cut.** It lasts 0.5–0.95 s, builds +15 to +25 dB, peaks about 0.1 s before the cut and drops dead on the cut.
- **Short hits** right after cuts and on big graphic moments.
- **Music drop-outs** of about 0.2 s before a punchline.
- **A soft ambient bed** about 20 dB under the voice.
- **Mastering** at −14.3 LUFS, with a loudness range around 2 LU.

## How this style places sounds

General rules (sync points, tiers, density, timing, levels, phone translation, with sources) are in `sound-placement.md`. In this style:

- **Section cards** (the ONE…FIVE item cards): each gets its **own, different riser** cresting into the cut. Only the **first** section card also gets an impact (a hero).
- **Two heroes per reel:** the first section and the punchline.
- **Music stops are optional.** With a real song a drop-out can feel jarring; with an ambient bed it's subtle. Default: `music.drops: []`.
- **Leave the shot before each hero dry,** for contrast.
- **The CTA gets no hit,** only one light, warm accent as the keyword lands (`pop-kalimba`). A cinematic riser plus a boom at the end tends to feel heavy.
- **Lists** get one rising pop run (`pop-step-*`). Rotate the start pitch from list to list (`steps(times, v, from)`).
- **Number landings** get bell dings that step up in pitch through the video: `ding-bell-low` → `ding-bell` → `ding-bell-mid` → `ding-bell-up`.
- **Cuts into a new graphic** get a soft whoosh peaking on the cut (`whoosh()`). Use a different file each time.
- **Cuts back to the talking head stay dry.**
- **Skip:** ticking counters, camera shutters, card slides, marker swipes, and any sound on motion that doesn't land.
- **Level:** the mix bus in `kit/build.mjs` (`MIX`) is calibrated, so keep plan volumes near the example values. Check with `td qa <name> placement` and `td qa <name> sfx`.

## Sounds that work, and sounds that don't

From testing on real edits:

- **Works: crisp, mid-bright, short, techy sounds.** Brightness around 2–6.5 kHz, tails ≤ ~0.45 s on accents, and little low end, except the punchline booms. Examples: pop runs, bell dings, airy and electric risers, infographic swishes, zoom swipes.
- **Often fails:**
  - Dark cinematic trailer sounds (`rise-reverse`, `rise-cine`, `hit-logo`) feel too deep for UI graphics.
  - Glassy, crystal dings (`ding-crystal*`, 9–11 kHz) feel harsh.
- **Context matters.** The same boom can work on a punchline and fail at the CTA.

## Placing sounds (helpers in the example plan)

```js
const at = (s, t, v) => ({ s, at: t, v });                                   // sound starts at t
const hitOn = (s, t, v) => ({ s, at: t, v, align: "peak" });                 // loudest point lands on t
const riseInto = (s, cut, v = 0.28) => ({ s, at: cut, v, align: "peak", lead: 0.08 }); // crests 0.08 s before the cut
const steps = (times, v = 0.2, from = 1) => times.map((t, i) => at(`pop-step-${((from - 1 + i) % 5) + 1}`, t, v)); // rising pop run
const whoosh = (s, cut, v = 0.18) => hitOn(s, cut, v); // secondary: peaks on the cut into a new graphic
```

The builder reads each sound's duration and peak from `kit/audio/sfx.json`, so alignment is exact. Overlapping sounds go on separate tracks automatically.

## Palette (kit/audio/, built by `td setup`)

| Family | Sounds | Use |
|---|---|---|
| Risers (end on their peak) | `rise-air`, `rise-whip`, `rise-electric`, `rise-stutter`, `swish-freeze`; `rise-reverse`, `rise-cine` (dark) | One per section card, each different; none on the CTA |
| Impacts | `boom-sub`, `boom-deep`, `hit-zoom`; `hit-logo`, `hit-chord` | Heroes only (2 per reel). Both booms are saturated for phone speakers. |
| Swishes | `swish-info`, `swish-cloth`, `swish-a…e`, `slide-tech` | One per cut *into* a new graphic, a different file each time |
| Pops | `pop-step-1…5` (ascending), `pop-explainer`, `pop-hard`, `pop-dry`, `pop-bubble` | Tiles, checkmarks, badges, chips |
| UI | `click-tone`, `click-select`, `click-check`, `success-correct`, `success-confirm`, `success-bleep` | "Done", "captured", "installed" moments |
| Numbers | `ding-bell-low`, `ding-bell`, `ding-bell-mid`, `ding-bell-up`; `ding-crystal*`; `tick-run` | When a count-up lands; step up in pitch as the video goes on |
| Sparkle | `sparkle-hit`, `sparkle-touch`, `sparkle-sweep` | A chart reaching the top, a star lighting up; one at a time |
| Accents | `pop-kalimba` (warm pluck: logos, clean reveals, the CTA keyword), `deny-ui` (strike-throughs, wrong answers) | |
| Other | `glitch-scifi`, `glitch-break`, `shutter`, `zoom-swipe`, `zoom-ui`, `typing-elec`, `marker` | Screenshot zoom-ins (`zoom-swipe`, `zoom-ui`); typing a prompt |
| Music | A real track via `plan.music.src` (`td music-fit`) | About 20 LU under the voice. `bed.wav` is only a synthesized placeholder. |

## Adding sounds

1. **Find candidates.** `node <skill>/kit/sfx-library/catalog.mjs <categories…>` lists Mixkit effects (title, length, preview URL). Mixkit is free for commercial use with no attribution; **ask the user before downloading**.
2. **Register them.** Add the new ids, titles and preview URLs to `kit/sfx-library/manifest.json`, then run `node <skill>/kit/sfx-library/download.mjs`.
3. **Add them to the palette.** Add entries to `PALETTE` in `kit/make-sfx.mjs` and run it. Every sound is trimmed to start at its useful part, normalised to −3 dBFS peak, and its duration and peak recorded in `sfx.json`. Sustained families get a −3 dB dip at 2.5 kHz so they stay out of the voice's consonant band.
4. **Phone-test anything low:** `ffmpeg -i x.wav -af "highpass=f=400:poles=2,highpass=f=400:poles=2,ebur128" -f null -`. Losing more than about 10 dB means phones barely hear it; add `{ phone: true }` and/or a `layer` transient.
