import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
