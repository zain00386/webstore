# Order messages (SMS, email, WhatsApp)

## What happens today

No SMS, email or WhatsApp message is sent automatically. The website never says one was sent.

When a customer places an order:

1. They see the confirmation page with their **order number**, total, items and next step.
2. The page has a private link (the `?t=...` part is a secret). It is saved under
   **My orders** (`/orders`) on the device they ordered from, or on any device where they open the link.
3. For JazzCash / Easypaisa they're asked to send the payment screenshot to the shop's WhatsApp.
   The order stays **Payment pending verification** until an admin checks the money arrived
   and marks it paid (Phase 10). A screenshot never marks it paid.
4. The shop sees new orders in **Admin → Orders** (Phase 10).

## Connecting a message service later

Everything goes through one place: `src/lib/notifications/order-placed.ts`.

- `notifyOrderPlaced()` runs **after** the order is saved and the customer already has their
  reply (Next.js `after()`), so a slow or broken service can never block or undo an order.
- It receives the order number, total, payment and delivery method, the customer's name,
  phone and email (if given), and the full private order link.
- Add one entry to the `channels` list per service:

  ```ts
  {
    name: "sms",
    isConfigured: () => Boolean(process.env.SMS_API_KEY),
    send: async (notice) => { /* call the provider's API here */ },
  }
  ```

- A channel whose keys are missing is reported as `not_configured` and skipped.
  A channel that fails is reported as `failed`; the order is unaffected.
- Logs contain only the order number and each channel's result, never customer details.

Good options in Pakistan: an SMS gateway (e.g. a local bulk SMS provider), email through
a service like Resend, or the WhatsApp Business Platform (needs Meta business verification
and approved message templates). Each needs its own account and API key, stored as a
server-only environment variable (never starting with `NEXT_PUBLIC_`).

Before connecting one, decide: who gets the message (customer, shop, or both), and what it says.
Never put the payment account number in an SMS or email, and only send the private order link
to the customer's own phone or email.
