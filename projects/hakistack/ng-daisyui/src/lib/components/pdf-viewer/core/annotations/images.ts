import { decodeStream, deflate, inflate, unpredict } from '../pdf-writer/filters';
import { PdfDict, PdfName, PdfStream } from '../pdf-writer/objects';

/**
 * Images for stamps: PNG decoding (to embed as a Flate image with an alpha
 * soft mask), JPEG header reading (embedded as-is with DCTDecode), and the
 * way back from an image XObject to a PNG or JPEG. No dependencies; PNG
 * scanline filters reuse the PDF predictor code (they are the same thing).
 */

export interface DecodedImage {
  readonly width: number;
  readonly height: number;
  /** 8-bit RGB, row by row. */
  readonly rgb: Uint8Array;
  /** 8-bit alpha, or null when fully opaque. */
  readonly alpha: Uint8Array | null;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Decode a non-interlaced 8-bit PNG (grey, grey+alpha, RGB, RGBA or palette). */
export async function decodePng(bytes: Uint8Array): Promise<DecodedImage> {
  if (!PNG_SIGNATURE.every((b, i) => bytes[i] === b)) throw new Error('not a PNG');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0;
  let height = 0;
  let depth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette: Uint8Array | null = null;
  let trns: Uint8Array | null = null;
  const idat: Uint8Array[] = [];
  for (let at = 8; at + 8 <= bytes.length; ) {
    const len = view.getUint32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    const data = bytes.subarray(at + 8, at + 8 + len);
    if (type === 'IHDR') {
      width = view.getUint32(at + 8);
      height = view.getUint32(at + 12);
      depth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    at += 12 + len;
  }
  if (depth !== 8 || interlace !== 0) throw new Error('only 8-bit, non-interlaced PNGs are supported');
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`unsupported PNG colour type ${colorType}`);
  const joined = new Uint8Array(idat.reduce((n, c) => n + c.length, 0));
  let o = 0;
  for (const c of idat) {
    joined.set(c, o);
    o += c.length;
  }
  const raw = unpredict(await inflate(joined), new PdfDict({ Predictor: 15, Colors: channels, BitsPerComponent: 8, Columns: width }));

  const n = width * height;
  const rgb = new Uint8Array(n * 3);
  const alpha = new Uint8Array(n);
  let opaque = true;
  for (let i = 0; i < n; i++) {
    let r: number;
    let g: number;
    let b: number;
    let a = 255;
    if (colorType === 0 || colorType === 4) {
      r = g = b = raw[i * channels];
      if (colorType === 4) a = raw[i * 2 + 1];
    } else if (colorType === 3) {
      const idx = raw[i];
      r = palette?.[idx * 3] ?? 0;
      g = palette?.[idx * 3 + 1] ?? 0;
      b = palette?.[idx * 3 + 2] ?? 0;
      if (trns && idx < trns.length) a = trns[idx];
    } else {
      r = raw[i * channels];
      g = raw[i * channels + 1];
      b = raw[i * channels + 2];
      if (colorType === 6) a = raw[i * 4 + 3];
    }
    rgb[i * 3] = r;
    rgb[i * 3 + 1] = g;
    rgb[i * 3 + 2] = b;
    alpha[i] = a;
    if (a !== 255) opaque = false;
  }
  return { width, height, rgb, alpha: opaque ? null : alpha };
}

/** Encode RGB (+ optional alpha) as an 8-bit PNG. */
export async function encodePng(img: DecodedImage): Promise<Uint8Array> {
  const channels = img.alpha ? 4 : 3;
  const stride = img.width * channels + 1;
  const raw = new Uint8Array(stride * img.height);
  for (let y = 0; y < img.height; y++) {
    raw[y * stride] = 0; // filter: none
    for (let x = 0; x < img.width; x++) {
      const i = y * img.width + x;
      const at = y * stride + 1 + x * channels;
      raw[at] = img.rgb[i * 3];
      raw[at + 1] = img.rgb[i * 3 + 1];
      raw[at + 2] = img.rgb[i * 3 + 2];
      if (img.alpha) raw[at + 3] = img.alpha[i];
    }
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, img.width);
  dv.setUint32(4, img.height);
  ihdr.set([8, img.alpha ? 6 : 2, 0, 0, 0], 8);
  return concat([Uint8Array.from(PNG_SIGNATURE), chunk('IHDR', ihdr), chunk('IDAT', await deflate(raw)), chunk('IEND', new Uint8Array())]);
}

/** Size and component count from a JPEG's SOF marker. */
export function jpegInfo(bytes: Uint8Array): { width: number; height: number; components: number } {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('not a JPEG');
  for (let at = 2; at + 9 < bytes.length; ) {
    if (bytes[at] !== 0xff) {
      at++;
      continue;
    }
    const marker = bytes[at + 1];
    const len = (bytes[at + 2] << 8) | bytes[at + 3];
    // SOF0–SOF15, except DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: (bytes[at + 5] << 8) | bytes[at + 6], width: (bytes[at + 7] << 8) | bytes[at + 8], components: bytes[at + 9] };
    }
    at += 2 + len;
  }
  throw new Error('JPEG without a frame header');
}

/** Image XObject streams for a PNG or JPEG: the image and, for transparent PNGs, its soft mask. */
export async function imageXObject(
  bytes: Uint8Array,
  mime: 'image/png' | 'image/jpeg',
): Promise<{ image: PdfStream; smask: PdfStream | null }> {
  if (mime === 'image/jpeg') {
    const { width, height, components } = jpegInfo(bytes);
    if (components !== 1 && components !== 3) throw new Error('CMYK JPEGs must be converted first');
    const dict = new PdfDict({
      Type: PdfName.of('XObject'),
      Subtype: PdfName.of('Image'),
      Width: width,
      Height: height,
      ColorSpace: PdfName.of(components === 1 ? 'DeviceGray' : 'DeviceRGB'),
      BitsPerComponent: 8,
      Filter: PdfName.of('DCTDecode'),
    });
    return { image: new PdfStream(dict, bytes), smask: null };
  }
  const img = await decodePng(bytes);
  const base = { Type: PdfName.of('XObject'), Subtype: PdfName.of('Image'), Width: img.width, Height: img.height, BitsPerComponent: 8 };
  const image = new PdfStream(
    new PdfDict({ ...base, ColorSpace: PdfName.of('DeviceRGB'), Filter: PdfName.of('FlateDecode') }),
    await deflate(img.rgb),
  );
  const smask = img.alpha
    ? new PdfStream(
        new PdfDict({ ...base, ColorSpace: PdfName.of('DeviceGray'), Filter: PdfName.of('FlateDecode') }),
        await deflate(img.alpha),
      )
    : null;
  return { image, smask };
}

/**
 * Back from an image XObject to a file: DCT data is a JPEG already; other
 * 8-bit RGB or grey images (with an optional 8-bit soft mask) become a PNG.
 * Returns null for what it can't convert (other colour spaces, bit depths,
 * filters).
 */
export async function imageFromXObject(
  image: PdfStream,
  smask: PdfStream | null,
): Promise<{ data: Uint8Array; mime: 'image/png' | 'image/jpeg'; width: number; height: number } | null> {
  const width = image.dict.getNumber('Width') ?? 0;
  const height = image.dict.getNumber('Height') ?? 0;
  const filters = image.dict.get('Filter');
  const filterNames =
    filters instanceof PdfName ? [filters.value] : Array.isArray(filters) ? filters.map((f) => (f instanceof PdfName ? f.value : '')) : [];
  if (filterNames.length === 1 && (filterNames[0] === 'DCTDecode' || filterNames[0] === 'DCT')) {
    return { data: image.data, mime: 'image/jpeg', width, height };
  }
  if ((image.dict.getNumber('BitsPerComponent') ?? 8) !== 8) return null;
  const cs = image.dict.getName('ColorSpace');
  const channels = cs === 'DeviceRGB' ? 3 : cs === 'DeviceGray' ? 1 : 0;
  if (!channels || width <= 0 || height <= 0) return null;
  let pixels: Uint8Array;
  let mask: Uint8Array | null = null;
  try {
    pixels = await decodeStream(image);
    if (smask) mask = await decodeStream(smask);
  } catch {
    return null;
  }
  const n = width * height;
  if (pixels.length < n * channels) return null;
  const rgb = channels === 3 ? pixels.subarray(0, n * 3) : new Uint8Array(n * 3).map((_, i) => pixels[Math.floor(i / 3)]);
  const alpha = mask && mask.length >= n ? mask.subarray(0, n) : null;
  return { data: await encodePng({ width, height, rgb, alpha }), mime: 'image/png', width, height };
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

let CRC_TABLE: Uint32Array | null = null;

function crc32(bytes: Uint8Array): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const b of bytes) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
