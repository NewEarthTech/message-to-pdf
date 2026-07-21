//! Listing the 1:1 conversations in a `chat.db`.
//!
//! This is the data behind both the CLI's interactive picker and the desktop
//! app's conversation list: one row per 1:1 chat, newest first, resolved to a
//! human name through the [`Directory`](crate::contacts::Directory).

use anyhow::Result;
use chrono::{DateTime, Local, TimeZone};
use rusqlite::Connection;

use crate::contacts::Directory;
use crate::load::ChatRef;

const APPLE_EPOCH_OFFSET: i64 = 978_307_200;

/// Convert an Apple-epoch nanosecond timestamp (as stored in `message.date`) to
/// local time. Returns `None` for a missing or zero timestamp.
pub fn apple_ns_to_local(apple_ns: Option<i64>) -> Option<DateTime<Local>> {
    let ns = apple_ns?;
    if ns == 0 {
        return None;
    }
    let secs = APPLE_EPOCH_OFFSET + (ns / 1_000_000_000);
    Local.timestamp_opt(secs, 0).single()
}

/// One 1:1 conversation as it appears in the picker / conversation list.
pub struct ConversationSummary {
    pub rowid: i32,
    pub handle: String,
    pub display: Option<String>,
    pub contact_name: Option<String>,
    pub last_message: Option<DateTime<Local>>,
    pub message_count: i64,
}

impl ConversationSummary {
    /// Best available human label: contact name, else chat display name, else the
    /// raw handle.
    pub fn name(&self) -> &str {
        self.contact_name
            .as_deref()
            .filter(|s| !s.is_empty())
            .or_else(|| self.display.as_deref().filter(|s| !s.is_empty()))
            .unwrap_or(&self.handle)
    }

    /// Consume into a [`ChatRef`] for the export pipeline.
    pub fn into_chat_ref(self) -> ChatRef {
        ChatRef {
            rowid: self.rowid,
            handle: self.handle,
            display: self.display,
            contact_name: self.contact_name,
        }
    }
}

/// List every 1:1 conversation in `db`, newest last-message first, resolved
/// against `contacts`. Group chats are excluded: a 1:1 chat is a `chat` row with
/// exactly one joined handle.
pub fn list(db: &Connection, contacts: &Directory) -> Result<Vec<ConversationSummary>> {
    let mut stmt = db.prepare(
        "
        SELECT
            c.ROWID AS chat_id,
            h.id AS handle,
            c.display_name AS display,
            (SELECT MAX(m.date) FROM chat_message_join cmj
                JOIN message m ON m.ROWID = cmj.message_id
                WHERE cmj.chat_id = c.ROWID) AS last_date,
            (SELECT COUNT(*) FROM chat_message_join cmj
                WHERE cmj.chat_id = c.ROWID) AS message_count
        FROM chat c
        JOIN chat_handle_join chj ON chj.chat_id = c.ROWID
        JOIN handle h ON h.ROWID = chj.handle_id
        GROUP BY c.ROWID
        HAVING COUNT(chj.handle_id) = 1
        ORDER BY last_date DESC
        ",
    )?;

    let rows = stmt.query_map([], |r| {
        Ok((
            r.get::<_, i32>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, Option<String>>(2)?,
            r.get::<_, Option<i64>>(3)?,
            r.get::<_, i64>(4)?,
        ))
    })?;

    let mut out = Vec::new();
    for row in rows {
        let (rowid, handle, display, last_date, message_count) = row?;
        let contact_name = contacts.lookup(&handle).map(str::to_string);
        out.push(ConversationSummary {
            rowid,
            handle,
            display,
            contact_name,
            last_message: apple_ns_to_local(last_date),
            message_count,
        });
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::apple_ns_to_local;
    use chrono::Datelike;

    #[test]
    fn zero_and_none_are_none() {
        assert!(apple_ns_to_local(None).is_none());
        assert!(apple_ns_to_local(Some(0)).is_none());
    }

    #[test]
    fn nonzero_resolves_past_the_apple_epoch() {
        // ~700M seconds after the 2001-01-01 Apple epoch → well into the 2020s
        let dt = apple_ns_to_local(Some(700_000_000_i64 * 1_000_000_000)).expect("date");
        assert!(dt.year() >= 2001);
    }
}

