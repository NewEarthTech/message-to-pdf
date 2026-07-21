import { getVersion } from "@tauri-apps/api/app"
import { openUrl } from "@tauri-apps/plugin-opener"
import { useEffect, useState } from "react"
import { CREDITS, LICENSE_URL, PRODUCT_NAME, PRODUCT_TAGLINE, SOURCE_URL } from "./product"

// An in-app About surface so buyers can reach the license, the source, and the
// third-party credits from inside the app — the GPL-3.0 compliance requirement.
// Dismissed with Escape or the Close button (both keyboard-accessible).
export function AboutDialog({ onClose }: { onClose: () => void }) {
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch(() => {})
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={`About ${PRODUCT_NAME}`}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold text-xl">{PRODUCT_NAME}</h2>
          {version && <span className="text-neutral-400 text-sm">v{version}</span>}
        </div>
        <p className="mt-1 text-neutral-500 text-sm">{PRODUCT_TAGLINE}</p>

        <div className="mt-5 space-y-3 text-sm">
          <p className="text-neutral-700">
            Free software under the{" "}
            <button
              type="button"
              className="text-blue-600 hover:underline"
              onClick={() => void openUrl(LICENSE_URL)}
            >
              GNU GPL v3 (or later)
            </button>
            .
          </p>
          <p>
            <button
              type="button"
              className="text-blue-600 hover:underline"
              onClick={() => void openUrl(SOURCE_URL)}
            >
              View source code
            </button>
          </p>
          <div className="rounded-md bg-neutral-50 p-3">
            <p className="font-medium text-neutral-500 text-xs uppercase tracking-wide">Built on</p>
            <ul className="mt-1 space-y-1">
              {CREDITS.map((c) => (
                <li key={c.name}>
                  <button
                    type="button"
                    className="text-blue-600 hover:underline"
                    onClick={() => void openUrl(c.url)}
                  >
                    {c.name}
                  </button>
                  <span className="text-neutral-500"> by {c.author} — GPL-3.0</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-neutral-100 px-4 py-2 font-medium text-neutral-700 text-sm hover:bg-neutral-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
