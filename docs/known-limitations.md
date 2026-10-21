# Known limitations (after Phase 15)

Things that are deliberately not done yet, or that need a decision from the shop.

## Needs the owner

- **Policy wording** (Returns, Privacy, Terms) shows a "Draft policy" notice until you approve the text.
- **Payment accounts**: JazzCash / Easypaisa are switched on without numbers. Add them in Admin → Settings,
  or switch them off.
- **Stock counts**: every book was set to 100 on 21 Oct 2026; change individual books in Admin → Books.

## By design for version 1

- **No customer accounts.** Customers find orders through their private link or "My orders" on the same device.
- **No automatic SMS / email / WhatsApp messages.** See `docs/notifications.md` for how to connect one.
- **No card payment gateway.** JazzCash, Easypaisa and bank transfers are checked by hand; Cash on Delivery via courier.
- **Shop name and opening hours** live in `src/config/site.ts` (the logo and "open now" badge use them).
- **Admin password changes** are done from the terminal (`npm run db:reset-admin-password`), not the admin area.
- **After an admin order action** the page can briefly show a loading placeholder while it refreshes (cosmetic).

## Accessibility checks

- `npm run e2e:a11y` checks every public and admin page at phone and desktop width with axe (WCAG 2.2 A/AA):
  no issues found on 21 October 2026.
- `npm run e2e:keyboard` checks skip link, visible focus, no keyboard traps, and that checkout works by keyboard.
- Not tested automatically: real screen readers (NVDA / TalkBack), and Urdu text (the site is in English).

## Development notes

- The development server served out-of-date code several times. Its disk cache is now switched off for
  `next dev` (next.config.ts). If it still happens, stop it, delete `.next/dev` and start again.
  The live (production) site isn't affected.
- `npm test` has twice failed to start straight after another heavy command ("no tests" for every file);
  running it again passed. Cause not found yet.
