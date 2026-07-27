import { A, H2, LegalLayout, P } from "@/components/legal-layout"

import { SUPPORT_EMAIL } from "@/paddle-config"

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" effective="July 26, 2026">
      <P>
        New Earth Technologies ("we") respects your privacy. This policy explains what we do, and
        importantly do not, collect.
      </P>

      <H2>1. The app does not collect your messages</H2>
      <P>
        Our software, Message to PDF, runs entirely on your Mac. It reads your local Messages
        database and attachments only to build the PDF you asked for, and writes that PDF to the
        folder you choose. Your messages, attachments, and the PDFs you create never leave your
        computer. We do not upload, transmit, receive, store, or have any access to your message
        content or the files you export. The app requests macOS Full Disk Access only so it can read
        your local Messages database on your own machine.
      </P>

      <H2>2. Information the website collects</H2>
      <P>
        We do not use third-party analytics, advertising, or tracking cookies on message-to-pdf.com.
        Our hosting provider (Amazon Web Services) may keep standard server request logs, such as IP
        addresses, for security and operations. If you email us, we receive the information you send
        (such as your email address and message) so we can reply. We do not sell your personal
        information.
      </P>

      <H2>3. Payments</H2>
      <P>
        Purchases are processed by <A href="https://www.paddle.com">Paddle</A>, our Merchant of
        Record, which acts as the data controller for the payment information it collects at
        checkout (such as your name, billing address, and payment details). We receive only limited
        transaction information (such as a confirmation and the country, for tax purposes). See{" "}
        <A href="https://www.paddle.com/legal/privacy">Paddle's privacy notice</A> for how they
        handle your data.
      </P>

      <H2>4. Your rights and contact</H2>
      <P>
        Depending on where you live, you may have rights to access, correct, or delete personal
        information we hold about you. To exercise them, or for any privacy question, email{" "}
        <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A>. We may update this policy and will
        post changes here with a new effective date.
      </P>
    </LegalLayout>
  )
}
