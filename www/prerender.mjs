// Build-time prerender. Turns the client bundle into real HTML per route so a
// crawler that never runs JavaScript still receives the full page, the right
// <title>, the right meta description, and the structured data.
//
// Pipeline (see package.json "build"):
//   1. vite build          -> dist/ with hashed assets and index.html template
//   2. vite build --ssr    -> dist-ssr/entry-server.js
//   3. node prerender.mjs  -> this file, writes dist/<route>/index.html
//
// The template keeps two markers, <!--app-head--> and <!--app-html-->, replaced
// per route. Everything else in the head (icons, theme color, the hashed script
// and stylesheet tags Vite injected) is shared. Plain JS on purpose: it runs
// under bare `node` with no loader or extra dependency.
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const dist = join(here, "dist")

const { render, ROUTES, NOT_FOUND, SITE_URL } = await import(
  join(here, "dist-ssr", "entry-server.js")
)

const template = await readFile(join(dist, "index.html"), "utf8")

const escapeAttr = (value) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")

// JSON-LD goes in a script tag, so the only character that can break out is `<`.
const escapeJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c")

function head(route) {
  const canonical = `${SITE_URL}${route.path === "/" ? "/" : route.path}`
  const image = `${SITE_URL}/export-sample.png`
  return [
    `<title>${escapeAttr(route.title)}</title>`,
    `<meta name="description" content="${escapeAttr(route.description)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    route.noindex ? `<meta name="robots" content="noindex,follow" />` : "",
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Message to PDF" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:title" content="${escapeAttr(route.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(route.description)}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(route.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(route.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    route.jsonLd ? `<script type="application/ld+json">${escapeJson(route.jsonLd())}</script>` : ""
  ]
    .filter(Boolean)
    .join("\n    ")
}

async function emit(route) {
  const { html } = render(route.path)
  const page = template.replace("<!--app-head-->", head(route)).replace("<!--app-html-->", html)

  // "/" is dist/index.html; "/pricing" is dist/pricing/index.html, which the
  // CloudFront function rewrites directory-style requests onto.
  const target =
    route.path === "/" ? join(dist, "index.html") : join(dist, route.path, "index.html")
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, page, "utf8")
  return route.path
}

for (const route of [...ROUTES, NOT_FOUND]) {
  console.log(`prerendered ${await emit(route)}`)
}

// The 404 also lives at dist/404.html, which is what the CloudFront error
// response serves, with a real 404 status rather than a soft 200.
await writeFile(
  join(dist, "404.html"),
  await readFile(join(dist, "404", "index.html"), "utf8"),
  "utf8"
)

const indexable = ROUTES.filter((r) => !r.noindex)
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable
  .map((r) => `  <url><loc>${SITE_URL}${r.path === "/" ? "/" : r.path}</loc></url>`)
  .join("\n")}
</urlset>
`
await writeFile(join(dist, "sitemap.xml"), sitemap, "utf8")

await writeFile(
  join(dist, "robots.txt"),
  `User-agent: *\nAllow: /\nDisallow: /success\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
  "utf8"
)

console.log(`wrote sitemap.xml (${indexable.length} urls) and robots.txt`)
