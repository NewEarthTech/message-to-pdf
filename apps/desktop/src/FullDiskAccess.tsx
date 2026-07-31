import { openUrl } from "@tauri-apps/plugin-opener"
import { PRODUCT_NAME } from "./product"

// Deep-links straight to System Settings › Privacy & Security › Full Disk Access.
const FDA_SETTINGS_URL = "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"

type Props = {
  access: "denied" | "missing"
  onRecheck: () => void
}

export function FullDiskAccess({ access, onRecheck }: Props) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        {access === "missing" ? (
          <>
            <h2 className="font-semibold text-lg">No Messages database found</h2>
            <p className="mt-2 text-neutral-600 text-sm dark:text-neutral-300">
              {PRODUCT_NAME} couldn't find a{" "}
              <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-700">chat.db</code> at
              the expected location. If your messages live elsewhere, you can point the app at a
              copy.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-semibold text-lg">Full Disk Access needed</h2>
            <p className="mt-2 text-neutral-600 text-sm dark:text-neutral-300">
              macOS keeps your Messages database private. To read your conversations, {PRODUCT_NAME}{" "}
              needs Full Disk Access. Everything stays on your Mac — nothing is uploaded.
            </p>
            <ol className="mt-4 list-decimal space-y-1 pl-5 text-neutral-600 text-sm dark:text-neutral-300">
              <li>Open System Settings → Privacy &amp; Security → Full Disk Access.</li>
              <li>Turn on the switch for {PRODUCT_NAME}.</li>
              <li>Come back — this screen updates on its own.</li>
            </ol>
          </>
        )}
        <div className="mt-5 flex gap-2">
          {access === "denied" && (
            <button
              type="button"
              onClick={() => void openUrl(FDA_SETTINGS_URL)}
              className="rounded-md bg-blue-600 px-4 py-2 font-medium text-sm text-white hover:bg-blue-700"
            >
              Open System Settings
            </button>
          )}
          <button
            type="button"
            onClick={onRecheck}
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
          >
            Re-check
          </button>
        </div>
      </div>
    </div>
  )
}
