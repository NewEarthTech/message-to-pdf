import { openUrl } from "@tauri-apps/plugin-opener"

// Deep-links straight to System Settings › Privacy & Security › Full Disk Access.
const FDA_SETTINGS_URL = "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"

type Props = {
  access: "denied" | "missing"
  onRecheck: () => void
}

export function FullDiskAccess({ access, onRecheck }: Props) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        {access === "missing" ? (
          <>
            <h2 className="font-semibold text-lg">No Messages database found</h2>
            <p className="mt-2 text-neutral-600 text-sm">
              msg2pdf couldn't find a <code className="rounded bg-neutral-100 px-1">chat.db</code>{" "}
              at the expected location. If your messages live elsewhere, you can point the app at a
              copy.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-semibold text-lg">Full Disk Access needed</h2>
            <p className="mt-2 text-neutral-600 text-sm">
              macOS keeps your Messages database private. To read your conversations, msg2pdf needs
              Full Disk Access. Everything stays on your Mac — nothing is uploaded.
            </p>
            <ol className="mt-4 list-decimal space-y-1 pl-5 text-neutral-600 text-sm">
              <li>Open System Settings → Privacy &amp; Security → Full Disk Access.</li>
              <li>Turn on the switch for msg2pdf.</li>
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
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-50"
          >
            Re-check
          </button>
        </div>
      </div>
    </div>
  )
}
