// Central product identity. The product name is `Message to PDF`; keep it in
// sync with tauri.conf.json (productName, window title). The bundle identifier
// (com.sheaf.desktop) and the Cargo crate/binary names are internal and
// deliberately stay as-is — the identifier is the app's Full Disk Access
// identity and must never change.
export const PRODUCT_NAME = "Message to PDF"

export const PRODUCT_TAGLINE = "Export an iMessage conversation to PDF"

// GPL-3.0-or-later compliance: buyers must be able to reach the source and the
// license from inside the app. gnu.org hosts the canonical license text (always
// reachable, independent of repo visibility); the source repo goes public at
// launch.
export const SOURCE_URL = "https://github.com/NewEarthTech/message-to-pdf"
export const LICENSE_URL = "https://www.gnu.org/licenses/gpl-3.0.html"

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
