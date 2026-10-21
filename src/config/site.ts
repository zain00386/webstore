/**
 * Store details shown across the site.
 *
 * These are static for now. Delivery charges and payment details move to
 * Admin > Settings (database) in Phase 12, so they can be changed without code.
 */
export const siteConfig = {
  name: "Dogar's Unique Books",
  branch: "Rawalpindi",
  fullName: "Dogar's Unique Books Rawalpindi",
  description:
    "Official Rawalpindi branch of Dogar Publishers. Books from all publishers for CSS, PMS, FPSC, PPSC, NTS, MDCAT, ECAT, ISSB and job tests, delivered all over Pakistan.",
  address: "Iqbal Road, Committee Chowk, Rawalpindi",
  phoneDisplay: "0324-9574895",
  /** International format without "+" for tel: and wa.me links. */
  phoneE164: "923249574895",
  hours: {
    open: "10:00 AM",
    close: "9:00 PM",
    closedDay: "Friday",
    summary: "10:00 AM - 9:00 PM, closed Friday",
  },
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Iqbal+Road+Committee+Chowk+Rawalpindi",
} as const;

export const deliveryOptions = [
  {
    id: "pakistan_post",
    label: "Pakistan Post",
    charge: 300,
    note: "All over Pakistan, prepaid only (JazzCash or Easypaisa)",
    codAllowed: false,
  },
  {
    id: "courier",
    label: "TCS / Leopards",
    charge: 550,
    note: "Cash on Delivery available, or prepaid",
    codAllowed: true,
  },
] as const;

export const examShortcuts = [
  { label: "CSS & PMS", slug: "css-pms" },
  { label: "FPSC & PPSC", slug: "fpsc-ppsc" },
  { label: "NTS & GAT", slug: "nts-gat" },
  { label: "MDCAT & ECAT", slug: "mdcat-ecat" },
  { label: "ISSB & Armed Forces", slug: "armed-forces" },
  { label: "Police & Jobs", slug: "jobs" },
  { label: "Law & LAT", slug: "law" },
] as const;

export const footerLinks = [
  { label: "My orders", href: "/orders" },
  { label: "About us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Shipping", href: "/shipping" },
  { label: "Returns", href: "/returns" },
  { label: "FAQ", href: "/faq" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
] as const;
