// Product identity is shared with the marketing site and lives in
// packages/ui/src/product.ts, so the two surfaces cannot drift on the product
// name, the source URL, or the license URL. The Sheaf rename had to chase those
// same strings through two repos; one definition prevents a repeat.
//
// This file stays as the app's import point so nothing else in the app has to
// change: `import { PRODUCT_NAME } from "./product"` keeps working.
export {
  CREDITS,
  LICENSE_URL,
  PRODUCT_NAME,
  PRODUCT_TAGLINE,
  SOURCE_URL,
  SUPPORT_EMAIL
} from "@msg2pdf/ui"
