import { MessageCircle } from "lucide-react";
import { siteConfig } from "@/config/site";
import { whatsappLink } from "@/lib/format";

export function WhatsAppButton() {
  return (
    <a
      href={whatsappLink(siteConfig.phoneE164, "Assalam-o-Alaikum, I have a question about a book.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat on WhatsApp, ${siteConfig.phoneDisplay} (opens in a new tab)`}
      className="fixed right-4 bottom-20 z-40 flex size-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-lg transition-transform hover:scale-105 lg:bottom-6"
    >
      <MessageCircle className="size-6" aria-hidden />
    </a>
  );
}
