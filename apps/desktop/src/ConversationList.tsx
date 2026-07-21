import { useMemo, useState } from "react"
import type { Conversation } from "./bindings"
import { formatDate, numberFormat } from "./format"

type Props = {
  conversations: Conversation[]
  selected: Conversation | null
  onSelect: (conversation: Conversation) => void
}

export function ConversationList({ conversations, selected, onSelect }: Props) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(
      (c) => c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q)
    )
  }, [conversations, query])

  return (
    <div className="flex h-full flex-col">
      <div className="border-neutral-200 border-b p-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations…"
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
        />
      </div>

      <ul className="flex-1 divide-y divide-neutral-100 overflow-y-auto">
        {filtered.map((c) => (
          <li key={c.rowid}>
            <button
              type="button"
              onClick={() => onSelect(c)}
              className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-100 ${
                selected?.rowid === c.rowid ? "bg-blue-50 hover:bg-blue-50" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-sm">{c.name}</p>
                {c.name !== c.handle && (
                  <p className="truncate text-neutral-500 text-xs">{c.handle}</p>
                )}
              </div>
              <div className="shrink-0 text-right text-neutral-400 text-xs">
                <p>{formatDate(c.last_message)}</p>
                <p>{numberFormat.format(c.message_count)}</p>
              </div>
            </button>
          </li>
        ))}

        {filtered.length === 0 && (
          <li className="p-4 text-neutral-500 text-sm">
            {conversations.length === 0 ? "No conversations found." : "No matches."}
          </li>
        )}
      </ul>
    </div>
  )
}
