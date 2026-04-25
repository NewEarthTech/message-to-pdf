mod assets;
mod contacts;
mod emoji;
mod font;
mod load;
mod model;
mod pdf;
mod picker;

use anyhow::{Context, Result};
use clap::Parser;
use std::path::PathBuf;

#[derive(Parser, Debug)]
#[command(
    name = "msg2pdf",
    version,
    about = "Export a 1:1 iMessage/SMS conversation from chat.db to PDF"
)]
struct Cli {
    /// Phone number or email of the other party. Omit to pick interactively.
    #[arg(short, long)]
    contact: Option<String>,

    /// Path to chat.db. Defaults to ~/Library/Messages/chat.db.
    #[arg(long)]
    db: Option<PathBuf>,

    /// Directory to write the PDF into. Defaults to the current directory.
    #[arg(short, long, default_value = ".")]
    out: PathBuf,
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    let db_path = load::resolve_db_path(cli.db)?;
    let db = load::open(&db_path)?;

    let directory = contacts::Directory::load();
    if directory.len() > 0 {
        eprintln!("(matched {} contact entries from AddressBook)", directory.len());
    }

    let chat = match cli.contact.as_deref() {
        Some(c) => load::resolve_contact(&db, &directory, c)?,
        None => picker::pick(&db, &directory)?,
    };

    let asset_dir = assets::AssetDir::new().context("creating asset dir")?;
    eprintln!("  asset dir: {}", asset_dir.root().display());

    eprintln!("loading {}…", chat.label());
    let conv = model::build(&db, &chat, &db_path, &asset_dir).context("building conversation")?;

    let stem = pdf::safe_filename(chat.label());
    let out = cli.out.join(format!("{stem}.pdf"));
    eprintln!("writing pdf → {}", out.display());
    pdf::write(&conv, &out).with_context(|| format!("writing {}", out.display()))?;

    let size = std::fs::metadata(&out).map(|m| m.len()).unwrap_or(0);
    println!("wrote {} ({} bytes)", out.display(), size);
    Ok(())
}
