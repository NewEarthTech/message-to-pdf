import { LICENSE_URL, SELLER_LEGAL, SELLER_NAME, SITE_URL } from "@msg2pdf/ui"

import { FAQ_ITEMS } from "@/data/faq"

// Stable @id values so the nodes on different pages describe one product and
// one company rather than a new pair per URL. Search engines and answer engines
// both dedupe on these.
const PRODUCT_ID = `${SITE_URL}/#product`
const ORG_ID = `${SITE_URL}/#organization`

// The product, described once. The home and pricing pages both emit it, so
// describing it in two places would let the two drift.
export function softwareApplication() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": PRODUCT_ID,
    name: "Message to PDF",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "macOS 11.0 or later",
    url: SITE_URL,
    description:
      "A macOS app that exports an iMessage or SMS conversation to a clean, printable PDF, entirely on your own device.",
    license: LICENSE_URL,
    softwareHelp: `${SITE_URL}/faq`,
    publisher: { "@id": ORG_ID },
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

// Who is behind the product. Emitted on the home page only: one authoritative
// node, referenced by @id everywhere else.
export function organization() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SELLER_NAME,
    legalName: SELLER_LEGAL,
    url: "https://newearth.llc",
    brand: { "@id": PRODUCT_ID }
  }
}

export interface QuestionAnswer {
  q: string
  a: string
}

// Defaults to the site-wide FAQ; the use-case pages pass their own questions so
// the structured data matches the answers actually rendered on that page.
export function faqPage(items: QuestionAnswer[] = FAQ_ITEMS) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a }
    }))
  }
}

// Home > page. Two levels is the whole hierarchy of this site, so the trail is
// derived rather than declared per page.
export function breadcrumbs(path: string, name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name, item: `${SITE_URL}${path}` }
    ]
  }
}

// A guide page, tied back to the product it is about. `about` is what lets an
// answer engine connect the question the page answers to the thing that answers
// it, without restating the product on every page.
export function guidePage({
  path,
  headline,
  description
}: {
  path: string
  headline: string
  description: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE_URL}${path}`,
    url: `${SITE_URL}${path}`,
    name: headline,
    description,
    isPartOf: { "@type": "WebSite", url: SITE_URL, name: "Message to PDF" },
    about: { "@id": PRODUCT_ID },
    publisher: { "@id": ORG_ID }
  }
}
