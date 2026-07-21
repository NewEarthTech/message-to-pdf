//! Export progress events.
//!
//! [`model::build`](crate::model::build) reports its work through a
//! `&mut dyn FnMut(Progress)` sink so the caller decides how to surface it: the
//! CLI renders these to stderr, the desktop app forwards them as IPC events.

/// A step of progress while assembling a conversation.
#[derive(Debug, Clone)]
pub enum Progress {
    /// Messages are streaming out of `chat.db`; `count` seen so far.
    Streaming { count: usize },
    /// The message stream finished with `total` rows.
    Streamed { total: usize },
    /// A free-form status line (e.g. the regular/tapback split).
    Note(String),
    /// Bubbles are being built: `done` of `total` messages, with running
    /// attachment and prepared-image counts.
    Building {
        done: usize,
        total: usize,
        attachments: usize,
        images: usize,
    },
    /// Bubble assembly finished.
    Built {
        bubbles: usize,
        attachments: usize,
        images: usize,
    },
    /// Unique emoji glyphs preloaded before layout.
    PreloadedEmoji { glyphs: usize },
    /// Laying bubbles onto pages: `done` of `total`, across `pages` so far.
    LayingOut {
        done: usize,
        total: usize,
        pages: usize,
    },
    /// Layout finished: `bubbles` placed across `pages`.
    LaidOut { bubbles: usize, pages: usize },
    /// Serializing the laid-out document to PDF bytes.
    Serializing,
    /// The PDF serialized to `bytes` bytes.
    Serialized { bytes: usize },
}
