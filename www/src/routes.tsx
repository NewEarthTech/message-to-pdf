import type { ReactNode } from "react"

import Faq, { FAQ_ITEMS } from "@/components/faq"
import Home from "@/components/home"
import NotFound from "@/components/not-found"
import Pricing from "@/components/pricing"
import Privacy from "@/components/privacy"
import Refund from "@/components/refund"
import Success from "@/components/success"
import Terms from "@/components/terms"

export const SITE_URL = "https://message-to-pdf.com"

export interface Route {
  path: string
  title: string
  description: string
  /** Kept out of the sitemap and marked noindex. */
  noindex?: boolean
  /** JSON-LD emitted into the prerendered head. */
  jsonLd?: () => object
  render: () => ReactNode
}

// The product itself, described once. Reused by the home and pricing pages so
// the two never drift apart.
function softwareApplication() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Message to PDF",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "macOS 11.0 or later",
    url: SITE_URL,
    description:
      "A macOS app that exports an iMessage or SMS conversation to a clean, printable PDF, entirely on your own device.",
    license: "https://www.gnu.org/licenses/gpl-3.0.html",
    softwareHelp: `${SITE_URL}/faq`,
    offers: {
      "@type": "Offer",
      price: "29.00",
      priceCurrency: "USD",
      url: `${SITE_URL}/pricing`,
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "New Earth Technologies",
        url: "https://newearth.llc"
      }
    }
  }
}

export const ROUTES: Route[] = [
  {
    path: "/",
    title: "iMessage to PDF for Mac | Message to PDF",
    description:
      "Message to PDF turns your iMessage and SMS history into a clean, printable PDF, entirely on your Mac. Nothing gets uploaded. $29, one time.",
    jsonLd: softwareApplication,
    render: () => <Home />
  },
  {
    path: "/pricing",
    title: "Pricing, $29 one time | Message to PDF",
    description:
      "Message to PDF costs $29 once. No subscription, no account, no license key. 14-day refund, sold through Paddle as Merchant of Record.",
    jsonLd: softwareApplication,
    render: () => <Pricing />
  },
  {
    path: "/faq",
    title: "FAQ | Message to PDF",
    description:
      "Full Disk Access, privacy, open source, refunds, group chats, and exactly what Message to PDF exports from your iMessage history.",
    jsonLd: () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a }
      }))
    }),
    render: () => <Faq />
  },
  {
    path: "/terms",
    title: "Terms of Service | Message to PDF",
    description:
      "Terms of Service for Message to PDF, sold by New Earth Technologies through Paddle, and licensed under GPL-3.0-or-later.",
    render: () => <Terms />
  },
  {
    path: "/privacy",
    title: "Privacy Policy | Message to PDF",
    description:
      "Message to PDF runs entirely on your Mac. Your messages, attachments, and exported PDFs never leave your computer, and we never receive them.",
    render: () => <Privacy />
  },
  {
    path: "/refund",
    title: "Refund Policy | Message to PDF",
    description:
      "A full refund within 14 days of purchase, issued by Paddle to your original payment method. Email us and we will approve it.",
    render: () => <Refund />
  },
  {
    path: "/success",
    title: "Thank you | Message to PDF",
    description: "Your Message to PDF download.",
    noindex: true,
    render: () => <Success />
  }
]

export const NOT_FOUND: Route = {
  path: "/404",
  title: "Page not found | Message to PDF",
  description: "That page does not exist.",
  noindex: true,
  render: () => <NotFound />
}

export function matchRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, "") || "/"
  if (path === "/refunds") return ROUTES.find((r) => r.path === "/refund") ?? NOT_FOUND
  return ROUTES.find((r) => r.path === path) ?? NOT_FOUND
}
