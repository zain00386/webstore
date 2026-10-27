import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import { siteConfig } from "@/config/site";
import { siteUrl } from "@/lib/site-url";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${siteConfig.fullName} | Exam, Test Prep & Academic Books`,
    template: `%s | ${siteConfig.fullName}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.fullName,
  openGraph: {
    type: "website",
    locale: "en_PK",
    siteName: siteConfig.fullName,
    // Default picture when a page is shared on WhatsApp/Facebook (pages with a cover use their own).
    images: [{ url: "/brand/logo.png", width: 256, height: 256, alt: siteConfig.fullName }],
  },
  twitter: { card: "summary" },
};

export const viewport: Viewport = {
  themeColor: "#f4f1ea",
  width: "device-width",
  initialScale: 1,
  // Lets env(safe-area-inset-*) report the iPhone home-indicator/notch insets the tab bar pads for.
  // Zoom is deliberately NOT restricted (no maximumScale / userScalable).
  viewportFit: "cover",
};

/** Shared by the shop and the admin area. Each has its own layout inside. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-scroll-behavior: Next turns the CSS smooth scrolling off during route changes so new pages start at the top instantly.
    <html lang="en" data-scroll-behavior="smooth" className={`${lexend.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        {/* Top-centre: clear of the phone tab bar and the floating WhatsApp button; offset below the sticky shop header / admin save bar. */}
        <Toaster position="top-center" offset={{ top: 72 }} mobileOffset={{ top: 72 }} />
      </body>
    </html>
  );
}
