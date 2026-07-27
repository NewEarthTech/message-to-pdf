import { useEffect, useState } from "react"

import { A } from "@/components/legal-layout"

import { DOWNLOAD_ENDPOINT, PADDLE_ENV, SUPPORT_EMAIL } from "@/paddle-config"

// Post-purchase thank-you and download. Checkout redirects here with
// ?_ptxn=<transaction_id>.
//
// Gating model: server-verified entitlement. This page never holds a download
// URL. It links to the download gate with the transaction id, and that endpoint
// verifies the transaction against the Paddle API (real, paid, and for this
// product) before redirecting to a short-lived signed URL. The DMG has no public
// read path, so a visitor who lands here without a paid transaction gets a 403,
// not a file.
export default function Success() {
  const [txn, setTxn] = useState<string | null>(null)

  // Read on the client only: this page is prerendered with no transaction, and
  // the id arrives in the query string of the real visit.
  useEffect(() => {
    setTxn(new URLSearchParams(window.location.search).get("_ptxn"))
  }, [])

  // Both are required: the endpoint is injected at deploy, the transaction id
  // comes from the checkout redirect. Without a transaction there is nothing to
  // verify.
  const downloadHref =
    DOWNLOAD_ENDPOINT && txn ? `${DOWNLOAD_ENDPOINT}?_ptxn=${encodeURIComponent(txn)}` : null

  return (
    <main className="px-6 py-16 md:px-10">
      <div className="mx-auto max-w-[46rem]">
        {PADDLE_ENV === "sandbox" && (
          <p className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200/90 text-xs">
            Sandbox: this was a test purchase. No real charge was made.
          </p>
        )}

        {/* Do not claim a payment happened unless this page actually carries a
            transaction. Landing here directly must not read as a receipt. */}
        <h1 className="font-[680] text-[clamp(1.9rem,4vw,2.4rem)] tracking-[-0.03em]">
          {txn ? "Thank you for buying Message to PDF." : "No purchase found on this page."}
        </h1>
        <p className="mt-3 max-w-[54ch] text-[#f5f3ef]/70">
          {txn
            ? "Your payment went through. Your download is below, and a copy is on its way to your email."
            : "This page shows your download after a purchase. If you have already bought Message to PDF, open the link from your confirmation email, which carries your transaction."}
        </p>

        <div className="mt-10 rounded-2xl border border-[#93735a]/40 bg-[#403f3c] px-7 py-8 sm:px-9">
          <p className="text-[#f5f3ef]/75 text-sm leading-relaxed">
            Message to PDF for macOS. Universal (Apple Silicon and Intel), macOS 11 and later,
            signed and notarized by Apple.
          </p>

          {downloadHref ? (
            <a
              className="mt-6 inline-block whitespace-nowrap rounded-full bg-[#cba980] px-7 py-3.5 font-semibold text-[#23231f] transition-opacity hover:opacity-90 active:translate-y-px"
              href={downloadHref}
            >
              Download Message to PDF
            </a>
          ) : (
            <p className="mt-6 rounded-2xl border border-[#f5f3ef]/15 px-4 py-3 text-[#f5f3ef]/60 text-xs leading-relaxed">
              {DOWNLOAD_ENDPOINT
                ? "There is no transaction in this link, so there is nothing to verify. Use the download link from your purchase confirmation email, or write to us and we will sort it out."
                : "The download endpoint is not wired up in this deploy yet."}
            </p>
          )}

          <p className="mt-6 text-[#f5f3ef]/50 text-xs">
            Transaction:{" "}
            <span className="break-all font-mono">
              {txn ?? "(none, did you arrive here directly?)"}
            </span>
          </p>
        </div>

        <p className="mt-6 text-[#f5f3ef]/50 text-xs leading-relaxed">
          Keep the email: your download link works any time. Trouble? Write to{" "}
          <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A>. By downloading you accept the
          GPL-3.0-or-later license shipped in the app.
        </p>
      </div>
    </main>
  )
}
