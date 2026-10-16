# Tool-Drop Style for Claude (inspired by Nick Sarev)

A ready-made editing style for Claude Code. Drop in a raw talking-head clip and Claude edits it into a finished vertical reel in the fast "tool drop" format:
- a hard cut on almost every sentence;
- full-screen product-UI motion graphics;
- numbered item cards and count-ups;
- serif and sans captions;
- a riser into every section;
- a comment-keyword CTA.

The style is already learned and tuned, so there's nothing to train. Install it, then ask for it by name.

> **Not affiliated with Nick Sarev.** The style was studied from his public reels to learn the editing techniques. Everything here (code, graphics kit, documentation) is an independent recreation. None of his videos, audio or scripts are included.

Shared by [@aeran.ai](https://instagram.com/aeran.ai) as a bonus to the guide *Edit Your Videos With Claude*.

## Before you start

You need the setup from Step 1 of the guide: Node.js 22+, FFmpeg, Claude Code, and a `my-videos` folder. The HyperFrames plugin and Parakeet are recommended too; if they're missing, setup installs what it needs.

## Install (about 5 minutes)

**The easy way:** open Claude Code in your `my-videos` folder and paste:

```
Install the Tool-Drop style: clone https://github.com/anirudhaeran/tool-drop-style
into .claude/skills/style-tool-drop, then run
node .claude/skills/style-tool-drop/engine/td.mjs setup
```

**Or by hand,** in a terminal inside `my-videos`:

```bash
git clone https://github.com/anirudhaeran/tool-drop-style .claude/skills/style-tool-drop
node .claude/skills/style-tool-drop/engine/td.mjs setup
```

No Git? On the GitHub page click **Code → Download ZIP**, unzip it, rename the folder to `style-tool-drop`, and move it to `my-videos/.claude/skills/`. Then run the setup line.

Setup does four things:
- installs the renderer inside the style folder, about 120 MB;
- downloads the free Mixkit sound effects and builds the sound palette;
- reuses the Parakeet model and Chrome you already have, or downloads them (640 MB and 270 MB) if they're missing;
- ends with "Ready" once everything checks out.

If Claude doesn't see the style straight away, start a new session (`/exit`, then `claude`).

## Edit a reel

1. Put your clip in `my-videos/inbox/`. Optionally, put a licensed music track in `inbox/music/`.
2. Tell Claude:

```
Edit inbox/my-clip.mp4 in the tool-drop style.
```

Claude does the whole edit:
- transcribes the clip and cuts the pauses and filler words;
- plans a graphic for every sentence and gathers real logos and screenshots;
- builds the edit and checks every frame and the sound levels;
- renders `projects/<name>/exports/<name>.mp4` at −14 LUFS.

**To tweak it yourself,** ask Claude to "open it in Studio". That's a timeline editor: drag, trim or change a volume, tell Claude what you changed, then ask for a render.

## Tips

- **Real assets make it look real.** Name the tools you talk about clearly in the video. Claude captures their sites and uses the real logos and numbers.
- **Pace:** the reference reels run at 235–265 words per minute. If your take is slower, ask Claude to speed it up a little (1.06× is gentle).
- **Scripts:** ask Claude to "write me a tool-drop script about <topic>". The style comes with the hook formats, structure and CTA formula that make this format work.
- **Your taste:** when you give feedback you'd want every time ("quieter sound effects", "no zooms to the side"), ask Claude to save it to the style. Later edits keep it.

## Updating

When a new version is out: `cd .claude/skills/style-tool-drop`, then `git pull`, then run setup again. If you used the ZIP, replace the folder and run setup.

## Licenses

- **Code and documentation:** MIT (see `LICENSE`).
- **Sound effects:** downloaded from [Mixkit](https://mixkit.co/free-sound-effects/) on your computer, under the Mixkit Sound Effects Free License. They're free for commercial use with no attribution.
- **Fonts:** Google Fonts (Instrument Serif, Inter, JetBrains Mono), loaded at render time.
- **HyperFrames:** Apache 2.0 ([GitHub](https://github.com/heygen-com/hyperframes)).
