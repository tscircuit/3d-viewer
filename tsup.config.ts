import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["./src/index.tsx"],
  platform: "neutral",
  format: ["esm"],
  dts: true,
  noExternal: [
    "@jscad/modeling",
    "@jscad/regl-renderer",
    "@jscad/stl-serializer",
    "@jscad/array-utils",
    "@react-three/drei",
    "@react-three/fiber",
    "react-use-gesture",
    "react-reconciler",
  ],
})
