use anyhow::{Context, Result, anyhow, bail};
use imessage_database::tables::table::get_connection;
use rusqlite::{Connection, OpenFlags};
use std::path::{Path, PathBuf};

use crate::contacts::Directory;

pub struct ChatRef {
    pub rowid: i32,
    pub handle: String,
    pub display: Option<String>,
    pub contact_name: Option<String>,
}

impl ChatRef {
    pub fn label(&self) -> &str {
        self.contact_name
            .as_deref()
            .filter(|s| !s.is_empty())
            .or_else(|| self.display.as_deref().filter(|s| !s.is_empty()))
            .unwrap_or(&self.handle)
    }
}

pub fn resolve_db_path(cli: Option<PathBuf>) -> Result<PathBuf> {
    if let Some(p) = cli {
        return Ok(p);
    }
    let home = std::env::var("HOME").context("HOME not set")?;
    Ok(PathBuf::from(home).join("Library/Messages/chat.db"))
}

pub fn open(path: &Path) -> Result<Connection> {
    get_connection(path).map_err(|e| {
        anyhow!(
            "could not open {}: {e}\n\n\
             If you see a permissions error, grant Full Disk Access to your terminal:\n  \
             System Settings → Privacy & Security → Full Disk Access → add Terminal/iTerm/VS Code.",
            path.display()
        )
    })
}

/// Whether a `chat.db` at `path` can be read.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Access {
    /// Opened read-only successfully.
    Readable,
    /// Present but not readable — the Full Disk Access case on macOS. Until the
    /// app is granted access, `~/Library/Messages/` is TCC-protected and even
    /// `stat`ing `chat.db` fails, so this covers any error other than "not
    /// found" (permission denied to stat or to open).
    Denied,
    /// No file exists at that path.
    Missing,
}

/// Probe whether `path` can be opened read-only, distinguishing "protected"
/// (needs Full Disk Access) from "not there".
pub fn check_access(path: &Path) -> Access {
    // Probe the file directly rather than through `path.exists()`. Under macOS
    // TCC, `~/Library/Messages/` is a protected directory, so before Full Disk
    // Access is granted a `stat()` on the `chat.db` inside it fails with EPERM.
    // `Path::exists()` collapses that into `false` — indistinguishable from a
    // file that genuinely isn't there — which would route a denied user to the
    // "no database" message instead of the Full Disk Access onboarding. The
    // error kind from an open attempt keeps them apart: NotFound is Missing;
    // any other error (EPERM/EACCES, whether from the stat or the open) is
    // Denied. On success we still confirm SQLite can open it read-only.
    match std::fs::File::open(path) {
        Ok(_) => match Connection::open_with_flags(
            path,
            OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
        ) {
            Ok(_) => Access::Readable,
            Err(_) => Access::Denied,
        },
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Access::Missing,
        Err(_) => Access::Denied,
    }
}

pub fn resolve_contact(db: &Connection, contacts: &Directory, contact: &str) -> Result<ChatRef> {
    let mut stmt = db.prepare(
        "
        SELECT c.ROWID, h.id, c.display_name
        FROM chat c
        JOIN chat_handle_join chj ON chj.chat_id = c.ROWID
        JOIN handle h ON h.ROWID = chj.handle_id
        WHERE h.id = ?1
          AND (SELECT COUNT(*) FROM chat_handle_join chj2 WHERE chj2.chat_id = c.ROWID) = 1
        ORDER BY (
            SELECT MAX(m.date)
            FROM chat_message_join cmj
            JOIN message m ON m.ROWID = cmj.message_id
            WHERE cmj.chat_id = c.ROWID
        ) DESC
        LIMIT 1
        ",
    )?;
    let row = stmt
        .query_row([contact], |row| {
            Ok((
                row.get::<_, i32>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
            ))
        })
        .ok();

    if let Some((rowid, handle, display)) = row {
        let contact_name = contacts.lookup(&handle).map(str::to_string);
        return Ok(ChatRef {
            rowid,
            handle,
            display,
            contact_name,
        });
    }

    let handle_exists: bool = {
        let mut s = db.prepare("SELECT 1 FROM handle WHERE id = ?1 LIMIT 1")?;
        s.exists([contact])?
    };
    if handle_exists {
        bail!("{contact} exists in chat.db but not in any 1:1 conversation — group chats are not supported");
    }
    bail!("no handle matching {contact} found in chat.db")
}
