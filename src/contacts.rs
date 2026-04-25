use anyhow::Result;
use rusqlite::{Connection, OpenFlags};
use std::collections::HashMap;
use std::path::PathBuf;

pub struct Directory {
    by_key: HashMap<String, String>,
}

impl Directory {
    pub fn empty() -> Self {
        Self {
            by_key: HashMap::new(),
        }
    }

    pub fn load() -> Self {
        let Ok(home) = std::env::var("HOME") else {
            return Self::empty();
        };
        let pattern = PathBuf::from(home)
            .join("Library/Application Support/AddressBook/Sources");
        let Ok(sources) = std::fs::read_dir(&pattern) else {
            return Self::empty();
        };

        let mut by_key: HashMap<String, String> = HashMap::new();
        for entry in sources.flatten() {
            let db = entry.path().join("AddressBook-v22.abcddb");
            if !db.exists() {
                continue;
            }
            if let Err(e) = ingest(&db, &mut by_key) {
                eprintln!("  (contacts: {} — {e})", db.display());
            }
        }
        Self { by_key }
    }

    pub fn lookup(&self, handle: &str) -> Option<&str> {
        for key in keys_for(handle) {
            if let Some(n) = self.by_key.get(&key) {
                return Some(n.as_str());
            }
        }
        None
    }

    pub fn len(&self) -> usize {
        self.by_key.len()
    }
}

fn ingest(db_path: &std::path::Path, out: &mut HashMap<String, String>) -> Result<()> {
    let conn = Connection::open_with_flags(
        db_path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )?;

    let mut phones = conn.prepare(
        "
        SELECT p.ZFULLNUMBER, r.ZFIRSTNAME, r.ZLASTNAME, r.ZNICKNAME, r.ZORGANIZATION
        FROM ZABCDPHONENUMBER p
        JOIN ZABCDRECORD r ON p.ZOWNER = r.Z_PK
        WHERE p.ZFULLNUMBER IS NOT NULL
        ",
    )?;
    let rows = phones.query_map([], |row| {
        Ok((
            row.get::<_, Option<String>>(0)?,
            row.get::<_, Option<String>>(1)?,
            row.get::<_, Option<String>>(2)?,
            row.get::<_, Option<String>>(3)?,
            row.get::<_, Option<String>>(4)?,
        ))
    })?;
    for row in rows.flatten() {
        let (phone, first, last, nick, org) = row;
        let Some(phone) = phone else { continue };
        let Some(name) = compose_name(&first, &last, &nick, &org) else {
            continue;
        };
        for key in keys_for(&phone) {
            out.entry(key).or_insert_with(|| name.clone());
        }
    }

    let mut emails = conn.prepare(
        "
        SELECT COALESCE(e.ZADDRESSNORMALIZED, e.ZADDRESS),
               r.ZFIRSTNAME, r.ZLASTNAME, r.ZNICKNAME, r.ZORGANIZATION
        FROM ZABCDEMAILADDRESS e
        JOIN ZABCDRECORD r ON e.ZOWNER = r.Z_PK
        WHERE COALESCE(e.ZADDRESSNORMALIZED, e.ZADDRESS) IS NOT NULL
        ",
    )?;
    let rows = emails.query_map([], |row| {
        Ok((
            row.get::<_, Option<String>>(0)?,
            row.get::<_, Option<String>>(1)?,
            row.get::<_, Option<String>>(2)?,
            row.get::<_, Option<String>>(3)?,
            row.get::<_, Option<String>>(4)?,
        ))
    })?;
    for row in rows.flatten() {
        let (email, first, last, nick, org) = row;
        let Some(email) = email else { continue };
        let Some(name) = compose_name(&first, &last, &nick, &org) else {
            continue;
        };
        out.entry(email.to_lowercase()).or_insert(name);
    }

    Ok(())
}

fn compose_name(
    first: &Option<String>,
    last: &Option<String>,
    nick: &Option<String>,
    org: &Option<String>,
) -> Option<String> {
    if let Some(n) = nick.as_deref().filter(|s| !s.trim().is_empty()) {
        return Some(n.trim().to_string());
    }
    let parts: Vec<&str> = [first, last]
        .into_iter()
        .filter_map(|p| p.as_deref().map(str::trim).filter(|s| !s.is_empty()))
        .collect();
    if !parts.is_empty() {
        return Some(parts.join(" "));
    }
    org.as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(String::from)
}

fn keys_for(handle: &str) -> Vec<String> {
    let trimmed = handle.trim();
    if trimmed.contains('@') {
        return vec![trimmed.to_lowercase()];
    }
    let digits: String = trimmed.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.is_empty() {
        return vec![trimmed.to_string()];
    }
    let mut keys = vec![digits.clone()];
    if digits.len() == 11 && digits.starts_with('1') {
        keys.push(digits[1..].to_string());
    } else if digits.len() == 10 {
        keys.push(format!("1{digits}"));
    }
    keys
}
