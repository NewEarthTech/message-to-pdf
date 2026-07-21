//! msg2pdf export engine.
//!
//! Reads one 1:1 iMessage/SMS conversation out of `chat.db` and lays it out as a
//! PDF that looks like Messages. This crate is the shared engine behind both the
//! `msg2pdf` CLI and the desktop app; it does no interactive I/O of its own and
//! reports progress through a caller-supplied [`progress::Progress`] sink.

pub mod assets;
pub mod contacts;
pub mod conversations;
pub mod load;
pub mod model;
pub mod pdf;
pub mod progress;

mod emoji;
mod font;
