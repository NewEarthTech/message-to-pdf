use printpdf::{Op, PdfDocument, Pt, RawImage, XObjectId, XObjectTransform};
use std::collections::HashMap;
use twemoji_assets::png::PngTwemojiAsset;
use unicode_segmentation::UnicodeSegmentation;

use crate::font::Metrics;

#[derive(Debug, Clone)]
pub enum Token {
    Word(String),
    Space,
    Emoji(String),
    Newline,
}

pub fn tokenize(text: &str) -> Vec<Token> {
    let mut out: Vec<Token> = Vec::new();
    let mut buf = String::new();
    let flush = |buf: &mut String, out: &mut Vec<Token>| {
        if buf.is_empty() {
            return;
        }
        // split on ASCII space, preserving Space tokens
        let drained = std::mem::take(buf);
        let mut last = 0;
        for (i, c) in drained.char_indices() {
            if c == ' ' {
                if i > last {
                    out.push(Token::Word(drained[last..i].to_string()));
                }
                out.push(Token::Space);
                last = i + 1;
            }
        }
        if last < drained.len() {
            out.push(Token::Word(drained[last..].to_string()));
        }
    };

    for g in text.graphemes(true) {
        if g == "\n" {
            flush(&mut buf, &mut out);
            out.push(Token::Newline);
            continue;
        }
        if PngTwemojiAsset::from_emoji(g).is_some() {
            flush(&mut buf, &mut out);
            out.push(Token::Emoji(g.to_string()));
            continue;
        }
        buf.push_str(g);
    }
    flush(&mut buf, &mut out);
    out
}

pub fn token_width(tok: &Token, m: &Metrics, size: f32) -> f32 {
    match tok {
        Token::Word(w) => m.text_width_pt(w, size),
        Token::Space => m.char_width_pt(' ', size),
        Token::Emoji(_) => size * 1.15,
        Token::Newline => 0.0,
    }
}

pub fn wrap_tokens(tokens: Vec<Token>, max_w: f32, m: &Metrics, size: f32) -> Vec<Vec<Token>> {
    let mut lines: Vec<Vec<Token>> = Vec::new();
    let mut current: Vec<Token> = Vec::new();
    let mut current_w: f32 = 0.0;

    for tok in tokens {
        match tok {
            Token::Newline => {
                while matches!(current.last(), Some(Token::Space)) {
                    current.pop();
                }
                lines.push(std::mem::take(&mut current));
                current_w = 0.0;
            }
            Token::Space => {
                if current.is_empty() {
                    continue;
                }
                let w = m.char_width_pt(' ', size);
                if current_w + w > max_w {
                    lines.push(std::mem::take(&mut current));
                    current_w = 0.0;
                } else {
                    current.push(Token::Space);
                    current_w += w;
                }
            }
            ref t @ (Token::Word(_) | Token::Emoji(_)) => {
                let w = token_width(t, m, size);
                if w > max_w
                    && current.is_empty()
                    && let Token::Word(s) = &tok
                {
                    for c in s.chars() {
                        let cw = m.char_width_pt(c, size);
                        if current_w + cw > max_w && !current.is_empty() {
                            while matches!(current.last(), Some(Token::Space)) {
                                current.pop();
                            }
                            lines.push(std::mem::take(&mut current));
                            current_w = 0.0;
                        }
                        current.push(Token::Word(c.to_string()));
                        current_w += cw;
                    }
                    continue;
                }
                if current_w + w > max_w && !current.is_empty() {
                    while matches!(current.last(), Some(Token::Space)) {
                        current.pop();
                    }
                    lines.push(std::mem::take(&mut current));
                    current_w = 0.0;
                }
                current.push(tok);
                current_w += w;
            }
        }
    }
    if !current.is_empty() {
        while matches!(current.last(), Some(Token::Space)) {
            current.pop();
        }
        lines.push(current);
    }
    lines
}

pub fn line_width(line: &[Token], m: &Metrics, size: f32) -> f32 {
    line.iter().map(|t| token_width(t, m, size)).sum()
}

pub struct EmojiAtlas {
    images: HashMap<String, EmojiImage>,
}

#[derive(Clone)]
pub struct EmojiImage {
    pub id: XObjectId,
    pub w: u32,
    pub h: u32,
}

impl EmojiAtlas {
    pub fn new() -> Self {
        Self {
            images: HashMap::new(),
        }
    }

    pub fn get(&self, grapheme: &str) -> Option<&EmojiImage> {
        self.images.get(grapheme)
    }

    pub fn len(&self) -> usize {
        self.images.len()
    }

    pub fn get_or_load(&mut self, doc: &mut PdfDocument, grapheme: &str) -> Option<EmojiImage> {
        if let Some(existing) = self.images.get(grapheme) {
            return Some(existing.clone());
        }
        let asset = PngTwemojiAsset::from_emoji(grapheme)?;
        let bytes: &[u8] = asset.data.0;
        let raw = RawImage::decode_from_bytes(bytes, &mut Vec::new()).ok()?;
        let w = raw.width as u32;
        let h = raw.height as u32;
        let id = doc.add_image(&raw);
        let img = EmojiImage { id, w, h };
        self.images.insert(grapheme.to_string(), img.clone());
        Some(img)
    }
}

/// Emit ops to render an emoji at (x, baseline_y) at the given font height. Returns advance width.
pub fn draw_emoji(
    img: &EmojiImage,
    x: f32,
    baseline_y: f32,
    size: f32,
    ops: &mut Vec<Op>,
) -> f32 {
    // Twemoji PNGs are square; height = font size, so scale = size / img.h.
    let scale = size / img.h as f32;
    let dw = img.w as f32 * scale;
    // Baseline alignment: emoji visual sits 0..size above baseline; descender allowance ~15%.
    let img_y = baseline_y - size * 0.15;
    ops.push(Op::UseXobject {
        id: img.id.clone(),
        transform: XObjectTransform {
            translate_x: Some(Pt(x)),
            translate_y: Some(Pt(img_y)),
            scale_x: Some(scale),
            scale_y: Some(scale),
            dpi: Some(72.0),
            ..Default::default()
        },
    });
    dw + size * 0.05
}
