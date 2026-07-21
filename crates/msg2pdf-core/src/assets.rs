use anyhow::{Context, Result};
use std::fs::File;
use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

const MAX_DIM_PX: u32 = 1200;

pub struct AssetDir {
    root: PathBuf,
    counter: std::cell::Cell<u32>,
}

impl AssetDir {
    pub fn new() -> Result<Self> {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let root = std::env::temp_dir().join(format!(
            "msg2pdf-img-{}-{nanos}",
            std::process::id()
        ));
        std::fs::create_dir_all(&root)
            .with_context(|| format!("creating {}", root.display()))?;
        Ok(Self {
            root,
            counter: std::cell::Cell::new(0),
        })
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    /// Convert+resize `src` into the asset dir as a JPEG capped at 1200px on the longest side.
    /// Returns the new path, or None if conversion failed.
    pub fn prepare_image(&self, src: &Path) -> Option<PathBuf> {
        if !src.exists() {
            eprintln!("  warn: source image missing: {}", src.display());
            return None;
        }
        let n = self.counter.get();
        self.counter.set(n + 1);
        let dst = self.root.join(format!("{n:06}.jpg"));

        let output = Command::new("/usr/bin/sips")
            .arg("-s")
            .arg("format")
            .arg("jpeg")
            .arg("--resampleHeightWidthMax")
            .arg(MAX_DIM_PX.to_string())
            .arg(src)
            .arg("--out")
            .arg(&dst)
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .output()
            .ok()?;

        if !output.status.success() {
            eprintln!(
                "  warn: sips {} → {}: {}",
                src.display(),
                output.status,
                String::from_utf8_lossy(&output.stderr).trim()
            );
            let _ = std::fs::remove_file(&dst);
            return None;
        }
        if !dst.exists() {
            eprintln!("  warn: sips produced no output for {}", src.display());
            return None;
        }
        if let Err(e) = apply_exif_orientation(&dst) {
            eprintln!("  warn: orientation fix on {}: {e}", dst.display());
        }
        Some(dst)
    }
}

impl Drop for AssetDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.root);
    }
}

/// Read EXIF orientation from a JPEG, physically rotate pixels, and re-encode without the tag.
/// No-op if orientation is 1 / absent.
fn apply_exif_orientation(path: &Path) -> Result<()> {
    let orientation = read_exif_orientation(path).unwrap_or(1);
    if orientation == 1 {
        return Ok(());
    }
    let img = image::ImageReader::open(path)
        .with_context(|| format!("opening {}", path.display()))?
        .with_guessed_format()
        .with_context(|| format!("guessing format of {}", path.display()))?
        .decode()
        .with_context(|| format!("decoding {}", path.display()))?;
    let rotated = match orientation {
        2 => image::DynamicImage::ImageRgba8(image::imageops::flip_horizontal(&img.to_rgba8())),
        3 => image::DynamicImage::ImageRgba8(image::imageops::rotate180(&img.to_rgba8())),
        4 => image::DynamicImage::ImageRgba8(image::imageops::flip_vertical(&img.to_rgba8())),
        5 => {
            let r = image::imageops::rotate90(&img.to_rgba8());
            image::DynamicImage::ImageRgba8(image::imageops::flip_horizontal(&r))
        }
        6 => image::DynamicImage::ImageRgba8(image::imageops::rotate90(&img.to_rgba8())),
        7 => {
            let r = image::imageops::rotate270(&img.to_rgba8());
            image::DynamicImage::ImageRgba8(image::imageops::flip_horizontal(&r))
        }
        8 => image::DynamicImage::ImageRgba8(image::imageops::rotate270(&img.to_rgba8())),
        _ => img,
    };
    rotated
        .into_rgb8()
        .save_with_format(path, image::ImageFormat::Jpeg)
        .with_context(|| format!("re-encoding {}", path.display()))?;
    Ok(())
}

fn read_exif_orientation(path: &Path) -> Option<u32> {
    let file = File::open(path).ok()?;
    let mut reader = BufReader::new(&file);
    let exif = exif::Reader::new().read_from_container(&mut reader).ok()?;
    let field = exif.get_field(exif::Tag::Orientation, exif::In::PRIMARY)?;
    field.value.get_uint(0)
}
