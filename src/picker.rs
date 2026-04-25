use anyhow::{Result, bail};
use chrono::{DateTime, Local, TimeZone};
use dialoguer::FuzzySelect;
use dialoguer::theme::ColorfulTheme;
use rusqlite::Connection;

use crate::contacts::Directory;
use crate::load::ChatRef;

const APPLE_EPOCH_OFFSET: i64 = 978_307_200;

fn apple_ns_to_local(apple_ns: Option<i64>) -> Option<DateTime<Local>> {
    let ns = apple_ns?;
    if ns == 0 {
        return None;
    }
    let secs = APPLE_EPOCH_OFFSET + (ns / 1_000_000_000);
    Local.timestamp_opt(secs, 0).single()
}

pub fn pick(db: &Connection, contacts: &Directory) -> Result<ChatRef> {
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

    let rows: Vec<(i32, String, Option<String>, Option<i64>, i64)> = stmt
        .query_map([], |r| {
            Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?))
        })?
        .collect::<rusqlite::Result<_>>()?;

    if rows.is_empty() {
        bail!("no 1:1 chats found in chat.db");
    }

    let items: Vec<String> = rows
        .iter()
        .map(|(_, handle, display, last, count)| {
            let name = contacts
                .lookup(handle)
                .map(str::to_string)
                .or_else(|| display.clone().filter(|s| !s.is_empty()))
                .unwrap_or_else(|| handle.clone());
            let suffix = if name != *handle {
                format!(" ({handle})")
            } else {
                String::new()
            };
            let when = apple_ns_to_local(*last)
                .map(|d| d.format("%Y-%m-%d").to_string())
                .unwrap_or_else(|| "never".into());
            let head = format!("{name}{suffix}");
            format!("{head:<40}  {count:>6} msgs  last: {when}")
        })
        .collect();

    let idx = FuzzySelect::with_theme(&ColorfulTheme::default())
        .with_prompt("Select a conversation")
        .items(&items)
        .default(0)
        .interact()?;

    let (rowid, handle, display, _, _) = rows.into_iter().nth(idx).unwrap();
    let contact_name = contacts.lookup(&handle).map(str::to_string);
    Ok(ChatRef {
        rowid,
        handle,
        display,
        contact_name,
    })
}
