import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
    proxy: {
      // Use .storybook/main.ts to configure the proxy, for some reason it
      // doesn't work when configured here
    },
  },
  optimizeDeps: {
    exclude: [
      "circuit-json-to-spice",
      "spicey",
      "calculate-packing",
      "circuit-json",
      "@tscircuit/props",
      "@resvg/resvg-wasm",
    ],
  },
  build: {
    rollupOptions: {
      external: [
        "circuit-json-to-spice",
        "spicey",
        "calculate-packing",
        "circuit-json",
        "@tscircuit/props",
        "@resvg/resvg-wasm",
      ],
    },
  },
})
