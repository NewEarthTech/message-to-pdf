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
    let conv = model::build(
        &db,
        &chat,
        &db_path,
        &asset_dir,
        &model::DateRange::default(),
        &mut |_: Progress| {},
    )
    .unwrap();
    assert!(!conv.bubbles.is_empty(), "conversation has bubbles");

    let has_rendered_image = conv
        .bubbles
        .iter()
        .flat_map(|b| &b.attachments)
        .any(|a| a.image_path.is_some() && !a.missing);
    assert!(has_rendered_image, "the fixture's attachment renders as an inline image");

    let out = temp_path("export.pdf");
    pdf::write(&conv, &out, &mut |_: Progress| {}).unwrap();
    let bytes = std::fs::read(&out).unwrap();
    assert!(bytes.starts_with(b"%PDF"), "produces a valid PDF");

    std::fs::remove_file(&db_path).ok();
    std::fs::remove_file(&out).ok();
}

#[test]
fn build_respects_date_range() {
    let db_path = temp_path("range.db");
    msg2pdf_fixture::create(&db_path).unwrap();
    let db = load::open(&db_path).unwrap();
    let chat = load::resolve_contact(&db, &contacts::Directory::empty(), "+15551234567").unwrap();
    let asset_dir = assets::AssetDir::new().unwrap();

    // Chat 1's messages are all on 2024-06-10; full history keeps them.
    let full = model::build(
        &db,
        &chat,
        &db_path,
        &asset_dir,
        &model::DateRange::default(),
        &mut |_: Progress| {},
    )
    .unwrap();
    assert!(full.bubbles.len() >= 5, "full history keeps the messages");

    // A window starting the next day filters everything out.
    let after = model::DateRange {
        start: Some("2024-06-11".to_string()),
        end: None,
    };
    let filtered = model::build(&db, &chat, &db_path, &asset_dir, &after, &mut |_: Progress| {})
        .unwrap();
    assert!(filtered.bubbles.is_empty(), "no messages on or after 2024-06-11");

    std::fs::remove_file(&db_path).ok();
}

#[test]
fn check_access_reports_readable_and_missing() {
    let db_path = temp_path("access.db");
    msg2pdf_fixture::create(&db_path).unwrap();
    assert_eq!(load::check_access(&db_path), load::Access::Readable);

    std::fs::remove_file(&db_path).ok();
    assert_eq!(load::check_access(&db_path), load::Access::Missing);
}
