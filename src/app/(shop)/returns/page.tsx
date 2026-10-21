import type { Metadata } from "next";
import { InfoPage } from "@/components/layout/info-page";
import { getStoreInfo } from "@/lib/db/store-info";

export const metadata: Metadata = { title: "Returns & exchanges" };

// DRAFT, based on the Lahore main branch's exchange policy. Owner to confirm for Rawalpindi.
export default async function ReturnsPage() {
  const store = await getStoreInfo();
  return (
    <InfoPage title="Returns & exchanges" draft>
      <h2>Wrong or damaged books</h2>
      <p>
        If you receive the wrong book, or a book that is damaged or has missing or misprinted pages, contact us within 5
        business days of delivery on WhatsApp {store.phoneDisplay} with your order number and photos. We will replace
        it at no extra cost.
      </p>
      <h2>Exchanges</h2>
      <ul>
        <li>Books must be unused, in their original condition, with proof of purchase.</li>
        <li>Requests must be made within 5 business days of delivery.</li>
        <li>If the exchange is not because of our mistake, delivery charges apply.</li>
      </ul>
      <h2>Books that cannot be exchanged</h2>
      <p>Syllabus-based and job-related books cannot be exchanged or returned unless they are wrong or damaged.</p>
    </InfoPage>
  );
}
