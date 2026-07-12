import {
  getManifoldModule,
  type ManifoldToplevel,
} from "@tscircuit/manifold-2d"

declare global {
  interface Window {
    ManifoldModule: any
    MANIFOLD?: any
    MANIFOLD_MODULE?: any
  }
}

export const loadManifoldRuntime = async (): Promise<ManifoldToplevel> => {
  const existingManifold =
    window.ManifoldModule ?? window.MANIFOLD ?? window.MANIFOLD_MODULE
  let loadedModule: ManifoldToplevel

  if (
    existingManifold &&
    typeof existingManifold === "object" &&
    existingManifold.setup
  ) {
    loadedModule = existingManifold
  } else if (existingManifold) {
    loadedModule = await existingManifold()
    loadedModule.setup()
  } else {
    loadedModule = await getManifoldModule()
  }

  window.ManifoldModule = loadedModule
  return loadedModule
}
