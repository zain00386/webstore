import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { getStoreInfo } from "@/lib/db/store-info";
import { formatPKR } from "@/lib/format";
import { InfoPage } from "@/components/layout/info-page";

export const metadata: Metadata = {
  title: "Shipping & delivery",
  description: "Delivery all over Pakistan by Pakistan Post or courier (TCS / Leopards / M&P), with Cash on Delivery on courier orders.",
};

export default async function ShippingPage() {
  const store = await getStoreInfo();
  const prepaid = [store.payments.jazzcash && "JazzCash", store.payments.easypaisa && "Easypaisa", store.payments.bank_transfer && "bank transfer"]
    .filter(Boolean)
    .join(", ");
  const courier = store.delivery.find((o) => o.id === "courier");
  return (
    <InfoPage title="Shipping & delivery" intro="We deliver books all over Pakistan from our Rawalpindi shop.">
      <div className="not-prose overflow-hidden rounded-2xl ring-1 ring-border">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Delivery options and charges</caption>
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="p-3 font-semibold">Delivery</th>
              <th scope="col" className="p-3 font-semibold">Charge</th>
              <th scope="col" className="p-3 font-semibold">Payment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {store.delivery.map((o) => (
              <tr key={o.id}>
                <th scope="row" className="p-3 font-medium">{o.label}</th>
                <td className="p-3">{formatPKR(o.charge)}</td>
                <td className="p-3">
                  {o.codAllowed ? `Cash on Delivery${prepaid ? `, or in advance (${prepaid})` : ""}` : `In advance${prepaid ? ` (${prepaid})` : ""}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {store.deliveryNotes && <p>{store.deliveryNotes}</p>}

      {prepaid && (
        <>
          <h2>Paying in advance ({prepaid})</h2>
          <ul>
            <li>Place your order. You will see the exact amount and our account details.</li>
            <li>Send the payment and write your order number in the payment note.</li>
            <li>Send the payment screenshot on WhatsApp {store.phoneDisplay}.</li>
            <li>We dispatch your books once we have confirmed the payment in our account.</li>
          </ul>
        </>
      )}

      {store.codAvailable && courier && (
        <>
          <h2>Cash on Delivery</h2>
          <p>
            Available with {courier.label} only. Pay the courier in cash when your books arrive. We may call or WhatsApp you
            to confirm your order before dispatch.
          </p>
        </>
      )}

      <h2>Delivery time</h2>
      <p>Delivery time depends on your city and the courier. For an urgent order, WhatsApp us before ordering.</p>

      <h2>Collect from the shop</h2>
      <p>
        You can also buy in person at {store.address}, {siteConfig.hours.summary}.
      </p>
    </InfoPage>
  );
}
