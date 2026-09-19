import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

const root = fileURLToPath(new URL("..", import.meta.url))

export default defineConfig({
  root: fileURLToPath(new URL("./app", import.meta.url)),
  base: "/renderer-comparison/",
  publicDir: fileURLToPath(
    new URL("../stories/renderer-comparison/public", import.meta.url),
  ),
  // Keep prebundled dependencies under node_modules so Babel does not process them again.
  cacheDir: `${root}/node_modules/.cache/renderer-comparison`,
  plugins: [react()],
  resolve: {
    alias: { src: `${root}/src` },
    dedupe: ["react", "react-dom", "three"],
  },
  optimizeDeps: {
    exclude: ["manifold-3d"],
    esbuildOptions: { sourcemap: false },
  },
  server: {
    host: "127.0.0.1",
    port: 5187,
    strictPort: true,
    fs: { allow: [root] },
  },
})
