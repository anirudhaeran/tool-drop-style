# Footage profiles

Decide which profile applies before cutting and before planning layouts. Ask the user when unsure: a wrong guess costs a full re-render.

## 1. Normal talking-head footage (raw)

- Leave pause and filler removal on (`silence`, `fillers`).
- Run `td verify <name> --apply` after the cut. Parakeet sometimes skips "uh"s, and the verify pass catches them.
- Styles may shrink the speaker into a floating card (the tool-drop style's `card` mode). That works when the footage shows the full upper body.

## 2. Pre-cleaned footage

The gaps and fillers are already removed, and often the colour is graded.

- In `edit.json`, set `silence.enabled: false`, `fillers.enabled: false` and `trimEnds: false`.
- Don't re-grade the colour.

## 3. Head-and-shoulders footage (an AI avatar, or a tight crop)

The framing stops at the shoulders, or the body fades out at the bottom of the clip.

- **Split layouts must be a hard 50/50 split.** The graphic goes on top and the speaker sits in the bottom half at full size (zoom 1.0, about 570 px shifted down), with captions just above the seam.
  - Never shrink this footage into a floating card: it exposes the missing body.
  - In the tool-drop kit this is `export const speaker = { mode: "panel", zoom: 1.0, shift: 570 }`.
- Split graphics must fit the top half: under about 800 px tall, clear of the seam caption at y ≈ 885.
- Full-screen talking-head shots crop in 1.22× around the face (origin 50% 42%). Push-ins on emphasis shots go up to about 1.1.

## Voice processing

The reference reels are dense and compressed (a loudness range of about 2 LU at −14 LUFS). Home recordings usually have more dynamics. A setting that works well:

```json
"voiceChain": "highpass=f=70,acompressor=threshold=-22dB:ratio=3:attack=5:release=80:makeup=3dB:knee=3,alimiter=limit=-1dB:level=0"
```

The final `render` step then brings the whole mix to −14 LUFS and −1.5 dBTP with a two-pass loudnorm.

## Speed

The tool-drop references run at 236–266 wpm. Measure the take: words ÷ duration × 60.

| Take | Setting |
|---|---|
| Slow (around 200 wpm) | `cut.speed: 1.06` (gentle) |
| Very slow | Up to 1.12. Above that the voice starts to sound rushed. |
| Already 240+ wpm | Leave it at 1.0 |

If a plan was written for a different speed, set `timeScale` in the plan instead of re-timing it by hand.
