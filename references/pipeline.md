# Pipeline reference

`td` = `node .claude/skills/style-tool-drop/engine/td.mjs`, run from the videos folder.

## Folder layout

```
my-videos/                         the folder Claude Code is open in
  inbox/                           raw clips;  inbox/music/  licensed music tracks
  projects/<name>/
    edit.json                      per-project settings (copied from the skill's config.json)
    project.json                   metadata + what each step produced (written by the tools)
    plan.mjs                       the creative plan the style kit reads
    source/<file>                  HARD LINK to the user's original — never modify
    work/transcript.json|txt       Parakeet words (source timeline, word indices)
    work/edl.json                  cuts + kept segments;  work/cut-transcript.json|txt  the cut timeline
    work/captures/                 website captures (npx hyperframes capture)
    video/                         HyperFrames project: index.html, assets/ (footage.mp4, voice.m4a, audio/, img/, logos/)
    review/                        QA output (shots.png, frames/)
    exports/<name>.mp4 + .srt      the final video (loudness-mastered) + subtitles;  master.mp4 = pre-master render
  .claude/skills/style-tool-drop/  this skill: SKILL.md, references/, examples/, kit/, engine/ (td), config.json
```

## Commands

| Command | What it does |
|---|---|
| `td setup` | One time: the pinned renderer (inside the skill folder), Parakeet, Chrome, the Mixkit sound palette |
| `td doctor` | Check Node, FFmpeg, the renderer, Parakeet and the sound palette |
| `td new "<video>" [--name n] [--aspect 9:16]` | Create `projects/<name>` (the source is hard-linked) |
| `td transcribe <name>` | Parakeet TDT 0.6B v3 (on this computer) → `work/transcript.*` |
| `td plan <name>` | Pauses (audio levels) + fillers + `manualCuts` → `work/edl.json` |
| `td cut <name> [--encoder libx264]` | FFmpeg cut (+ speed, voiceChain) → `video/assets/footage.mp4`, the cut transcript, `.srt` |
| `td verify <name> [--apply]` | Re-transcribe the cut: clipped words at joins? missed "uh"s? |
| `td recut <name>` | plan + cut, plus build when `plan.mjs` exists |
| `td build <name>` | The style kit turns `plan.mjs` into `video/index.html` |
| `td qa <name> [frames\|sfx\|placement\|seams]` | Quality checks (see `qa.md`) |
| `td music-fit <name> "<file>"` | Fit a music track under the voice and print the plan's `music` line |
| `td preview <name> [--stop]` | HyperFrames Studio, a timeline editor in the browser |
| `td render <name> [--draft] [--quality delivery]` | Render → loudnorm −14 LUFS → `exports/<name>.mp4` |
| `td status <name>` / `td list` | Inspect |

Other tools: `npx hyperframes capture <url> -o <dir>` (website screenshots + logos/SVGs for graphics),
`npx hyperframes snapshot projects/<name>/video --at 1,5,9` (exact frames),
`npx hyperframes lint projects/<name>/video`.

## edit.json reference

| Key | Default | Meaning |
|---|---|---|
| `style` | — | Style sub-skill used by `td build` (`"tool-drop"`, set by `td new`) |
| `silence.enabled` | `true` | Remove pauses (off for pre-cleaned footage) |
| `silence.thresholdDb` | `"auto"` | auto = speech level − 20 dB, kept ≥ 6 dB above the noise floor |
| `silence.minSilence` | `0.45` | Shortest pause (s) that gets cut |
| `silence.keepAfterSpeech` / `keepBeforeSpeech` | `0.15` / `0.1` | Breathing room at each cut |
| `fillers.enabled`, `fillers.words` | `true`, um/uh/… | Filler removal (off for pre-cleaned footage) |
| `trimEnds` | `true` | Trim before the first / after the last word |
| `manualCuts` | `[]` | `{"words":[a,b]}` (indices from work/transcript.txt) or `{"start":s,"end":e}` + `"note"` |
| `keep` | `[]` | Ranges never cut |
| `cut.encoder` | `"auto"` | NVENC → libx264 fallback |
| `cut.speed` | `1` | Global speed (pitch preserved). Raise it (1.06 is gentle) when a take is slow; see `footage.md`. |
| `cut.voiceChain` | `null` | FFmpeg audio filters on the voice (compression) — see footage.md |
| `format.aspect` | `"source"` | `source`, `16:9`, `9:16`, `1:1`, `4:5` |
| `export.quality` | `"looks"` | HyperFrames render quality |
| `export.loudness` / `truePeak` | `-14` / `-1.5` | Final master (LUFS / dBTP) |

## Timebases

Everything after the cut uses the **cut timeline** (`work/cut-transcript.json`, `.txt`). A style plan
written against one cut can be reused after a re-cut that changes speed by setting
`export const timeScale = <old speed / new speed>` in the plan — the kit rescales every time position.
