import type { Metadata } from "next";
import { InfoPage } from "@/components/layout/info-page";
import { ContactForm } from "@/components/store/contact-form";
import { ShopCard } from "@/components/store/shop-card";

export const metadata: Metadata = {
  title: "Contact",
  description: "Visit, call or WhatsApp Dogar's Unique Books at Iqbal Road, Committee Chowk, Rawalpindi.",
};

export default function ContactPage() {
  return (
    <InfoPage title="Contact us" intro="Visit our shop, call, or send us a WhatsApp message. We usually reply during shop hours.">
      <ShopCard />
      <ContactForm />
    </InfoPage>
  );
}
