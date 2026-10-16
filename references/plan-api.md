# plan.mjs API (style-tool-drop kit)

`projects/<name>/plan.mjs` is an ES module read by `kit/build.mjs`. The best starting point is
`examples/reel-01.plan.mjs`. All times are seconds on the **cut timeline** (`work/cut-transcript.json`)
unless `timeScale` is set.

## Exports

| Export | Required | Meaning |
|---|---|---|
| `shots` | yes | Ordered, contiguous shots; the first starts at 0, the last ends at the footage end (the builder clamps it) |
| `css` | no | Extra CSS for this video's scenes (prefix classes per shot, e.g. `.s06-row`) |
| `sfx` | no | Sound events (see sound-design.md) |
| `music` | no | `{ file, src, volume, drops }`. `src` is the bed's path relative to the project folder: a track already cut to the reel's length and normalised to −20 LUFS. `td music-fit <name> "<file>"` makes it and prints this line. `volume` sets the level; 0.114 is about 20 LU under a −18.9 LUFS voice. `drops` (`[[a, b], …]`, short silences before punchlines) are optional; leave them empty with a real song. Without `src`, `file` is read from the kit's `audio/` (`bed.wav` is a placeholder) |
| `speaker` | no | `{ mode: "card" \| "panel", zoom, shift }`. Use panel for head-and-shoulders footage (an AI avatar, or a tight crop): `{ mode: "panel", zoom: 1.0, shift: 570 }` |
| `timeScale` | no | Multiply every time position by this (plan authored on a different-speed cut) |
| `shift` | no | Cut seconds removed from the front after the plan was written, e.g. a hook re-cut that drops the opening line. Positions become `t × timeScale − shift`, and shots, captions and sounds that end before 0 drop out. The first remaining shot must start at the new 0 |
| `mix` | no | Override mix-bus gains per sound prefix, e.g. `{ "rise-": 0.25 }` |

## Shot fields

| Field | Meaning |
|---|---|
| `id` | `s01`, `s02`… (used for element ids and CSS prefixes) |
| `start`, `end` | Cut-timeline seconds. Cut ≈ 0.06 s before the sentence's first word |
| `layout` | `th` (talking head) · `split` (graphic top, speaker below) · `full` (graphic only) · `item` (numbered item card, full layout) · `shot` (screenshot on blurred copy) |
| `theme` | `white` · `beige` (Claude topics) · `grey` · `dark` (#0d1117) · `black`. Pick from the product's brand |
| `html` | Scene markup placed inside `.stage` (flex-centered). Not used for `th` |
| `anim(tl, NS, t, el)` | Adds tweens; `t` = shot start (plan time), `el` = the scene element. Use absolute word times from the transcript for word-synced builds |
| `caps` | `[[wordTime, "text", opts?], …]`. Each caption shows 0.15 s before `wordTime` and hard-swaps to the next |
| `push` | `th` only: push-in scale over the shot (1.07–1.1 for emphasis/CTA) |
| `zoom` | `th` only: override the 1.22 base crop |
| `capY` | Override caption y for the shot |

Caption `opts`:

| Option | Meaning |
|---|---|
| `font` | `sans` (default for th/split), `serif` (default for full/item/shot, uppercased), `soft` (serif italic, lowercase) |
| `tone` | `dark`, `light`, `accent` (brand word, e.g. "Claude") |
| `emph` | `{ lead, key, at }`. Two-tier emphasis: serif `lead` word over a gradient `key` that fades in at `at`. Use `text: ""` |
| `count` | `{ from, to, t, d, fmt: "int" \| "dec1" \| "k", pre, post }`. Number rolls up inside the caption |
| `until` | Hold this caption until a time (e.g. the CTA to the end) |
| `y` | Caption center y in px |

## NS helpers (kit/kit.js), used inside `anim`

| Helper | Use |
|---|---|
| `NS.pop(tl, el, t, {y, x, scale, d, stagger})` | Default entrance (fade, rise, 0.94→1 scale) |
| `NS.bounce(tl, el, t, {stagger})` | Badges, chips, icons (back-out pop) |
| `NS.fly(tl, el, {x \| y}, t, {stagger})` | Fast move in with motion blur |
| `NS.count(tl, el, from, to, t, d, fmt, pre, post)` | Number roll-up in any element |
| `NS.type(tl, el, text, t, d)` | Typewriter |
| `NS.draw(tl, svgPath, t, d)` | Stroke draw (arrows, chart lines, connectors) |
| `NS.sweep(tl, el, t, d)` | Highlighter / bar grows from the left (scaleX) |
| `NS.zoom(tl, el, t, d, scale, origin, {x})` | Zoom into a detail (screenshots); `origin` = CSS transform-origin |
| `NS.drift(tl, el, t, d, to)` | Slow push on a card |
| `NS.item(tl, ".item", t)` | Numbered item card entrance (tile rises, header slides up from behind it) |

`el` can be a selector, an element or a NodeList. Never put a CSS transform on an animated element.

## Kit CSS building blocks (kit/kit.css)

- **Layout:** `.stage` (centered area), `.card-fill` / `.panel-seam` (added automatically for split), `.shot-bg` + `.shot-card` (screenshot layout), `.hl-box` (orange frame), `.hl-sweep` (marker).
- **Components:**
  - `.item` > `.item-head` + `.tile` (numbered card);
  - `.tile.sm` / `.tile.xs`;
  - `.ui-card` (white card), `.dark-card` (GitHub-dark card);
  - `.pill.green|.red|.orange|.grey`;
  - `.big-num`, `.label`, `.mono`, `.mascot`.
- **Colors:** `--ns-accent #d97757`, `--ns-red`, `--ns-green`, `--ns-amber`, `--ns-beige`, `--ns-dark`.
- **Fonts** (Google Fonts, loaded by the builder): Instrument Serif (captions, headers), Inter (UI and sans captions), JetBrains Mono (terminals, file names).

## Geometry (1080×1920)

| Area | Position |
|---|---|
| Full / item stage | y 140–1200 |
| Split stage | card mode y 60–1000 (speaker card from 1150); panel mode y 30–850 (speaker half from 960) |
| Caption centers | th 1300 · split 1075 (panel 885) · full/item/shot 1330 |
| Talking head | base crop 1.22 around 50% 42% |
| Item card | `.item` 760×640, header top 120, tile 340 |
