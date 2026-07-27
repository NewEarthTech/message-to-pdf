import { LICENSE_URL, SOURCE_URL, SUPPORT_EMAIL } from "@msg2pdf/ui"

// One definition per question, feeding three places: the FAQ page, the short
// list on the home page, and the FAQPage structured data. `a` is the plain text
// a search engine gets; `html` is the same answer with links, rendered with
// set:html where the page wants it.
//
// Ten questions in one flat list is a wall, so they carry a group and the page
// renders one hairline per group rather than ten.
export type FaqGroup = "Privacy and permissions" | "What it exports" | "Open source and buying"

export const FAQ_GROUPS: FaqGroup[] = [
  "Privacy and permissions",
  "What it exports",
  "Open source and buying"
]

export interface FaqItem {
  q: string
  a: string
  group: FaqGroup
  html?: string
  /** Shown in the short list on the home page. */
  onHome?: boolean
}

const link = (href: string, text: string) =>
  `<a class="border-b border-[#93735a]/45 pb-px text-[#cba980] transition-colors hover:border-[#cba980]" href="${href}">${text}</a>`

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Why does Message to PDF need Full Disk Access?",
    group: "Privacy and permissions",
    onHome: true,
    a: "macOS treats your Messages database as private, even from you. Full Disk Access is the switch Apple provides to grant that permission. The app uses it only to read your messages on your Mac so it can build the PDF. It does not upload anything, and you can revoke the access any time in System Settings."
  },
  {
    q: "Is it actually private?",
    group: "Privacy and permissions",
    onHome: true,
    a: "Yes. The app runs entirely on your Mac. It has no account, no analytics, no telemetry, and makes no network calls of its own, so your conversations never leave your computer. The only data that goes anywhere is what you type into checkout, which is handled by our reseller, Paddle. And because the app is open source, you do not have to take our word for any of this. The code is public."
  },
  {
    q: "Do you see my messages if I ask for support?",
    group: "Privacy and permissions",
    a: "No. Support is just email between you and us. Nothing about your conversations is ever sent to us, so there is nothing for us to see."
  },
  {
    q: "What does it export, exactly?",
    group: "What it exports",
    a: "A PDF that mirrors the conversation: message bubbles in reading order, photos and image attachments inline, contact names, timestamps, read receipts, and tapbacks attached to the message they reacted to. It handles both iMessage (blue) and SMS (green). You can export the full history or narrow it to a date range."
  },
  {
    q: "Does it do group chats?",
    group: "What it exports",
    onHome: true,
    a: "Not yet. It currently exports one-on-one conversations, iMessage and SMS both. Group chats are on the list."
  },
  {
    q: "Which Macs are supported?",
    group: "What it exports",
    onHome: true,
    a: "It is a universal app: it runs natively on both Apple Silicon and Intel Macs, on macOS 11 (Big Sur) and later. It is signed and notarized by Apple, so it opens with a double click."
  },
  {
    q: "Is it open source? Where is the code?",
    group: "Open source and buying",
    a: "Message to PDF is free software under the GNU GPL v3 or, at your option, any later version. You can read every line, audit it, or build it yourself. The source lives on GitHub. Paying gets you the signed, notarized, ready to run build and supports the work.",
    html: `Message to PDF is free software under the ${link(LICENSE_URL, "GNU GPL v3")} or, at your option, any later version. You can read every line, audit it, or build it yourself. The source lives on ${link(SOURCE_URL, "GitHub")}. Paying gets you the signed, notarized, ready to run build and supports the work.`
  },
  {
    q: "If it is open source, why pay?",
    group: "Open source and buying",
    a: "You are paying for the finished thing: a build that is signed and notarized by Apple so it opens with a double click, kept up to date, and made by someone you can email. It is the same reason people buy software they could technically compile themselves: convenience, trust, and supporting the maker."
  },
  {
    q: "How do I get it after I buy?",
    group: "Open source and buying",
    a: "Checkout is handled by Paddle. As soon as your payment goes through you get a download link on the confirmation page and a copy by email, along with your receipt. Download the DMG, drag the app to your Applications folder, and open it. The link keeps working, so you can re-download later from the same email."
  },
  {
    q: "What about refunds?",
    group: "Open source and buying",
    a: `If it is not for you, email ${SUPPORT_EMAIL} within 14 days and we will refund you, no complicated questions. See the Refund Policy for details.`,
    html: `If it is not for you, email ${link(`mailto:${SUPPORT_EMAIL}`, SUPPORT_EMAIL)} within 14 days and we will refund you, no complicated questions. See the ${link("/refund", "Refund Policy")} for details.`
  }
]
