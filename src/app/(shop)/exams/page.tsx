import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { categories } from "@/config/categories";
import { examGroups, umbrellaExams } from "@/config/exams";
import { categoryCounts as countCategories, examCounts as countExams } from "@/lib/catalog/selectors";
import { getCatalogState } from "@/lib/db/catalog";
import { SetupNotice } from "@/components/feedback/setup-notice";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export const metadata: Metadata = {
  title: "Browse by exam",
  description:
    "Find books for CSS, PMS, FPSC, PPSC, MDCAT, ECAT, NUST NET, ISSB, police, educators, nurses and other recruitment tests.",
};

function ExamLink({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm hover:bg-muted"
    >
      <span className="font-medium">{label}</span>
      <span className="text-xs text-muted-foreground">{count}</span>
    </Link>
  );
}

export default async function ExamsPage() {
  const state = await getCatalogState();
  if (state.status === "not-configured") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <SetupNotice problems={state.problems} />
      </div>
    );
  }
  const examCounts = countExams(state.catalog.books);
  const categoryCounts = countCategories(state.catalog.books);
  const academic = categories.filter(
    (c) => ["intermediate", "university", "masters", "english", "general-knowledge", "medicare", "children"].includes(c.slug) && categoryCounts.get(c.slug),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Exams" }]} />
      <h1 className="text-3xl font-semibold tracking-tight">Browse by exam</h1>
      <p className="mt-2 mb-8 max-w-2xl text-sm text-muted-foreground">
        Pick your exam to see every guide, MCQs book and past paper we stock for it. Can&apos;t find yours? WhatsApp us
        on 0324-9574895.
      </p>

      <section aria-labelledby="popular-exams" className="mb-10">
        <h2 id="popular-exams" className="mb-3 text-lg font-semibold">
          Popular
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {umbrellaExams
            .filter((e) => examCounts.get(e.slug))
            .map((e) => (
              <li key={e.slug}>
                <Link
                  href={`/books?exam=${e.slug}`}
                  className="flex h-full flex-col justify-between gap-2 rounded-2xl bg-card p-4 ring-1 ring-border transition-shadow hover:shadow-md"
                >
                  <span className="font-semibold">{e.label}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    {examCounts.get(e.slug)} books <ArrowRight className="size-3.5" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      </section>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {examGroups.map((group) => {
          const exams = group.exams.filter((e) => examCounts.get(e.slug));
          if (exams.length === 0) return null;
          return (
            <section key={group.slug} aria-labelledby={`group-${group.slug}`} className="rounded-2xl bg-surface p-4 ring-1 ring-border">
              <h2 id={`group-${group.slug}`} className="mb-2 px-3 text-base font-semibold">
                {group.title}
              </h2>
              <ul>
                {exams.map((e) => (
                  <li key={e.slug}>
                    <ExamLink href={`/books?exam=${e.slug}`} label={e.label} count={examCounts.get(e.slug) ?? 0} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        <section aria-labelledby="group-academic" className="rounded-2xl bg-surface p-4 ring-1 ring-border">
          <h2 id="group-academic" className="mb-2 px-3 text-base font-semibold">
            Academic & other
          </h2>
          <ul>
            {academic.map((c) => (
              <li key={c.slug}>
                <ExamLink href={`/books?category=${c.slug}`} label={c.name} count={categoryCounts.get(c.slug) ?? 0} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
