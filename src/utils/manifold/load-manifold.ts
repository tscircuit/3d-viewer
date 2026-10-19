import type { ManifoldToplevel } from "manifold-3d"
import { getRuntimeAssetUrl } from "../get-runtime-asset-url"

declare global {
  interface Window {
    ManifoldModule: any
    MANIFOLD?: any
    MANIFOLD_MODULE?: any
  }
}

let manifoldPromise: Promise<ManifoldToplevel> | undefined

export function loadManifold(): Promise<ManifoldToplevel> {
  if (!manifoldPromise) {
    manifoldPromise = (async () => {
      const existing =
        window.ManifoldModule ?? window.MANIFOLD ?? window.MANIFOLD_MODULE
      if (existing && typeof existing === "object" && existing.setup) {
        window.ManifoldModule = existing
        return existing as ManifoldToplevel
      }

      const factory =
        existing ??
        (
          await import(
            /* @vite-ignore */ /* webpackIgnore: true */
            getRuntimeAssetUrl("manifold-3d", "3.2.1", "manifold.js")
          )
        ).default
      // Manifold resolves its matching WASM relative to the imported module URL.
      const module: ManifoldToplevel = await factory()
      module.setup()
      window.ManifoldModule = module
      return module
    })().catch((error) => {
      manifoldPromise = undefined
      throw error
    })
  }
  return manifoldPromise
}
