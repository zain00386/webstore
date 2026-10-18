import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { siteConfig } from "@/config/site";
import { InfoPage } from "@/components/layout/info-page";

export const metadata: Metadata = { title: "FAQ", description: "Answers about delivery, payment and our Rawalpindi shop." };

const faqs = [
  {
    q: "Do you deliver outside Rawalpindi?",
    a: "Yes, all over Pakistan. Pakistan Post costs Rs. 300 (prepaid only). TCS / Leopards costs Rs. 550 and allows Cash on Delivery.",
  },
  {
    q: "Can I pay Cash on Delivery?",
    a: "Yes, when you choose TCS / Leopards delivery. Pakistan Post orders must be paid in advance by JazzCash or Easypaisa.",
  },
  {
    q: "How do I pay with JazzCash or Easypaisa?",
    a: `After placing your order, send the amount shown with your order number in the payment note, then send the screenshot on WhatsApp ${siteConfig.phoneDisplay}. We dispatch after confirming the payment.`,
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

export default function FaqPage() {
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
