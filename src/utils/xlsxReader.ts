/**
 * Lightweight native .xlsx reader (0 KB dependency). Replaces the 929 KB `exceljs` bundle.
 * Uses the browser DecompressionStream('deflate-raw') + DOMParser to read sheet cell text.
 */
async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new (globalThis as any).DecompressionStream('deflate-raw');
  const stream = new Blob([data as unknown as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

interface ZipEntry { name: string; method: number; compSize: number; offset: number }

function readZipDirectory(buf: Uint8Array): ZipEntry[] {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('INVALID_XLSX');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const entries: ZipEntry[] = [];
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const offset = dv.getUint32(p + 42, true);
    entries.push({ name: dec.decode(buf.subarray(p + 46, p + 46 + nameLen)), method, compSize, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function readEntryText(buf: Uint8Array, e: ZipEntry): Promise<string> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const nameLen = dv.getUint16(e.offset + 26, true);
  const extraLen = dv.getUint16(e.offset + 28, true);
  const start = e.offset + 30 + nameLen + extraLen;
  const raw = buf.subarray(start, start + e.compSize);
  const out = e.method === 0 ? raw : await inflateRaw(raw);
  return new TextDecoder('utf-8').decode(out);
}

function colIndex(ref: string): number {
  const m = /^([A-Z]+)/i.exec(ref);
  if (!m) return 0;
  let n = 0;
  for (const ch of m[1].toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export async function readXlsxRows(arrayBuffer: ArrayBuffer): Promise<string[][]> {
  const buf = new Uint8Array(arrayBuffer);
  const entries = readZipDirectory(buf);
  const byName = new Map(entries.map((e) => [e.name, e]));
  const parser = new DOMParser();
  const shared: string[] = [];
  const ssEntry = byName.get('xl/sharedStrings.xml');
  if (ssEntry) {
    const doc = parser.parseFromString(await readEntryText(buf, ssEntry), 'application/xml');
    doc.querySelectorAll('si').forEach((si) => {
      shared.push(Array.from(si.querySelectorAll('t')).map((t) => t.textContent || '').join(''));
    });
  }
  const sheetNames = entries.map((e) => e.name).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort();
  const rows: string[][] = [];
  for (const sn of sheetNames) {
    const doc = parser.parseFromString(await readEntryText(buf, byName.get(sn)!), 'application/xml');
    doc.querySelectorAll('sheetData > row').forEach((row) => {
      const cells: string[] = [];
      row.querySelectorAll('c').forEach((c) => {
        const idx = colIndex(c.getAttribute('r') || '');
        const t = c.getAttribute('t');
        let val = '';
        if (t === 's') val = shared[Number(c.querySelector('v')?.textContent || -1)] ?? '';
        else if (t === 'inlineStr') val = Array.from(c.querySelectorAll('t')).map((x) => x.textContent || '').join('');
        else val = c.querySelector('v')?.textContent ?? '';
        while (cells.length < idx) cells.push('');
        cells[idx] = val;
      });
      if (cells.some((x) => x !== '')) rows.push(cells);
    });
  }
  return rows;
}
