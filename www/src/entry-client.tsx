import React from "react"
import { hydrateRoot } from "react-dom/client"

import App from "./App"
import "@fontsource-variable/inter"
import "./globals.css"

const root = document.getElementById("root")
if (!root) throw new Error("#root missing from the prerendered HTML")
hydrateRoot(
  root,
  <React.StrictMode>
    <App path={window.location.pathname} />
  </React.StrictMode>
)
