# Go-live checklist

Work through this before the shop takes real orders. Phase 15 adds the step-by-step
Vercel guide and a test-order script. This list is a careful review, **not** a certified
security audit or legal compliance check.

## 1. Accounts you need

| Account | What for | Status |
| --- | --- | --- |
| **Supabase** (supabase.com) | Database, admin logins, book images | Have it. Check the plan's backups (below). |
| **GitHub** (zain00386/webstore) | Stores the code | Have it. |
| **Vercel** (vercel.com, sign in with GitHub) | Hosts the website | Needed (Phase 15). |
| **Domain name** (e.g. from a .pk or international registrar) | Your web address | Needed if you want your own address. |
| **Google Search Console** | Tell Google about the sitemap, see search traffic | Optional, recommended. |
| **JazzCash / Easypaisa / bank** | Receiving payments (checked by hand) | Your existing accounts. |
| SMS / email / WhatsApp API provider | Automatic order messages | Optional, not connected (`docs/notifications.md`). |
| Card payment gateway | Card payments | Not connected. Only after the provider confirms eligibility and it's tested in their sandbox. |

## 2. Database (Supabase)

- [ ] Run every file in `supabase/migrations/` that isn't installed yet (today: **0005 to 0009**), in order.
- [ ] `npm run db:check` shows only ✓ lines.
- [ ] Authentication → Sign In / Providers: **"Allow new users to sign up" is OFF**.
- [ ] Authentication → URL Configuration: Site URL = your live address.
- [ ] Only real admins are in `admin_users` (remove test accounts).
- [ ] Set real stock counts and prices in Admin → Books.
- [ ] Admin → Settings: payment accounts, delivery fees, contact details checked.
- [ ] Delete test orders (e.g. DUB-10013) or cancel them so stock returns.

## 3. Hosting settings (Vercel → Project → Settings → Environment Variables)

| Name | Value | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable / anon key | Public (protected by database rules) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret / service_role key | **Secret.** Production only. Never `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain` | Used for links, sitemap, Google data |

The site refuses to start if the secret key is ever put in a `NEXT_PUBLIC_` variable.

## 4. What protects the shop (reviewed in Phase 14)

- **Admin area:** every admin page and action checks the login *and* admin rights on the server; database
  rules (RLS) check again. No public sign-up page. Admin pages are hidden from search engines.
- **Login cookie:** HttpOnly (page scripts can't read it), Secure (HTTPS only) on the live site,
  SameSite=Lax, expires after 7 days without admin use.
- **Rate limits** shared by all servers (migration 0009): 5 wrong logins per 15 min per email + address;
  10 orders/hour per device and 5/hour per phone. Only scrambled keys are stored.
- **Orders:** prices, stock and delivery fees are re-read by the database; stock can't oversell;
  double-clicks can't create two orders; transfers stay "pending" until an admin checks the money.
- **Customer data:** names, phones and addresses are readable only by admins; a customer's order page
  needs its secret link; payment account numbers appear only on the customer's own order page.
- **Browser safety headers:** no framing by other sites, no content-type guessing, limited referrer,
  camera/microphone/location off, HTTPS enforced (HSTS) on the live site.
- **Logs:** only error codes and order numbers, never names, phones, addresses or passwords.
- **Dependencies:** `npm audit --omit=dev` finds 0 known problems in what the website runs. The
  development tools (ESLint, shadcn CLI) carry a "braces" warning with no fixed version yet; they never
  run on the live site.

## 5. Search engines

- `/sitemap.xml` lists every book on sale, exam pages, published posts and info pages.
- `/robots.txt` keeps admin, cart, checkout and order pages out of search; preview copies of the site
  (Vercel previews) are hidden completely.
- Each page has a title, description and canonical address; book pages carry product data, posts carry
  article data, and the home/contact pages carry the shop's address, phone and hours. No ratings or
  reviews are claimed.
- After going live: add the site in Google Search Console and submit `https://your-domain/sitemap.xml`.

## 6. Backups and restore

- **Database:** Supabase → Database → Backups. Free projects keep only limited daily backups; paid plans
  keep more and offer point-in-time restore. Decide which you need before taking real orders.
- **Your own copy (recommended weekly):** Supabase → Database → Backups → download, or with the Supabase CLI
  `npx supabase db dump --data-only > backup.sql` (needs `npx supabase login` and `link` first).
  Keep it somewhere private: it contains customer details.
- **Images:** book covers and post images live in Supabase Storage (buckets `book-covers`, `post-images`).
  They are not included in a database dump; download them occasionally or keep the originals.
- **Code:** GitHub keeps every version.
- **Restore test:** at least once, restore a backup into a new, empty Supabase project and run
  `npm run db:check` against it, so you know the steps before you need them.

## 7. Before the first real customer

- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass.
- [ ] Place one small real order yourself on the live site (Phase 15 script), confirm it in Admin → Orders,
      then cancel it and check the stock came back.
- [ ] Approve or edit the Returns, Privacy and Terms wording (they show "Draft policy" until then).
