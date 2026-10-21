import { DatabaseZap } from "lucide-react";
import type { ConfigProblem } from "@/lib/env";
import { siteConfig } from "@/config/site";

/**
 * Shown instead of the catalogue when Supabase settings are missing.
 * Names the missing settings (never their values) so the owner knows what to fix.
 */
export function SetupNotice({ problems }: { problems: ConfigProblem[] }) {
  return (
    <div role="alert" className="mx-auto max-w-2xl rounded-2xl bg-warning-soft p-6 text-sm">
      <div className="mb-3 flex items-center gap-2 font-semibold text-warning">
        <DatabaseZap className="size-5" aria-hidden />
        The book catalogue is not connected yet
      </div>
      <p>
        The shop&apos;s database settings are missing, so books can&apos;t be shown. Customers can still order by
        WhatsApp on {siteConfig.whatsappDisplay}.
      </p>
      <p className="mt-3 font-medium">For the shop owner: fix these settings, then restart the site.</p>
      <ul className="mt-1 list-disc pl-5">
        {problems.map((p) => (
          <li key={p.name}>
            <code>{p.name}</code> {p.problem}
          </li>
        ))}
      </ul>
      <p className="mt-3">
        See <code>docs/database-setup.md</code>.
      </p>
    </div>
  );
}
