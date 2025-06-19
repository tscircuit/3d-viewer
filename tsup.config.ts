import { defineConfig } from "tsup"
import fs from "node:fs"
import path from "node:path"

const wasmBase64LoaderPlugin = {
  name: "wasm-base64-loader",
  setup(build) {
    // Intercept import paths ending with .wasm?base64
    build.onResolve({ filter: /\.wasm\?base64$/ }, (args) => {
      // Remove the ?base64 suffix to get the path to the actual .wasm file
      const actualPath = args.path.replace(/\?base64$/, "")
      // Resolve the path relative to the directory of the importing file
      const resolvedPath = path.resolve(args.resolveDir, actualPath)
      return {
        path: resolvedPath,
        namespace: "wasm-base64-ns", // Assign a namespace to trigger our onLoad handler
      }
    })

    // Handle loading for files in our 'wasm-base64-ns' namespace
    build.onLoad(
      { filter: /.*/, namespace: "wasm-base64-ns" },
      async (args) => {
        // args.path is the resolved path to the .wasm file
        const wasmBuffer = await fs.promises.readFile(args.path)
        const base64String = wasmBuffer.toString("base64")
        return {
          // Return the content as a JavaScript module exporting the base64 data URL string
          contents: `export default "data:application/wasm;base64,${base64String}";`,
          loader: "js", // Tell esbuild to treat this as JavaScript content
        }
      },
    )
  },
}

export default defineConfig({
  // esbuildPlugins will be merged with other tsup options (e.g., from CLI).
  esbuildPlugins: [wasmBase64LoaderPlugin],
  external: [
    "react",
    "react-dom",
    "@react-three/drei",
    "@react-three/fiber",
    "jscad-fiber",
    "react-use-gesture",
  ],
})
