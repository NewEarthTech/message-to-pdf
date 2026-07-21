import { useEffect, useState } from "react"
import { type Conversation, ipc } from "./bindings"
import { ConversationList } from "./ConversationList"
import { ExportPanel } from "./ExportPanel"

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; conversations: Conversation[] }

function App() {
  const [state, setState] = useState<LoadState>({ status: "loading" })
  const [selected, setSelected] = useState<Conversation | null>(null)

  useEffect(() => {
    ipc
      .listConversations()
      .then((conversations) => setState({ status: "ready", conversations }))
      .catch((message) => setState({ status: "error", message: String(message) }))
  }, [])

  return (
    <div className="flex h-screen flex-col bg-neutral-50 text-neutral-900">
      <header className="flex items-baseline gap-3 border-neutral-200 border-b px-6 py-3">
        <h1 className="font-semibold text-lg">msg2pdf</h1>
        <p className="text-neutral-500 text-sm">Export an iMessage conversation to PDF</p>
      </header>

      {state.status === "loading" && (
        <p className="p-6 text-neutral-500 text-sm">Loading conversations…</p>
      )}

      {state.status === "error" && (
        <div className="p-6">
          <p className="font-medium text-red-700 text-sm">Could not read conversations</p>
          <p className="mt-1 text-neutral-500 text-sm">{state.message}</p>
        </div>
      )}

      {state.status === "ready" && (
        <div className="flex min-h-0 flex-1">
          <aside className="w-80 shrink-0 border-neutral-200 border-r">
            <ConversationList
              conversations={state.conversations}
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
