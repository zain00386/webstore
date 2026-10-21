import type { Metadata } from "next";
import { InfoPage } from "@/components/layout/info-page";
import { getStoreInfo } from "@/lib/db/store-info";

export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

// DRAFT for the owner to review. Not legal advice.
export default async function PrivacyPage() {
  const store = await getStoreInfo();
  return (
    <InfoPage title="Privacy policy" draft>
      <h2>What we collect</h2>
      <p>
        When you order, we collect your name, mobile number, delivery address, city and, if you give it, your email and
        delivery notes. We use these only to process and deliver your order and to contact you about it.
      </p>
      <h2>Payments</h2>
      <p>
        We never ask for card numbers, PINs, OTPs or banking passwords. JazzCash and Easypaisa payments are made in your own
        app; we only check that the payment arrived.
      </p>
      <h2>Sharing</h2>
      <p>
        We share your name, phone and address with the courier or Pakistan Post only to deliver your order. We do not sell
        your information.
      </p>
      <h2>Your cart</h2>
      <p>Your cart is saved in your own browser so it is still there when you come back.</p>
      <h2>Questions</h2>
      <p>
        To see, correct or delete your details, contact us on {store.phoneDisplay}.
      </p>
    </InfoPage>
  );
}
