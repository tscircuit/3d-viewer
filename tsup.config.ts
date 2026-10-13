import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["./src/index.tsx"],
  platform: "neutral",
  format: "esm",
  dts: { resolve: ["@tscircuit/flex-utils"] },
  noExternal: ["@tscircuit/flex-utils", "@tscircuit/internal-dynamic-import"],
  external: ["react", "react-dom"],
  bundle: true,
  splitting: true,
  clean: true,
})
