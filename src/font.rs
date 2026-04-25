use ttf_parser::Face;

pub const REGULAR_TTF: &[u8] = include_bytes!("../assets/fonts/DejaVuSans.ttf");
pub const BOLD_TTF: &[u8] = include_bytes!("../assets/fonts/DejaVuSans-Bold.ttf");

pub struct Metrics<'a> {
    face: Face<'a>,
}

impl<'a> Metrics<'a> {
    pub fn new(bytes: &'a [u8]) -> Self {
        Self {
            face: Face::parse(bytes, 0).expect("bundled font is valid"),
        }
    }

    pub fn units_per_em(&self) -> f32 {
        self.face.units_per_em() as f32
    }

    /// Width of a single character in PDF points at the given font size.
    pub fn char_width_pt(&self, c: char, size_pt: f32) -> f32 {
        let advance = self
            .face
            .glyph_index(c)
            .and_then(|g| self.face.glyph_hor_advance(g))
            .unwrap_or_else(|| {
                self.face
                    .glyph_hor_advance(ttf_parser::GlyphId(0))
                    .unwrap_or(500)
            });
        (advance as f32 / self.units_per_em()) * size_pt
    }

    pub fn text_width_pt(&self, s: &str, size_pt: f32) -> f32 {
        s.chars().map(|c| self.char_width_pt(c, size_pt)).sum()
    }
}
