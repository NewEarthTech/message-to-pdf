import { SUPPORT_EMAIL } from "@msg2pdf/ui"

import { PADDLE_ENV } from "@/lib/paddle-config"
import { TIER } from "@/lib/tiers"
import { usePaddleCheckout } from "@/lib/use-paddle"

// One of only two islands on the site. Everything around it is static HTML; this
// needs the browser because Paddle.js fetches the localized price and opens the
// overlay.
const linkClass =
  "text-[#f5f3ef] underline underline-offset-2 transition-colors hover:text-[#cba980]"

export default function Checkout() {
  const checkout = usePaddleCheckout(TIER.priceId[PADDLE_ENV])

  return (
    <>
      {PADDLE_ENV === "sandbox" && (
        <p className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200/90 text-xs">
          Sandbox build: test cards only, no real charge. Use a Paddle{" "}
          <a
            className={linkClass}
            href="https://developer.paddle.com/sdks/sandbox#test-cards"
            target="_blank"
            rel="noreferrer"
          >
            sandbox test card
          </a>{" "}
          (the standard 4242 card), any future expiry, any CVC.
        </p>
      )}

      <div className="rounded-2xl border border-[#93735a]/40 bg-[#403f3c] px-7 py-8 sm:px-9">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-[640] text-2xl">{TIER.name}</h2>
          <div className="text-right">
            <div className="font-[680] text-3xl">{checkout.price ?? "$29.00"}</div>
            <div className="text-[#f5f3ef]/65 text-xs">one time, incl. tax</div>
          </div>
        </div>
        <p className="mt-4 max-w-[52ch] text-[#f5f3ef]/70 text-sm leading-relaxed">
          {TIER.description}
        </p>
        <ul className="mt-7 space-y-2.5 text-[#f5f3ef]/75 text-sm">
          {TIER.features.map((feature) => (
            <li className="flex gap-3" key={feature}>
              <span aria-hidden="true" className="text-[#cba980]">
                &bull;
              </span>
              {feature}
            </li>
          ))}
          <li className="flex gap-3">
            <span aria-hidden="true" className="text-[#cba980]">
              &bull;
            </span>
            <span>
              14-day refund, see our{" "}
              <a className={linkClass} href="/refund">
                Refund Policy
              </a>
            </span>
          </li>
        </ul>

        <button
          type="button"
          onClick={checkout.open}
          disabled={!checkout.ready}
          className="mt-9 w-full rounded-full bg-[#cba980] px-6 py-3.5 font-semibold text-[#23231f] transition-opacity hover:opacity-90 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
        >
          {checkout.ready
            ? `Get it for ${checkout.price ?? "$29.00"}`
            : checkout.status === "error"
              ? "Checkout unavailable"
              : "Loading checkout..."}
        </button>
        {checkout.status === "error" && (
          <p className="mt-3 text-red-300/90 text-xs">
            Checkout could not load. Reload the page, or email{" "}
            <a className={linkClass} href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>{" "}
            and we will send you a link.
          </p>
        )}
      </div>
    </>
  )
}
