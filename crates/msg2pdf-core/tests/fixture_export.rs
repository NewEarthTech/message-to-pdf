//! End-to-end coverage against the synthetic fixture: the engine lists the fixture
//! conversations and exports one to a valid PDF, with no real chat.db or AddressBook.

use msg2pdf_core::progress::Progress;
use msg2pdf_core::{assets, contacts, conversations, load, model, pdf};
use std::path::PathBuf;

fn temp_path(name: &str) -> PathBuf {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    std::env::temp_dir().join(format!("msg2pdf-test-{}-{nanos}-{name}", std::process::id()))
}

#[test]
fn lists_fixture_conversations_newest_first() {
    let db_path = temp_path("list.db");
    msg2pdf_fixture::create(&db_path).unwrap();
    let db = load::open(&db_path).unwrap();

    let convs = conversations::list(&db, &contacts::Directory::empty()).unwrap();
    assert_eq!(convs.len(), 3, "fixture has three 1:1 conversations");

    // Newest last-message first: Alex (2024-06-10), Sam (2024-05-20), raw handle (2024-03-01).
    assert_eq!(convs[0].name(), "Alex Rivera");
    assert_eq!(convs[0].message_count, 6);
    assert_eq!(convs[1].name(), "Sam Chen");
    assert_eq!(convs[1].message_count, 3);
    // The third chat has no display name and no contact, so it falls back to the handle.
    assert_eq!(convs[2].name(), "+15559876543");

    std::fs::remove_file(&db_path).ok();
}

#[test]
fn exports_fixture_conversation_to_valid_pdf() {
    let db_path = temp_path("export.db");
    msg2pdf_fixture::create(&db_path).unwrap();
    let db = load::open(&db_path).unwrap();

    let chat = load::resolve_contact(&db, &contacts::Directory::empty(), "+15551234567").unwrap();
    let asset_dir = assets::AssetDir::new().unwrap();
    let conv = model::build(&db, &chat, &db_path, &asset_dir, &mut |_: Progress| {}).unwrap();
    assert!(!conv.bubbles.is_empty(), "conversation has bubbles");

    let out = temp_path("export.pdf");
    pdf::write(&conv, &out).unwrap();
    let bytes = std::fs::read(&out).unwrap();
    assert!(bytes.starts_with(b"%PDF"), "produces a valid PDF");

    std::fs::remove_file(&db_path).ok();
    std::fs::remove_file(&out).ok();
}
