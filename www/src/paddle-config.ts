// Paddle configuration, read from environment variables and validated LOUDLY.
//
// Nothing is silently defaulted: if VITE_PADDLE_ENV or VITE_PADDLE_CLIENT_TOKEN
// is missing (or mismatched), the app throws at load rather than risk running
// against the wrong Paddle account. The client-side token is public-safe (Paddle
// designs it to ship in frontend JS) but still lives in env, not source, so the
// environment and its token are always chosen together at build time. Price ids
// live in `tiers.ts` (they are catalog ids, and editable there).

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local for local dev, or set it in the deploy workflow for CI.`
    )
  }
  return value
}

const ENV = required("VITE_PADDLE_ENV", import.meta.env.VITE_PADDLE_ENV)
if (ENV !== "sandbox" && ENV !== "production") {
  throw new Error(`VITE_PADDLE_ENV must be "sandbox" or "production", got "${ENV}".`)
}
export const PADDLE_ENV: "sandbox" | "production" = ENV

export const PADDLE_CLIENT_TOKEN = required(
  "VITE_PADDLE_CLIENT_TOKEN",
  import.meta.env.VITE_PADDLE_CLIENT_TOKEN
)

// Guard the token against the environment so a sandbox token can never ship to
// production, or vice versa, unnoticed (sandbox tokens are `test_`, live `live_`).
const expectedPrefix = PADDLE_ENV === "sandbox" ? "test_" : "live_"
if (!PADDLE_CLIENT_TOKEN.startsWith(expectedPrefix)) {
  throw new Error(
    `VITE_PADDLE_CLIENT_TOKEN must start with "${expectedPrefix}" for the "${PADDLE_ENV}" environment.`
  )
}

// The entitlement-gated download endpoint. The thank-you page links here with
// ?_ptxn=<txn>; that endpoint verifies the transaction against the Paddle API
// and redirects to a short-lived signed CloudFront URL. The DMG has no public
// read path, so no verified purchase means no URL. Injected at build via
// `VITE_DOWNLOAD_ENDPOINT`; `||` (not `??`) so an empty CI variable renders the
// "not wired yet" notice rather than a broken href.
export const DOWNLOAD_ENDPOINT = import.meta.env.VITE_DOWNLOAD_ENDPOINT || ""

export const SUPPORT_EMAIL = "sales@newearth.llc"
