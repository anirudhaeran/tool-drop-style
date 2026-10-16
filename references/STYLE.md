# Tool-Drop style: editing breakdown (inspired by Nick Sarev, merged from 3 public reels)

> An independent analysis of publicly posted reels, written to learn the techniques. Not affiliated with Nick Sarev; no media from the reels is included.

| Ref | Topic | Length | Analysis |
|---|---|---|---|
| 1 | AUDIT: Cloudflare security skill | 37.1 s | (not included) |
| 2 | CLAUDE: 5 Claude Code plugins (listicle) | 46.5 s | (not included) |
| 3 | LTX: free AI video generator | 27.7 s | (not included) |

All three are 1080×1920 at 30 fps. Scripts are analyzed separately in `SCRIPTS.md` (same folder). 
**(3/3)** means the rule held in all three videos; **(2/3)** or **(1/3)** means it's optional or varies.

---

## 1. Pacing (3/3, numbers almost identical)

| | Ref 1 | Ref 2 | Ref 3 | Rule |
|---|---|---|---|---|
| Speaking rate | 266 wpm | 243 | 236 | **235–265 wpm** |
| Longest pause between words | 0.16 s | 0.16 s | 0.16 s | **every pause and breath removed** |
| Shots | 14 | 21 | 13 | **one per sentence/clause** |
| Average shot | 2.65 s | 2.21 s | 2.13 s | **about 2.2 s (0.5–5.3 s)** |

- **Every shot change is a hard cut on a sentence or clause boundary.** There are no transition effects. **(3/3)**
- Jump cuts in the talking-head footage are hidden under graphics. **(3/3)**
- **Talking-head time is about 30%**, used as breathers every 5–8 s. The rest is graphics or split screen. **(3/3)**
- The style doesn't depend on the shoot: refs 1 and 2 are the same setup (black tee, sage wall), while ref 3 is a different setup (grey sweatshirt, mic in frame).

## 2. Layouts (3/3)

| Layout | Description |
|---|---|
| **A. Talking head** | Speaker full frame. |
| **B. Full-screen graphic** | Plain background with an animated element in the upper-middle (y≈200–1100) and the caption at y≈1300. |
| **C. Split** | Graphic on top, with the speaker in a full-width card at the bottom (y≈1230–1920). The card has rounded top corners (r≈48) and the speaker is scaled to about 0.75×. The caption sits in the gap (y≈900). |
| **D. Screenshot / article** | A real screenshot card (article, README, website) over a heavily blurred, darkened copy of itself, with a slow push-in. A highlighter sweep (orange or red) or an orange frame marks the key line. |

**Backgrounds match the product's brand:**
- white #FFF or light grey #ECECEC (neutral, logos);
- warm beige #F4EDE6 (Claude topics);
- dark: GitHub #0D1117, Strix #000, LTX dark navy.

## 3. Captions

- **1–3 words, about 10 characters max.** Each caption appears about 0.15 s **before** its first word and is held until the next one. There are no gaps and no animation (hard swap). **(3/3)**
- **No punctuation** except apostrophes and quotes. Numbers are written as digits.
- **Numbers count up inside the caption**: "over 254 → 523 → 600", "5 → 7 BILLION". **(2/3)**

**Fonts** (verified by rendering them next to the originals):

| Where | Font | Case / color |
|---|---|---|
| Full-screen graphic, screenshot (B, D) **(3/3)** | **Instrument Serif Italic**, faux-bold (about 3 px stroke at 146 px), about 140 px | UPPERCASE. Black on light, white on dark |
| Talking head (A) **(3/3)** | **Inter Bold**, −3.5% letter-spacing, about 92 px | lowercase as spoken. White with a soft shadow (0 4px 24px rgba(0,0,0,.35)) |
| Split (C) | Inter Bold **(2/3)** *or* Instrument Serif Italic lowercase **(1/3, used with media/video cards)** | black on light, white on dark |
| "Soft" connective words | Instrument Serif Italic, **lowercase**, larger (for example "called", "on a Mac", "how to") | any layout |

- Brand words take the brand's color, for example "CLAUDE" in #D97757. **(1/3)**

**Emphasis captions** (2–3 per video, 3/3):
- A **two-tier stack**: a lead word in Instrument Serif Italic (lowercase, white or silver) overlapping a **big Inter Bold keyword with a white→accent gradient** and a soft glow.
- The keyword fades in on its spoken word.
- The gradient color is the video's accent: orange #FF7A2F (refs 1 and 2), blue #4FB3FF (ref 3), teal on the "Free LLM APIs" beat (ref 2), pink on "anymore" (ref 3).
- It's used on the value line ("completely free", "100%", "a single thing", "AI VIDEOS / anymore") and **always on the CTA**: `comment` / `"KEYWORD"`, held to the end (3–4 s).

## 4. Camera

- **Normal talking-head shots are static.** **(3/3)**
- **Talking-head shots with an emphasis caption or the CTA get a slow push-in of 5–15%** over the shot, eased. **(3/3)**

## 5. Graphics

**Principles (3/3):**
- Everything is illustrated **literally**: each noun or number in the sentence appears on screen.
- Elements **build in time with the words**. Entry is a fade plus scale from 0.96 to 1 (0.15–0.25 s, ease-out). Fast moves have motion blur.
- Objects **move or transform between states** instead of cutting.
- At a cut, the incoming graphic fades in over about 2 frames.

**Look:** clean product UI. White cards, 1 px light borders, 10–14 px corner radius, soft shadows. UI text is Inter. Terminals are dark (#1E1E1E) with orange command highlights. Status colors: red #E5484D, green #30A46C, amber.

**Patterns seen** (to build as reusable HyperFrames blocks):

| # | Pattern | Seen in |
|---|---|---|
| 1 | **Brand logo reveal**: symbol appears, then the wordmark slides out (Cloudflare, Anthropic) | 1, 2 |
| 2 | **App-icon tile**: rounded square with a shadow, used to introduce a product | 2, 3 |
| 3 | **Strike-through**: a red slash draws across competitor icons ("don't pay for Veo or Kling") | 3 |
| 4 | **Numbered item card**: "THE SECOND" in a pink-red gradient serif rises from behind the icon tile, item name below | 2 |
| 5 | **Annotated UI mockup**: login form or dashboard, then issue badges or red tag chips pop on, plus a red **scan line** sweep | 1, 2 |
| 6 | **Stat counter**: a big red number rolls up (7,000+), with a label | 1 |
| 7 | **GitHub repo card** with a star count-up, or a **star-history line chart** that draws itself | 1, 2 |
| 8 | **Screenshot card on a blurred background** with a highlighter sweep or orange frame (layout D) | 1, 2, 3 |
| 9 | **Terminal card** typing a command, with an orange highlight | 1, 2 |
| 10 | **Pixel mascot**: Claude mascot ×1 → ×3 → flies into list cards (Logins / Database / APIs) | 1, 2 |
| 11 | **Flow diagram**: platform icons pop in one by one, joined by curved lines into a target | 2 |
| 12 | **Logo carousel**: logos swap on each word, with a small icon row underneath | 2 |
| 13 | **Media card / grid**: product video clips playing in rounded cards, a 2×2 grid, or a collage | 3 |
| 14 | **Product photo** (for example a MacBook) on white, with a serif caption above | 3 |
| 15 | **Report / list builder**: rows appear with severity tags and checkmarks, and a code-fix row expands | 1 |

## 6. Audio

This section describes what the reference reels do. How this kit places sounds is in `sound-design.md`.


- **Mastering** (3/3, identical): **−14.2 to −14.3 LUFS**, loudness range 1.6–2.5 LU (heavy compression), peaks about −0.5 dBFS. The voice is dry and loud.
- **Music** (3/3): a soft ambient bed (pad plus soft plucks) for the whole video, about 20 dB under the voice, at a constant level. It's probably the same or a similar track in all three.
- **Sound effects** (3/3), about one every 2–3 s (12 in 37 s, 25 in 46 s, 13 in 28 s). They were found by removing the voice.
  1. **Risers into section cuts.** A low swell plus a rising noise sweep, 0.5–0.95 s long, +15 to +25 dB, peaking about 0.1 s before the cut. Used on every major beat: "Then…", "The second…", "Third…", "And finally…", the CTA.
  2. **Hits / whooshes** (0.2–0.4 s). Placed right **after** a cut as the new item lands ("is", "which", "there's"), or on a big moment inside a graphic (badges pop, mascots fly).
  3. **Music drop-outs.** The music goes silent for about 0.15–0.3 s right before a punchline, then returns ("…on a Mac"; ref 1 has two of these).
- Effect peaks sit at roughly music level to +5 dB, always under the voice.

## 7. Per-video choices (pick these for each new edit)

- Accent color (from the product's brand) → emphasis gradient, highlights, item-card color.
- Background theme (light, beige or dark) per product.
- Split-layout caption font (Inter Bold by default; serif lowercase when the card holds media).
- Which graphic patterns from §5 fit the script.

## 8. Still open

- Is the voice sped up? 236–266 wpm is consistent across all three, which suggests about 1.1× on top of the cut pauses.
- Quiet mono effects (clicks, dings) can't be separated from the voice by the stereo method. Point out any you hear.
- The music track itself isn't identified.
