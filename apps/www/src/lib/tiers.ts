// Editable product config: the one place to change what is for sale.
//
// Message to PDF is a single ONE-TIME product, so there is one tier, a flat
// one-time price per Paddle environment, and no billing cycle. Price ids are
// catalog ids (not secret), and are the same ids the sibling site sells.
export interface Tier {
  name: string
  description: string
  features: string[]
  priceId: { sandbox: string; production: string }
}

export const TIER: Tier = {
  name: "Message to PDF",
  description:
    "A macOS app that exports an iMessage or SMS conversation to a clean, printable PDF, entirely on your own device.",
  features: [
    "Universal macOS app, Apple Silicon and Intel, macOS 11 and later",
    "Signed and notarized by Apple, so it opens with a double click",
    "One time. No subscription, no account, no license key",
    "Runs locally. Your messages never leave your Mac",
    "Free software under GPL-3.0-or-later, source on GitHub"
  ],
  priceId: {
    sandbox: "pri_01ky33v58pn8e4yjksjvzf7mhy",
    production: "pri_01ky3jejabnq1c30r78fq1h694"
  }
}
