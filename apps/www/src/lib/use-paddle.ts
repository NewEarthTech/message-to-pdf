import { initializePaddle, type Paddle } from "@paddle/paddle-js"
import { useEffect, useState } from "react"

import { PADDLE_CLIENT_TOKEN, PADDLE_ENV } from "@/lib/paddle-config"

type Status = "loading" | "ready" | "error"

// Initialize Paddle.js once, fetch the country-localized price via PricePreview,
// and expose an overlay-checkout opener for a one-time price.
//
// Localization: we pass NO country/address, so Paddle detects location from the
// visitor's IP. (This is a static site on CloudFront, so there is no server to
// read a geo header. Per Paddle's guidance, when there is no header you simply
// do not pass a country code and let IP auto-detection run.)
//
// The `price` returned is Paddle's already-formatted total string, displayed
// verbatim. No frontend math, no re-formatting.
//
// The success redirect is UX only; the durable source of truth is the webhook.
export function usePaddleCheckout(priceId: string) {
  const [paddle, setPaddle] = useState<Paddle | null>(null)
  const [status, setStatus] = useState<Status>("loading")
  const [price, setPrice] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    initializePaddle({
      token: PADDLE_CLIENT_TOKEN,
      environment: PADDLE_ENV,
      // No pwCustomer: Paddle Retain wants the signed-in customer's Paddle id,
      // and Message to PDF has no user accounts, so nobody is signed in here.
      eventCallback: (event) => {
        if (event.name === "checkout.error") setStatus("error")
        // Drive the post-purchase redirect ourselves. Paddle's `successUrl` does
        // NOT append the transaction id, so a buyer would land on /success with
        // nothing to verify and could never download. This event carries it.
        if (event.name === "checkout.completed") {
          const txn = (event.data as { transaction_id?: string } | undefined)?.transaction_id
          window.location.assign(txn ? `/success?_ptxn=${encodeURIComponent(txn)}` : "/success")
        }
      }
    })
      .then((p) => {
        if (!live) return
        if (!p) {
          setStatus("error")
          return
        }
        setPaddle(p)
        setStatus("ready")
        p.PricePreview({ items: [{ priceId, quantity: 1 }] })
          .then((res) => {
            if (live) {
              setPrice(res.data.details.lineItems[0]?.formattedTotals.total ?? null)
            }
          })
          .catch(() => {
            /* leave price null; the button still works at the checkout price */
          })
      })
      .catch(() => live && setStatus("error"))
    return () => {
      live = false
    }
  }, [priceId])

  function open() {
    paddle?.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      settings: {
        displayMode: "overlay",
        variant: "one-page",
        theme: "dark"
        // Deliberately NO successUrl: Paddle's redirect drops the transaction
        // id, which the download gate requires. The checkout.completed handler
        // above navigates instead, carrying ?_ptxn=<id>.
      }
    })
  }

  return { status, open, ready: status === "ready", price }
}
