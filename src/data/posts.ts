import "server-only";
import type { Post } from "@/types/post";

/**
 * PHASE 2 PREVIEW POSTS. Real posts are written in Admin > Posts from Phase 11.
 * Posts with isSample: true are shown with a visible "Sample" label and must
 * never be presented as real job adverts.
 */
const posts: Post[] = [
  {
    slug: "how-to-order-books-from-dogars-unique-books-rawalpindi",
    title: "How to order books from Dogar's Unique Books Rawalpindi",
    kind: "blog",
    excerpt:
      "Delivery all over Pakistan from Rs. 300, Cash on Delivery with TCS / Leopards / M&P, and JazzCash or Easypaisa payments. Here is how it works.",
    coverUrl: null,
    publishedAt: "2026-10-18",
    isSample: false,
    body: [
      { type: "p", text: "You can order any book from our Rawalpindi branch and have it delivered anywhere in Pakistan." },
      { type: "h2", text: "Delivery options" },
      {
        type: "ul",
        items: [
          "Pakistan Post: Rs. 300, all over Pakistan. Prepaid only (JazzCash or Easypaisa).",
          "TCS / Leopards / M&P courier: Rs. 550. Cash on Delivery available, or pay in advance.",
        ],
      },
      { type: "h2", text: "Paying with JazzCash or Easypaisa" },
      {
        type: "p",
        text: "Place your order, send the amount shown with your order number in the payment note, then send the payment screenshot on WhatsApp 0324-9574895. We dispatch your books after we confirm the payment.",
      },
      { type: "h2", text: "Visit the shop" },
      {
        type: "p",
        text: "Iqbal Road, Committee Chowk, Rawalpindi. Open 10:00 AM to 9:00 PM, closed on Friday. Online and WhatsApp orders are accepted every day.",
      },
    ],
  },
  {
    slug: "sample-ppsc-lecturer-vacancies",
    title: "Sample: PPSC Lecturer vacancies announcement",
    kind: "vacancy",
    excerpt: "Example of how a vacancy post will look, with the department, last date to apply and the books to prepare.",
    coverUrl: null,
    publishedAt: "2026-10-17",
    isSample: true,
    vacancy: {
      organisation: "Punjab Public Service Commission (PPSC)",
      positions: "Lecturers (various subjects)",
      location: "Punjab",
      lastDate: "2026-11-05",
      applyUrl: "https://www.ppsc.gop.pk",
      examSlug: "fpsc-ppsc",
    },
    body: [
      { type: "p", text: "This is a sample post showing how vacancy announcements will appear. It is not a real job advertisement. Always check the official website before applying." },
      { type: "h2", text: "What a real post will include" },
      { type: "ul", items: ["Department and number of posts", "Eligibility and age limit", "Last date to apply", "Link to the official application page", "Books to prepare for the test"] },
    ],
  },
  {
    slug: "sample-fpsc-assistant-director-vacancies",
    title: "Sample: FPSC Assistant Director vacancies announcement",
    kind: "vacancy",
    excerpt: "Example vacancy post for federal government jobs, with preparation guides from our shop.",
    coverUrl: null,
    publishedAt: "2026-10-16",
    isSample: true,
    vacancy: {
      organisation: "Federal Public Service Commission (FPSC)",
      positions: "Assistant Directors (sample)",
      location: "Islamabad",
      lastDate: "2026-11-10",
      applyUrl: "https://www.fpsc.gov.pk",
      examSlug: "fpsc-ppsc",
    },
    body: [
      { type: "p", text: "This is a sample post showing how vacancy announcements will appear. It is not a real job advertisement. Always check the official website before applying." },
    ],
  },
  {
    slug: "sample-preparing-for-a-recruitment-test",
    title: "Sample: Preparing for a recruitment test in four weeks",
    kind: "blog",
    excerpt: "Example study-guide article: plan your weeks, practise past papers and track weak topics.",
    coverUrl: null,
    publishedAt: "2026-10-15",
    isSample: true,
    body: [
      { type: "p", text: "This is a sample article showing how blog posts will look." },
      { type: "h2", text: "Week by week" },
      { type: "ul", items: ["Week 1: read the syllabus and take one practice test", "Weeks 2-3: cover topics, solve MCQs daily", "Week 4: timed past papers and revision"] },
    ],
  },
];

export function getPublishedPosts(kind?: Post["kind"]): Post[] {
  return posts
    .filter((p) => !kind || p.kind === kind)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getPostBySlug(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
