// Central product identity, shared by every surface that has to name the
// product or point at its source.
//
// This lives in a package rather than in one app because both the desktop app
// and the marketing site state these, and they drifted before: the Sheaf rename
// had to chase the same strings through two repos. One definition, imported.
//
// The product name is `Message to PDF`; keep it in sync with tauri.conf.json
// (productName, window title). The bundle identifier (llc.newearth.msg2pdf) and
// the Cargo crate/binary names are internal and deliberately stay `msg2pdf` --
// the identifier is the app's Full Disk Access identity, so changing it
// invalidates every FDA grant already given.
export const PRODUCT_NAME = "Message to PDF"

export const PRODUCT_TAGLINE = "Export an iMessage conversation to PDF"

// GPL-3.0-or-later compliance: buyers must be able to reach the source and the
// license from inside the app. gnu.org hosts the canonical license text (always
// reachable, independent of repo visibility).
export const SOURCE_URL = "https://github.com/NewEarthTech/message-to-pdf"
export const LICENSE_URL = "https://www.gnu.org/licenses/gpl-3.0.html"

// Where buyers reach a person. Same address on the site, in the app, and on the
// purchase receipt.
export const SUPPORT_EMAIL = "sales@newearth.llc"

// The marketing and checkout site.
export const SITE_URL = "https://message-to-pdf.com"

// The selling entity, as it must appear to a payment processor and on the
// legal pages.
export const SELLER_NAME = "New Earth Technologies"
export const SELLER_LEGAL =
  "New Earth Technologies, the registered California name of John Carmack Corp. (California entity no. 5851872)"

// GPL dependencies the app is built on and must credit (both by ReagentX,
// GPL-3.0). imessage-database is the iMessage reader; crabstep is its
// typedstream parser.
export const CREDITS = [
  {
    name: "imessage-database",
    author: "ReagentX",
    url: "https://crates.io/crates/imessage-database"
  },
  { name: "crabstep", author: "ReagentX", url: "https://crates.io/crates/crabstep" }
] as const
