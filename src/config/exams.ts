/**
 * Exam taxonomy used for navigation, filters and tagging.
 * A book can match several exams (e.g. "PPSC" and "Police & Sub-Inspector").
 * Tags are worked out from title + category for imported books; from Phase 6
 * the owner can edit a book's exam tags in admin.
 *
 * The seven "umbrella" slugs (css-pms, fpsc-ppsc, nts-gat, mdcat-ecat,
 * armed-forces, jobs, law) are kept stable because links and posts use them.
 */
export type ExamDef = {
  slug: string;
  label: string;
  /** Matched against the full product title. */
  pattern?: RegExp;
  /** Category slugs that imply this exam. */
  categories?: string[];
  /** Short honest guide shown on the exam's catalogue page. */
  intro?: string;
};

export type ExamGroup = { slug: string; title: string; exams: ExamDef[] };

/** Broad tags used by home shortcuts, posts and older links. */
export const umbrellaExams: ExamDef[] = [
  {
    slug: "css-pms",
    label: "CSS & PMS",
    categories: ["css-pms"],
    pattern: /\b(CSS|PMS|PCS)\b/i,
    intro: "Guides, MCQs and essay books for CSS (FPSC) and provincial PMS / PCS exams, compulsory and optional subjects.",
  },
  {
    slug: "fpsc-ppsc",
    label: "FPSC & PPSC",
    pattern: /\b(FPSC|PPSC|KPPSC|SPSC|BPSC|AJKPSC)\b|Public Service Commission/i,
    intro: "Preparation guides for Federal and Provincial Public Service Commission tests: one-paper MCQs, subject guides and post-specific books.",
  },
  {
    slug: "nts-gat",
    label: "NTS, GAT & Testing Services",
    pattern: /\b(NTS|GAT|HAT|ETEA|OTS|PTS|STS|UTS|USAT)\b/i,
    intro: "Books for NTS, GAT (General / Subject), HAT, USAT and other testing-service exams.",
  },
  {
    slug: "mdcat-ecat",
    label: "MDCAT & ECAT",
    categories: ["entry-tests"],
    pattern: /\b(MDCAT|ECAT|NUMS|NUST|NET|ETEA|FAST|IBA)\b|Entry Test/i,
    intro: "Entry test preparation for medical and engineering universities: MDCAT, ECAT, NUST NET, NUMS and more, with guides and past papers.",
  },
  {
    slug: "armed-forces",
    label: "ISSB & Armed Forces",
    categories: ["armed-forces"],
    pattern: /\b(ISSB|Army|Navy|PAF|PMA|Air Force|Initial Test|Intelligence Tests?)\b/i,
    intro: "ISSB, initial tests and intelligence test books for Army (PMA), Navy and PAF.",
  },
  {
    slug: "jobs",
    label: "Police & Job Tests",
    categories: ["job-tests"],
    pattern: /Recruitment|\bPolice\b|Constable|\bFIA\b|\bASF\b|\bNAB\b/i,
    intro: "Recruitment test guides for police, FIA, educators, nurses and other government jobs, usually written for the latest syllabus.",
  },
  {
    slug: "law",
    label: "Law, LL.B & LAT",
    categories: ["law"],
    pattern: /\b(LAT|LL\.?B|LAW-GAT|Law)\b/i,
    intro: "LL.B semester books, LAT and LAW-GAT preparation.",
  },
];

/** Finer exams shown in the Exams directory and filters. */
export const examGroups: ExamGroup[] = [
  {
    slug: "competitive",
    title: "Competitive exams",
    exams: [
      { slug: "css", label: "CSS", pattern: /\bCSS\b/i, categories: ["css-pms"] },
      { slug: "pms", label: "PMS / PCS", pattern: /\b(PMS|PCS)\b/i },
      { slug: "fpsc", label: "FPSC", pattern: /\bFPSC\b|Federal Public Service/i },
      { slug: "ppsc", label: "PPSC", pattern: /\bPPSC\b|Punjab Public Service/i },
      { slug: "provincial-psc", label: "KPPSC, SPSC & BPSC", pattern: /\b(KPPSC|SPSC|BPSC|AJKPSC)\b|Khyber|Sindh Public|Balochistan/i },
      { slug: "one-paper", label: "One Paper MCQs", pattern: /One\s*(1\s*)?Paper/i },
    ],
  },
  {
    slug: "entry-tests",
    title: "Entry tests",
    exams: [
      { slug: "mdcat", label: "MDCAT", pattern: /\bMDCAT\b/i },
      { slug: "ecat", label: "ECAT", pattern: /\bECAT\b/i },
      { slug: "nust-net", label: "NUST NET", pattern: /\bNUST\b|\bNET\b/i },
      { slug: "nums", label: "NUMS", pattern: /\bNUMS\b/i },
      { slug: "usat", label: "USAT", pattern: /\bUSAT\b/i },
      { slug: "gat-hat", label: "GAT & HAT", pattern: /\b(GAT|HAT)\b/i },
      { slug: "lat", label: "LAT", pattern: /\bLAT\b/i },
      { slug: "fast-iba", label: "FAST & IBA", pattern: /\b(FAST|IBA)\b/i },
    ],
  },
  {
    slug: "armed-forces",
    title: "Armed forces",
    exams: [
      { slug: "issb", label: "ISSB", pattern: /\bISSB\b/i },
      { slug: "army-pma", label: "Army & PMA", pattern: /\b(Army|PMA)\b/i },
      { slug: "navy", label: "Navy", pattern: /\bNavy\b/i },
      { slug: "paf", label: "PAF", pattern: /\bPAF\b|Air Force/i },
      { slug: "intelligence-tests", label: "Intelligence tests", pattern: /Intelligence Tests?|Aptitude Tests?/i },
    ],
  },
  {
    slug: "recruitment",
    title: "Recruitment tests",
    exams: [
      { slug: "educators", label: "Educators & Lecturers", pattern: /Educator|Lecturer|Teacher|\bSST\b|\bEST\b/i },
      { slug: "police", label: "Police & Sub-Inspector", pattern: /Police|Constable|\bASI\b|Sub[- ]Inspector/i },
      { slug: "fia-intelligence", label: "FIA & Intelligence Bureau", pattern: /\bFIA\b|Intelligence (Bureau|Officer)|\bNCCIA\b/i },
      { slug: "nurses-health", label: "Nurses & Health", pattern: /Nurs|Health|Medical Officer/i },
      { slug: "nts", label: "NTS tests", pattern: /\bNTS\b/i },
    ],
  },
  {
    slug: "study-aids",
    title: "Study aids",
    exams: [
      { slug: "past-papers", label: "Past papers", pattern: /Past Papers?|Solved Papers|Original Papers|Guess Papers/i },
      { slug: "mcqs", label: "MCQs books", pattern: /MCQs?/i },
      { slug: "bundles", label: "Bundles & packages", pattern: /Bundle|Package|Set of \d/i },
    ],
  },
];

export const allExams: ExamDef[] = [...umbrellaExams, ...examGroups.flatMap((g) => g.exams)];

export function getExam(slug: string | undefined): ExamDef | undefined {
  return slug ? allExams.find((e) => e.slug === slug) : undefined;
}

/** Which exam slugs a book belongs to, from its full title and category. */
export function deriveExams(title: string, categorySlug: string): string[] {
  return allExams
    .filter((e) => e.categories?.includes(categorySlug) || (e.pattern && e.pattern.test(title)))
    .map((e) => e.slug);
}
