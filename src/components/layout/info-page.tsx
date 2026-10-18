import type { ReactNode } from "react";
import { Alert } from "@/components/feedback/alert";
import { Breadcrumbs } from "./breadcrumbs";

type InfoPageProps = {
  title: string;
  intro?: string;
  /** Shows a visible "draft" notice until the owner approves the wording. */
  draft?: boolean;
  children: ReactNode;
};

/** Shared template for About, Contact, Shipping, Returns, Privacy, Terms and FAQ. */
export function InfoPage({ title, intro, draft, children }: InfoPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: title }]} />
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {intro && <p className="mt-3 text-muted-foreground">{intro}</p>}
      {draft && (
        <Alert tone="warning" title="Draft policy" className="mt-6">
          This wording is a draft and will be confirmed by the shop. Contact us if you have any questions.
        </Alert>
      )}
      <div className="prose-info mt-8 space-y-4 leading-relaxed text-foreground/85 [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </div>
  );
}
