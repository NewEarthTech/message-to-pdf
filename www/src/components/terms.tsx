import { A, H2, LegalLayout, P } from "@/components/legal-layout"

import { SUPPORT_EMAIL } from "@/paddle-config"

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" effective="July 26, 2026">
      <P>
        These Terms of Service ("Terms") govern your use of the website at message-to-pdf.com (the
        "Site") and your purchase and use of our macOS software application, Message to PDF (the
        "Software"), each provided by New Earth Technologies ("we", "us"), a California corporation.
        New Earth Technologies is the registered California name of John Carmack Corp. (California
        entity no. 5851872). By using the Site or purchasing the Software, you agree to these Terms.
      </P>

      <H2>1. The Software and its license</H2>
      <P>
        The Software exports your iMessage and SMS conversations to PDF files entirely on your own
        computer. It is free and open-source software, licensed to you under the GNU General Public
        License, version 3 or (at your option) any later version ("GPL-3.0-or-later"). A copy of the
        license is included with the Software and is available at{" "}
        <A href="https://www.gnu.org/licenses/gpl-3.0.html">gnu.org</A>.
      </P>
      <P>
        Your rights to use, copy, modify, and redistribute the Software are governed solely by
        GPL-3.0-or-later. Nothing in these Terms limits, and these Terms shall not be read to limit,
        any right granted to you under that license, including your right to receive the source code
        and to redistribute the Software. The purchase price pays for a packaged, ready-to-run build
        and supports the project; it does not change the Software's license.
      </P>

      <H2>2. Purchases, pricing, and payment processing</H2>
      <P>
        The Software is offered for a one-time price of $29.00 USD (applicable taxes may be added at
        checkout). Purchases are sold and processed by <A href="https://www.paddle.com">Paddle</A>{" "}
        as our reseller and Merchant of Record. When you buy, your transaction is also subject to
        Paddle's Buyer Terms and Refund Policy, shown at checkout. Paddle handles payment, billing,
        and tax collection; we do not receive or store your full payment card details.
      </P>

      <H2>3. Refunds</H2>
      <P>
        We offer a 14-day refund on the Software. See our <A href="/refund">Refund Policy</A> for
        details.
      </P>

      <H2>4. Acceptable use of the Site</H2>
      <P>
        You agree not to misuse the Site, for example by attempting to disrupt it, gain unauthorized
        access, or use it to break the law. The Site's own content (text, branding, and layout,
        excluding the open-source Software) belongs to New Earth Technologies or its licensors.
      </P>

      <H2>5. Disclaimer of warranty</H2>
      <P>
        The Site is provided "as is." Consistent with GPL-3.0-or-later, the Software is provided
        without warranty of any kind, to the extent permitted by law. We do not warrant that the
        Site or Software will be uninterrupted or error-free.
      </P>

      <H2>6. Limitation of liability</H2>
      <P>
        To the maximum extent permitted by law, New Earth Technologies will not be liable for any
        indirect, incidental, or consequential damages arising from your use of the Site or
        Software. Nothing in these Terms excludes liability that cannot be excluded under applicable
        law.
      </P>

      <H2>7. Changes and contact</H2>
      <P>
        We may update these Terms; material changes will be posted on this page with a new effective
        date. Questions? Email <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A>. These Terms
        are governed by the laws of the State of California, USA.
      </P>
    </LegalLayout>
  )
}
