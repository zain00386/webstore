import Link from "next/link";
import { MessageCircle, Phone, ShoppingBag } from "lucide-react";
import { siteConfig } from "@/config/site";
import { whatsappLink } from "@/lib/format";
import { CartCount } from "@/components/cart/cart-count";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { SearchForm } from "./search-form";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 lg:px-8">
        <Logo />
        <SearchForm className="hidden max-w-xl flex-1 md:block" id="header-search" />
        <div className="ml-auto flex items-center gap-2">
          <a
            href={`tel:+${siteConfig.phoneE164}`}
            className="hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs hover:bg-muted lg:flex"
          >
            <Phone className="size-4" aria-hidden />
            <span className="flex flex-col leading-tight">
              <span className="text-muted-foreground">Helpline</span>
              <span className="font-semibold">{siteConfig.phoneDisplay}</span>
            </span>
          </a>
          <Button asChild variant="outline" size="icon" className="text-whatsapp">
            <a
              href={whatsappLink(siteConfig.phoneE164)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`WhatsApp us on ${siteConfig.phoneDisplay} (opens in a new tab)`}
            >
              <MessageCircle aria-hidden />
            </a>
          </Button>
          <Button asChild variant="default" size="default">
            <Link href="/cart">
              <ShoppingBag aria-hidden />
              <span className="hidden sm:inline">Cart</span>
              <span className="sr-only sm:hidden">Cart</span>
              <CartCount />
            </Link>
          </Button>
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <SearchForm id="mobile-search" />
      </div>
    </header>
  );
}
