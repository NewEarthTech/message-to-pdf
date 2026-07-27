import { SUPPORT_EMAIL } from "@/paddle-config"

// Seller identity lives here in full. A payment processor reviewing this site
// looks for exactly this: who is selling, under what legal entity, how to reach
// them, and where the policies are.
export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-auto border-[#93735a]/25 border-t py-10 text-[#f5f3ef]/55 text-sm">
      <div className="mx-auto w-full max-w-[1140px] px-6 md:px-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-[38ch] space-y-2">
            <p className="font-medium text-[#f5f3ef]/80">Message to PDF</p>
            <p>
              Sold by New Earth Technologies, the registered California name of John Carmack Corp.
              (California entity no. 5851872). Payments are processed by Paddle as Merchant of
              Record.
            </p>
          </div>
          <nav className="flex flex-col gap-2.5 sm:text-right">
            <a className="transition-colors hover:text-[#f5f3ef]" href="/pricing">
              Pricing
            </a>
            <a className="transition-colors hover:text-[#f5f3ef]" href="/faq">
              FAQ
            </a>
            <a className="transition-colors hover:text-[#f5f3ef]" href="/terms">
              Terms of Service
            </a>
            <a className="transition-colors hover:text-[#f5f3ef]" href="/privacy">
              Privacy Policy
            </a>
            <a className="transition-colors hover:text-[#f5f3ef]" href="/refund">
              Refund Policy
            </a>
            <a
              className="transition-colors hover:text-[#f5f3ef]"
              href="https://github.com/NewEarthTech/message-to-pdf"
              target="_blank"
              rel="noreferrer"
            >
              Source code
            </a>
            <a className="transition-colors hover:text-[#f5f3ef]" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </nav>
        </div>
        <p className="mt-9 border-[#93735a]/20 border-t pt-6 text-[#f5f3ef]/45 text-xs">
          © {year} New Earth Technologies. Message to PDF is free software under GPL-3.0-or-later.
          Apple, macOS, and iMessage are trademarks of Apple Inc., which does not sponsor or endorse
          this app.
        </p>
      </div>
    </footer>
  )
}
