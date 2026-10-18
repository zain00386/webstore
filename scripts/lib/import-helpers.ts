/** Pure helpers for the import script (unit tested). */

export type ImportOptions = {
  /** Starting stock for newly imported books. */
  stock: number;
  dryRun: boolean;
  limit: number | null;
  /** Also refresh title/price/description of books imported earlier (never stock). */
  update: boolean;
};

export function parseImportArgs(argv: string[]): ImportOptions {
  const opts: ImportOptions = { stock: 10, dryRun: false, limit: null, update: false };
  for (const arg of argv) {
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--update") opts.update = true;
    else if (arg.startsWith("--stock=")) opts.stock = Number(arg.slice(8));
    else if (arg.startsWith("--limit=")) opts.limit = Number(arg.slice(8));
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (!Number.isInteger(opts.stock) || opts.stock < 0 || opts.stock > 100_000) throw new Error("--stock must be a whole number, 0 or more");
  if (opts.limit !== null && (!Number.isInteger(opts.limit) || opts.limit < 1)) throw new Error("--limit must be a positive whole number");
  return opts;
}

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** File extension for an allowed image type, or null if the type is not allowed. */
export function imageExtension(contentType: string | null): string | null {
  const type = (contentType ?? "").split(";")[0].trim().toLowerCase();
  return IMAGE_TYPES[type] ?? null;
}

/** Runs tasks with at most `limit` running at once. */
export async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Turns the description blocks into the plain-text format stored in the database. */
export function descriptionText(blocks: string[]): string {
  return blocks.join("\n").slice(0, 20000);
}
