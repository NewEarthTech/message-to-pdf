// Builds public/og.png, the social card, from the committed hero export.
//
// Run with: pnpm run og
//
// Why a composed card rather than a straight resize of the export: a social
// thumbnail renders around 500-600px wide, and the export is a US Letter page.
// Fitting the whole page width into 1200px puts the message text at roughly 17px,
// which halves again in the feed and reads as grey mush. Cropping does not help
// either, because the page width is the binding constraint in both cases. So the
// headline carries the message, and the export contributes two real bubbles at a
// scale you can actually read: one received, one sent, because the blue is what
// makes it register as iMessage at a glance.
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
const EXPORT = join(root, "src/assets/export-sample.png")

const W = 1200
const H = 630
const BASE = "#3a3a38"
const INK = "#f5f3ef"
const ACCENT = "#cba980"
const FONT = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif"

const PAPER_W = 620
const PAPER_H = 268
const PAPER_X = W - PAPER_W + 40 // bleeds a little off the right edge
const PAPER_Y = Math.round((H - PAPER_H) / 2)

const SCALE = 0.7
const RECEIVED = { left: 45, top: 236, width: 665, height: 82 }
const SENT = { left: 960, top: 337, width: 765, height: 76 }

const bubble = async (box) =>
  sharp(EXPORT)
    .extract(box)
    .resize({ width: Math.round(box.width * SCALE) })
    .toBuffer()

const [received, sent] = await Promise.all([bubble(RECEIVED), bubble(SENT)])
const sentW = Math.round(SENT.width * SCALE)

// White page with the two bubbles laid out the way the export lays them out:
// received on the left, sent on the right.
const paperFlat = await sharp({
  create: { width: PAPER_W, height: PAPER_H, channels: 4, background: "#ffffff" }
})
  .composite([
    { input: received, left: 32, top: 58 },
    { input: sent, left: PAPER_W - sentW - 32, top: 152 }
  ])
  .png()
  .toBuffer()

const mask = Buffer.from(
  `<svg width="${PAPER_W}" height="${PAPER_H}"><rect width="${PAPER_W}" height="${PAPER_H}" rx="18" ry="18" fill="#fff"/></svg>`
)
const paper = await sharp(paperFlat)
  .composite([{ input: mask, blend: "dest-in" }])
  .png()
  .toBuffer()

const text = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .name { font-family: ${FONT}; font-size: 38px; font-weight: 700; fill: ${INK}; }
    .lede { font-family: ${FONT}; font-size: 46px; font-weight: 700; fill: ${INK}; letter-spacing: -1.2px; }
    .meta { font-family: ${FONT}; font-size: 25px; font-weight: 500; fill: ${ACCENT}; }
  </style>
  <text x="72" y="126" class="name">Message to PDF</text>
  <text x="72" y="270" class="lede">Turn your iMessage</text>
  <text x="72" y="324" class="lede">history into a PDF</text>
  <text x="72" y="378" class="lede">worth keeping.</text>
  <text x="72" y="472" class="meta">Runs on your Mac. $29 once.</text>
</svg>`)

const out = await sharp({ create: { width: W, height: H, channels: 4, background: BASE } })
  .composite([
    { input: paper, left: PAPER_X, top: PAPER_Y },
    { input: text, left: 0, top: 0 }
  ])
  .flatten({ background: BASE })
  .removeAlpha()
  .png()
  .toBuffer()

writeFileSync(join(root, "public/og.png"), out)

const meta = await sharp(out).metadata()
console.log(
  `wrote public/og.png ${meta.width}x${meta.height}, ${(out.length / 1024).toFixed(0)} kB, alpha: ${meta.hasAlpha}`
)
