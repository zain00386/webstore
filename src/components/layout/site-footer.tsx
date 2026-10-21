import Link from "next/link";
import { Clock, MapPin, Phone } from "lucide-react";
import { umbrellaExams } from "@/config/exams";
import { footerLinks, siteConfig } from "@/config/site";
import { getStoreInfo } from "@/lib/db/store-info";
import { telHref } from "@/lib/store-info";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { formatPKR, whatsappLink } from "@/lib/format";
import { Logo } from "./logo";

export async function SiteFooter() {
  const store = await getStoreInfo();
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5 lg:px-8">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">
            Official Rawalpindi branch of Dogar Publishers. Genuine books from all publishers.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold">Visit our shop</h2>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              <a href={store.mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                {store.address}
              </a>
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Helpline:{" "}
                {store.phones.map((p, i) => (
                  <span key={p}>
                    {i > 0 && ", "}
                    <a href={telHref(p)} className="hover:text-foreground">
                      {p}
                    </a>
                  </span>
                ))}
              </span>
            </li>
            <li className="flex gap-2">
              <WhatsAppIcon className="mt-0.5 size-4 shrink-0 text-whatsapp" />
              <a href={whatsappLink(store.phoneE164)} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                WhatsApp: {store.whatsappDisplay}
              </a>
            </li>
            <li className="flex gap-2">
              <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {siteConfig.hours.summary}
                <br />
                Online orders accepted every day
              </span>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold">Delivery</h2>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            {store.delivery.map((option) => (
              <li key={option.id}>
                <span className="font-medium text-foreground">
                  {option.label}: {formatPKR(option.charge)}
                </span>
                <br />
                {option.note}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold">Popular exams</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {umbrellaExams.map((e) => (
              <li key={e.slug}>
                <Link href={`/books?exam=${e.slug}`} className="hover:text-foreground">
                  {e.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/exams" className="font-medium text-foreground hover:underline">
                All exams
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold">Help</h2>
          <ul className="grid grid-cols-2 gap-2 text-sm text-muted-foreground lg:grid-cols-1">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
        {siteConfig.fullName}, an official branch of Dogar Publishers.
      </div>
    </footer>
  );
}
