# Database setup (Supabase)

Follow these steps once. They take about 15 minutes. You will paste three values
into a private file, paste one SQL file into Supabase, flip one switch, and run four commands.

**Quick version**

1. Create the project on supabase.com.
2. Paste 3 values into `.env.local`. The file already exists; just fill in the blanks.
3. Paste `supabase/setup-all.sql` into Supabase's SQL Editor and click **Run**.
4. Turn off public sign-up in Supabase.
5. In the terminal: `npm run db:check`, then `npm run db:create-admin -- --email=YOUR@EMAIL`,
   then `npm run db:import`, then `npm run db:check` again.

> **Never** paste your keys or passwords into chat, email, WhatsApp or GitHub.
> They only go in the `.env.local` file on your computer (and later in Vercel's settings).

---

## 1. Create the Supabase project

1. Go to <https://supabase.com> and sign in (GitHub sign-in is easiest).
2. Click **New project**.
   - **Name:** `dogars-unique-books`
   - **Database password:** click *Generate*, then save it in a password manager.
   - **Region:** *South Asia (Mumbai)* or *Southeast Asia (Singapore)*, closest to Pakistan.
3. Wait 1–2 minutes until the project is ready.

## 2. Put the keys in `.env.local`

1. In VS Code open **`.env.local`** (already created for you, with empty values).
2. In Supabase open **Project Settings → API Keys** (or **Settings → API**). Copy:

   | Put this in `.env.local` | Copy from Supabase |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | **Project URL** (`https://xxxx.supabase.co`), under Settings → Data API / API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Publishable key** (`sb_publishable_…`), or the legacy **anon public** key |
   | `SUPABASE_SERVICE_ROLE_KEY` | **Secret key** (`sb_secret_…`), or the legacy **service_role** key |

3. Save the file. It is already ignored by Git, so it will not be uploaded to GitHub.
4. If `npm run dev` is running, stop it (`Ctrl + C`) and start it again so it reads the new file.

**Which key is which?** The *publishable/anon* key is meant to be public: the database
security rules decide what it can see. The *secret/service_role* key skips every rule,
like a master key. It must never be in a variable starting with `NEXT_PUBLIC_`; the
site refuses to start if it is.

## 3. Create the tables (one paste)

1. In VS Code open **`supabase/setup-all.sql`**, press `Ctrl + A` then `Ctrl + C`.
2. In Supabase open **SQL Editor → New query**, paste (`Ctrl + V`), click **Run**.
3. You should see *Success. No rows returned*.

Run it **once**. It runs as one transaction: if anything goes wrong, nothing is changed;
copy the error message and ask for help. (Supabase may warn that the query
"contains destructive operations": that's the `revoke` security lines; click *Run* to confirm.)

*`setup-all.sql` is the three files in `supabase/migrations/` combined. Advanced alternative:
`npx supabase link` then `npx supabase db push`.*

## 4. Check everything

In the VS Code terminal:

```
npm run db:check
```

Every line should show ✓. A ✗ line tells you what to fix. "No admin yet" and
"No books yet" are warnings you'll fix in the next steps.

## 5. Turn off public sign-up and create your admin account

The website has **no sign-up page**; admins are created only by you.

1. In Supabase: **Authentication → Sign In / Providers** (or *Auth settings*), turn **off**
   *"Allow new users to sign up"*, then Save. (`npm run db:check` warns if it's still on.)
2. In the VS Code terminal, with your own email:

   ```
   npm run db:create-admin -- --email=you@example.com
   ```

   It creates the account, gives it admin rights, and shows a strong password **once**.
   Save that password in a password manager immediately. Running it again for the same
   email only re-adds admin rights; the password isn't changed.

To remove an admin later (SQL Editor): `delete from public.admin_users where user_id = '...';`

## 6. Import the Lahore catalogue

First a dry run, which shows what would happen without changing anything:

```
npm run db:import -- --dry-run
```

Then the real import (about 483 books; covers are copied into your storage, which takes a few minutes):

```
npm run db:import
```

- New books start with **stock 10** so nothing shows "Out of stock". You will set
  real counts in Admin → Books (Phase 6). Use `-- --stock=5` for a different starting number.
- Running it again is safe: books already imported are **skipped**, so your stock and
  price edits are never overwritten.
- `-- --update` refreshes titles, prices and descriptions from the snapshot (never stock).
- If a cover can't be copied (too large, download failed) the book still imports and
  links to the Lahore image instead; the script lists these at the end.

Then run `npm run db:check` again: it should now report the books and your admin.

---

## How stock works (decided now, built in Phases 7–10)

- **Adding to cart does not hold stock.** Two people can have the last copy in their carts.
- **Stock is deducted when an order is placed**, inside one database transaction that
  locks the book row and checks there is enough. If two people order the last copy at
  the same moment, one order succeeds and the other gets a clear "only 0 left" message.
  It is never oversold.
- **Prices are re-read from the database at checkout.** The prices in the shopper's
  browser are ignored, so a tampered price can't be used.
- **Cancelling an order puts the stock back exactly once.** The order records
  `stock_restored_at`, so pressing *Cancel* twice cannot add stock twice.
- **JazzCash / Easypaisa orders** keep their stock deducted while payment is pending.
  If a customer never pays, you cancel the order in admin and the stock returns.
- **Payment status and order status are separate.** Marking an order *Shipped* never marks
  it *Paid*, and only an admin can mark a transfer as *Paid* after checking the money arrived.

## Security summary

| Who | Can do |
| --- | --- |
| Visitors | See active books, categories and published posts; see delivery fees. Nothing else. |
| Signed-in non-admins | The same as visitors (no special rights). |
| Admins (in `admin_users`) | Manage books, categories, posts, orders and settings through the admin area. |
| Website server code | Uses the secret key only for trusted jobs such as placing an order after re-checking prices and stock. |

Customer names, phone numbers and addresses are **never** readable by visitors. Payment
account numbers are shown only to a customer on their own order page (Phase 9).
These rules are tested automatically (`npm test`, file `supabase/tests/schema.test.ts`).

## If a key leaks

In Supabase: **Project Settings → API Keys**, create a new secret key and delete the
leaked one (or roll the legacy keys). Update `.env.local` (and Vercel later), then restart.

## Backups

Before going live, check the backup options on your Supabase plan (Database → Backups).
We'll cover this in Phase 14.

## Later database updates

When a new phase adds a file to `supabase/migrations/`, paste **only that new file** into
the SQL Editor and click Run (not `setup-all.sql`, which is only for a brand-new, empty
project). `npm run db:check` tells you if something is missing.

| File | Added in | What it does |
| --- | --- | --- |
| `20261019000004_place_order.sql` | Phase 8 | The ordering step: re-checks prices and stock, deducts stock safely, creates the order |
| `20261021000005_bank_transfer.sql` | Payment settings | Adds bank transfer and the bank account fields used in Admin → Settings |
