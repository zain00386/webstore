import {
  Baby,
  BookA,
  BriefcaseBusiness,
  FlaskConical,
  Gavel,
  Globe2,
  GraduationCap,
  HeartPulse,
  Landmark,
  Library,
  School,
  Shield,
  type LucideIcon,
} from "lucide-react";

export type Category = {
  slug: string;
  name: string;
  icon: LucideIcon;
  /** Category names used by the Lahore main-branch catalogue (for import). */
  sourceNames: string[];
};

/** Customer-facing categories, in display order. */
export const categories: Category[] = [
  { slug: "css-pms", name: "CSS / PMS / PCS", icon: Landmark, sourceNames: ["CSS/PMS/PCS"] },
  { slug: "job-tests", name: "Job & Recruitment Tests", icon: BriefcaseBusiness, sourceNames: ["Job Related Books"] },
  { slug: "armed-forces", name: "Armed Forces & ISSB", icon: Shield, sourceNames: ["Armed Forces Books"] },
  { slug: "entry-tests", name: "Entry Tests (MDCAT, ECAT, NET)", icon: FlaskConical, sourceNames: ["Entry Test Books"] },
  { slug: "intermediate", name: "Intermediate (F.A / F.Sc)", icon: School, sourceNames: ["Intermediate Level"] },
  { slug: "university", name: "BA / ADP / BS", icon: GraduationCap, sourceNames: ["BA/ADP/BS Books"] },
  { slug: "masters", name: "MA / MPhil / GAT", icon: Library, sourceNames: ["MA/Mphill/GAT Books"] },
  { slug: "law", name: "Law (LL.B / LAT)", icon: Gavel, sourceNames: ["Law Books"] },
  { slug: "english", name: "English Learning", icon: BookA, sourceNames: ["English Learning Books"] },
  { slug: "general-knowledge", name: "General Knowledge", icon: Globe2, sourceNames: ["General Knowledge Books"] },
  { slug: "medicare", name: "Medicare & Allied Health", icon: HeartPulse, sourceNames: ["Medicare"] },
  { slug: "children", name: "Children's Books (KidStar)", icon: Baby, sourceNames: ["KidStar Books"] },
  { slug: "other", name: "Other books", icon: Library, sourceNames: [] },
];

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
