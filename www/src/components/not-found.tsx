export default function NotFound() {
  return (
    <main className="px-6 py-24 md:px-10">
      <div className="mx-auto max-w-[46rem]">
        <h1 className="font-[680] text-[clamp(1.9rem,4vw,2.4rem)] tracking-[-0.03em]">
          That page does not exist.
        </h1>
        <p className="mt-3 max-w-[52ch] text-[#f5f3ef]/70">
          The link may be out of date. Everything lives off the home page.
        </p>
        <a
          className="mt-8 inline-block whitespace-nowrap rounded-full bg-[#cba980] px-6 py-3 font-semibold text-[#23231f] transition-opacity hover:opacity-90 active:translate-y-px"
          href="/"
        >
          Back to Message to PDF
        </a>
      </div>
    </main>
  )
}
