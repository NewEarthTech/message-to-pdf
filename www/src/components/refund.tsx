import { A, H2, LegalLayout, P } from "@/components/legal-layout"

import { SUPPORT_EMAIL } from "@/paddle-config"

export default function Refund() {
  return (
    <LegalLayout title="Refund Policy" effective="July 26, 2026">
      <P>We want you to be happy with Message to PDF.</P>

      <H2>14-day refunds</H2>
      <P>
        If Message to PDF isn't right for you, you can request a full refund within 14 days of your
        purchase. Just email <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A> from the
        address you used to buy, or reply to your Paddle receipt. We'll approve it, no complicated
        questions asked.
      </P>

      <H2>How refunds are processed</H2>
      <P>
        The Software is sold through <A href="https://www.paddle.com">Paddle</A>, our Merchant of
        Record. Refunds are issued by Paddle to your original payment method and typically appear
        within 5 to 10 business days, depending on your bank. You can also request a refund directly
        through the link in your Paddle purchase receipt.
      </P>

      <H2>Questions</H2>
      <P>
        Email <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A> and we'll help.
      </P>
    </LegalLayout>
  )
}
