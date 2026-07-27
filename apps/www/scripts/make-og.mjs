// Builds the two social cards from the committed hero export.
//
// Run with: pnpm run og
//
//   apps/www/public/og.png       the site card, served at message-to-pdf.com/og.png
//   .github/social-preview.png   the repo card, uploaded by hand in GitHub's
//                                repo Settings > General > Social preview
//                                (GitHub has no API for that field)
//
// Why composed cards rather than a straight resize of the export: a social
// thumbnail renders around 500-600px wide, and the export is a US Letter page.
// Fitting the whole page width into the card puts the message text at roughly
// 17px, which halves again in a feed and reads as grey mush. Cropping does not
// help either, because the page width is the binding constraint in both cases.
// So the headline carries the message, and the export contributes two real
// bubbles at a scale you can actually read: one received, one sent, because the
// blue is what makes it register as iMessage at a glance.
//
// The two cards differ on purpose. The site card sells (price, "runs on your
// Mac"); the repo card tells a developer what they are looking at (stack,
// platform, license). GitHub crops its card in some surfaces, so nothing there
// sits outside the 80px safe inset and the paper does not bleed.
//
// The bubble coordinates below are measured from the committed export, not
// guessed. If that asset is ever regenerated, re-measure by scanning for rows of
// blue and grey pixels rather than eyeballing offsets.
//
// The fonts are whatever the system offers (the site itself ships Inter). A
// social card is a raster thumbnail, so a near neighbour is fine; this is not a
// surface where the brand face has to be exact.
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, "..")
const repoRoot = join(root, "../..")
const EXPORT = join(root, "src/assets/export-sample.png")

const BASE = "#3a3a38"
const INK = "#f5f3ef"
const MUTED = "#c2c0bb" // 6.2:1 on BASE, clears WCAG AA
const ACCENT = "#cba980"
const FONT = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif"

// Measured bubble boxes in the 1800x1268 export.
const RECEIVED = { left: 45, top: 236, width: 665, height: 82 }
const SENT = { left: 960, top: 337, width: 765, height: 76 }

/** White page carrying one received and one sent bubble, laid out as the export lays them. */
async function paper({ width, height, scale }) {
  const grab = (box) =>
    sharp(EXPORT)
      .extract(box)
      .resize({ width: Math.round(box.width * scale) })
      .toBuffer()

  const [received, sent] = await Promise.all([grab(RECEIVED), grab(SENT)])
  const sentW = Math.round(SENT.width * scale)
  const inset = Math.round(width * 0.055)

  const flat = await sharp({
    create: { width, height, channels: 4, background: "#ffffff" }
  })
    .composite([
      { input: received, left: inset, top: Math.round(height * 0.22) },
      { input: sent, left: width - sentW - inset, top: Math.round(height * 0.57) }
    ])
    .png()
    .toBuffer()

  const mask = Buffer.from(
    `<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="18" ry="18" fill="#fff"/></svg>`
  )
  return sharp(flat)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer()
}

async function card({ width, height, paperBox, svg, out }) {
  const sheet = await paper(paperBox)
  const text = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`
  )
  const buf = await sharp({ create: { width, height, channels: 4, background: BASE } })
    .composite([
      { input: sheet, left: paperBox.x, top: paperBox.y },
      { input: text, left: 0, top: 0 }
    ])
    .flatten({ background: BASE })
    .removeAlpha()
    .png()
    .toBuffer()

  writeFileSync(out, buf)
  const meta = await sharp(buf).metadata()
  console.log(
    `wrote ${out.replace(`${repoRoot}/`, "")} ${meta.width}x${meta.height}, ${(buf.length / 1024).toFixed(0)} kB`
  )
}

// --- Site card: 1200x630, sells. The paper bleeds off the right edge.
await card({
  width: 1200,
  height: 630,
  paperBox: { width: 620, height: 268, scale: 0.7, x: 620, y: 181 },
  out: join(root, "public/og.png"),
  svg: `
  <style>
    .name { font-family: ${FONT}; font-size: 38px; font-weight: 700; fill: ${INK}; }
    .lede { font-family: ${FONT}; font-size: 46px; font-weight: 700; fill: ${INK}; letter-spacing: -1.2px; }
    .meta { font-family: ${FONT}; font-size: 25px; font-weight: 500; fill: ${ACCENT}; }
  </style>
  <text x="72" y="126" class="name">Message to PDF</text>
  <text x="72" y="270" class="lede">Turn your iMessage</text>
  <text x="72" y="324" class="lede">history into a PDF</text>
  <text x="72" y="378" class="lede">worth keeping.</text>
  <text x="72" y="472" class="meta">Runs on your Mac. $29 once.</text>`
})

// --- Repo card: 1280x640, tells a developer what this is. Everything stays
// inside the 80px safe inset GitHub recommends, and the paper does not bleed.
await card({
  width: 1280,
  height: 640,
  paperBox: { width: 520, height: 300, scale: 0.6, x: 680, y: 170 },
  out: join(repoRoot, ".github/social-preview.png"),
  svg: `
  <style>
    .repo { font-family: ${FONT}; font-size: 26px; font-weight: 600; fill: ${ACCENT}; }
    .lede { font-family: ${FONT}; font-size: 48px; font-weight: 700; fill: ${INK}; letter-spacing: -1.2px; }
    .meta { font-family: ${FONT}; font-size: 24px; font-weight: 500; fill: ${MUTED}; }
  </style>
  <text x="80" y="168" class="repo">NewEarthTech / message-to-pdf</text>
  <text x="80" y="292" class="lede">Turn your iMessage</text>
  <text x="80" y="346" class="lede">history into a PDF</text>
  <text x="80" y="400" class="lede">worth keeping.</text>
  <text x="80" y="486" class="meta">Rust engine, Tauri app. macOS only.</text>
  <text x="80" y="524" class="meta">GPL-3.0-or-later.</text>`
})
