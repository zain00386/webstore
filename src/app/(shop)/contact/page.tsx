import type { Metadata } from "next";
import { InfoPage } from "@/components/layout/info-page";
import { ContactForm } from "@/components/store/contact-form";
import { ShopCard } from "@/components/store/shop-card";
import { getStoreInfo } from "@/lib/db/store-info";
import { jsonLdHtml, storeJsonLd } from "@/lib/seo/json-ld";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Visit, call or WhatsApp Dogar's Unique Books at Iqbal Road, Committee Chowk, Rawalpindi.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const store = await getStoreInfo();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdHtml(storeJsonLd(store))}
      />
      <InfoPage
        title="Contact us"
        intro="Visit our shop, call, or send us a WhatsApp message. We usually reply during shop hours."
      >
        <ShopCard />
        <ContactForm phoneE164={store.phoneE164} />
      </InfoPage>
    </>
  );
}
