# Sheaf landing page

Static, dependency-free marketing site for Sheaf. Plain HTML + one CSS file — deploy anywhere (S3/CloudFront, Netlify, Vercel static, GitHub Pages). No build step.

```
site/
  index.html      home — hero, features, how-it-works, pricing, Paddle checkout
  faq.html        Full Disk Access, privacy, GPL/source, refunds, scope
  privacy.html    the "your messages never leave your Mac" commitment
  terms.html      terms of sale + 14-day refund + GPL license
  style.css       shared styles (brand indigo #3a54d6)
  assets/
    icon.png          app icon (1024)
    screenshot-app.png  hero product shot — rendered from the SYNTHETIC FIXTURE only
```

## Before anything ships — needs John

- **All prose is a draft for your review.** Honest, non-hypey, privacy-forward. The two hero lines (`index.html` `<h1>` + `.sub`) are the spots that most want a **/john-voice** pass — everything else is functional/legal copy that should stay plain.
- **Support email:** `sales@newearth.llc` (live) — wired into `terms.html` (contact + refund) and `faq.html` (refund).
- **Placeholder to fill:** the source-repo URL, if the GitHub repo gets renamed from `message-to-pdf`.

## Paddle checkout (sandbox → live)

`index.html` loads Paddle.js v2 and wires every `[data-buy]` button to the overlay checkout. Two values, injected at deploy time, **never committed**:

- `PADDLE_CLIENT_TOKEN` — Paddle's client-side token (safe to expose in the browser; it is *not* the secret API key).
- `PADDLE_PRICE_ID` — the $29 one-time price.

Until real values are dropped in, the buttons show a friendly "not wired up yet" notice instead of failing silently. Flow: sandbox values first (test the full purchase), then `Paddle.Environment.set("sandbox")` → `"production"` and the live token/price at launch.

**Critical (per launch plan):** the Paddle product's presented license must be **GPL-3.0-or-later**, overriding Paddle's default "no redistribution" EULA — they legally conflict (GPL §10). This is configured in the Paddle dashboard (the sidework bot's task), not here.

## Screenshots — fixture only, always

`screenshot-app.png` is a faithful mockup of the app rendered with the **synthetic fixture** conversations (Alex Rivera / Sam Chen). Real `chat.db` content must NEVER appear on the site. Regenerate/extend shots from the fixture only.

## Do not deploy

Deploying the site to its domain is John's call at launch. This is a reviewable draft.
