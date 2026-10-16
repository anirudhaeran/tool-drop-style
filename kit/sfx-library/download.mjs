#!/usr/bin/env node
// Download the free Mixkit source sounds listed in manifest.json (their preview MP3s) into raw/, skipping files already
// there. Mixkit Sound Effects Free License: commercial use, no attribution. The files themselves are not redistributed;
// every machine fetches them from Mixkit. Then run ../make-sfx.mjs to build the palette.
//   node .claude/skills/<style>/kit/sfx-library/download.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(HERE, "manifest.json"), "utf8"));
fs.mkdirSync(path.join(HERE, "raw"), { recursive: true });
let got = 0;
for (const m of manifest) {
  const file = path.join(HERE, m.file);
  if (fs.existsSync(file)) continue;
  const res = await fetch(m.source, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${m.id} (${m.title}): HTTP ${res.status}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  got++;
}
console.log(`${manifest.length} Mixkit sounds ready (${got} downloaded) → ${path.join(HERE, "raw")}`);
