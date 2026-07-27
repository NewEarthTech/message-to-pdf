import type { ReactNode } from "react"

import { A } from "@/components/legal-layout"
import { SUPPORT_EMAIL } from "@/paddle-config"

// Plain-text answers live here so the same wording feeds both the rendered page
// and the FAQPage structured data in the prerendered head. `body` carries the
// linked version for display; `a` is the text a search engine gets.
//
// Ten questions in one flat list is a wall. They cluster into three things
// people actually worry about, so the page is grouped and each cluster carries
// one hairline rather than ten.
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
  body?: ReactNode
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Why does Message to PDF need Full Disk Access?",
    group: "Privacy and permissions",
    a: "macOS treats your Messages database as private, even from you. Full Disk Access is the switch Apple provides to grant that permission. The app uses it only to read your messages on your Mac so it can build the PDF. It does not upload anything, and you can revoke the access any time in System Settings."
  },
  {
    q: "Is it actually private?",
    group: "Privacy and permissions",
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
    a: "Not yet. It currently exports one-on-one conversations. Group chats are on the list."
  },
  {
    q: "Which Macs are supported?",
    group: "What it exports",
    a: "It is a universal app: it runs natively on both Apple Silicon and Intel Macs, on macOS 11 (Big Sur) and later."
  },
  {
    q: "Is it open source? Where is the code?",
    group: "Open source and buying",
    a: "Message to PDF is free software under the GNU GPL v3 or, at your option, any later version. You can read every line, audit it, or build it yourself. The source lives on GitHub. Paying gets you the signed, notarized, ready to run build and supports the work.",
    body: (
      <>
        Message to PDF is free software under the{" "}
        <A href="https://www.gnu.org/licenses/gpl-3.0.html">GNU GPL v3</A> or, at your option, any
        later version. You can read every line, audit it, or build it yourself. The source lives on{" "}
        <A href="https://github.com/NewEarthTech/message-to-pdf">GitHub</A>. Paying gets you the
        signed, notarized, ready to run build and supports the work.
      </>
    )
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
    body: (
      <>
        If it is not for you, email <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A> within
        14 days and we will refund you, no complicated questions. See the{" "}
        <A href="/refund">Refund Policy</A> for details.
      </>
    )
  }
]

export default function Faq() {
  return (
    <main className="px-6 py-16 md:px-10">
      <div className="mx-auto max-w-[46rem]">
        <h1 className="font-[680] text-[clamp(1.9rem,4vw,2.4rem)] tracking-[-0.03em]">
          Frequently asked questions
        </h1>

        {FAQ_GROUPS.map((group) => (
          <section className="mt-12 first:mt-10" key={group}>
            <h2 className="border-[#93735a]/45 border-b pb-3 font-[620] text-[#cba980] text-[1.05rem]">
              {group}
            </h2>
            <div className="mt-2">
              {FAQ_ITEMS.filter((item) => item.group === group).map((item) => (
                <div className="py-6" key={item.q}>
                  <h3 className="font-[620] text-[#f5f3ef] text-[1.02rem]">{item.q}</h3>
                  <p className="mt-2.5 text-[#f5f3ef]/70 leading-[1.65]">{item.body ?? item.a}</p>
                </div>
              ))}
            </div>
          </section>
        ))}

        <p className="mt-10 border-[#93735a]/25 border-t pt-8 text-[#f5f3ef]/65 text-sm">
          Still stuck? Email <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A> and a person
          will answer.
        </p>
      </div>
    </main>
  )
}
