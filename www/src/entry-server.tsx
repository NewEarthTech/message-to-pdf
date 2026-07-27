import React from "react"
import { renderToString } from "react-dom/server"

import App from "./App"
import { matchRoute, type Route } from "./routes"

export { NOT_FOUND, ROUTES, SITE_URL } from "./routes"

// Render one route to hydratable markup at build time. Effects never run here,
// so anything touching the browser (Paddle.js, the ?_ptxn lookup) is simply
// absent from the HTML and fills in on hydration.
export function render(path: string): { html: string; route: Route } {
  const route = matchRoute(path)
  const html = renderToString(
    <React.StrictMode>
      <App path={path} />
    </React.StrictMode>
  )
  return { html, route }
}
