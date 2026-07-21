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
    Ok(())
}
