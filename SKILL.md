---
name: style-tool-drop
description: A ready-made editing style plus its own pipeline. It turns a raw talking-head clip into a finished vertical 9:16 "tool drop" or listicle reel, inspired by Nick Sarev (not affiliated). Every sentence hard-cuts between the talking head, full-screen UI motion graphics, split screen and screenshot cards. Captions run 1–3 words, with numbered item cards, count-ups, emphasis captions with push-ins, a riser into every section and a comment-keyword CTA. The pipeline does everything: transcription, cutting pauses and fillers, motion graphics, sound effects, music under the voice, quality checks and a −14 LUFS render. Use it whenever the user asks for the tool-drop style, the "Nick Sarev style" or a "tool drop reel", wants a script written in that format, or a project's edit.json says "style": "tool-drop". It is self-contained: use its own `td` commands rather than any other video pipeline in the folder.
---

# Tool-Drop style (inspired by Nick Sarev)

A recreation of the fast AI-tool reel format, studied from three high-performing public reels. It's not affiliated with Nick Sarev, and none of his media or scripts are included. The style is already learned and tuned, so don't re-analyse references: edit the user's clip with it.

**`td`** below means `node .claude/skills/style-tool-drop/engine/td.mjs`. Run it from the user's videos folder (the folder Claude Code is open in): projects go to `projects/<name>/` there, and raw clips sit in `inbox/`. If this skill lives somewhere else (for example `~/.claude/skills/`), use this skill's base directory in the path instead.

**One-time setup:** `td setup` installs the pinned renderer inside this skill folder, downloads the free Mixkit sounds and builds the palette, and checks for Parakeet and Chrome, installing them if needed. Run `td doctor` if anything fails.

**The look, in one breath:**
- The picture changes on almost every sentence.
- About 30% of the screen time is talking head; the rest is clean product-UI motion graphics that illustrate the words literally.
- Each element animates in on the word it illustrates.
- Captions are 1–3 words that hard-swap about 0.15 s before they're spoken.
- A riser leads into each section, and the video ends on `comment "KEYWORD"`.

## Editing a video

1. **Ingest:** `td new "inbox/<file>" --name <slug> --aspect 9:16`. The source is hard-linked, so never write into `projects/*/source/`.
2. **Classify the footage** (`references/footage.md`, and ask if unsure):
   - Is it raw, or already cleaned of gaps and fillers?
   - Is it a full upper body, or head-and-shoulders (an AI avatar, or a tight crop)? That changes the split layout.
3. **Transcribe:** `td transcribe <name>`.
   - Parakeet mishears names (for example "Cody Hings" for "Corey Haines"). Verify product and people names with a web search.
   - Tell the user which corrections you made.
4. **Cut:** set `projects/<name>/edit.json`, then run `td plan <name>` and `td cut <name>`.
   - **Pre-cleaned footage:** set `silence.enabled` and `fillers.enabled` to false and `trimEnds` to false.
   - **Pace:** the reference reels run at 235–265 wpm. Speed up a slow take with `cut.speed`: 1.06 is gentle, and above 1.12 starts to sound rushed.
   - **Voice compression:** `cut.voiceChain` (example in `references/footage.md`).
   - After a raw cut, run `td verify <name> --apply` to catch missed "uh"s, then `td recut <name>`.
5. **Read the cut transcript** (`work/cut-transcript.txt` and `.json`) and split it into beats: hook, value, proof number, steps or items, the "even…" line, CTA (see `references/SCRIPTS.md`).
6. **Gather real assets.** Graphics show real things:
   - Verify names and numbers with a web search.
   - Capture product pages with `npx hyperframes capture <url> -o projects/<name>/work/captures/<slug>`. That gives screenshots in `screenshots/`, and logos and SVGs in `assets/`.
   - Crop screenshots with ffmpeg into `video/assets/img/` and copy logos to `video/assets/logos/`.
7. **Plan the shots**, one per sentence or clause (about 2–2.5 s on average):
   - **Hook (shot 1):** a split with a brand or topic graphic that is **fully visible on frame 0**, because frame 0 is the thumbnail.
   - **Talking head:** a breather every 5–8 s, and for emphasis lines.
   - **Listicles:** an **item card** for every "One/Two/…". The header word rises from behind an app tile, and the item name is a serif caption.
   - **Numbers** become count-ups, in the graphic and in the caption.
   - **Real pages** become `shot` layout screenshots with a zoom to the key detail.
   - **2–3 emphasis moments** (the value line and the CTA): a talking-head shot with a two-tier gradient caption and a push-in.
   - **Cuts** fall about 0.06 s before the first word of the new sentence.
8. **Write `projects/<name>/plan.mjs`.**
   - Start from `examples/reel-01.plan.mjs`: 23 shots, including the head-and-shoulders panel and a tuned sound map. Its images and logos aren't included, so swap in your own.
   - The full API is in `references/plan-api.md`.
9. **Design the sound** with `references/sound-design.md` and `references/sound-placement.md`:
   - Every sound lands on a sync point.
   - 2 heroes (the first section and the punchline), with quiet before each. The CTA gets a light keyword accent, not a hit.
   - A different riser into each section card; an impact only on the first.
   - One rising pop run per list, and dings that step up in pitch.
   - A soft, varied whoosh on cuts into new graphics. Cuts back to the talking head stay dry.
10. **Music:** the user's own licensed track from `inbox/music/`. `td music-fit <name> "<file>"` prints the plan's `music` line (see `references/qa.md`). Without a track, the plan can use the kit's placeholder `bed.wav`. Warn the user about copyright for commercial songs.
11. **Build and check:**
    1. `td build <name>`
    2. `npx hyperframes lint projects/<name>/video` (0 errors)
    3. `td qa <name> frames`, then look at `projects/<name>/review/shots.png` for overlaps, empty frames and clipped graphics
    4. `td qa <name> placement` and `td qa <name> sfx`
12. **Render:** `td render <name>` writes `projects/<name>/exports/<name>.mp4`, mastered to −14 LUFS. For panel projects, then run `td qa <name> seams`.
13. **Tweaks:** `td preview <name>` opens HyperFrames Studio, so the user can drag, trim and change volumes. Stop it with `td preview <name> --stop` before re-cutting.

## Defaults (edit them to taste)

- **Frame 0 shows the opening graphic fully,** with no fade-in.
- **Sound effects sit under the voice, and every one has a job.**
  - Targets: 3–6 sound moments per 10 s. Heroes sit about 10 dB under the voice's median, everything else 13 dB or more under.
  - What fails: one riser and one whoosh reused everywhere sounds cheap; 85 effects in 47 s is far too many; booms on every section make nothing feel big.
- **Music** sits about 20 LU under the voice and plays straight through. Music stops before punchlines tend to feel jarring with a real song.
- **Every graphic move needs a reason:** it lands on a spoken word, reveals content, or is part of how a diagram works.
  - Avoid decorative drift, zooms toward one side, idle bobbing and wobble.
  - A slow, centred push-in on a held graphic is fine.
- **When feedback states a lasting preference,** add it to this section so later edits keep it.

## Variants

- **Full upper-body footage:** the default `card` mode shrinks the speaker into a rounded card with feathered sides.
- **Head-and-shoulders footage** (an AI avatar, or a tight crop): set `export const speaker = { mode: "panel", zoom: 1.0, shift: 570 }`.
  - Split shots become a hard 50/50 split, with the speaker at full size in the bottom half and captions at y ≈ 885.
  - Never shrink this footage into a card, because that exposes the cut-off body.
  - Keep split graphics under about 800 px tall.
- **Plan written for another cut speed:** set `export const timeScale = <factor>`. The kit rescales every time position.
- **Hook re-cut** (a variant that drops the opening line, for an A/B test):
  - Make a new project from the same source, with a `manualCuts` entry for the dropped range.
  - Copy the plan and set `export const shift = <dropped seconds> / cut.speed`.

## The first 2 seconds decide the reel

- **Frame 0 is a finished graphic,** never a count-up sitting at "0". Start counters at their final value, or start them after frame 0.
- **No near-empty frames in the first 3 s.** Elements must be on screen on the cut, not 0.17 s after it.
- **The first words carry the promise.** Lead with the command, claim or payoff (see `references/SCRIPTS.md`), not a setup stat like "There are over…".

## Pitfalls that cost a re-render

- **CSS transforms:** don't put a CSS `transform` on any element GSAP animates (`x`, `y`, `scale`, `rotation`). Position with left/top or flex instead, or HyperFrames lint fails with `gsap_css_transform_conflict`.
- **Clips:** never tween `.clip` elements (scenes, videos); animate their children.
- **Content height:**
  - Full-graphic stage: 140–1200 px.
  - Split stage: 60–1000 px in card mode, 30–850 px in panel mode.
  - Graphics that overflow collide with the caption.
- **Captions:** write them in lowercase in the plan; serif captions are uppercased by CSS. Keep each to about 10 characters (1–3 words).
- **Always-present elements** (`.aroll-*` wrappers, `#caps`) must stay unstyled, or the style draws over every shot. Put backgrounds and shadows in the timed scene, such as `.panel-seam` or `.card-fill`.
- **Item headers** sit 120 px from the top of `.item`, so the tile overlaps the lower letters. That overlap is the look.
- **Pauses:** Parakeet stretches word end-times across pauses, so the cut step finds pauses from audio levels, not transcript gaps.
- **Studio:**
  - Opening Studio adds `data-hf-id` tags to `video/index.html`; the tools ignore them.
  - Before rebuilding while Studio is open, compare the timeline (ids, starts, durations, volumes) with a fresh build so you don't overwrite the user's Studio edits.
  - If Studio crashes after a rebuild, reload it.
- **Patching code:** in JavaScript `String.replace`, a replacement containing `$$` becomes `$`. Use `split/join` or the Edit tool.
- **Windows:** quote paths that contain spaces.

## Cover (thumbnail)

- **Use the reel's own look:** a big headline (the hook's promise, with the number in the accent colour), an emphasis line in a deep orange gradient, the reel's tiles or hero graphic, and optionally the speaker.
- **Keep everything important inside the profile grid's 3:4 crop** (y 240–1680 of 1920).
- **Build it** as a one-frame HyperFrames composition and capture it with `npx hyperframes snapshot <dir> --at 0.5`.

## References

- `references/STYLE.md`: the editing rules, with measurements from the reference reels.
- `references/SCRIPTS.md`: the script formula, hook formats, techniques and templates. Use it when the user wants a script, or to judge where emphasis moments belong.
- `references/plan-api.md`: everything `plan.mjs` can contain.
- `references/sound-design.md`: the sound palette and how this style places it.
- `references/sound-placement.md`: general sound-placement rules (sync points, tiers, density, levels, phone speakers), with sources.
- `references/footage.md`: footage profiles, voice processing and speed.
- `references/qa.md`: what each check measures and the targets, plus fitting a music bed.
- `references/pipeline.md`: every `td` command and the `edit.json` keys.
- **Kit:**
  - `kit/build.mjs` turns the plan into `video/index.html`;
  - `kit/kit.css` holds the layouts, captions and components;
  - `kit/kit.js` holds the `NS.*` runtime helpers.
  - The sound palette in `kit/audio/` is built on each machine by `td setup`, not shipped.
- The HyperFrames skills (the `hyperframes` plugin) cover composition authoring in depth.
