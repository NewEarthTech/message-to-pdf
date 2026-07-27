import { fileURLToPath, URL } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// Validate the Paddle env/token pair at BUILD time (and at dev startup), not in
// the visitor's browser. paddle-config.ts throws at page load on a mismatch, but
// by then a wrong-environment build has already shipped; failing here keeps a
// sandbox-token production build (or vice versa) from ever leaving CI. loadEnv
// merges .env files and process.env, the same sources Vite uses for
// import.meta.env.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_PADDLE")
  const paddleEnv = env.VITE_PADDLE_ENV
  const token = env.VITE_PADDLE_CLIENT_TOKEN
  if (paddleEnv !== "sandbox" && paddleEnv !== "production") {
    throw new Error(
      `VITE_PADDLE_ENV must be "sandbox" or "production", got "${paddleEnv ?? ""}". ` +
        "Copy .env.example to .env.local for local dev; CI injects it in the deploy workflow."
    )
  }
  const expectedPrefix = paddleEnv === "sandbox" ? "test_" : "live_"
  if (!token?.startsWith(expectedPrefix)) {
    throw new Error(
      `VITE_PADDLE_CLIENT_TOKEN must start with "${expectedPrefix}" for the "${paddleEnv}" environment.`
    )
  }

  return {
    // Uncommon pinned port, strict so a taken port fails loudly instead of
    // silently shifting. 47611 belongs to the desktop app's dev server.
    server: { port: 47612, strictPort: true },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) }
    },
    build: { target: "es2022" }
  }
})
