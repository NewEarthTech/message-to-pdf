// Single-line desktop nav, 64px tall. The buy CTA carries the same label
// everywhere on the site ("Get it for $29") so there is one purchase intent,
// not three competing ones.
export function Header() {
  return (
    <header className="sticky top-0 z-20 border-[#93735a]/25 border-b bg-[#3a3a38]/85 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex h-16 w-full max-w-[1140px] items-center justify-between px-6 md:px-10">
        <a
          className="flex items-center gap-2.5 font-semibold text-[1.05rem] tracking-[-0.01em]"
          href="/"
        >
          <img
            src="/icon.svg"
            alt=""
            aria-hidden="true"
            className="aspect-square h-7 w-7"
            width={28}
            height={28}
          />
          <span>Message to PDF</span>
        </a>
        <nav className="flex items-center gap-6 text-[#f5f3ef]/70 text-sm">
          <a className="hidden transition-colors hover:text-[#f5f3ef] sm:inline" href="/#how">
            How it works
          </a>
          <a className="hidden transition-colors hover:text-[#f5f3ef] sm:inline" href="/faq">
            FAQ
          </a>
          <a
            className="whitespace-nowrap rounded-full bg-[#cba980] px-4 py-2 font-semibold text-[#23231f] text-sm transition-opacity hover:opacity-90 active:translate-y-px"
            href="/pricing"
          >
            Get it for $29
          </a>
        </nav>
      </div>
    </header>
  )
}
