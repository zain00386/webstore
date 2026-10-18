/**
 * Which exams a book helps with, worked out from its title and category.
 * This is a best-effort rule for the imported catalogue; from Phase 6 the
 * owner can set exam tags per book in admin.
 */
const rules: { slug: string; categories?: string[]; pattern: RegExp }[] = [
  { slug: "css-pms", categories: ["css-pms"], pattern: /\b(CSS|PMS|PCS)\b/i },
  { slug: "fpsc-ppsc", pattern: /\b(FPSC|PPSC|KPPSC|SPSC|BPSC|AJKPSC)\b|Public Service Commission/i },
  { slug: "nts-gat", pattern: /\b(NTS|GAT|ETEA|OTS|PTS|STS|UTS)\b/i },
  { slug: "mdcat-ecat", categories: ["entry-tests"], pattern: /\b(MDCAT|ECAT|NUMS|NUST|NET|ETEA)\b|Entry Test/i },
  { slug: "armed-forces", categories: ["armed-forces"], pattern: /\b(ISSB|Army|Navy|PAF|Air Force|Initial Test|Intelligence Tests?)\b/i },
  { slug: "jobs", categories: ["job-tests"], pattern: /Recruitment|\bPolice\b|Constable|\bFIA\b|\bASF\b|\bNAB\b/i },
  { slug: "law", categories: ["law"], pattern: /\b(LAT|LL\.?B|LAW-GAT|Law)\b/i },
];

export function deriveExams(title: string, categorySlug: string): string[] {
  return rules
    .filter((r) => r.categories?.includes(categorySlug) || r.pattern.test(title))
    .map((r) => r.slug);
}
