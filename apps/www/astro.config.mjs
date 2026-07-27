// @ts-check
import react from "@astrojs/react"
import sitemap from "@astrojs/sitemap"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"

// Validate the Paddle env/token pair at BUILD time, not in the visitor's
// browser. paddle-config.ts throws at page load on a mismatch, but by then a
// wrong-environment build has already shipped. Failing here keeps a
// sandbox-token production build (or vice versa) from ever leaving CI.
const paddleEnv = process.env.PUBLIC_PADDLE_ENV
const token = process.env.PUBLIC_PADDLE_CLIENT_TOKEN
if (paddleEnv !== "sandbox" && paddleEnv !== "production") {
  throw new Error(
    `PUBLIC_PADDLE_ENV must be "sandbox" or "production", got "${paddleEnv ?? ""}". ` +
      "Copy .env.example to .env for local dev; CI injects it in the deploy workflow."
  )
}
const expectedPrefix = paddleEnv === "sandbox" ? "test_" : "live_"
if (!token?.startsWith(expectedPrefix)) {
  throw new Error(
    `PUBLIC_PADDLE_CLIENT_TOKEN must start with "${expectedPrefix}" for the "${paddleEnv}" environment.`
  )
}

export default defineConfig({
  site: "https://message-to-pdf.com",
  // Canonicals and internal links are extensionless (/pricing, not /pricing/),
  // and the CloudFront function maps those onto each route's index.html.
  trailingSlash: "never",
  build: { format: "directory" },
  integrations: [react(), sitemap({ filter: (page) => !page.includes("/success") })],
  // Uncommon pinned port, strict so a taken port fails loudly instead of
  // silently shifting. 47611 belongs to the desktop app's dev server.
  server: { port: 47612 },
  vite: { plugins: [tailwindcss()] }
})
