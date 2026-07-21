import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const host = process.env.TAURI_DEV_HOST

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Tauri expects a fixed port and fails if it is not available.
  clearScreen: false,
  server: {
    port: 47611,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 47612 } : undefined,
    watch: {
      // Tauri's Rust source is watched by the Tauri CLI, not Vite.
      ignored: ["**/src-tauri/**"]
    }
  }
})
