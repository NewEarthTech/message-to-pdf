//! msg2pdf desktop backend.
//!
//! The IPC surface is a single [`Ipc`] trait, mounted through
//! [`tauri_typed_ipc`] so the TypeScript client is generated from the same
//! definition (see `bin/gen_bindings.rs` and the `export` feature). The export
//! engine itself lives in `msg2pdf-core`.

use std::path::PathBuf;

use serde::Serialize;
use tauri::State;
use tauri_typed_ipc::{Channel, handler, procedures};

use msg2pdf_core::conversations::{self, ConversationSummary};
use msg2pdf_core::progress::Progress;
use msg2pdf_core::{assets, contacts, load, model, pdf};

/// App-managed configuration: which `chat.db` to read from.
struct AppState {
    db_path: PathBuf,
}

/// One 1:1 conversation, as sent to the frontend list. Field names are
/// snake_case on both the wire (serde) and in the generated TypeScript
/// (specta), so the two cannot disagree.
#[derive(Serialize, specta::Type)]
struct Conversation {
    rowid: i32,
    handle: String,
    name: String,
    /// Last message time as an RFC 3339 string, or null if the chat is empty.
    last_message: Option<String>,
    message_count: i32,
}

impl From<ConversationSummary> for Conversation {
    fn from(summary: ConversationSummary) -> Self {
        let name = summary.name().to_string();
        Self {
            rowid: summary.rowid,
            handle: summary.handle,
            name,
            last_message: summary.last_message.map(|d| d.to_rfc3339()),
            message_count: i32::try_from(summary.message_count).unwrap_or(i32::MAX),
        }
    }
}

/// A streamed progress update during an export.
#[derive(Serialize, specta::Type)]
struct ProgressEvent {
    /// Coarse phase: `preparing` | `building` | `rendering` | `saving`.
    phase: String,
    /// Human-readable status for the current step.
    label: String,
    /// Completion of the current phase in 0.0–1.0, or null when indeterminate.
    fraction: Option<f64>,
}

/// The result of a successful export.
#[derive(Serialize, specta::Type)]
struct ExportResult {
    /// Absolute path of the written PDF.
    path: String,
}

/// Whether the configured `chat.db` can be read — drives Full Disk Access onboarding.
#[derive(Serialize, specta::Type)]
#[serde(rename_all = "lowercase")]
enum AccessStatus {
    Readable,
    Denied,
    Missing,
}

/// Collapse the engine's fine-grained [`Progress`] into a UI-friendly event.
fn map_progress(ev: Progress) -> ProgressEvent {
    let fraction = |done: usize, total: usize| (total > 0).then(|| done as f64 / total as f64);
    let (phase, label, fraction) = match ev {
        Progress::Streaming { count } => ("preparing", format!("Reading messages… {count}"), None),
        Progress::Streamed { total } => ("preparing", format!("Read {total} messages"), None),
        Progress::Note(message) => ("preparing", message, None),
        Progress::Building { done, total, .. } => (
            "building",
            format!("Building conversation… {done}/{total}"),
            fraction(done, total),
        ),
        Progress::Built { bubbles, .. } => {
            ("building", format!("Built {bubbles} messages"), Some(1.0))
        }
        Progress::PreloadedEmoji { glyphs } => {
            ("rendering", format!("Prepared {glyphs} emoji"), None)
        }
        Progress::LayingOut { done, total, .. } => (
            "rendering",
            format!("Laying out pages… {done}/{total}"),
            fraction(done, total),
        ),
        Progress::LaidOut { pages, .. } => {
            ("rendering", format!("Laid out {pages} pages"), Some(1.0))
        }
        Progress::Serializing => ("saving", "Saving PDF…".to_string(), None),
        Progress::Serialized { bytes } => {
            ("saving", format!("Wrote {} KB", bytes / 1024), Some(1.0))
        }
    };
    ProgressEvent {
        phase: phase.to_string(),
        label,
        fraction,
    }
}

#[procedures]
trait Ipc {
    /// Whether the configured `chat.db` can be read. Drives Full Disk Access onboarding.
    fn check_access(&self, state: State<AppState>) -> AccessStatus;

    /// List every 1:1 conversation in the configured `chat.db`, newest first.
    fn list_conversations(&self, state: State<AppState>) -> Result<Vec<Conversation>, String>;

    /// Export the conversation with `rowid` to a PDF in `out_dir`, streaming
    /// [`ProgressEvent`]s. `start`/`end` are `YYYY-MM-DD` bounds — start
    /// inclusive, end exclusive; null means unbounded (full history).
    fn export_conversation(
        &self,
        rowid: i32,
        out_dir: String,
        start: Option<String>,
        end: Option<String>,
        on_progress: Channel<ProgressEvent>,
        state: State<AppState>,
    ) -> Result<ExportResult, String>;
}

struct Backend;

impl Ipc for Backend {
    fn check_access(&self, state: State<AppState>) -> AccessStatus {
        match load::check_access(&state.db_path) {
            load::Access::Readable => AccessStatus::Readable,
            load::Access::Denied => AccessStatus::Denied,
            load::Access::Missing => AccessStatus::Missing,
        }
    }

    fn list_conversations(&self, state: State<AppState>) -> Result<Vec<Conversation>, String> {
        let db = load::open(&state.db_path).map_err(|e| e.to_string())?;
        let directory = contacts::Directory::load();
        let summaries = conversations::list(&db, &directory).map_err(|e| e.to_string())?;
        Ok(summaries.into_iter().map(Conversation::from).collect())
    }

    fn export_conversation(
        &self,
        rowid: i32,
        out_dir: String,
        start: Option<String>,
        end: Option<String>,
        on_progress: Channel<ProgressEvent>,
        state: State<AppState>,
    ) -> Result<ExportResult, String> {
        let db = load::open(&state.db_path).map_err(|e| e.to_string())?;
        let directory = contacts::Directory::load();
        let chat = conversations::by_rowid(&db, &directory, rowid)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("no 1:1 conversation with id {rowid}"))?
            .into_chat_ref();

        let asset_dir = assets::AssetDir::new().map_err(|e| e.to_string())?;
        let range = model::DateRange { start, end };
        let mut sink = |ev: Progress| {
            let _ = on_progress.send(map_progress(ev));
        };

        let conv = model::build(&db, &chat, &state.db_path, &asset_dir, &range, &mut sink)
            .map_err(|e| e.to_string())?;

        let stem = pdf::safe_filename(chat.label());
        let out_path = PathBuf::from(&out_dir).join(format!("{stem}.pdf"));
        pdf::write(&conv, &out_path, &mut sink).map_err(|e| e.to_string())?;

        Ok(ExportResult {
            path: out_path.to_string_lossy().into_owned(),
        })
    }
}

/// Resolve the `chat.db` to read: an explicit `MSG2PDF_DB` override wins; a debug
/// build otherwise regenerates the synthetic fixture (so the app runs without
/// Full Disk Access); a release build points at the real Messages database.
fn resolve_db_path() -> PathBuf {
    if let Ok(path) = std::env::var("MSG2PDF_DB") {
        return PathBuf::from(path);
    }
    default_db_path()
}

#[cfg(debug_assertions)]
fn default_db_path() -> PathBuf {
    let path = std::env::temp_dir().join("msg2pdf-dev-fixture.db");
    if let Err(e) = msg2pdf_fixture::create(&path) {
        eprintln!("failed to create dev fixture at {}: {e}", path.display());
    }
    path
}

#[cfg(not(debug_assertions))]
fn default_db_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_default();
    PathBuf::from(home).join("Library/Messages/chat.db")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            db_path: resolve_db_path(),
        })
        .invoke_handler(handler(Backend.into_procedures()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Absolute path of the committed TypeScript client, resolved from this crate's
/// location so it is independent of the working directory.
#[cfg(feature = "export")]
fn bindings_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../src/bindings.ts")
}

/// Write the TypeScript client to `src/bindings.ts`.
#[cfg(feature = "export")]
pub fn export_bindings() -> Result<(), tauri_typed_ipc::BindingsError> {
    tauri_typed_ipc::Bindings::new()
        .register::<IpcProcedures>()
        .export_to(bindings_path())
}

/// Fail if the committed TypeScript client has drifted from the Rust surface.
#[cfg(feature = "export")]
pub fn check_bindings() -> Result<(), tauri_typed_ipc::BindingsError> {
    tauri_typed_ipc::Bindings::new()
        .register::<IpcProcedures>()
        .check(bindings_path())
}
