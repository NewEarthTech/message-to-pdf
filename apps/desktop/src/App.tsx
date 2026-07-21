import { useEffect, useMemo, useState } from "react"
import { type Conversation, ipc } from "./bindings"

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; conversations: Conversation[] }

const numberFormat = new Intl.NumberFormat()

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function App() {
  const [state, setState] = useState<LoadState>({ status: "loading" })
  const [query, setQuery] = useState("")

  useEffect(() => {
    ipc
      .listConversations()
      .then((conversations) => setState({ status: "ready", conversations }))
      .catch((message) => setState({ status: "error", message: String(message) }))
  }, [])

  const conversations = state.status === "ready" ? state.conversations : []
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(
      (c) => c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q)
    )
  }, [conversations, query])

  return (
    <div className="flex h-screen flex-col bg-neutral-50 text-neutral-900">
      <header className="border-neutral-200 border-b px-6 py-4">
        <h1 className="font-semibold text-lg">msg2pdf</h1>
        <p className="text-neutral-500 text-sm">Export an iMessage conversation to PDF</p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations…"
          className="mt-3 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
        />
      </header>

      <main className="flex-1 overflow-y-auto">
        {state.status === "loading" && (
          <p className="p-6 text-neutral-500 text-sm">Loading conversations…</p>
        )}

        {state.status === "error" && (
          <div className="p-6">
            <p className="font-medium text-red-700 text-sm">Could not read conversations</p>
            <p className="mt-1 text-neutral-500 text-sm">{state.message}</p>
          </div>
        )}

        {state.status === "ready" && filtered.length === 0 && (
          <p className="p-6 text-neutral-500 text-sm">
            {conversations.length === 0 ? "No conversations found." : "No matches."}
          </p>
        )}

        {state.status === "ready" && filtered.length > 0 && (
          <ul className="divide-y divide-neutral-100">
            {filtered.map((c) => (
              <li key={c.rowid}>
                <div className="flex items-center justify-between gap-4 px-6 py-3 hover:bg-neutral-100">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    {c.name !== c.handle && (
                      <p className="truncate text-neutral-500 text-sm">{c.handle}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right text-neutral-500 text-sm">
                    <p>{formatDate(c.last_message)}</p>
                    <p>{numberFormat.format(c.message_count)} messages</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {state.status === "ready" && (
        <footer className="border-neutral-200 border-t px-6 py-2 text-neutral-500 text-xs">
          {numberFormat.format(filtered.length)} of {numberFormat.format(conversations.length)}{" "}
          conversations
        </footer>
      )}
    </div>
  )
}

export default App
