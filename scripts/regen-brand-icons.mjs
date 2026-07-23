/**
 * Regenerate favicon + PWA/app icons from `public/logo-mark-light.png`.
 *
 * Light mark (Floral + Pumpkin) is the chrome/source mark. Opaque derivatives
 * sit on brand-black `#050609`. Maskable icons keep ~12% safe-zone padding.
 *
 * Usage: `npm run icons:regen`
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const MARK_LIGHT = join(PUBLIC, "logo-mark-light.png");
const BRAND_BLACK = { r: 0x05, g: 0x06, b: 0x09, alpha: 1 };

/** PNG-in-ICO (Vista+) with 16 + 32 frames. */
function writeIco(path, pngBuffers) {
  const count = pngBuffers.length;
  let offset = 6 + 16 * count;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const entries = [];
  const blobs = [];
  for (const png of pngBuffers) {
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width < 256 ? width : 0, 0);
    entry.writeUInt8(height < 256 ? height : 0, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    blobs.push(png);
    offset += png.length;
  }
  writeFileSync(path, Buffer.concat([header, ...entries, ...blobs]));
}

async function resizeMark(size) {
  return sharp(MARK_LIGHT)
    .resize(size, size, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
}

async function markOnBlack(size, padRatio = 0) {
  const content = Math.max(1, Math.round(size * (1 - 2 * padRatio)));
  const offset = Math.floor((size - content) / 2);
  const mark = await sharp(MARK_LIGHT)
    .resize(content, content, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BRAND_BLACK,
    },
  })
    .composite([{ input: mark, left: offset, top: offset }])
    .png()
    .toBuffer();
}

async function writePng(path, buffer) {
  writeFileSync(path, buffer);
  console.log(`wrote ${path.replace(`${PUBLIC}/`, "")} (${buffer.length} bytes)`);
}

async function main() {
  // Source must exist (byte-identical brand export).
  readFileSync(MARK_LIGHT);

  const fav16 = await resizeMark(16);
  const fav32 = await resizeMark(32);
  await writePng(join(PUBLIC, "favicon-16x16.png"), fav16);
  await writePng(join(PUBLIC, "favicon-32x32.png"), fav32);
  writeIco(join(PUBLIC, "favicon.ico"), [fav16, fav32]);
  console.log("wrote favicon.ico");

  const opaque = [
    ["apple-touch-icon.png", 180, 0],
    ["icon-192.png", 192, 0],
    ["icon-512.png", 512, 0],
    ["icon-maskable-192.png", 192, 0.12],
    ["icon-maskable-512.png", 512, 0.12],
  ];
  for (const [name, size, pad] of opaque) {
    await writePng(join(PUBLIC, name), await markOnBlack(size, pad));
  }

  // favicon.svg is maintained as the vector light mark (Floral + Pumpkin).
  const svg = readFileSync(join(PUBLIC, "favicon.svg"), "utf8");
  if (!svg.includes("#FEF8EC") || !svg.includes("#E8823C")) {
    throw new Error("favicon.svg missing Floral/Pumpkin fills — update vector mark first");
  }
  console.log("favicon.svg OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
