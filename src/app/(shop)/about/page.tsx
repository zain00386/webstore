import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/layout/info-page";
import { ShopCard } from "@/components/store/shop-card";

export const metadata: Metadata = {
  title: "About us",
  description: "Dogar's Unique Books is the official Rawalpindi branch of Dogar Publishers, Lahore.",
};

export default function AboutPage() {
  return (
    <InfoPage title="About us" intro="The official Rawalpindi branch of Dogar Publishers.">
      <p>
        Dogar&apos;s Unique Books brings the Dogar Publishers range to Rawalpindi and Islamabad, together with books
        from other publishers, so students and job seekers can find everything for their exam in one place.
      </p>
      <h2>What we stock</h2>
      <ul>
        <li>CSS, PMS, FPSC, PPSC and NTS preparation guides</li>
        <li>MDCAT, ECAT and NUST NET entry test books</li>
        <li>ISSB, armed forces, police and job recruitment test guides</li>
        <li>Intermediate, BA / BS, MA / MPhil, law and English learning books</li>
        <li>KidStar children&apos;s books</li>
      </ul>
      <h2>Genuine books</h2>
      <p>
        As an official branch, we sell genuine publisher editions only, never photocopies.
      </p>
      <h2>Order from anywhere in Pakistan</h2>
      <p>
        We deliver all over Pakistan. See <Link href="/shipping" className="underline">shipping & delivery</Link> for
        charges and payment options.
      </p>
      <ShopCard />
    </InfoPage>
  );
}
