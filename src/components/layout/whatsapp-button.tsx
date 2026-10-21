import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { whatsappLink } from "@/lib/format";
import { getStoreInfo } from "@/lib/db/store-info";

export async function WhatsAppButton() {
  const store = await getStoreInfo();
  return (
    <aside aria-label="WhatsApp chat">
      <a
        href={whatsappLink(
          store.phoneE164,
          "Assalam-o-Alaikum, I have a question about a book.",
        )}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Chat on WhatsApp, ${store.whatsappDisplay} (opens in a new tab)`}
        className="fixed right-4 bottom-20 z-40 flex size-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-lg transition-transform hover:scale-105 lg:bottom-6"
      >
        <WhatsAppIcon className="size-7" />
      </a>
    </aside>
  );
}
