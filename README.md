# Sheaf

Sheaf exports one iMessage or SMS conversation out of your Mac's `chat.db` and into a PDF that looks like Messages: your bubbles blue on the right, theirs gray on the left, photos inline, tapbacks, replies, edit history, read receipts.

Apple ships no export. The good open source exporters emit HTML or plain text, which is right for search and archival and wrong for a document you can print, file, or hand to someone. Sheaf lays out the other thing: one conversation, paginated, looking about like it looked, so a thread worth keeping can outlive the phone.

Everything happens on your Mac. Nothing is uploaded.

## Get Sheaf

Sheaf is a Mac app, and it's free software (GPL-3.0). Two ways to run it:

- **Buy the build.** A signed, notarized, universal app that opens with a double-click — one-time $29, no subscription, 14-day refund. It's the same program you can build below; paying skips the toolchain and supports the work. → *[sheaf website — link at launch]*
- **Build it yourself.** It's all here. Instructions below.

## Build from source

This is a Cargo workspace: a shared engine (`msg2pdf-core`), a command-line tool (`msg2pdf`), and the desktop app (**Sheaf**, built with [Tauri](https://tauri.app)). You need macOS, a [Rust toolchain](https://rustup.rs), and — for the app — [pnpm](https://pnpm.io). Photo conversion shells out to `/usr/bin/sips`, already on every Mac; nothing else to install.

### The desktop app

```sh
cd apps/desktop
pnpm install
pnpm tauri dev      # build and run against a synthetic fixture (no real data, no permissions needed)
```

A debug run reads a seeded fixture database, so you can try the whole UI without touching your own messages. Point it at a real database with `MSG2PDF_DB=/path/to/chat.db pnpm tauri dev`. A release build (`pnpm tauri build`) reads `~/Library/Messages/chat.db` and is what the distributed app is made from; it signs with the maintainer's Apple Developer ID, so building your own distributable means supplying your own identity (or just running `tauri dev`).

On first launch a release build asks for **Full Disk Access** — macOS keeps `chat.db` private, and this is the switch that lets Sheaf read it, locally. The app walks you through it.

### The command-line tool

```sh
cargo build --release

./target/release/msg2pdf                              # pick from a list
./target/release/msg2pdf --contact +15555550123       # or name one
./target/release/msg2pdf --contact someone@example.com --out ~/Desktop
```

The CLI reads `chat.db` directly, so grant Full Disk Access to whichever terminal you run it from (System Settings → Privacy & Security → Full Disk Access → add Terminal, iTerm, or your editor). With no `--contact` it opens a fuzzy picker over every 1:1 chat, newest first. `--db` reads a `chat.db` from elsewhere (a backup, say); `--out` picks the output directory.

## What ends up in the PDF

- **Bubbles** in Messages' proportions: 72% of the content width at most, 12pt corners, iMessage blue for you and system gray for them, tight within a run and looser when the speaker changes.
- **Date separators** when an hour goes by or the calendar day turns over.
- **Photos** inline, one large or tiled: two across, three across, 2x2 for four, three across past that.
- **Other attachments** as a chip with filename and size. Files iCloud has evicted from disk are marked missing rather than dropped quietly.
- **Tapbacks** on the bubble they were actually aimed at, including one aimed at the photo half of a photo-plus-text message.
- **Replies** carrying a snippet of whatever was replied to.
- **Edits**: every earlier version, dated, beneath the final text. Unsent messages hold their place as markers.
- **Receipts** on the last message of each of your runs, the way Messages does it, with Read winning over Delivered when both exist.
- **Color emoji** from Twemoji PNGs, since the embedded text font has no color glyphs.

## How it works

The engine lives in `msg2pdf-core`; the CLI and the app are thin shells over it.

- `load.rs`: opens `chat.db` read-only and resolves the conversation. A 1:1 chat is a `chat` row with exactly one joined handle, so group chats fall out of the query; when a handle exists but only inside group chats, it says that instead of reporting nothing found. It also tells "protected" (needs Full Disk Access) apart from "not there," which drives the app's onboarding.
- `contacts.rs`: reads the macOS AddressBook to turn handles into names. Numbers key on digits alone with both US forms inserted, so `+1 (555) 555-0123` and `5555550123` land on the same person. No readable AddressBook just means handles stay raw.
- `model.rs`: streams messages through `imessage-database`, then pulls tapbacks out and buckets them by target GUID and component index. **A message carrying both a photo and text becomes two bubbles**, photo first, and that component index is what routes each reaction to the right one.
- `assets.rs`: converts each photo to a JPEG capped at 1200px with `sips`, then reads the EXIF orientation and rotates the pixels itself before dropping the tag. PDF has no orientation flag, so a portrait photo that merely claims to be upright would otherwise arrive on its side. Staging is a temp directory removed on drop.
- `emoji.rs` / `font.rs`: DejaVu Sans and DejaVu Sans Bold are compiled into the binary with advance widths read from the TTF, so a line can be measured before it is drawn; color emoji draw as Twemoji images inline, each distinct glyph embedded once.
- `pdf.rs`: the layout engine. US Letter, 36pt margins, a single cursor walking down the page. Each bubble is measured whole — wrapped text, photo block, reply header, reactions, receipt — then starts a new page when all of it will not clear the bottom margin.

The app reports progress through a sink the engine calls as it works, and runs the whole export off the UI thread so a large conversation never freezes the window.

## Project layout

```
crates/
  msg2pdf-core/     the engine (load, contacts, model, assets, pdf, …)
  msg2pdf-cli/      the `msg2pdf` command-line tool
  msg2pdf-fixture/  a synthetic chat.db for tests and dev (no real data, ever)
apps/desktop/       the Sheaf app — Tauri (Rust) + React/Vite/Tailwind
```

Internal crate and binary names stay `msg2pdf`; the product is Sheaf.

## Limits

1:1 conversations only; group chats are refused at the door. macOS only by construction, since the paths, the AddressBook schema, and `sips` all belong to Apple. Photos embed, while video and audio and documents are listed but not rendered. The conversation is assembled in memory before a byte is written, which is comfortable for years of one thread and would not be for a decade of a busy one.

## Privacy

Nothing leaves the machine: no network calls, no telemetry, and `chat.db` is opened read-only. Exports are private by definition, so the repo refuses to track `*.pdf` and `*.html` at the root.

## License

GPL-3.0-or-later. Sheaf is built on two libraries by [ReagentX](https://github.com/ReagentX), both GPL, that do the hard work of reading Apple's data: [`imessage-database`](https://github.com/ReagentX/imessage-exporter) (the Messages schema) and [`crabstep`](https://github.com/ReagentX/crabstep) (the `typedstream` blobs Apple stores message bodies in). Because they are GPL, Sheaf is too — copyleft all the way down. DejaVu Sans is bundled under its own permissive license. The full license text is in [LICENSE](LICENSE).
