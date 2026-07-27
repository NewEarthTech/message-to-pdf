import type { ReactNode } from "react"

// The page title and meta description are baked into each route's prerendered
// head (see src/routes.tsx), not set from an effect, so a crawler that does not
// run JavaScript still gets them.
export function LegalLayout({
  title,
  effective,
  children
}: {
  title: string
  effective: string
  children: ReactNode
}) {
  return (
    <main className="px-6 py-16 md:px-10">
      <article className="mx-auto max-w-[46rem] space-y-5 text-[#f5f3ef]/80 text-sm leading-relaxed">
        <div className="space-y-2">
          <h1 className="font-[680] text-[#f5f3ef] text-[clamp(1.9rem,4vw,2.4rem)] tracking-[-0.03em]">
            {title}
          </h1>
          <p className="text-[#f5f3ef]/65 text-xs">Effective {effective}</p>
        </div>
        {children}
        <p className="pt-8 text-[#f5f3ef]/65 text-xs">
          <a
            className="underline underline-offset-2 transition-colors hover:text-[#f5f3ef]"
            href="/"
          >
            Back to Message to PDF
          </a>
        </p>
      </article>
    </main>
  )
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="pt-6 font-[620] text-[#f5f3ef] text-lg">{children}</h2>
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-[#f5f3ef]/80">{children}</p>
}

export function A({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("http")
  return (
    <a
      className="text-[#f5f3ef] underline underline-offset-2 transition-colors hover:text-[#cba980]"
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {children}
    </a>
  )
}
