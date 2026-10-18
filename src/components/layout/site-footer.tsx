import Link from "next/link";
import { Clock, MapPin, Phone } from "lucide-react";
import { deliveryOptions, footerLinks, siteConfig } from "@/config/site";
import { formatPKR } from "@/lib/format";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
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
              <a href={siteConfig.mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                {siteConfig.address}
              </a>
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 size-4 shrink-0" aria-hidden />
              <a href={`tel:+${siteConfig.phoneE164}`} className="hover:text-foreground">
                {siteConfig.phoneDisplay} (call / WhatsApp)
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
            {deliveryOptions.map((option) => (
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
