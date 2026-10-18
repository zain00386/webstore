export type PostBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

export type Post = {
  slug: string;
  title: string;
  kind: "vacancy" | "blog";
  excerpt: string;
  body: PostBlock[];
  coverUrl: string | null;
  /** ISO date (YYYY-MM-DD). */
  publishedAt: string;
  seoTitle?: string;
  seoDescription?: string;
  /** Preview content that must be clearly labelled and never mistaken for a real announcement. */
  isSample: boolean;
  vacancy?: {
    organisation: string;
    positions: string;
    location: string;
    /** ISO date (YYYY-MM-DD). */
    lastDate: string;
    /** External official link. Validated before rendering. */
    applyUrl: string;
    /** Catalogue filter for "related books". */
    examSlug?: string;
  };
};
