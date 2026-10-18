import { Suspense } from "react";
import { CartProvider } from "@/components/cart/cart-provider";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Logo } from "@/components/layout/logo";
import { MobileTabBar, MobileTabBarList } from "@/components/layout/mobile-tab-bar";
import { SideNav, SideNavList } from "@/components/layout/side-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";

/** Customer-facing shell: header, sidebar, footer, tab bar, WhatsApp button and cart. */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <AnnouncementBar />
      <div className="flex flex-1">
        <aside className="sticky top-0 hidden h-svh w-24 shrink-0 flex-col items-center gap-8 border-r border-border bg-surface py-5 lg:flex">
          <Logo compact />
          <Suspense fallback={<SideNavList pathname={null} />}>
            <SideNav />
          </Suspense>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <SiteHeader />
          <main id="main" className="flex-1 pb-20 lg:pb-0">
            {children}
          </main>
          <SiteFooter />
        </div>
      </div>
      <Suspense fallback={<MobileTabBarList pathname={null} />}>
        <MobileTabBar />
      </Suspense>
      <WhatsAppButton />
    </CartProvider>
  );
}
