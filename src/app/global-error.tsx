"use client";

/** Last-resort error screen when the root layout itself fails. Uses inline styles: global CSS isn't loaded here. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f4f1ea",
          color: "#1f1f1f",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 16,
        }}
      >
        <title>Something went wrong | Dogar&apos;s Unique Books Rawalpindi</title>
        <main>
          <h1 style={{ fontSize: 24 }}>Something went wrong</h1>
          <p>Please try again, or WhatsApp us on 0324-9574895.</p>
          <button
            onClick={() => retry()}
            style={{
              marginTop: 16,
              padding: "12px 24px",
              borderRadius: 999,
              border: 0,
              background: "#1f1f1f",
              color: "#fff",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
