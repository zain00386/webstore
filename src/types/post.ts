export type Post = {
  id: string;
  slug: string;
  title: string;
  kind: "vacancy" | "blog";
  excerpt: string;
  /** Markdown (safe subset, see src/lib/posts/markdown.ts). */
  body: string;
  coverUrl: string | null;
  /** Pakistan date (YYYY-MM-DD). */
  publishedAt: string;
  seoTitle: string | null;
  seoDescription: string | null;
  /** Exam whose books are shown under the post (catalogue filter slug). */
  examSlug: string | null;
  vacancy: {
    organisation: string | null;
    positions: string | null;
    location: string | null;
    /** ISO date (YYYY-MM-DD). */
    lastDate: string | null;
    /** External official link. Validated again before rendering. */
    applyUrl: string | null;
  } | null;
};
