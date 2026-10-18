export const MAX_COVER_BYTES = 2 * 1024 * 1024;

export type ImageKind = { mime: "image/jpeg" | "image/png" | "image/webp"; ext: "jpg" | "png" | "webp" };

/**
 * Identifies JPEG / PNG / WebP from the file's first bytes ("magic numbers").
 * The browser-reported type and file name can be faked; the bytes can't.
 */
export function detectImageType(bytes: Uint8Array): ImageKind | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) {
    return { mime: "image/png", ext: "png" };
  }
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

export type CoverCheck = { ok: true; kind: ImageKind; bytes: Uint8Array } | { ok: false; error: string };

export async function checkCoverFile(file: File): Promise<CoverCheck> {
  if (file.size > MAX_COVER_BYTES) return { ok: false, error: "Cover must be 2 MB or smaller." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > MAX_COVER_BYTES) return { ok: false, error: "Cover must be 2 MB or smaller." };
  const kind = detectImageType(bytes);
  if (!kind) return { ok: false, error: "Cover must be a JPG, PNG or WebP image." };
  return { ok: true, kind, bytes };
}
