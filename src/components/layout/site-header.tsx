import Link from "next/link";
import { Phone, ShoppingBag } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { whatsappLink } from "@/lib/format";
import { CartCount } from "@/components/cart/cart-count";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { SearchForm } from "./search-form";
import { getStoreInfo } from "@/lib/db/store-info";
import { telHref } from "@/lib/store-info";

export async function SiteHeader() {
  const store = await getStoreInfo();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 lg:px-8">
        <Logo />
        <SearchForm className="hidden max-w-xl flex-1 md:block" id="header-search" />
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 px-3 py-1.5 text-xs lg:flex">
            <Phone className="size-4" aria-hidden />
            <span className="flex flex-col leading-tight">
              <span className="text-muted-foreground">Helpline</span>
              <span className="flex gap-2 font-semibold">
                {store.phones.map((p) => (
                  <a key={p} href={telHref(p)} className="hover:underline">
                    {p}
                  </a>
                ))}
              </span>
            </span>
          </div>
          {/* Phones have the floating WhatsApp button instead, leaving room for the logo and cart. */}
          <Button asChild variant="outline" size="icon" className="hidden text-whatsapp sm:inline-flex">
            <a
              href={whatsappLink(store.phoneE164)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`WhatsApp us on ${store.whatsappDisplay} (opens in a new tab)`}
            >
              <WhatsAppIcon />
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
