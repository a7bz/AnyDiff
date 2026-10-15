// One-off generator for the extension icon (128x128 RGBA PNG).
// Pure Node, no dependencies. Safe to delete after use.
const zlib = require('zlib');

const SIZE = 128;
const R = 26;

function lerp(a, b, t) { return a + (b - a) * t; }

const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);

function setPx(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const idx = (y * (SIZE * 4 + 1)) + 1 + x * 4;
  raw[idx] = r; raw[idx + 1] = g; raw[idx + 2] = b; raw[idx + 3] = a;
}

function drawCircle(cxp, cyp, radius) {
  for (let y = Math.floor(cyp - radius); y <= Math.ceil(cyp + radius); y++) {
    for (let x = Math.floor(cxp - radius); x <= Math.ceil(cxp + radius); x++) {
      if (Math.hypot(x - cxp, y - cyp) <= radius) setPx(x, y, 255, 255, 255, 255);
    }
  }
}

function drawThickLine(x0, y0, x1, y1, width, r, g, b) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    for (let oy = -width; oy <= width; oy++) {
      for (let ox = -width; ox <= width; ox++) {
        setPx(Math.round(x + ox), Math.round(y + oy), r, g, b, 255);
      }
    }
  }
}

let p = 0;
for (let y = 0; y < SIZE; y++) {
  raw[p++] = 0; // filter: none
  for (let x = 0; x < SIZE; x++) {
    const dx = Math.max(R - x, x - (SIZE - 1 - R), 0);
    const dy = Math.max(R - y, y - (SIZE - 1 - R), 0);
    const insideCorners = (x >= R && x <= SIZE - 1 - R) || (y >= R && y <= SIZE - 1 - R);
    const inside = insideCorners || Math.hypot(dx, dy) <= R;
    if (!inside) { raw[p++] = 0; raw[p++] = 0; raw[p++] = 0; raw[p++] = 0; continue; }
    const t = (x + y) / (2 * SIZE);
    raw[p++] = Math.round(lerp(79, 31, t));
    raw[p++] = Math.round(lerp(140, 111, t));
    raw[p++] = Math.round(lerp(201, 178, t));
    raw[p++] = 255;
  }
}

// Glyph: two horizontal arms bending downward + centre dot.
drawThickLine(40, 42, 70, 42, 3, 255, 255, 255);
drawThickLine(70, 42, 70, 86, 3, 255, 255, 255);
drawThickLine(88, 42, 58, 42, 3, 190, 225, 245);
drawThickLine(58, 42, 58, 86, 3, 190, 225, 245);
drawCircle(64, 64, 7);

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // RGBA

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);

require('fs').writeFileSync(__dirname + '/../media/icon.png', png);
console.log('wrote icon.png,', png.length, 'bytes');
