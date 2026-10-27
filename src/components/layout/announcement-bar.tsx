import { Phone } from "lucide-react";
import { siteConfig } from "@/config/site";
import { getStoreInfo } from "@/lib/db/store-info";
import { whatsappLink } from "@/lib/format";
import { telHref } from "@/lib/store-info";
import { FacebookIcon, InstagramIcon } from "@/components/icons/social-icons";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";

/** Top strip: social pages on the left, the helpline in the middle. */
export async function AnnouncementBar() {
  const store = await getStoreInfo();
  const social = [
    siteConfig.social.facebook && { href: siteConfig.social.facebook, label: "Facebook", Icon: FacebookIcon },
    siteConfig.social.instagram && { href: siteConfig.social.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: whatsappLink(store.phoneE164), label: `WhatsApp Business ${store.whatsappDisplay}`, Icon: WhatsAppIcon },
  ].filter(Boolean) as { href: string; label: string; Icon: typeof WhatsAppIcon }[];

  return (
    <aside aria-label="Contact and social media" className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-1.5 text-xs font-medium lg:px-8">
        <ul className="flex items-center gap-1">
          {social.map(({ href, label, Icon }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${label} (opens in a new tab)`}
                className="-my-1.5 flex size-11 items-center justify-center rounded-full hover:bg-primary-foreground/15 sm:my-0 sm:size-8"
              >
                <Icon className="size-4" />
              </a>
            </li>
          ))}
        </ul>
        <p className="flex flex-1 items-center justify-center gap-2 pr-8 text-center sm:pr-0">
          <Phone className="size-3.5 shrink-0" aria-hidden />
          <span>
            <span className="hidden sm:inline">Need help? </span>Call us:{" "}
            {store.phones.map((p, i) => (
              <span key={p}>
                {i > 0 && <span className="hidden sm:inline">, </span>}
                <a href={telHref(p)} className={`tabular-nums underline-offset-4 hover:underline ${i > 0 ? "hidden sm:inline" : ""}`}>
                  {p}
                </a>
              </span>
            ))}
          </span>
        </p>
        <span className="hidden w-[104px] sm:block" aria-hidden />
      </div>
    </aside>
  );
}
