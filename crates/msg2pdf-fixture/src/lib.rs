//! A synthetic `chat.db` fixture for tests and local development.
//!
//! The schema is the real Messages table structure (derived from a live `chat.db`,
//! no data); the rows are entirely invented. Point the CLI or the app at the
//! generated database with a db-path override to work without Full Disk Access or
//! any real conversation.

use anyhow::{Context, Result};
use rusqlite::Connection;
use std::path::Path;

const SCHEMA: &str = include_str!("../schema.sql");
const SEED: &str = include_str!("../seed.sql");
/// A small, obviously-synthetic placeholder photo — not real content.
const ATTACHMENT_IMAGE: &[u8] = include_bytes!("../lunch.jpeg");

/// Create a fresh synthetic `chat.db` fixture at `path`, replacing any existing file.
pub fn create(path: &Path) -> Result<()> {
    if path.exists() {
        std::fs::remove_file(path).with_context(|| format!("removing {}", path.display()))?;
    }
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .with_context(|| format!("creating {}", parent.display()))?;
    }
    let conn =
        Connection::open(path).with_context(|| format!("creating {}", path.display()))?;
    conn.execute_batch(SCHEMA).context("applying schema")?;
    conn.execute_batch(SEED).context("applying seed data")?;
    write_attachment(&conn, path).context("writing fixture attachment")?;
    Ok(())
}

/// Write the synthetic attachment image next to the database and point the seeded
/// attachment row at it, so the export renders a real inline photo (exercising the
/// image pipeline) instead of a "missing" placeholder.
fn write_attachment(conn: &Connection, db_path: &Path) -> Result<()> {
    let stem = db_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("fixture");
    let dir = db_path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join(format!("{stem}-attachments"));
    std::fs::create_dir_all(&dir).with_context(|| format!("creating {}", dir.display()))?;
    let image_path = dir.join("lunch.jpeg");
    std::fs::write(&image_path, ATTACHMENT_IMAGE)
        .with_context(|| format!("writing {}", image_path.display()))?;

    let absolute = std::fs::canonicalize(&image_path).unwrap_or(image_path);
    conn.execute(
        "UPDATE attachment SET filename = ?1, total_bytes = ?2 WHERE ROWID = 1",
        rusqlite::params![absolute.to_string_lossy(), ATTACHMENT_IMAGE.len() as i64],
    )
    .context("updating attachment path")?;
    Ok(())
}
