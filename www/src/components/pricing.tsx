import { A } from "@/components/legal-layout"

import { PADDLE_ENV, SUPPORT_EMAIL } from "@/paddle-config"
import { TIER } from "@/tiers"
import { usePaddleCheckout } from "@/use-paddle"

export default function Pricing() {
  const checkout = usePaddleCheckout(TIER.priceId[PADDLE_ENV])

  return (
    <main className="px-6 py-16 md:px-10">
      <div className="mx-auto max-w-[46rem]">
        {PADDLE_ENV === "sandbox" && (
          <p className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200/90 text-xs">
            Sandbox build: test cards only, no real charge. Use a Paddle{" "}
            <A href="https://developer.paddle.com/sdks/sandbox#test-cards">sandbox test card</A>{" "}
            (the standard 4242 card), any future expiry, any CVC.
          </p>
        )}

        <h1 className="font-[680] text-[clamp(2rem,4.5vw,2.6rem)] tracking-[-0.03em]">
          One price, one payment.
        </h1>
        <p className="mt-3 max-w-[52ch] text-[#f5f3ef]/70">
          No subscription and no account. Prices are shown in your local currency, tax included
          where it applies.
        </p>

        <div className="mt-10 rounded-2xl border border-[#93735a]/40 bg-[#403f3c] px-7 py-8 sm:px-9">
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
              14-day refund, see our <A href="/refund">Refund Policy</A>
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
              <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A> and we will send you a link.
            </p>
          )}
        </div>

        <p className="mt-6 text-[#f5f3ef]/65 text-xs leading-relaxed">
          Sold by New Earth Technologies through <A href="https://www.paddle.com">Paddle</A>, our
          reseller and Merchant of Record. By purchasing you agree to our{" "}
          <A href="/terms">Terms of Service</A> and <A href="/privacy">Privacy Policy</A>. The app
          itself is licensed to you under GPL-3.0-or-later.
        </p>
      </div>
    </main>
  )
}
