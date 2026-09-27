// Generates the app icons (PNG) without dependencies: node tools/make-icons.mjs
// A train window at sunset: dark violet frame, warm sky, sun, hills and a rail line.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    rows[y * (size * 4 + 1)] = 0;
    rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const FRAME = [28, 22, 56];
const SKY_TOP = [58, 42, 110];
const SKY_LOW = [255, 170, 90];
const SUN = [255, 236, 190];
const HILL_FAR = [96, 70, 120];
const HILL_NEAR = [40, 36, 60];
const RAIL = [210, 190, 170];

/** Color of the icon at (x, y) in 0..1 units; `inset` shrinks the art for maskable icons. */
function colorAt(x, y, inset) {
  const u = (x - inset) / (1 - inset * 2);
  const v = (y - inset) / (1 - inset * 2);
  const win = { x0: 0.14, y0: 0.14, x1: 0.86, y1: 0.86, r: 0.12 };
  const dx = Math.max(win.x0 + win.r - u, 0, u - (win.x1 - win.r));
  const dy = Math.max(win.y0 + win.r - v, 0, v - (win.y1 - win.r));
  if (Math.hypot(dx, dy) > win.r) return FRAME;
  const hillFar = 0.6 + 0.05 * Math.sin(u * 9 + 1);
  const hillNear = 0.72 + 0.04 * Math.sin(u * 6 + 3);
  if (v > 0.8 && v < 0.815) return RAIL;
  if (v > hillNear) return HILL_NEAR;
  if (v > hillFar) return HILL_FAR;
  if (Math.hypot(u - 0.62, v - 0.5) < 0.1) return SUN;
  return mix(SKY_TOP, SKY_LOW, Math.min(1, Math.max(0, (v - 0.14) / 0.5)));
}

/** Renders with 3x3 supersampling for smooth edges. */
function render(size, inset) {
  const out = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let acc = [0, 0, 0];
      for (let sy = 0; sy < 3; sy++) {
        for (let sx = 0; sx < 3; sx++) {
          const c = colorAt((px + (sx + 0.5) / 3) / size, (py + (sy + 0.5) / 3) / size, inset);
          acc = acc.map((v, i) => v + c[i] / 9);
        }
      }
      out.set([...acc.map(Math.round), 255], (py * size + px) * 4);
    }
  }
  return out;
}

mkdirSync('icons', { recursive: true });
[
  ['icons/icon-192.png', 192, 0],
  ['icons/icon-512.png', 512, 0],
  ['icons/icon-maskable-512.png', 512, 0.1],
  ['icons/apple-touch-icon.png', 180, 0],
].forEach(([file, size, inset]) => {
  writeFileSync(file, encodePng(size, render(size, inset)));
  console.log('wrote', file);
});
