# Known limitations (after Phase 13)

Things that are deliberately not done yet, or that need a decision from the shop.

## Needs the owner

- **Policy wording** (Returns, Privacy, Terms) shows a "Draft policy" notice until you approve the text.
- **Database updates 0005–0008** must be pasted into Supabase (see `docs/database-setup.md`).
  Until then, order pages, Admin → Orders, Settings and publishing posts don't work.
- **Real stock counts**: imported books start at stock 10.

## By design for version 1

- **No customer accounts.** Customers find orders through their private link or "My orders" on the same device.
- **No automatic SMS / email / WhatsApp messages.** See `docs/notifications.md` for how to connect one.
- **No card payment gateway.** JazzCash, Easypaisa and bank transfers are checked by hand; Cash on Delivery via courier.
- **Shop name and opening hours** live in `src/config/site.ts` (the logo and "open now" badge use them).
- **Rate limits** on login and checkout are kept in the server's memory, so each server instance counts separately.
  Phase 14 reviews this for hosting.

## Accessibility checks

- `npm run e2e:a11y` checks every public and admin page at phone and desktop width with axe (WCAG 2.2 A/AA):
  no issues found on 21 October 2026.
- `npm run e2e:keyboard` checks skip link, visible focus, no keyboard traps, and that checkout works by keyboard.
- Not tested automatically: real screen readers (NVDA / TalkBack), and Urdu text (the site is in English).

## Development notes

- The development server occasionally serves an old copy of a changed file. If something looks out of date,
  stop it, delete the `.next/dev` folder and start it again. The live (production) site isn't affected.
- `npm test` has twice failed to start straight after another heavy command ("no tests" for every file);
  running it again passed. Cause not found yet.
