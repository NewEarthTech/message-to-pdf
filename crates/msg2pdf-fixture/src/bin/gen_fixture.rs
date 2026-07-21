//! Write the synthetic fixture database to a path (default `fixture.db`).
//!
//! Usage: `cargo run -p msg2pdf-fixture --bin gen-fixture -- [path]`

use anyhow::Result;
use std::path::PathBuf;

fn main() -> Result<()> {
    let path = std::env::args()
        .nth(1)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("fixture.db"));
    msg2pdf_fixture::create(&path)?;
    println!("wrote fixture db → {}", path.display());
    Ok(())
}
