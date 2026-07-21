import { getCurrentWindow } from "@tauri-apps/api/window"
import { useCallback, useEffect, useRef, useState } from "react"
import { AboutDialog } from "./AboutDialog"
import { type AccessStatus, type Conversation, ipc } from "./bindings"
import { ConversationList } from "./ConversationList"
import { ExportPanel } from "./ExportPanel"
import { FullDiskAccess } from "./FullDiskAccess"
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "./product"

type Phase =
  | { kind: "checking" }
  | { kind: "blocked"; access: Exclude<AccessStatus, "readable"> }
  | { kind: "loading" }
  | { kind: "ready"; conversations: Conversation[] }
  | { kind: "error"; message: string }

function App() {
  const [phase, setPhase] = useState<Phase>({ kind: "checking" })
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  const check = useCallback(async () => {
    setPhase({ kind: "checking" })
    const access = await ipc.checkAccess()
    if (access !== "readable") {
      setPhase({ kind: "blocked", access })
      return
    }
    setPhase({ kind: "loading" })
    try {
      const conversations = await ipc.listConversations()
      setPhase({ kind: "ready", conversations })
    } catch (e) {
      setPhase({ kind: "error", message: String(e) })
    }
  }, [])

  useEffect(() => {
    void check()
  }, [check])

  // Re-check when the window regains focus while blocked (e.g. after granting access in System Settings).
  useEffect(() => {
    const unlisten = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (focused && phaseRef.current.kind === "blocked") void check()
    })
    return () => {
      void unlisten.then((off) => off())
    }
  }, [check])

  return (
    <div className="flex h-screen flex-col bg-neutral-50 text-neutral-900">
      <header className="flex items-baseline gap-3 border-neutral-200 border-b px-6 py-3">
        <h1 className="font-semibold text-lg">{PRODUCT_NAME}</h1>
        <p className="text-neutral-500 text-sm">{PRODUCT_TAGLINE}</p>
        <button
          type="button"
          onClick={() => setAboutOpen(true)}
          className="ml-auto self-center rounded-md px-2.5 py-1 text-neutral-500 text-sm hover:bg-neutral-100 hover:text-neutral-700"
        >
          About
        </button>
      </header>

      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}

      {phase.kind === "checking" && (
        <p className="p-6 text-neutral-500 text-sm">Checking access…</p>
      )}

      {phase.kind === "loading" && (
        <p className="p-6 text-neutral-500 text-sm">Loading conversations…</p>
      )}

      {phase.kind === "blocked" && (
        <FullDiskAccess access={phase.access} onRecheck={() => void check()} />
      )}

      {phase.kind === "error" && (
        <div className="p-6">
          <p className="font-medium text-red-700 text-sm">Could not read conversations</p>
          <p className="mt-1 text-neutral-500 text-sm">{phase.message}</p>
        </div>
      )}

      {phase.kind === "ready" && (
        <div className="flex min-h-0 flex-1">
          <aside className="w-80 shrink-0 border-neutral-200 border-r">
            <ConversationList
              conversations={phase.conversations}
              selected={selected}
              onSelect={setSelected}
            />
          </aside>
          <main className="min-w-0 flex-1">
            {selected ? (
              <ExportPanel key={selected.rowid} conversation={selected} />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-neutral-400 text-sm">
                Select a conversation to export.
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  )
}

export default App
