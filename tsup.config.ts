import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["./src/index.tsx"],
  platform: "neutral",
  format: "esm",
  dts: true,
  external: ["react", "react-dom"],
  bundle: true,
  splitting: true,
  clean: true,
})
