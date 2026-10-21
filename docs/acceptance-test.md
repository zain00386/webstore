# Acceptance test: check the shop yourself

Follow these steps in order, on your computer and once on your phone. Tick each box.
It takes about 45 minutes. Use the local shop (`http://localhost:3000`) or the live site.

If something doesn't match, write down: **the page, what you did, what you expected, what happened**
(a screenshot helps), and send that to your developer.

Test orders: use your own name, and write **TEST** in the order notes. Cancel them at the end
(section 8) so the stock comes back.

## 1. Browsing (5 min)

- [ ] Home page: the banner shows new books; "Shop by exam" buttons work; the map loads at the bottom.
- [ ] Top bar: Facebook, Instagram and WhatsApp icons open the right pages; the helpline numbers start a call on a phone.
- [ ] Search "PPSC" in the search box: matching books appear.
- [ ] Books page: change a filter (exam, publisher, price) and the sort; results change; the page numbers work.
- [ ] Open a book: cover, price, description, "In stock", delivery info, "You may also like".
- [ ] On the phone: the bottom menu (Home, Books, Exams, Vacancies, Cart) works; nothing is cut off at the sides.

## 2. Cart (5 min)

- [ ] Add 2 different books to the cart. The cart number in the header goes up.
- [ ] In the cart: change a quantity with + and −; remove one book; the total updates.
- [ ] Close the browser, open it again: the cart is still there.
- [ ] You can't add more copies than are in stock.

## 3. Checkout: Cash on Delivery (5 min)

- [ ] Checkout with **TCS / Leopards / M&P** and **Cash on Delivery**.
- [ ] Try "Place order" with the phone number empty: a clear message appears next to the field.
- [ ] Fill in everything (notes: TEST) → **Place order**. The order page opens with an order number (DUB-…).
- [ ] The order page says Cash on Delivery and shows the right total (books + delivery fee).
- [ ] Press the browser's Back and Place order again quickly: no second order is created
      (check Admin → Orders later: only one).
- [ ] "My orders" (footer) lists the order on this device.

## 4. Checkout: JazzCash / Easypaisa / bank (5 min)

- [ ] Checkout with **Pakistan Post**: Cash on Delivery is not offered (pay in advance only).
- [ ] Choose JazzCash (or Easypaisa / bank) → Place order (notes: TEST).
- [ ] The order page shows **your account number and name** from Settings, the exact amount, and
      "Payment pending verification". It does **not** say paid.

## 5. Admin: orders (10 min)

- [ ] Sign in at `/admin/login`. Overview shows "New orders" and "Payments to verify".
- [ ] Admin → Orders: both test orders are under "Needs action". Search by the phone number finds them.
- [ ] Open the **JazzCash** order: there is no "Mark shipped" yet. Click **Mark paid…**: it asks you to tick that
      you checked your account. Tick → Mark paid. Now "Mark shipped" appears.
- [ ] Open the **COD** order: Confirm → Mark packed → Mark shipped (choose TCS, type a test tracking number).
- [ ] Open the customer's order page link (from "My orders"): it shows "Shipped" and the tracking number.
- [ ] History at the bottom of the admin order lists every step with the time.

## 6. Admin: books, posts, settings (10 min)

- [ ] Admin → Books: change a book's price, Save; the shop shows the new price straight away.
- [ ] Untick **On sale** for a book, Save: it disappears from the shop. Tick it again.
- [ ] Tick **New arrival** for a book, Save: it appears in the home page banner and "New arrivals".
- [ ] Admin → Posts → New post: a Vacancy as **Draft**: it is NOT on `/blog`. Change to **Published**: it appears.
- [ ] Admin → Settings: change the courier fee (e.g. 560), Save; checkout shows 560. Change it back.

## 7. Safety checks (5 min)

- [ ] Sign out. Open `/admin` directly: you are sent to the login page.
- [ ] Type a wrong password 6 times: it asks you to wait.
- [ ] Open your order page link but change one letter after `?t=`: "Order not found".
- [ ] In a private/incognito window, nothing from your cart or orders shows.

## 8. Clean up (2 min)

- [ ] Admin → Orders → each TEST order → **Cancel order…** (reason: "Test"). Stock comes back
      (the book page shows the same stock as before).

## Small real test order (on the live site, once)

Before telling customers the shop is open:

1. Place **one real small order** with your own phone and address: a cheap book, **TCS/Leopards/M&P**,
   **Cash on Delivery** (or a small JazzCash payment to your own account).
2. Check it in Admin → Orders, mark it confirmed / packed / shipped as you would for a customer.
3. Check the customer order page on your phone shows each step.
4. If you paid by JazzCash, check the money in your account before you press "Mark paid".
