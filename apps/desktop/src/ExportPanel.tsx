import { Channel } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener"
import { useState } from "react"
import { type Conversation, type ExportResult, ipc, type ProgressEvent } from "./bindings"
import { nextDay } from "./format"

type ExportState =
  | { status: "idle" }
  | { status: "exporting"; progress: ProgressEvent | null }
  | { status: "done"; result: ExportResult }
  | { status: "error"; message: string }

// Keyed on the conversation rowid by the parent, so all state resets on selection change.
export function ExportPanel({ conversation }: { conversation: Conversation }) {
  const [outDir, setOutDir] = useState<string | null>(null)
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [state, setState] = useState<ExportState>({ status: "idle" })

  const exporting = state.status === "exporting"

  async function chooseFolder() {
    const dir = await open({ directory: true, multiple: false })
    if (typeof dir === "string") setOutDir(dir)
  }

  async function runExport() {
    if (!outDir) return
    setState({ status: "exporting", progress: null })
    const channel = new Channel<ProgressEvent>()
    channel.onmessage = (progress) => {
      setState((s) => (s.status === "exporting" ? { status: "exporting", progress } : s))
    }
    try {
      const result = await ipc.exportConversation(
        conversation.rowid,
        outDir,
        start || null,
        end ? nextDay(end) : null,
        channel
      )
      setState({ status: "done", result })
    } catch (e) {
      setState({ status: "error", message: String(e) })
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div>
        <p className="text-neutral-500 text-xs uppercase tracking-wide">Export</p>
        <h2 className="mt-1 font-semibold text-xl">{conversation.name}</h2>
        {conversation.name !== conversation.handle && (
          <p className="text-neutral-500 text-sm">{conversation.handle}</p>
        )}
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <span className="font-medium text-neutral-700 text-sm">Date range</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="date"
              value={start}
              max={end || undefined}
              onChange={(e) => setStart(e.target.value)}
              disabled={exporting}
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
            <span className="text-neutral-400">→</span>
            <input
              type="date"
              value={end}
              min={start || undefined}
              onChange={(e) => setEnd(e.target.value)}
              disabled={exporting}
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </div>
          <p className="mt-1 text-neutral-400 text-xs">Leave empty to export the full history.</p>
        </div>

        <div>
          <span className="font-medium text-neutral-700 text-sm">Destination</span>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={chooseFolder}
              disabled={exporting}
              className="shrink-0 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50"
            >
              Choose folder…
            </button>
            <span className="truncate text-neutral-500 text-sm" title={outDir ?? undefined}>
              {outDir ?? "No folder selected"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={runExport}
          disabled={!outDir || exporting}
          className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {exporting ? "Exporting…" : "Export to PDF"}
        </button>
      </div>

      <div className="mt-6">
        {state.status === "exporting" && <ProgressView progress={state.progress} />}
        {state.status === "done" && (
          <SuccessView result={state.result} onDone={() => setState({ status: "idle" })} />
        )}
        {state.status === "error" && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="font-medium text-red-700 text-sm">Export failed</p>
            <p className="mt-1 text-red-600 text-sm">{state.message}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ProgressView({ progress }: { progress: ProgressEvent | null }) {
  const pct = progress?.fraction != null ? Math.round(progress.fraction * 100) : null
  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
        <div
          className={`h-full bg-blue-600 transition-all ${pct == null ? "w-full animate-pulse" : ""}`}
          style={pct != null ? { width: `${pct}%` } : undefined}
        />
      </div>
      <p className="mt-2 text-neutral-500 text-sm">{progress?.label ?? "Starting…"}</p>
    </div>
  )
}

function SuccessView({ result, onDone }: { result: ExportResult; onDone: () => void }) {
  return (
    <div className="rounded-md bg-green-50 p-4">
      <p className="font-medium text-green-800 text-sm">Exported</p>
      <p className="mt-1 truncate text-green-700 text-xs" title={result.path}>
        {result.path}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void openPath(result.path)}
          className="rounded-md bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-neutral-50"
        >
          Open PDF
        </button>
        <button
          type="button"
          onClick={() => void revealItemInDir(result.path)}
          className="rounded-md bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-neutral-50"
        >
          Reveal in Finder
        </button>
        <button
          type="button"
          onClick={onDone}
          className="ml-auto rounded-md px-3 py-1.5 text-neutral-500 text-sm hover:bg-neutral-100"
        >
          Done
        </button>
      </div>
    </div>
  )
}
