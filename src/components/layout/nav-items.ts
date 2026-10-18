import { BookOpen, GraduationCap, Home, Megaphone, ShoppingBag, type LucideIcon } from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon };

/** Main customer navigation, shared by the desktop sidebar and mobile tab bar. */
export const mainNav: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Books", href: "/books", icon: BookOpen },
  { label: "Exams", href: "/exams", icon: GraduationCap },
  { label: "Vacancies", href: "/blog", icon: Megaphone },
  { label: "Cart", href: "/cart", icon: ShoppingBag },
];

export function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
