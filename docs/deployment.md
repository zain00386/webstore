# Putting the shop online (Vercel)

About 30–45 minutes the first time. You need: your GitHub account (the code is already at
github.com/zain00386/webstore), your Supabase project, and optionally a domain name.

> Never paste keys or passwords into chat, email or WhatsApp. They go only into Vercel's
> settings (step 3) and your own `.env.local` file.

## 0. Before you start (5 minutes)

On your computer, in the VS Code terminal:

```
npm.cmd run db:check
```

Every line should show ✓. If not, fix that first (it tells you which database file to paste).

## 1. Create a Vercel account

1. Go to <https://vercel.com> → **Sign Up** → **Continue with GitHub** (use the zain00386 account).
2. Choose the **Hobby** (free) plan to start. For a business shop, Vercel asks you to move to
   **Pro** for commercial use; read their current terms and decide (you can upgrade later).

## 2. Import the project

1. In Vercel: **Add New… → Project**.
2. Find **webstore** in the list → **Import**. (If it isn't listed: *Adjust GitHub App Permissions* and allow the repository.)
3. Framework Preset: **Next.js** (found automatically). Leave Build and Output settings as they are.
4. **Don't click Deploy yet**: open **Environment Variables** first (step 3).

## 3. Environment variables (the 4 settings)

Add each one (Name / Value), for **Production** (and Preview if you like):

| Name | Value | Where to find it |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jtlcazuuhvwmirgewtps.supabase.co` | Supabase → Project Settings → Data API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the **publishable** key (`sb_publishable_…`) | Supabase → Project Settings → API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | the **secret** key (`sb_secret_…`) | Supabase → Project Settings → API Keys. **Secret: Production only.** |
| `NEXT_PUBLIC_SITE_URL` | your live address, e.g. `https://dogarsuniquebooks.pk` (no `/` at the end) | For now use the Vercel address from step 4, then change it in step 6 |

The same values are in your `.env.local` file (open it in VS Code to copy them, but don't share the file).
Never put the secret key in a variable starting with `NEXT_PUBLIC_`: the site refuses to start if you do.

Now click **Deploy**. The first build takes 2–4 minutes.

## 4. Check the Vercel address

When it says **Congratulations**, click the preview. You get an address like
`https://webstore-xyz.vercel.app`.

1. In Vercel → Project → **Settings → Environment Variables**, set `NEXT_PUBLIC_SITE_URL` to that
   address (until you have your own domain) → Save.
2. **Deployments** → the latest one → **⋯ → Redeploy** (needed after changing a variable).

## 5. Supabase settings for the live site

In Supabase:

1. **Authentication → URL Configuration → Site URL**: your live address. Save.
2. **Authentication → Sign In / Providers**: "Allow new users to sign up" must be **OFF**.
3. **Storage**: buckets `book-covers` and `post-images` exist and are **public** (images only).
   `npm run db:check` already checks this.
4. Backups: see `docs/go-live-checklist.md` section 6. Decide on the plan before real orders.

Security rules (RLS) are part of the database files; `npm run db:check` checks that visitors
can't read orders, settings or payment details, and can't change books.

## 6. Your own domain (optional, recommended)

1. Buy a domain (e.g. `dogarsuniquebooks.pk` from a PKNIC registrar, or a `.com`).
2. Vercel → Project → **Settings → Domains → Add** → type the domain.
3. Vercel shows the **DNS records** to add (usually an `A` record `76.76.21.21` for the bare domain
   and a `CNAME` `cname.vercel-dns.com` for `www`). Add them at your domain registrar's DNS page.
   Use exactly what Vercel shows, as these can change.
4. Wait until Vercel shows **Valid Configuration** (minutes to a few hours).
   **HTTPS is automatic**: Vercel issues and renews the certificate itself.
5. Set `NEXT_PUBLIC_SITE_URL` to `https://your-domain` → **Redeploy**.
6. Supabase → Authentication → URL Configuration → Site URL: the same address.

## 7. First checks on the live site (10 minutes)

1. Open the home page, a book page, the cart and checkout on your **phone** and computer.
2. Sign in at `https://your-domain/admin/login`. Check Admin → Settings: payment accounts,
   delivery fees, phone numbers.
3. `https://your-domain/robots.txt` and `/sitemap.xml` open and show your domain.
4. Follow the acceptance test (`docs/acceptance-test.md`), section "Small real test order".

## 8. After going live

- **Google:** add the site in Google Search Console and submit `https://your-domain/sitemap.xml`.
- **Updates:** every time new code is pushed to GitHub `main`, Vercel builds and publishes it
  automatically. If a database file is added, paste it into Supabase **before** pushing.
- **If something breaks after an update:** Vercel → Deployments → the previous good one →
  **⋯ → Promote to Production** (instant rollback).

## Payments

The shop takes **JazzCash / Easypaisa / bank transfers checked by you** and **Cash on Delivery**.
No card or automatic wallet gateway is connected, and none should be switched on until the
provider has approved your business, it has been tested in the provider's **test/sandbox mode**,
and refunds and settlement are understood. Adding one is a separate piece of work.
