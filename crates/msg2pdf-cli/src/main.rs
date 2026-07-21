mod picker;

use anyhow::{Context, Result, bail};
use clap::Parser;
use std::io::Write;
use std::path::PathBuf;

use msg2pdf_core::progress::Progress;
use msg2pdf_core::{assets, contacts, conversations, load, model, pdf};

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
    if !directory.is_empty() {
        eprintln!("(matched {} contact entries from AddressBook)", directory.len());
    }

    let chat = match cli.contact.as_deref() {
        Some(c) => load::resolve_contact(&db, &directory, c)?,
        None => {
            let summaries = conversations::list(&db, &directory)?;
            if summaries.is_empty() {
                bail!("no 1:1 chats found in chat.db");
            }
            picker::pick(summaries)?
        }
    };

    let asset_dir = assets::AssetDir::new().context("creating asset dir")?;
    eprintln!("  asset dir: {}", asset_dir.root().display());

    eprintln!("loading {}…", chat.label());
    let conv = model::build(&db, &chat, &db_path, &asset_dir, &mut render_progress)
        .context("building conversation")?;

    let stem = pdf::safe_filename(chat.label());
    let out = cli.out.join(format!("{stem}.pdf"));
    eprintln!("writing pdf → {}", out.display());
    pdf::write(&conv, &out).with_context(|| format!("writing {}", out.display()))?;

    let size = std::fs::metadata(&out).map(|m| m.len()).unwrap_or(0);
    println!("wrote {} ({} bytes)", out.display(), size);
    Ok(())
}

/// Render an export progress event to stderr, mirroring the engine's old inline logging.
fn render_progress(ev: Progress) {
    match ev {
        Progress::Streaming { count } => {
            eprint!("\r  streaming messages… {count}");
            let _ = std::io::stderr().flush();
        }
        Progress::Streamed { total } => {
            eprintln!("\r  streamed {total} messages                  ");
        }
        Progress::Note(s) => eprintln!("  {s}"),
        Progress::Building {
            done,
            total,
            attachments,
            images,
        } => {
            eprint!(
                "\r  building bubbles… {done}/{total} · {attachments} attachments · {images} images prepared"
            );
            let _ = std::io::stderr().flush();
        }
        Progress::Built {
            bubbles,
            attachments,
            images,
        } => {
            eprintln!(
                "\r  built {bubbles} bubbles · {attachments} attachments · {images} images prepared            "
            );
        }
    }
}
