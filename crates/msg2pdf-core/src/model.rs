use anyhow::{Context, Result};
use chrono::{DateTime, Local};
use imessage_database::message_types::edited::{EditStatus, EditedEvent};
use imessage_database::message_types::variants::{Tapback, Variant};
use imessage_database::tables::attachment::{Attachment, MediaType};
use imessage_database::tables::messages::Message;
use imessage_database::tables::table::Table;
use imessage_database::util::dates::get_offset;
use imessage_database::util::platform::Platform;
use imessage_database::util::query_context::QueryContext;
use rusqlite::Connection;
use std::collections::{BTreeSet, HashMap};
use std::path::{Path, PathBuf};

use crate::assets::AssetDir;
use crate::load::ChatRef;
use crate::progress::Progress;

pub struct Bubble {
    pub from_me: bool,
    pub sent_at: DateTime<Local>,
    pub delivered_at: Option<DateTime<Local>>,
    pub read_at: Option<DateTime<Local>>,
    pub text: Option<String>,
    pub attachments: Vec<AttachmentOut>,
    pub reply_to: Option<ReplySnippet>,
    pub edits: Vec<EditedVersion>,
    pub reactions: Vec<Reaction>,
    #[allow(dead_code)]
    pub is_deleted: bool,
    pub is_fully_unsent: bool,
    pub last_outgoing_in_run: bool,
}

pub struct AttachmentOut {
    pub name: String,
    pub size: u64,
    pub image_path: Option<PathBuf>,
    pub missing: bool,
}

pub struct Reaction {
    pub emoji: String,
    pub from_me: bool,
    pub removed: bool,
}

#[derive(Clone)]
pub struct ReplySnippet {
    pub preview: String,
    pub from_me: bool,
}

pub struct EditedVersion {
    pub text: String,
    pub date: Option<DateTime<Local>>,
}

pub struct Conversation {
    pub label: String,
    pub bubbles: Vec<Bubble>,
}

pub fn build(
    db: &Connection,
    chat: &ChatRef,
    db_path: &Path,
    assets: &AssetDir,
    progress: &mut dyn FnMut(Progress),
) -> Result<Conversation> {
    let offset = get_offset();

    let mut ctx = QueryContext::default();
    let mut chats = BTreeSet::new();
    chats.insert(chat.rowid);
    ctx.set_selected_chat_ids(chats);

    progress(Progress::Streaming { count: 0 });
    let mut stmt = Message::stream_rows(db, &ctx).context("preparing message stream")?;
    let iter = stmt
        .query_map([], |row| Ok(Message::from_row(row)))
        .context("querying messages")?;

    let mut all: Vec<Message> = Vec::new();
    for res in iter {
        let mut m = Message::extract(res).context("extracting message row")?;
        if let Ok(body) = m.parse_body(db) {
            m.apply_body(body);
        }
        all.push(m);
        if all.len().is_multiple_of(200) {
            progress(Progress::Streaming { count: all.len() });
        }
    }
    progress(Progress::Streamed { total: all.len() });

    // Reactions are bucketed by (target_guid, component_index) so we can route them
    // to the right virtual bubble (image vs. text) when a message is split.
    let mut tapbacks: HashMap<(String, usize), Vec<Reaction>> = HashMap::new();
    let mut regular: Vec<Message> = Vec::new();
    for m in all {
        match m.variant() {
            Variant::Tapback(_, action, tapback) => {
                if let Some((idx, target_guid)) = m.clean_associated_guid() {
                    let emoji = tapback_to_emoji(&tapback);
                    let removed = matches!(
                        action,
                        imessage_database::message_types::variants::TapbackAction::Removed
                    );
                    tapbacks
                        .entry((target_guid.to_string(), idx))
                        .or_default()
                        .push(Reaction {
                            emoji,
                            from_me: m.is_from_me,
                            removed,
                        });
                }
            }
            _ => regular.push(m),
        }
    }

    let guid_to_preview: HashMap<String, (String, bool)> = regular
        .iter()
        .map(|m| {
            let preview = m
                .text
                .as_deref()
                .unwrap_or("[attachment]")
                .chars()
                .take(80)
                .collect::<String>();
            (m.guid.clone(), (preview, m.is_from_me))
        })
        .collect();

    progress(Progress::Note(format!(
        "split: {} regular · {} tapbacks",
        regular.len(),
        tapbacks.values().map(|v| v.len()).sum::<usize>()
    )));

    // Determine the layout of body components for each message: which component
    // index is the image (if any) and which is the text. Used to split messages
    // with both into two virtual bubbles and to route per-component reactions.
    fn component_indices(m: &Message) -> (Option<usize>, Option<usize>) {
        use imessage_database::tables::messages::models::BubbleComponent;
        let mut image_idx: Option<usize> = None;
        let mut text_idx: Option<usize> = None;
        for (i, c) in m.components.iter().enumerate() {
            match c {
                BubbleComponent::Attachment(_) if image_idx.is_none() => image_idx = Some(i),
                BubbleComponent::Text(_) if text_idx.is_none() => text_idx = Some(i),
                _ => {}
            }
        }
        (image_idx, text_idx)
    }

    let db_root = db_path.parent().unwrap_or(Path::new("/")).to_path_buf();
    let total = regular.len();
    let mut attach_count = 0usize;
    let mut image_count = 0usize;
    let mut last_log = std::time::Instant::now();

    let mut bubbles: Vec<Bubble> = Vec::with_capacity(regular.len());
    for (idx, m) in regular.iter().enumerate() {
        let sent_at = m.date(offset).ok().unwrap_or_else(Local::now);
        let delivered_at = if m.date_delivered != 0 {
            m.date_delivered(offset).ok()
        } else {
            None
        };
        let read_at = if m.date_read != 0 {
            m.date_read(offset).ok()
        } else {
            None
        };

        let attachments = collect_attachments(
            db,
            m,
            &db_root,
            assets,
            &mut attach_count,
            &mut image_count,
        )?;
        if last_log.elapsed() >= std::time::Duration::from_millis(500) {
            progress(Progress::Building {
                done: idx,
                total,
                attachments: attach_count,
                images: image_count,
            });
            last_log = std::time::Instant::now();
        }

        let reply_to = m
            .thread_originator_guid
            .as_deref()
            .and_then(|g| guid_to_preview.get(g))
            .map(|(p, f)| ReplySnippet {
                preview: p.clone(),
                from_me: *f,
            });

        let edits = collect_edits(m, offset);

        let text = m.text.clone().filter(|s| !s.is_empty());
        let has_text = text.is_some();
        let has_attachments = !attachments.is_empty();

        let (image_idx, text_idx) = component_indices(m);
        // Reactions targeting a specific component
        let take_reactions = |comp: Option<usize>| -> Vec<Reaction> {
            let mut out = Vec::new();
            if let Some(c) = comp
                && let Some(rs) = tapbacks.get(&(m.guid.clone(), c))
            {
                out.extend(rs.iter().cloned());
            }
            out
        };
        // Anything not pinned to a known component falls back to the primary bubble.
        let known_indices: std::collections::HashSet<usize> =
            [image_idx, text_idx].into_iter().flatten().collect();
        let leftover_reactions: Vec<Reaction> = tapbacks
            .iter()
            .filter(|((g, idx), _)| g == &m.guid && !known_indices.contains(idx))
            .flat_map(|(_, rs)| rs.iter().cloned())
            .collect();

        if has_text && has_attachments {
            // Image bubble first (caption-style), then text bubble.
            let mut image_rs = take_reactions(image_idx);
            image_rs.extend(leftover_reactions.iter().take(0).cloned());
            bubbles.push(Bubble {
                from_me: m.is_from_me,
                sent_at,
                delivered_at: None,
                read_at: None,
                text: None,
                attachments,
                reply_to: reply_to.clone(),
                edits: Vec::new(),
                reactions: image_rs,
                is_deleted: m.is_deleted(),
                is_fully_unsent: false,
                last_outgoing_in_run: false,
            });

            let mut text_rs = take_reactions(text_idx);
            text_rs.extend(leftover_reactions);
            bubbles.push(Bubble {
                from_me: m.is_from_me,
                sent_at,
                delivered_at,
                read_at,
                text,
                attachments: Vec::new(),
                reply_to: None,
                edits,
                reactions: text_rs,
                is_deleted: m.is_deleted(),
                is_fully_unsent: m.is_fully_unsent(),
                last_outgoing_in_run: false,
            });
        } else {
            let mut reactions = take_reactions(image_idx);
            reactions.extend(take_reactions(text_idx));
            reactions.extend(leftover_reactions);

            bubbles.push(Bubble {
                from_me: m.is_from_me,
                sent_at,
                delivered_at,
                read_at,
                text,
                attachments,
                reply_to,
                edits,
                reactions,
                is_deleted: m.is_deleted(),
                is_fully_unsent: m.is_fully_unsent(),
                last_outgoing_in_run: false,
            });
        }
    }

    progress(Progress::Built {
        bubbles: bubbles.len(),
        attachments: attach_count,
        images: image_count,
    });

    for i in 0..bubbles.len() {
        if bubbles[i].from_me {
            let last = i + 1 >= bubbles.len() || !bubbles[i + 1].from_me;
            bubbles[i].last_outgoing_in_run = last;
        }
    }

    Ok(Conversation {
        label: chat.label().to_string(),
        bubbles,
    })
}

fn collect_attachments(
    db: &Connection,
    m: &Message,
    db_root: &Path,
    assets: &AssetDir,
    attach_count: &mut usize,
    image_count: &mut usize,
) -> Result<Vec<AttachmentOut>> {
    if !m.has_attachments() {
        return Ok(Vec::new());
    }
    let raw = Attachment::from_message(db, m).context("loading attachments")?;
    let mut out = Vec::with_capacity(raw.len());
    for a in raw {
        if matches!(a.extension(), Some("pluginPayloadAttachment")) {
            continue;
        }
        *attach_count += 1;
        let name = a.filename().unwrap_or("attachment").to_string();
        let is_image = matches!(a.mime_type(), MediaType::Image(_));
        let resolved = a.resolved_attachment_path(&Platform::macOS, db_root, None);
        let resolved_path = resolved.as_deref().map(std::path::Path::new);

        let (image_path, missing) = if is_image {
            match resolved_path {
                Some(p) if p.exists() => match assets.prepare_image(p) {
                    Some(prepared) => {
                        *image_count += 1;
                        (Some(prepared), false)
                    }
                    None => (None, true),
                },
                _ => (None, true),
            }
        } else {
            (None, resolved_path.map(|p| !p.exists()).unwrap_or(true))
        };

        out.push(AttachmentOut {
            name,
            size: u64::try_from(a.total_bytes).unwrap_or(0),
            image_path,
            missing,
        });
    }
    Ok(out)
}

fn collect_edits(m: &Message, offset: i64) -> Vec<EditedVersion> {
    use imessage_database::util::dates::get_local_time;

    let Some(edits) = m.edited_parts.as_ref() else {
        return Vec::new();
    };
    let mut out: Vec<EditedVersion> = Vec::new();
    for part in &edits.parts {
        if !matches!(part.status, EditStatus::Edited) {
            continue;
        }
        if part.edit_history.len() <= 1 {
            continue;
        }
        let prior = &part.edit_history[..part.edit_history.len() - 1];
        for EditedEvent { date, text, .. } in prior {
            if let Some(t) = text.as_ref().filter(|s| !s.is_empty()) {
                let when = get_local_time(*date, offset).ok();
                out.push(EditedVersion {
                    text: t.clone(),
                    date: when,
                });
            }
        }
    }
    out
}

fn tapback_to_emoji(t: &Tapback<'_>) -> String {
    match t {
        Tapback::Loved => "❤️".into(),
        Tapback::Liked => "👍".into(),
        Tapback::Disliked => "👎".into(),
        Tapback::Laughed => "😂".into(),
        Tapback::Emphasized => "‼️".into(),
        Tapback::Questioned => "❓".into(),
        Tapback::Emoji(Some(e)) => (*e).to_string(),
        Tapback::Emoji(None) => "·".into(),
        Tapback::Sticker => "🔖".into(),
    }
}

impl Clone for Reaction {
    fn clone(&self) -> Self {
        Self {
            emoji: self.emoji.clone(),
            from_me: self.from_me,
            removed: self.removed,
        }
    }
}
