use anyhow::{Context, Result};
use chrono::{DateTime, Datelike, Local, TimeDelta};
use printpdf::{
    Color, FontId, Line, LinePoint, Mm, Op, PaintMode, ParsedFont, PdfDocument, PdfFontHandle,
    PdfPage, PdfSaveOptions, Point, Polygon, PolygonRing, Pt, RawImage, Rgb, TextItem, WindingOrder,
    XObjectId, XObjectTransform,
};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

use crate::emoji::{
    EmojiAtlas, Token, draw_emoji, line_width, tokenize, wrap_tokens,
};
use crate::font::{BOLD_TTF, Metrics, REGULAR_TTF};
use crate::model::{AttachmentOut, Bubble, Conversation, EditedVersion, Reaction, ReplySnippet};
use std::collections::HashSet;

const PAGE_W: f32 = 612.0;
const PAGE_H: f32 = 792.0;
const MARGIN_X: f32 = 36.0;
const MARGIN_Y: f32 = 36.0;
const CONTENT_TOP: f32 = PAGE_H - MARGIN_Y;
const CONTENT_BOTTOM: f32 = MARGIN_Y;
const CONTENT_W: f32 = PAGE_W - 2.0 * MARGIN_X;

const BUBBLE_MAX_W: f32 = CONTENT_W * 0.72;
const BUBBLE_PAD_X: f32 = 9.0;
const BUBBLE_PAD_Y: f32 = 5.0;
const BUBBLE_RADIUS: f32 = 12.0;
const TEXT_SIZE: f32 = 9.5;
const LINE_HEIGHT: f32 = 12.0;
const BUBBLE_GAP: f32 = 2.0;
const RUN_GAP: f32 = 8.0;
const DATE_SEP_SIZE: f32 = 8.5;
const DATE_SEP_GAP: f32 = 12.0;
const RECEIPT_SIZE: f32 = 7.5;
const REPLY_SIZE: f32 = 8.0;
const EDIT_SIZE: f32 = 8.0;
const HEADER_TITLE_SIZE: f32 = 13.0;
const HEADER_META_SIZE: f32 = 9.0;
const REACTION_SIZE: f32 = 9.0;
const IMAGE_MAX_W: f32 = 360.0;
const IMAGE_MAX_H: f32 = 380.0;
const IMAGE_GAP: f32 = 4.0;
const DATE_GAP_MINUTES: i64 = 60;

const ME_BG: Rgb = Rgb { r: 0.0, g: 0.478, b: 1.0, icc_profile: None };
const THEM_BG: Rgb = Rgb { r: 0.898, g: 0.898, b: 0.918, icc_profile: None };
const ME_FG: Rgb = Rgb { r: 1.0, g: 1.0, b: 1.0, icc_profile: None };
const THEM_FG: Rgb = Rgb { r: 0.110, g: 0.110, b: 0.118, icc_profile: None };
const MUTED: Rgb = Rgb { r: 0.557, g: 0.557, b: 0.576, icc_profile: None };
const HAIRLINE: Rgb = Rgb { r: 0.898, g: 0.898, b: 0.918, icc_profile: None };

pub fn write(conv: &Conversation, out: &Path) -> Result<()> {
    use std::io::Write;

    let metrics_regular = Metrics::new(REGULAR_TTF);
    let metrics_bold = Metrics::new(BOLD_TTF);

    let mut doc = PdfDocument::new(&conv.label);
    let regular = ParsedFont::from_bytes(REGULAR_TTF, 0, &mut Vec::new())
        .context("parsing regular font")?;
    let bold = ParsedFont::from_bytes(BOLD_TTF, 0, &mut Vec::new())
        .context("parsing bold font")?;
    let font_regular = doc.add_font(&regular);
    let font_bold = doc.add_font(&bold);

    let mut images: HashMap<PathBuf, ImageRef> = HashMap::new();

    let mut atlas = EmojiAtlas::new();
    preload_emojis(conv, &mut doc, &mut atlas);
    eprintln!("  preloaded {} unique emoji glyphs", atlas.len());

    let mut layout = Layout {
        pages: vec![PageOps::default()],
        cursor_y: CONTENT_TOP,
        font_regular,
        font_bold,
        metrics_regular,
        metrics_bold,
        atlas: &atlas,
        last_from_me: None,
    };

    layout.draw_header(conv);

    let total = conv.bubbles.len();
    let mut last_log = std::time::Instant::now();
    let mut prev_time: Option<DateTime<Local>> = None;

    for (idx, b) in conv.bubbles.iter().enumerate() {
        if should_insert_date_sep(prev_time, b.sent_at) {
            layout.draw_date_separator(&format_date_sep(b.sent_at));
        }
        let prepared = b
            .attachments
            .iter()
            .map(|a| (a, prepare_image(&mut doc, &mut images, a)))
            .collect::<Vec<_>>();
        layout.draw_bubble(b, &prepared);
        prev_time = Some(b.sent_at);

        if last_log.elapsed() >= std::time::Duration::from_millis(500) {
            eprint!(
                "\r  laying out… {idx}/{total} bubbles · {} pages",
                layout.pages.len()
            );
            let _ = std::io::stderr().flush();
            last_log = std::time::Instant::now();
        }
    }
    eprintln!(
        "\r  laid out {} bubbles across {} pages              ",
        total,
        layout.pages.len()
    );

    let pages: Vec<PdfPage> = layout
        .pages
        .into_iter()
        .map(|p| PdfPage::new(Mm(215.9), Mm(279.4), p.ops))
        .collect();

    eprint!("  serializing pdf…");
    let _ = std::io::stderr().flush();
    let mut warnings = Vec::new();
    let bytes = doc
        .with_pages(pages)
        .save(&PdfSaveOptions::default(), &mut warnings);
    eprintln!(" {} bytes", bytes.len());
    for w in warnings.iter().take(5) {
        eprintln!("  pdf-warn: {w:?}");
    }

    if let Some(parent) = out.parent()
        && !parent.as_os_str().is_empty()
    {
        std::fs::create_dir_all(parent).ok();
    }
    std::fs::write(out, &bytes).with_context(|| format!("writing {}", out.display()))?;
    Ok(())
}

#[derive(Clone)]
struct ImageRef {
    id: XObjectId,
    w: f32,
    h: f32,
}

fn prepare_image(
    doc: &mut PdfDocument,
    cache: &mut HashMap<PathBuf, ImageRef>,
    a: &AttachmentOut,
) -> Option<ImageRef> {
    let path = a.image_path.as_ref()?;
    if let Some(existing) = cache.get(path) {
        return Some(existing.clone());
    }
    let bytes = match std::fs::read(path) {
        Ok(b) => b,
        Err(e) => {
            eprintln!("  warn: read {}: {e}", path.display());
            return None;
        }
    };
    let mut decode_warnings = Vec::new();
    let raw = match RawImage::decode_from_bytes(&bytes, &mut decode_warnings) {
        Ok(r) => r,
        Err(e) => {
            eprintln!(
                "  warn: decode {}: {e:?} (warnings: {})",
                path.display(),
                decode_warnings.len()
            );
            return None;
        }
    };
    let w = raw.width as f32;
    let h = raw.height as f32;
    let id = doc.add_image(&raw);
    let r = ImageRef { id, w, h };
    cache.insert(path.clone(), r.clone());
    Some(r)
}

#[derive(Default)]
struct PageOps {
    ops: Vec<Op>,
}

struct Layout<'a> {
    pages: Vec<PageOps>,
    cursor_y: f32,
    font_regular: FontId,
    font_bold: FontId,
    metrics_regular: Metrics<'a>,
    metrics_bold: Metrics<'a>,
    atlas: &'a EmojiAtlas,
    last_from_me: Option<bool>,
}

fn preload_emojis(conv: &Conversation, doc: &mut PdfDocument, atlas: &mut EmojiAtlas) {
    let mut seen: HashSet<String> = HashSet::new();
    let scan = |s: &str| -> Vec<String> {
        let mut emojis = Vec::new();
        for tok in tokenize(s) {
            if let Token::Emoji(g) = tok {
                emojis.push(g);
            }
        }
        emojis
    };
    for b in &conv.bubbles {
        if let Some(t) = &b.text {
            for g in scan(t) {
                if seen.insert(g.clone()) {
                    atlas.get_or_load(doc, &g);
                }
            }
        }
        for r in &b.reactions {
            if seen.insert(r.emoji.clone()) {
                atlas.get_or_load(doc, &r.emoji);
            }
        }
        if let Some(reply) = &b.reply_to {
            for g in scan(&reply.preview) {
                if seen.insert(g.clone()) {
                    atlas.get_or_load(doc, &g);
                }
            }
        }
        for e in &b.edits {
            for g in scan(&e.text) {
                if seen.insert(g.clone()) {
                    atlas.get_or_load(doc, &g);
                }
            }
        }
    }
}

impl<'a> Layout<'a> {
    fn current(&mut self) -> &mut PageOps {
        self.pages.last_mut().unwrap()
    }

    fn new_page(&mut self) {
        self.pages.push(PageOps::default());
        self.cursor_y = CONTENT_TOP;
    }

    fn ensure_room(&mut self, height: f32) {
        if self.cursor_y - height < CONTENT_BOTTOM {
            self.new_page();
        }
    }

    fn advance(&mut self, dy: f32) {
        self.cursor_y -= dy;
    }

    fn draw_header(&mut self, conv: &Conversation) {
        let title_w = self.metrics_bold.text_width_pt(&conv.label, HEADER_TITLE_SIZE);
        let title_x = (PAGE_W - title_w) / 2.0;
        self.advance(2.0);
        self.draw_text(
            &conv.label,
            title_x,
            self.cursor_y - HEADER_TITLE_SIZE,
            HEADER_TITLE_SIZE,
            true,
            &THEM_FG,
        );
        self.advance(HEADER_TITLE_SIZE + 4.0);

        let now = Local::now();
        let meta = format!(
            "{} messages · exported {}",
            conv.bubbles.len(),
            now.format("%Y-%m-%d %H:%M")
        );
        let meta_w = self.metrics_regular.text_width_pt(&meta, HEADER_META_SIZE);
        let meta_x = (PAGE_W - meta_w) / 2.0;
        self.draw_text(
            &meta,
            meta_x,
            self.cursor_y - HEADER_META_SIZE,
            HEADER_META_SIZE,
            false,
            &MUTED,
        );
        self.advance(HEADER_META_SIZE + 10.0);

        let line = Line {
            points: vec![
                LinePoint {
                    p: Point { x: Pt(MARGIN_X), y: Pt(self.cursor_y) },
                    bezier: false,
                },
                LinePoint {
                    p: Point { x: Pt(PAGE_W - MARGIN_X), y: Pt(self.cursor_y) },
                    bezier: false,
                },
            ],
            is_closed: false,
        };
        self.current().ops.push(Op::SetOutlineColor { col: Color::Rgb(HAIRLINE) });
        self.current().ops.push(Op::SetOutlineThickness { pt: Pt(0.5) });
        self.current().ops.push(Op::DrawLine { line });
        self.advance(8.0);
    }

    fn draw_date_separator(&mut self, text: &str) {
        let h = DATE_SEP_SIZE + DATE_SEP_GAP;
        self.ensure_room(h);
        self.advance(DATE_SEP_GAP / 2.0);
        let w = self.metrics_regular.text_width_pt(text, DATE_SEP_SIZE);
        let x = (PAGE_W - w) / 2.0;
        self.draw_text(text, x, self.cursor_y - DATE_SEP_SIZE, DATE_SEP_SIZE, false, &MUTED);
        self.advance(DATE_SEP_SIZE + DATE_SEP_GAP / 2.0);
    }

    fn draw_bubble(&mut self, b: &Bubble, attachments: &[(&AttachmentOut, Option<ImageRef>)]) {
        let inner_w_max = BUBBLE_MAX_W - 2.0 * BUBBLE_PAD_X;

        // Wrap text into token lines.
        let mut text_lines: Vec<Vec<Token>> = Vec::new();
        if let Some(t) = b.text.as_deref() {
            text_lines.extend(wrap_tokens(
                tokenize(t),
                inner_w_max,
                &self.metrics_regular,
                TEXT_SIZE,
            ));
        }
        if b.is_fully_unsent && text_lines.is_empty() {
            text_lines.push(vec![Token::Word("Unsent message".to_string())]);
        }

        let mut raw_images: Vec<ImageRef> = Vec::new();
        let mut stub_lines: Vec<Vec<Token>> = Vec::new();
        for (a, img) in attachments {
            match img {
                Some(r) => raw_images.push(r.clone()),
                None => {
                    let label = if a.missing {
                        format!("[ {} — not downloaded ]", a.name)
                    } else {
                        format!("[ {} · {} ]", a.name, human_size(a.size))
                    };
                    stub_lines.extend(wrap_tokens(
                        tokenize(&label),
                        inner_w_max,
                        &self.metrics_regular,
                        TEXT_SIZE,
                    ));
                }
            }
        }

        let text_block_lines = text_lines.len() + stub_lines.len();
        let naked_image = text_block_lines == 0 && !raw_images.is_empty();

        // Compute image placements: 1 image = single large; N>1 = wrapped grid.
        let placements = layout_images(&raw_images, naked_image);
        let images_block_w = placements.block_w;
        let images_block_h = placements.block_h;

        let mut content_w: f32 = 0.0;
        for line in text_lines.iter().chain(stub_lines.iter()) {
            content_w = content_w.max(line_width(line, &self.metrics_regular, TEXT_SIZE));
        }
        content_w = content_w.max(images_block_w);

        let bubble_w = if naked_image {
            content_w.clamp(40.0, BUBBLE_MAX_W)
        } else {
            (content_w + 2.0 * BUBBLE_PAD_X).clamp(40.0, BUBBLE_MAX_W)
        };

        let mut inner_h: f32 = 0.0;
        if text_block_lines > 0 {
            inner_h += text_block_lines as f32 * LINE_HEIGHT;
        }
        if !raw_images.is_empty() {
            if text_block_lines > 0 {
                inner_h += IMAGE_GAP;
            }
            inner_h += images_block_h;
        }
        if inner_h < LINE_HEIGHT {
            inner_h = LINE_HEIGHT;
        }
        let bubble_h = if naked_image {
            inner_h
        } else {
            inner_h + 2.0 * BUBBLE_PAD_Y
        };

        // Total vertical envelope.
        let reply_h = if b.reply_to.is_some() { REPLY_SIZE + 4.0 } else { 0.0 };
        let edits_h = if !b.edits.is_empty() {
            (b.edits.len() as f32) * (EDIT_SIZE + 1.0) + EDIT_SIZE + 1.0 + 2.0
        } else {
            0.0
        };
        // Reaction chip overlaps the bubble bottom by ~half its height; reserve the
        // protruding half plus a small buffer so the next bubble can't collide with it.
        let reactions_h = if !b.reactions.is_empty() {
            REACTION_SIZE * 0.55 + 4.0
        } else {
            0.0
        };
        let receipt_h = if b.last_outgoing_in_run && (b.delivered_at.is_some() || b.read_at.is_some())
        {
            RECEIPT_SIZE + 2.0
        } else {
            0.0
        };
        // Extra space when sender flips between turns.
        let pre_gap = match self.last_from_me {
            Some(prev) if prev != b.from_me => RUN_GAP,
            _ => 0.0,
        };
        let total_h = pre_gap + reply_h + bubble_h + reactions_h + edits_h + receipt_h + BUBBLE_GAP;
        self.ensure_room(total_h);
        if pre_gap > 0.0 {
            self.advance(pre_gap);
        }

        if let Some(reply) = &b.reply_to {
            self.draw_reply(reply, b.from_me);
        }

        let bubble_x = if b.from_me {
            PAGE_W - MARGIN_X - bubble_w
        } else {
            MARGIN_X
        };
        let bubble_top = self.cursor_y;
        let bubble_bottom = bubble_top - bubble_h;

        let bg = if b.from_me { ME_BG } else { THEM_BG };
        let fg = if b.from_me { ME_FG } else { THEM_FG };

        if !naked_image {
            let polygon = rounded_rect(bubble_x, bubble_bottom, bubble_w, bubble_h, BUBBLE_RADIUS);
            self.current().ops.push(Op::SetFillColor { col: Color::Rgb(bg) });
            self.current().ops.push(Op::DrawPolygon { polygon });
        }

        // Text content (skipped for naked image bubbles).
        let text_x = bubble_x + BUBBLE_PAD_X;
        let mut y = if naked_image {
            bubble_top - TEXT_SIZE
        } else {
            bubble_top - BUBBLE_PAD_Y - TEXT_SIZE
        };
        for line in text_lines.iter().chain(stub_lines.iter()) {
            self.draw_token_line(line, text_x, y, TEXT_SIZE, false, &fg);
            y -= LINE_HEIGHT;
        }

        if !raw_images.is_empty() {
            if text_block_lines > 0 {
                y -= IMAGE_GAP;
            } else {
                y += LINE_HEIGHT;
            }
            let grid_left = bubble_x + (bubble_w - images_block_w) / 2.0;
            let grid_top = y;
            for cell in &placements.cells {
                let img_x = grid_left + cell.dx;
                let img_y = grid_top - cell.dy - cell.dh;
                let scale = cell.dw / cell.img.w;
                self.current().ops.push(Op::UseXobject {
                    id: cell.img.id.clone(),
                    transform: XObjectTransform {
                        translate_x: Some(Pt(img_x)),
                        translate_y: Some(Pt(img_y)),
                        scale_x: Some(scale),
                        scale_y: Some(scale),
                        dpi: Some(72.0),
                        ..Default::default()
                    },
                });
            }
            let _ = grid_top - images_block_h;
        }

        self.cursor_y = bubble_bottom;

        // Reactions overlap the bubble's BOTTOM corner; advance cursor past the chip overhang.
        if !b.reactions.is_empty() {
            self.draw_reactions(&b.reactions, bubble_x, bubble_w, bubble_bottom, b.from_me);
        }

        self.advance(BUBBLE_GAP);

        if !b.edits.is_empty() {
            self.draw_edits(&b.edits, b.from_me);
        }
        if b.last_outgoing_in_run && (b.delivered_at.is_some() || b.read_at.is_some()) {
            self.draw_receipt(b);
        }
        self.last_from_me = Some(b.from_me);
    }

    fn draw_reply(&mut self, r: &ReplySnippet, from_me: bool) {
        let prefix = if r.from_me { "↪ You: " } else { "↪ them: " };
        let text = format!("{prefix}{}", truncate(&r.preview, 80));
        let tokens = tokenize(&text);
        let w = line_width(&tokens, &self.metrics_regular, REPLY_SIZE);
        let x = if from_me { PAGE_W - MARGIN_X - w } else { MARGIN_X };
        self.draw_token_line(&tokens, x, self.cursor_y - REPLY_SIZE, REPLY_SIZE, false, &MUTED);
        self.advance(REPLY_SIZE + 4.0);
    }

    fn draw_reactions(
        &mut self,
        rs: &[Reaction],
        bubble_x: f32,
        bubble_w: f32,
        bubble_bottom: f32,
        bubble_from_me: bool,
    ) {
        const CHIP_PAD_X: f32 = 3.0;
        const CHIP_PAD_Y: f32 = 1.5;
        const CHIP_GAP: f32 = 2.0;

        let emoji_size = REACTION_SIZE;
        let chip_h = emoji_size + 2.0 * CHIP_PAD_Y;

        let chip_widths: Vec<f32> = rs
            .iter()
            .map(|r| {
                let w_inner = if let Some(img) = self.atlas.get(&r.emoji) {
                    let scale = emoji_size / img.h as f32;
                    img.w as f32 * scale
                } else {
                    self.metrics_regular.text_width_pt(&r.emoji, emoji_size)
                };
                w_inner + 2.0 * CHIP_PAD_X
            })
            .collect();
        let total_w = chip_widths.iter().sum::<f32>()
            + (rs.len().saturating_sub(1) as f32) * CHIP_GAP;

        // Same horizontal corner as before — opposite of the bubble's side.
        // received bubble → right corner; sent bubble → left corner.
        let start_x = if bubble_from_me {
            bubble_x - chip_widths.first().copied().unwrap_or(0.0) / 2.0
        } else {
            bubble_x + bubble_w - total_w + chip_widths.first().copied().unwrap_or(0.0) / 2.0
        };
        let start_x = start_x.max(MARGIN_X).min(PAGE_W - MARGIN_X - total_w);

        // Vertical: chip vertically centered on the bubble's BOTTOM edge.
        let chip_top = bubble_bottom + chip_h / 2.0;
        let chip_bottom = chip_top - chip_h;

        let mut x = start_x;
        for (i, r) in rs.iter().enumerate() {
            let cw = chip_widths[i];
            let chip = rounded_rect_mode(
                x,
                chip_bottom,
                cw,
                chip_h,
                chip_h / 2.0,
                PaintMode::FillStroke,
            );
            self.current().ops.push(Op::SetFillColor {
                col: Color::Rgb(Rgb {
                    r: 1.0,
                    g: 1.0,
                    b: 1.0,
                    icc_profile: None,
                }),
            });
            self.current().ops.push(Op::SetOutlineColor {
                col: Color::Rgb(MUTED),
            });
            self.current().ops.push(Op::SetOutlineThickness { pt: Pt(0.5) });
            self.current().ops.push(Op::DrawPolygon { polygon: chip });

            let inner_x = x + CHIP_PAD_X;
            let baseline_y = chip_bottom + CHIP_PAD_Y + emoji_size * 0.15;
            if let Some(img) = self.atlas.get(&r.emoji) {
                draw_emoji(img, inner_x, baseline_y, emoji_size, &mut self.current().ops);
            } else {
                self.draw_text(
                    &r.emoji,
                    inner_x,
                    chip_bottom + CHIP_PAD_Y,
                    emoji_size,
                    false,
                    &THEM_FG,
                );
            }
            x += cw + CHIP_GAP;
        }

        // Chip extends ~half its height below the bubble; lower cursor past it so the
        // next bubble can't overlap.
        if chip_bottom < self.cursor_y {
            self.cursor_y = chip_bottom;
        }
    }

    fn draw_edits(&mut self, edits: &[EditedVersion], from_me: bool) {
        let header = format!(
            "edited ({} prior version{})",
            edits.len(),
            if edits.len() == 1 { "" } else { "s" }
        );
        let hw = self.metrics_regular.text_width_pt(&header, EDIT_SIZE);
        let hx = if from_me { PAGE_W - MARGIN_X - hw } else { MARGIN_X };
        self.draw_text(&header, hx, self.cursor_y - EDIT_SIZE, EDIT_SIZE, false, &MUTED);
        self.advance(EDIT_SIZE + 1.0);

        for v in edits {
            let stamp = v.date.map(|d| d.format("%-I:%M %p").to_string()).unwrap_or_default();
            let text = if stamp.is_empty() {
                format!("· {}", truncate(&v.text, 100))
            } else {
                format!("· {stamp}  {}", truncate(&v.text, 100))
            };
            let tokens = tokenize(&text);
            let w = line_width(&tokens, &self.metrics_regular, EDIT_SIZE);
            let x = if from_me { PAGE_W - MARGIN_X - w } else { MARGIN_X };
            self.draw_token_line(&tokens, x, self.cursor_y - EDIT_SIZE, EDIT_SIZE, false, &MUTED);
            self.advance(EDIT_SIZE + 1.0);
        }
        self.advance(2.0);
    }

    fn draw_receipt(&mut self, b: &Bubble) {
        let (label, when) = if let Some(r) = b.read_at {
            ("Read", r)
        } else if let Some(d) = b.delivered_at {
            ("Delivered", d)
        } else {
            return;
        };
        let text = format!("{label} {}", when.format("%-I:%M %p"));
        let w = self.metrics_regular.text_width_pt(&text, RECEIPT_SIZE);
        let x = PAGE_W - MARGIN_X - w;
        self.draw_text(&text, x, self.cursor_y - RECEIPT_SIZE, RECEIPT_SIZE, false, &MUTED);
        self.advance(RECEIPT_SIZE + 2.0);
    }

    fn draw_token_line(
        &mut self,
        line: &[Token],
        x: f32,
        y: f32,
        size: f32,
        bold: bool,
        color: &Rgb,
    ) {
        let mut cx = x;
        for tok in line {
            match tok {
                Token::Word(s) => {
                    let w = if bold {
                        self.metrics_bold.text_width_pt(s, size)
                    } else {
                        self.metrics_regular.text_width_pt(s, size)
                    };
                    self.draw_text(s, cx, y, size, bold, color);
                    cx += w;
                }
                Token::Space => {
                    cx += if bold {
                        self.metrics_bold.char_width_pt(' ', size)
                    } else {
                        self.metrics_regular.char_width_pt(' ', size)
                    };
                }
                Token::Emoji(g) => {
                    if let Some(img) = self.atlas.get(g) {
                        let img_clone = img.clone();
                        let advance = draw_emoji(&img_clone, cx, y, size, &mut self.current().ops);
                        cx += advance;
                    } else {
                        let w = if bold {
                            self.metrics_bold.text_width_pt(g, size)
                        } else {
                            self.metrics_regular.text_width_pt(g, size)
                        };
                        self.draw_text(g, cx, y, size, bold, color);
                        cx += w;
                    }
                }
                Token::Newline => {}
            }
        }
    }

    fn draw_text(&mut self, text: &str, x: f32, y: f32, size: f32, bold: bool, color: &Rgb) {
        if text.is_empty() {
            return;
        }
        let font = if bold {
            PdfFontHandle::External(self.font_bold.clone())
        } else {
            PdfFontHandle::External(self.font_regular.clone())
        };
        let ops = &mut self.current().ops;
        ops.push(Op::SaveGraphicsState);
        ops.push(Op::StartTextSection);
        ops.push(Op::SetFont { font, size: Pt(size) });
        ops.push(Op::SetLineHeight { lh: Pt(size) });
        ops.push(Op::SetFillColor { col: Color::Rgb(color.clone()) });
        ops.push(Op::SetTextCursor { pos: Point { x: Pt(x), y: Pt(y) } });
        ops.push(Op::ShowText {
            items: vec![TextItem::Text(text.to_string())],
        });
        ops.push(Op::EndTextSection);
        ops.push(Op::RestoreGraphicsState);
    }
}

struct ImagePlacements {
    cells: Vec<ImageCell>,
    block_w: f32,
    block_h: f32,
}

struct ImageCell {
    img: ImageRef,
    dx: f32,
    dy: f32,
    dw: f32,
    dh: f32,
}

fn layout_images(imgs: &[ImageRef], naked: bool) -> ImagePlacements {
    if imgs.is_empty() {
        return ImagePlacements {
            cells: Vec::new(),
            block_w: 0.0,
            block_h: 0.0,
        };
    }
    if imgs.len() == 1 {
        let r = &imgs[0];
        let scale = (IMAGE_MAX_W / r.w).min(IMAGE_MAX_H / r.h).min(1.0);
        let dw = r.w * scale;
        let dh = r.h * scale;
        return ImagePlacements {
            cells: vec![ImageCell {
                img: r.clone(),
                dx: 0.0,
                dy: 0.0,
                dw,
                dh,
            }],
            block_w: dw,
            block_h: dh,
        };
    }

    let n = imgs.len();
    let cols: usize = match n {
        2 => 2,
        3 => 3,
        4 => 2,
        _ => 3,
    };
    let rows = n.div_ceil(cols);

    let max_w = BUBBLE_MAX_W - if naked { 0.0 } else { 2.0 * BUBBLE_PAD_X };
    let tile_size = ((max_w - (cols as f32 - 1.0) * IMAGE_GAP) / cols as f32).min(140.0);
    let block_w = cols as f32 * tile_size + (cols as f32 - 1.0) * IMAGE_GAP;
    let block_h = rows as f32 * tile_size + (rows as f32 - 1.0) * IMAGE_GAP;

    let mut cells = Vec::with_capacity(n);
    for (i, r) in imgs.iter().enumerate() {
        let col = i % cols;
        let row = i / cols;
        let cell_x = col as f32 * (tile_size + IMAGE_GAP);
        let cell_y = row as f32 * (tile_size + IMAGE_GAP);
        let scale = (tile_size / r.w).min(tile_size / r.h);
        let dw = r.w * scale;
        let dh = r.h * scale;
        let dx = cell_x + (tile_size - dw) / 2.0;
        let dy = cell_y + (tile_size - dh) / 2.0;
        cells.push(ImageCell {
            img: r.clone(),
            dx,
            dy,
            dw,
            dh,
        });
    }
    ImagePlacements {
        cells,
        block_w,
        block_h,
    }
}

fn rounded_rect(x: f32, y: f32, w: f32, h: f32, r: f32) -> Polygon {
    rounded_rect_mode(x, y, w, h, r, PaintMode::Fill)
}

fn rounded_rect_mode(x: f32, y: f32, w: f32, h: f32, r: f32, mode: PaintMode) -> Polygon {
    let r = r.min(w / 2.0).min(h / 2.0);
    let k = 0.5523 * r;
    let pt = |x: f32, y: f32, b: bool| LinePoint {
        p: Point { x: Pt(x), y: Pt(y) },
        bezier: b,
    };

    let points = vec![
        pt(x + r, y + h, false),
        pt(x + w - r, y + h, false),
        pt(x + w - r + k, y + h, true),
        pt(x + w, y + h - r + k, true),
        pt(x + w, y + h - r, false),
        pt(x + w, y + r, false),
        pt(x + w, y + r - k, true),
        pt(x + w - r + k, y, true),
        pt(x + w - r, y, false),
        pt(x + r, y, false),
        pt(x + r - k, y, true),
        pt(x, y + r - k, true),
        pt(x, y + r, false),
        pt(x, y + h - r, false),
        pt(x, y + h - r + k, true),
        pt(x + r - k, y + h, true),
    ];

    Polygon {
        rings: vec![PolygonRing { points }],
        mode,
        winding_order: WindingOrder::NonZero,
    }
}

fn truncate(s: &str, max_chars: usize) -> String {
    let chars: Vec<char> = s.chars().collect();
    if chars.len() <= max_chars {
        s.to_string()
    } else {
        let mut t: String = chars[..max_chars.saturating_sub(1)].iter().collect();
        t.push('…');
        t
    }
}

fn human_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;
    if bytes >= GB {
        format!("{:.1} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.1} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.1} KB", bytes as f64 / KB as f64)
    } else {
        format!("{bytes} B")
    }
}

fn should_insert_date_sep(prev: Option<DateTime<Local>>, current: DateTime<Local>) -> bool {
    match prev {
        None => true,
        Some(p) => {
            let gap = current - p;
            gap >= TimeDelta::minutes(DATE_GAP_MINUTES) || p.date_naive() != current.date_naive()
        }
    }
}

fn format_date_sep(dt: DateTime<Local>) -> String {
    let today = Local::now().date_naive();
    let d = dt.date_naive();
    if d == today {
        format!("Today  ·  {}", dt.format("%-I:%M %p"))
    } else if today.year() == d.year() {
        dt.format("%a, %b %-d  ·  %-I:%M %p").to_string()
    } else {
        dt.format("%a, %b %-d, %Y  ·  %-I:%M %p").to_string()
    }
}

pub fn safe_filename(label: &str) -> String {
    let mut out = String::with_capacity(label.len());
    for c in label.chars() {
        if c.is_alphanumeric() || c == '+' || c == '-' || c == '.' || c == '_' || c == '@' {
            out.push(c);
        } else {
            out.push('_');
        }
    }
    if out.is_empty() {
        "conversation".to_string()
    } else {
        out
    }
}

#[cfg(test)]
mod tests {
    use super::safe_filename;

    #[test]
    fn keeps_safe_characters() {
        assert_eq!(safe_filename("John_Doe.1"), "John_Doe.1");
        assert_eq!(safe_filename("+15555550123"), "+15555550123");
        assert_eq!(safe_filename("a@b.com"), "a@b.com");
    }

    #[test]
    fn replaces_separators_and_spaces() {
        assert_eq!(safe_filename("a/b c:d"), "a_b_c_d");
    }

    #[test]
    fn empty_becomes_placeholder() {
        assert_eq!(safe_filename(""), "conversation");
        assert_eq!(safe_filename("/"), "_");
    }
}
