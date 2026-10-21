import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { siteConfig } from "@/config/site";
import { getStoreInfo } from "@/lib/db/store-info";
import { formatPKR } from "@/lib/format";
import type { StoreInfo } from "@/lib/store-info";
import { InfoPage } from "@/components/layout/info-page";

export const metadata: Metadata = { title: "FAQ", description: "Answers about delivery, payment and our Rawalpindi shop.", alternates: { canonical: "/faq" } };

function faqsFor(store: StoreInfo) {
  const post = store.delivery.find((o) => o.id === "pakistan_post");
  const courier = store.delivery.find((o) => o.id === "courier");
  const prepaid = [store.payments.jazzcash && "JazzCash", store.payments.easypaisa && "Easypaisa", store.payments.bank_transfer && "bank transfer"]
    .filter(Boolean)
    .join(", ");
  return [
    {
      q: "Do you deliver outside Rawalpindi?",
      a: `Yes, all over Pakistan. ${store.delivery.map((o) => `${o.label} costs ${formatPKR(o.charge)}${o.codAllowed ? " and allows Cash on Delivery" : " (pay in advance)"}`).join(". ")}.`,
    },
    {
      q: "Can I pay Cash on Delivery?",
      a: store.codAvailable && courier
        ? `Yes, when you choose ${courier.label} delivery.${post ? ` ${post.label} orders must be paid in advance${prepaid ? ` by ${prepaid}` : ""}.` : ""}`
        : `Not at the moment. Please pay in advance${prepaid ? ` by ${prepaid}` : ""}.`,
    },
    {
      q: "How do I pay in advance?",
      a: `After placing your order, send the amount shown with your order number in the payment note, then send the screenshot on WhatsApp ${store.whatsappDisplay}. We dispatch after confirming the payment.`,
    },
    {
      q: "Are your books original?",
      a: "Yes. We are the official Rawalpindi branch of Dogar Publishers and sell genuine publisher editions only.",
    },
    {
      q: "Do you sell books from other publishers?",
      a: "Yes. Besides Dogar Publishers, we stock books from other publishers too. If you can't find a book on the website, WhatsApp us and we will check for you.",
    },
    {
      q: "What are your shop hours?",
      a: `${siteConfig.hours.summary}. Online and WhatsApp orders are accepted every day.`,
    },
    {
      q: "Do I need an account to order?",
      a: "No. You can check out as a guest with your name, phone number and address.",
    },
  ];
}

export default async function FaqPage() {
  const faqs = faqsFor(await getStoreInfo());
  return (
    <InfoPage title="Frequently asked questions">
      <div className="not-prose space-y-3">
        {faqs.map((f) => (
          <details key={f.q} className="group rounded-2xl bg-card ring-1 ring-border">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-medium [&::-webkit-details-marker]:hidden">
              {f.q}
              <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="px-4 pb-4 text-sm text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </InfoPage>
  );
}
