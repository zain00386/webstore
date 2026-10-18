import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { InfoPage } from "@/components/layout/info-page";

export const metadata: Metadata = { title: "Terms & conditions" };

// DRAFT for the owner to review. Not legal advice.
export default function TermsPage() {
  return (
    <InfoPage title="Terms & conditions" draft>
      <h2>Orders</h2>
      <p>
        An order is confirmed when we accept it. For JazzCash and Easypaisa orders, we dispatch after confirming your
        payment. We may contact you to confirm Cash on Delivery orders before dispatch.
      </p>
      <h2>Prices and availability</h2>
      <p>
        Prices are in Pakistani Rupees. Prices and stock are checked again when you place your order. If a book becomes
        unavailable, we will contact you and refund any amount paid for it.
      </p>
      <h2>Delivery</h2>
      <p>
        Delivery charges are shown at checkout. See <Link href="/shipping" className="underline">shipping & delivery</Link>.
      </p>
      <h2>Returns</h2>
      <p>
        See our <Link href="/returns" className="underline">returns & exchanges policy</Link>.
      </p>
      <h2>Contact</h2>
      <p>
        {siteConfig.fullName}, {siteConfig.address}. Phone / WhatsApp {siteConfig.phoneDisplay}.
      </p>
    </InfoPage>
  );
}
