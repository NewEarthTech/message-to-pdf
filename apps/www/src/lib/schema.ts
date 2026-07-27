import { LICENSE_URL, SELLER_NAME, SITE_URL } from "@msg2pdf/ui"

import { FAQ_ITEMS } from "@/data/faq"

// The product, described once. The home and pricing pages both emit it, so
// describing it in two places would let the two drift.
export function softwareApplication() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Message to PDF",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "macOS 11.0 or later",
    url: SITE_URL,
    description:
      "A macOS app that exports an iMessage or SMS conversation to a clean, printable PDF, entirely on your own device.",
    license: LICENSE_URL,
    softwareHelp: `${SITE_URL}/faq`,
    offers: {
      "@type": "Offer",
      price: "29.00",
      priceCurrency: "USD",
      url: `${SITE_URL}/pricing`,
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: SELLER_NAME, url: "https://newearth.llc" }
    }
  }
}

export function faqPage() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a }
    }))
  }
}
