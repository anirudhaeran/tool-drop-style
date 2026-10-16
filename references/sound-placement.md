# Sound placement: where effects go, how many, how loud

These rules apply to every style. They were researched (October 2026) from:
- film sound (Murch, Chion, Burtt);
- motion and UI sound design (Material Design, Microsoft, Apple, Google and Facebook UI sound leads, Sono Sanctus);
- short-form editor guides (Storyblocks, Sonilo, Film Editing Pro, Epidemic);
- loudness and mixing references (Torcoli et al. JAES 2019, iZotope, Production Expert, EBU R128, ITU-R BT.1359).

They were checked against measurements of the Nick Sarev references. A style's own `sound-design.md` can tighten them.

`td qa <name> placement` measures a build against these targets, and `td qa <name> sfx` measures the levels.

## 1. Every sound needs a job

**Sound the sync points, not the motion.** A sync point is a moment where picture and sound meet:
- an element **lands**;
- a counter **reaches its final value**;
- a logo **resolves**;
- a screenshot **cuts in**;
- a **section** changes.

Leave these silent: drift and idle loops, caption word highlights, motion without a clear landing, and visuals that only decorate a sentence. Syncing every movement ("mickey-mousing") feels cheap. As Google's UI sound lead put it: "You never want to play a sound just to play a sound."

Sound adds the most when a visual is too fast or too static to feel physical: a 3-frame pop, a hard screenshot cut. A slow, well-eased move often needs nothing.

## 2. Three tiers

| Tier | What | How many | Level vs the voice's median momentary loudness |
|---|---|---|---|
| **Hero** | Riser into an impact, or an impact on the stressed keyword, on the 2–3 biggest beats (a key section, the punchline) | **2–3 per 30–60 s reel**. The references have 3–4 swells of +20 dB or more. This user rejected big finishes on the CTA. | about −8 to −11 dB |
| **Primary** | List pops, number-landing dings, one positive accent and one negative accent | One per visual event | about −13 to −16 dB (short transients) |
| **Secondary** | A soft whoosh that peaks on a cut **into a new graphic**; a section riser without a hit | Most such cuts | about −15 dB or lower (sustained sounds sit lower) |

- **Quiet before loud.** Thin out the effects in the second before a hero, or stop the music for about 0.25 s before it. Without contrast the big moments don't land (Burtt, Andersen).
- **CTA:** one light accent on the keyword as it lands, not a hit and not a long outro sting. Reels loop, and this user rejected a cinematic riser + boom and a chord build + hit there.
- **Music stops: off by default.** A 0.25 s silence before a punchline is in the references, but with a real song the user heard it as a glitch ("should not be there… feels bad"). Let the music play through, and get contrast from the hit itself. If a stop is ever used, use only one per video. More than that reads as "disjointed" (Film Editing Pro).
- **A cut back to the talking head needs no sound.** The voice carries it, and "not on every cut" is the most consistent piece of editor advice.

## 3. Density and spacing (reference measurements and research)

- **3–6 sound moments per 10 s.** The references run 3.2–5.4. A run of list pops counts as one moment.
- **75–90% of cuts carry a sound.** That includes a landing that coincides with the cut. The references cover 77–92%. Leave the cuts back to the talking head, and the one before a hero, dry.
- **Separate events start ≥ 0.3–0.4 s apart.** Inside a deliberate run, keep ≥ 0.1 s between onsets (Glasgow earcon research). The references: minimum gap 0.43 s, median 1.3–2.4 s.
- **At most 2 effects sounding at any instant.** Voice and music already take two of the listener's roughly 4–5 trackable layers, and similar sounds stacked together collapse to about 2.5 (Murch). Never stack two sustained rising sounds, such as a sparkle sweep under a riser.
- **3 or more similar events read as a group.** Give them one gesture: a single rising pop run, not an independent sound each.
- **Front-load slightly.** The hook (0–10 s) is densest in every reference. Keep at least 2 moments in the last 10 s so the end doesn't go dead.

## 4. Matching sound to picture

- **One family per element type.** List items, number landings and transitions each get their own family. Inside a family, vary only pitch or take: rotate the start pitch of each pop run, and step dings up about 3 semitones as the numbers grow. Never play one identical file on every event.
- **Size → pitch and weight.** Small chips and words get short, high ticks. Big cards, screenshots and logos get lower, longer sounds with more body (Spence 2011).
- **Positive rises, negative falls** (UI convention: Windows, Material). Use a success tone for "done/captured". Use a glitch or falling blip for errors and strike-throughs, never a meme sound.
- **Whoosh length matches travel time.** A whoosh peaks on the fastest moment or on the landing. A screenshot zoom gets one whoosh spanning the zoom.

## 5. Timing

- **The transient lands on the first visible frame of the element.** Never more than 1 frame (33 ms) early: viewers notice audio that leads by about 45 ms, but tolerate lag up to about 125 ms (ITU-R BT.1359). If unsure, one frame late beats early.
- **Whooshes pre-lap.** A whoosh starts before the cut and peaks on it. A transition sound that starts after the cut always feels late.
- **Risers** crest on the target. The references crest about 0.08 s before the cut and let the cut silence them (`riseInto`).
- **Relative to speech:** fast talkers leave no gaps (the references: max gap 0.16 s at 236–266 wpm). So land hits on the **stressed syllable of the keyword** being illustrated, and keep everything else quieter instead of hunting for pauses.

## 6. Levels and frequency (phone-first)

- **The voice is the anchor.** Measure on the momentary meter (400 ms window), not on peaks. Short sounds read much quieter than their peak.
- **Music bed under speech:** 15–20 LU under the voice for ambient beds (Torcoli: at least 10 LU for music and 15 for ambience, and non-experts want about 4 LU more). The references sit at about 20 LU. Duck 10–15 dB with a 10–30 ms attack and a 250–500 ms release if the bed is musical.
- **Keep the effects bus ≥ 13 LU under the voice.** Short-form loudness rules also cap any 3-second window at +5 LU over the programme level (EBU R128 s1).
- **Phones play almost nothing below 250–800 Hz.** A pure sub boom loses 16–26 dB there. Every low impact needs harmonics or a mid transient (click / body / sub layering).
  - The palette does this with `phone: true` (parallel saturation) and `layer` (a short mid-range burst). Check a sound with the 400 Hz high-pass test in `sound-design.md`.
- **Keep the 1–4 kHz consonant band clear under speech.** Sustained effects (risers, whooshes, sparkles, glitches, typing) get a −3 dB dip at 2.5 kHz in the palette. Short transients don't need it.
- **Mono.** Phones are effectively mono. Keep sub layers mono and avoid decorrelating wideners; mid/side boosts like `extrastereo` survive a mono sum.
- **Master** at −14 LUFS integrated, ≤ −1.5 dBTP, with a loudness range around 2 LU. Instagram's xHE-AAC loudness control and phone DRC reward a controlled, low-range mix.

## Signs to check by ear

- **Overkill:**
  - you notice "the whoosh as a whoosh";
  - one file reused everywhere;
  - every accent at full strength;
  - an effect masks a word;
  - a "sonic soup" before a big moment.
- **Underkill:**
  - graphics appear "floating" in silence;
  - flat cuts into new graphics;
  - a dead last third.
