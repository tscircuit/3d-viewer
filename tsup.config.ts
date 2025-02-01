import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["three"],
  treeshake: true,
  esbuildOptions(options) {
    options.conditions = ["module"]
  },
})
