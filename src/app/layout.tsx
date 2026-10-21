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
};

/** Shared by the shop and the admin area. Each has its own layout inside. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${lexend.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
