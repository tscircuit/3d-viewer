import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    proxy: {
      "/easyeda-models": {
        target: "https://modules.easyeda.com/3dmodel/",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/easyeda-models/, ""),
      },
    },
  },
})
