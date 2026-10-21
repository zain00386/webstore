# Feature status (Phase 15, 21 October 2026)

✅ complete and tested · 🟡 partial / needs the owner · ⬜ not built (by decision or for later)

## Shop (customers)

| Feature | Status | Notes |
| --- | --- | --- |
| Home page: banner of new test books, exam shortcuts, new arrivals, vacancies, categories, discounts, feature cards, visit & map | ✅ | Banner books = the ones ticked "New arrival" |
| Book catalogue: search, filters (exam, category, publisher, price, stock), sort, pages | ✅ | 483 books imported |
| Book page: gallery, price, stock, delivery, share, related books, Google product data | ✅ | |
| Exam directory | ✅ | |
| Cart (kept in the browser, re-checked against the database) | ✅ | Price/stock changes and tampering are corrected |
| Guest checkout: Pakistan Post / TCS-Leopards-M&P, COD, JazzCash, Easypaisa, bank transfer | ✅ | Fees from Settings; total calculated by the database |
| Order page with private link, progress, payment details, tracking number | ✅ | |
| "My orders" on the same device | ✅ | No customer accounts |
| Blog and job vacancies with books to prepare | ✅ | |
| About, Contact (+ map, WhatsApp form), Shipping, FAQ | ✅ | |
| Returns, Privacy, Terms pages | 🟡 | Wording is a draft until you approve it |
| WhatsApp / call buttons, social links | ✅ | |
| Customer accounts / login | ⬜ | Not in version 1 |
| Automatic SMS / email / WhatsApp messages | ⬜ | Connection point ready (`docs/notifications.md`) |
| Card / automatic wallet payment gateway | ⬜ | Only after provider approval and sandbox testing |
| Urdu language version | ⬜ | |
| Reviews / ratings | ⬜ | None invented |

## Admin

| Feature | Status | Notes |
| --- | --- | --- |
| Login (no public sign-up), rate-limited, 7-day secure cookie | ✅ | New password: `npm run db:reset-admin-password` |
| Overview with live counts | ✅ | |
| Books: add, edit, cover upload, quick edit of price/stock/on sale/new arrival, delete | ✅ | |
| Real stock counts | 🟡 | All books set to 100 on 21 Oct 2026 (owner's choice); adjust per book in Admin → Books |
| Categories | ✅ | |
| Orders: filters, search, confirm/pack/ship/deliver, mark paid (with check), payment not received, cancel (stock back once), refund, notes, history | ✅ | Brief loading flicker after an action (cosmetic) |
| Posts (blog + vacancies): draft, publish, schedule, archive, delete, preview, image | ✅ | |
| Settings: contact, delivery fees, COD switch, delivery note, low-stock level, payment accounts | ✅ | 🟡 add your JazzCash/Easypaisa numbers or switch them off |
| Change your own password from the admin area | ⬜ | Done from the terminal instead (safer for now) |
| Several admins with different rights | ⬜ | All admins have full rights |

## Behind the scenes

| Feature | Status | Notes |
| --- | --- | --- |
| Database security rules (RLS) on every table, private storage writes | ✅ | Checked by `npm run db:check` and tests |
| Stock can never oversell (tested with 6 simultaneous buyers) | ✅ | `npm run e2e:last-copy` |
| Prices/fees always from the database, never the browser | ✅ | |
| Double-click / refresh never creates two orders | ✅ | |
| Shared rate limits (login, orders) | ✅ | |
| Security headers, secure cookies, no personal data in logs | ✅ | Not a certified security audit |
| SEO: titles, canonical URLs, sitemap, robots, Google data | ✅ | Submit the sitemap in Search Console after going live |
| Accessibility: every page passes axe (WCAG 2.2 AA) at phone and desktop size; keyboard check | ✅ | Not tested with real screen-reader users |
| Automated tests: 222 unit/database tests, 11 browser test suites (`npm run e2e:all`) | ✅ | |
| Hosting on Vercel, domain, HTTPS | 🟡 | Steps in `docs/deployment.md` (needs your Vercel account) |
| Backups | 🟡 | Choose a Supabase plan / download backups (`docs/go-live-checklist.md`) |
| Error monitoring service (e.g. Sentry) | ⬜ | Vercel's logs only for now |
