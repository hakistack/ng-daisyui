import { PdfDict, PdfName, PdfParseError, PdfStream, PdfValue } from './objects';

/**
 * Stream filters (§7.4). Decoding covers what the writer needs to read
 * structure (xref and object streams, form XObjects, content):
 * FlateDecode (with PNG/TIFF predictors), ASCIIHexDecode, ASCII85Decode.
 * Encoding is FlateDecode. Flate uses the platform's
 * CompressionStream/DecompressionStream (zlib format), so it's async and
 * needs no dependency.
 */

/** Run `data` through a (de)compression stream. Throws if the stream errors (corrupt input). */
async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  const writing = writer.write(data as Uint8Array<ArrayBuffer>).then(() => writer.close());
  writing.catch(() => undefined); // surfaced through the reader
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  await writing;
  return joinChunks(chunks);
}

function joinChunks(chunks: readonly Uint8Array[]): Uint8Array {
  if (chunks.length === 1) return chunks[0];
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

/** zlib-compress (`/FlateDecode`). */
export function deflate(data: Uint8Array): Promise<Uint8Array> {
  return pipe(data, new CompressionStream('deflate'));
}

/**
 * zlib-decompress. Corrupt or truncated streams are common in the wild:
 * decode what's recoverable, byte by byte if the whole-buffer pass fails.
 */
export async function inflate(data: Uint8Array): Promise<Uint8Array> {
  try {
    return await pipe(data, new DecompressionStream('deflate'));
  } catch {
    return inflatePartial(data);
  }
}

/** Decompress as much as possible, stopping at the first corrupt chunk. */
async function inflatePartial(data: Uint8Array): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const ds = new DecompressionStream('deflate');
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  const reading = (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        chunks.push(value);
      }
    } catch {
      /* stop at corruption */
    }
  })();
  try {
    await writer.write(data as Uint8Array<ArrayBuffer>);
    await writer.close();
  } catch {
    /* corrupt or truncated: keep what was produced */
  }
  await reading;
  return joinChunks(chunks);
}

/** Undo a PNG (Predictor ≥ 10) or TIFF (Predictor 2) predictor (§7.4.4.4). */
export function unpredict(data: Uint8Array, params: PdfDict | undefined): Uint8Array {
  const predictor = params?.getNumber('Predictor') ?? 1;
  if (predictor <= 1) return data;
  const colors = params?.getNumber('Colors') ?? 1;
  const bpc = params?.getNumber('BitsPerComponent') ?? 8;
  const columns = params?.getNumber('Columns') ?? 1;
  const bpp = Math.max(1, Math.ceil((colors * bpc) / 8));
  const rowLength = Math.ceil((colors * bpc * columns) / 8);

  if (predictor === 2) {
    if (bpc !== 8) return data; // only byte-aligned TIFF prediction is used in practice
    const out = data.slice();
    for (let row = 0; row * rowLength < out.length; row++) {
      const start = row * rowLength;
      for (let i = bpp; i < rowLength && start + i < out.length; i++) out[start + i] = (out[start + i] + out[start + i - bpp]) & 0xff;
    }
    return out;
  }

  // PNG: each row starts with its own filter-type byte.
  const rows = Math.floor(data.length / (rowLength + 1));
  const out = new Uint8Array(rows * rowLength);
  const prev = new Uint8Array(rowLength);
  for (let r = 0; r < rows; r++) {
    const type = data[r * (rowLength + 1)];
    const src = r * (rowLength + 1) + 1;
    const dst = r * rowLength;
    for (let i = 0; i < rowLength; i++) {
      const raw = data[src + i];
      const left = i >= bpp ? out[dst + i - bpp] : 0;
      const up = prev[i];
      const upLeft = i >= bpp ? prev[i - bpp] : 0;
      let value: number;
      switch (type) {
        case 1:
          value = raw + left;
          break;
        case 2:
          value = raw + up;
          break;
        case 3:
          value = raw + ((left + up) >> 1);
          break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          value = raw + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
          break;
        }
        default:
          value = raw;
      }
      out[dst + i] = value & 0xff;
    }
    prev.set(out.subarray(dst, dst + rowLength));
  }
  return out;
}

function asciiHexDecode(data: Uint8Array): Uint8Array {
  let hex = '';
  for (const c of data) {
    if (c === 0x3e) break; // '>'
    const ch = String.fromCharCode(c);
    if (/[0-9a-fA-F]/.test(ch)) hex += ch;
  }
  if (hex.length % 2) hex += '0';
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

function ascii85Decode(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  let group: number[] = [];
  const flush = (n: number) => {
    while (group.length < 5) group.push(84); // pad with 'u'
    let v = 0;
    for (const d of group) v = v * 85 + d;
    const bytes = [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff];
    out.push(...bytes.slice(0, n));
    group = [];
  };
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (c === 0x7e) break; // '~>' ends the data
    if (c === 0x7a && group.length === 0) {
      out.push(0, 0, 0, 0); // 'z'
      continue;
    }
    if (c < 0x21 || c > 0x75) continue; // whitespace and junk
    group.push(c - 0x21);
    if (group.length === 5) flush(4);
  }
  if (group.length > 1) flush(group.length - 1);
  return Uint8Array.from(out);
}

/** The filter chain and decode parameters of a stream, normalized to arrays. */
function filterChain(dict: PdfDict): { filters: string[]; params: (PdfDict | undefined)[] } {
  const f = dict.get('Filter');
  const p = dict.get('DecodeParms') ?? dict.get('DP');
  const filters =
    f instanceof PdfName ? [f.value] : Array.isArray(f) ? f.filter((x): x is PdfName => x instanceof PdfName).map((x) => x.value) : [];
  const asDict = (v: PdfValue | undefined) => (v instanceof PdfDict ? v : undefined);
  const params = Array.isArray(p) ? filters.map((_, i) => asDict(p[i])) : filters.map(() => asDict(p ?? undefined));
  return { filters, params };
}

/** Decode a stream's data through its whole filter chain. */
export async function decodeStream(stream: PdfStream): Promise<Uint8Array> {
  const { filters, params } = filterChain(stream.dict);
  let data = stream.data;
  for (let i = 0; i < filters.length; i++) {
    switch (filters[i]) {
      case 'FlateDecode':
      case 'Fl':
        data = unpredict(await inflate(data), params[i]);
        break;
      case 'ASCIIHexDecode':
      case 'AHx':
        data = asciiHexDecode(data);
        break;
      case 'ASCII85Decode':
      case 'A85':
        data = ascii85Decode(data);
        break;
      default:
        // Image codecs (DCT, JPX, CCITT, JBIG2) and LZW aren't needed to read structure.
        throw new PdfParseError(`unsupported filter /${filters[i]}`);
    }
  }
  return data;
}

/** A Flate-compressed stream holding `data`, with any extra dictionary entries. */
export async function flateStream(data: Uint8Array, extra?: PdfDict): Promise<PdfStream> {
  const dict = extra?.clone() ?? new PdfDict();
  dict.set('Filter', PdfName.of('FlateDecode'));
  dict.delete('DecodeParms');
  return new PdfStream(dict, await deflate(data));
}
