//! msg2pdf desktop backend.
//!
//! The IPC surface is a single [`Ipc`] trait, mounted through
//! [`tauri_typed_ipc`] so the TypeScript client is generated from the same
//! definition (see `bin/gen_bindings.rs` and the `export` feature). The export
//! engine itself lives in `msg2pdf-core`.

use std::path::PathBuf;

use serde::Serialize;
use tauri::State;
use tauri_typed_ipc::{handler, procedures};

use msg2pdf_core::conversations::{self, ConversationSummary};
use msg2pdf_core::{contacts, load};

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

#[procedures]
trait Ipc {
    /// List every 1:1 conversation in the configured `chat.db`, newest first.
    fn list_conversations(&self, state: State<AppState>) -> Result<Vec<Conversation>, String>;
}

struct Backend;

impl Ipc for Backend {
    fn list_conversations(&self, state: State<AppState>) -> Result<Vec<Conversation>, String> {
        let db = load::open(&state.db_path).map_err(|e| e.to_string())?;
        let directory = contacts::Directory::load();
        let summaries = conversations::list(&db, &directory).map_err(|e| e.to_string())?;
        Ok(summaries.into_iter().map(Conversation::from).collect())
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
