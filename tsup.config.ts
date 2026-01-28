import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["./src/index.tsx"],
  platform: "neutral",
  format: "esm",
  dts: true,
  external: [
    "react",
    "react-dom",
    "three/examples/jsm/renderers/webgpu/WebGPURenderer.js",
  ],
  bundle: true,
  splitting: true,
  clean: true,
})
