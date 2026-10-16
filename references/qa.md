# Quality checks

Run these before sending any render, with `td qa <name> [check]` (the code is in `engine/qa.mjs`).

| Check | When | What it does | Pass when |
|---|---|---|---|
| `frames` | After `build`, before `render` | Takes one HyperFrames snapshot per shot (75% into the shot) and tiles them into `projects/<name>/review/shots.png` | You've looked at it: no caption/graphic overlaps, nothing clipped at the frame edge or the split seam, no empty first frame, text readable |
| `sfx` | After `build` | Re-mixes the effects bus as placed in `index.html` and compares it with `voice.m4a` (K-weighted momentary loudness) | Loudest effect moment ≤ the voice median − 8 dB (about −10 is a good balance); bus ≥ 13 LU under the voice |
| `placement` | After `build` | Measures where effects land: moments per 10 s, the share of cuts carrying a sound, gaps between moments, the impact count, repeats of the same file | 3–6 moments per 10 s; ≥ 70% of cuts covered; gaps ≥ 0.4 s; ≤ 5 impacts; no file repeated within 4 s (rules in `sound-placement.md`) |
| `seams` | After `render` (50/50 panel projects) | Samples rows 890/950/1010 of every non-split graphic shot in the export | No dark dip at y ≈ 950 (a dip means a seam shadow is leaking onto other shots) |

Also:

- **Lint:** `npx hyperframes lint projects/<name>/video` must report **0 errors**. The kit's warnings (`nested_structure_needs_subcomposition`, `composition_file_too_large`, `timeline_track_too_dense`) are known and harmless for rendering.
- **Final loudness:** `ffmpeg -i projects/<name>/exports/<name>.mp4 -af ebur128=peak=true -f null -` should give −14 ±0.3 LUFS, a true peak ≤ −1.5 dBTP, and a loudness range around 2 LU.
- **Exact frames** for a suspected issue: `npx hyperframes snapshot projects/<name>/video --at <t>` (cheap), or `ffmpeg -ss <t> -i projects/<name>/exports/<name>.mp4 -frames:v 1 x.png` on the render.

A paused desktop player draws its own dark gradient at the bottom of the frame. Before "fixing" anything there, sample the actual pixels.

## Fitting a music bed

**The track:** put the user's track in `inbox/music/`. Use it only after confirming they have the rights: their own track, a subscription library, or a free library such as [Mixkit's stock music](https://mixkit.co/free-stock-music/).

**Fit it:** `td music-fit <name> "<file>" [--from s] [--at s] [--length s] [--under 20] [--vocals]`. The tool:
- maps the song (short-term loudness, 1–4 kHz share and centre content every 3 s) and picks a steady section that starts on a downbeat and ends before any breakdown;
- `--from` snaps to the nearest onset; `--at` starts exactly there;
- `--length` sets a shorter bed, for music that enters after the hook;
- `--vocals` runs Parakeet on the chosen stretch and reports sung words, which shouldn't sit under speech;
- levels the bed with a slow compressor and a 3 dB dip at 1–4 kHz, normalises it to −20 LUFS, and prints the `music` line for `plan.mjs`, with `volume` for 20 LU under the voice;
- reports the phone translation: how much the bed loses through a phone speaker compared with the voice.

**Line up the drop:** if the track has a drop, start it so the drop lands on the first big visual move: `--at <drop time − move time>`.

**Play it straight through:** the music runs the whole reel with no stops. Ask the user how loud it should sit; 17–20 LU under the voice is the usual range.
