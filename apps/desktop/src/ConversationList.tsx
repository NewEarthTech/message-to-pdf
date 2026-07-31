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
      <div className="border-neutral-200 border-b p-3 dark:border-neutral-800">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations…"
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
        />
      </div>

      <ul className="flex-1 divide-y divide-neutral-100 overflow-y-auto dark:divide-neutral-800">
        {filtered.map((c) => (
          <li key={c.rowid}>
            <button
              type="button"
              onClick={() => onSelect(c)}
              className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                selected?.rowid === c.rowid
                  ? "bg-blue-50 hover:bg-blue-50 dark:bg-blue-950 dark:hover:bg-blue-950"
                  : ""
              }`}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-sm">{c.name}</p>
                {c.name !== c.handle && (
                  <p className="truncate text-neutral-500 text-xs dark:text-neutral-400">
                    {c.handle}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right text-neutral-400 text-xs dark:text-neutral-500">
                <p>{formatDate(c.last_message)}</p>
                <p>{numberFormat.format(c.message_count)}</p>
              </div>
            </button>
          </li>
        ))}

        {filtered.length === 0 && (
          <li className="p-4 text-neutral-500 text-sm dark:text-neutral-400">
            {conversations.length === 0 ? "No conversations found." : "No matches."}
          </li>
        )}
      </ul>
    </div>
  )
}
