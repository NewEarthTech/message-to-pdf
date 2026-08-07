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
  integrations: [
    react(),
    sitemap({
      // /success is a post-purchase page reached with a transaction id. It has
      // nothing to rank for and should not be crawled, so it stays out.
      filter: (page) => !page.includes("/success"),
      changefreq: "monthly",
      // Weight the pages a buyer arrives on above the ones they read after they
      // have decided. Priority is a hint, not a ranking factor, but leaving
      // legal boilerplate at the same weight as the home page is the wrong hint.
      // Anything not listed is a use-case page and keeps the 0.8 default.
      serialize: (item) => {
        const priorities = new Map([
          ["", 1.0],
          ["/pricing", 0.9],
          ["/faq", 0.7],
          ["/terms", 0.3],
          ["/privacy", 0.3],
          ["/refund", 0.3]
        ])
        const path = new URL(item.url).pathname.replace(/\/$/, "")
        return { ...item, priority: priorities.get(path) ?? 0.8 }
      }
    })
  ],
  // Uncommon pinned port, strict so a taken port fails loudly instead of
  // silently shifting. 47611 belongs to the desktop app's dev server.
  server: { port: 47612 },
  vite: { plugins: [tailwindcss()] }
})
