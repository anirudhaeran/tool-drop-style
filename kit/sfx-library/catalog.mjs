// Build a catalog of Mixkit sound effects (title, seconds, preview URL) for the given categories.
// Mixkit Sound Effects Free License: free for commercial use, no attribution required.
import fs from "node:fs";
const cats = process.argv.slice(2);
const out = {};
for (const cat of cats) {
  const html = await (await fetch(`https://mixkit.co/free-sound-effects/${cat}/`, { headers: { "user-agent": "Mozilla/5.0" } })).text();
  const items = html.split('class="item-grid__item"').slice(1).map((chunk) => {
    const url = chunk.match(/data-audio-player-preview-url-value="([^"]+)"/)?.[1];
    const title = chunk.match(/item-grid-card__title">\s*([^<]+?)\s*</)?.[1];
    const dur = chunk.match(/data-test-id="duration">\s*(\d+):(\d+)/);
    return url && title ? { id: Number(url.match(/sfx\/(\d+)\//)[1]), title, seconds: dur ? +dur[1] * 60 + +dur[2] : null, url } : null;
  }).filter(Boolean);
  out[cat] = items;
}
fs.writeFileSync("catalog.json", JSON.stringify(out, null, 1));
for (const [cat, items] of Object.entries(out)) console.log(`== ${cat} (${items.length}): ` + items.map((i) => `${i.id} ${i.title} [${i.seconds}s]`).join(" | "));
