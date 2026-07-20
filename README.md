# message-to-pdf

`msg2pdf` exports one iMessage or SMS conversation out of `chat.db` and into a PDF that looks like Messages: your bubbles blue on the right, theirs gray on the left, photos inline, tapbacks, replies, edit history, read receipts.

Apple ships no export. The good open source exporters emit HTML or plain text, which is right for search and archival and wrong for a document you can print, file, or hand to someone. This lays out the other thing: one conversation, paginated, looking about like it looked, so a thread worth keeping can outlive the phone.

## Requirements

macOS, a Rust toolchain, and **Full Disk Access** for whichever terminal you run this from. `chat.db` is protected, so without it every read fails on permissions; msg2pdf catches that case and prints the Settings path rather than passing along a bare SQLite error.

System Settings > Privacy & Security > Full Disk Access > add Terminal, iTerm, or your editor.

Photo conversion shells out to `/usr/bin/sips`, which is already on every Mac. Nothing else to install.

## Usage

```sh
cargo build --release

./target/release/msg2pdf                              # pick from a list
./target/release/msg2pdf --contact +15555550123       # or name one
./target/release/msg2pdf --contact someone@example.com --out ~/Desktop
```

With no `--contact` it opens a fuzzy picker over every 1:1 chat, newest first, each row carrying the contact name, the message count, and the date of the last message. `--db` reads a `chat.db` from somewhere else, a backup for instance. `--out` picks the output directory; the filename comes from the contact, sanitized.

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

- `load.rs`: opens `chat.db` read-only and resolves the conversation. A 1:1 chat is a `chat` row with exactly one joined handle, so group chats fall out of the query; when a handle exists but only inside group chats, it says that instead of reporting nothing found.
- `contacts.rs`: reads the macOS AddressBook to turn handles into names. Numbers key on digits alone with both US forms inserted, so `+1 (555) 555-0123` and `5555550123` land on the same person. No readable AddressBook just means handles stay raw.
- `model.rs`: streams messages through `imessage-database`, then pulls tapbacks out and buckets them by target GUID and component index. **A message carrying both a photo and text becomes two bubbles**, photo first, and that component index is what routes each reaction to the right one. Get it wrong and the heart lands on the wrong half.
- `assets.rs`: converts each photo to a JPEG capped at 1200px with `sips`, then reads the EXIF orientation and rotates the pixels itself before dropping the tag. PDF has no orientation flag, so a portrait photo that merely claims to be upright arrives on its side. Staging is a temp directory removed on drop.
- `emoji.rs`: walks grapheme clusters and asks Twemoji whether each one is an emoji, splitting text into words, spaces, newlines, and emoji. Emoji draw as images inline with the text run, and each distinct glyph is embedded once and reused.
- `font.rs`: DejaVu Sans and DejaVu Sans Bold compiled into the binary, with advance widths read from the TTF so a line can be measured before it is drawn.
- `pdf.rs`: the layout engine. US Letter, 36pt margins, a single cursor walking down the page. Each bubble is measured whole, wrapped text and photo block and reply header and reactions and receipt together, then starts a new page when all of it will not clear the bottom margin.

## Limits

1:1 only; group chats are refused at the door. macOS only by construction, since the paths, the AddressBook schema, and `sips` all belong to Apple. Photos embed, while video and audio and documents are listed but not rendered. The conversation is assembled in memory before a byte is written, which is comfortable for years of one thread and would not be for a decade of a busy one.

## Privacy

Nothing leaves the machine: no network calls, no telemetry, and `chat.db` is opened read-only. Exports are private by definition, so the repo refuses to track `*.pdf` and `*.html` at the root.

## License

GPL-3.0-or-later, following [`imessage-database`](https://github.com/ReagentX/imessage-exporter), which is GPL and does the hard work of reading Apple's schema. DejaVu Sans is bundled under its own permissive license.
