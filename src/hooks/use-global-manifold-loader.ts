import { useState, useEffect, useMemo } from "react"
import { ManifoldToplevel } from "manifold-3d"

interface ManifoldCacheItem {
  manifoldInstancePromise: Promise<ManifoldToplevel | Error>
  manifoldInstance: ManifoldToplevel | Error | null
}

type ManifoldFactory = () => Promise<ManifoldToplevel>

declare global {
  interface Window {
    TSCIRCUIT_MANIFOLD_LOADER_CACHE: ManifoldCacheItem | null
    ManifoldModule: ManifoldFactory | undefined
    MANIFOLD?: ManifoldFactory
    MANIFOLD_MODULE?: ManifoldFactory
  }
}

if (typeof window !== "undefined" && !window.TSCIRCUIT_MANIFOLD_LOADER_CACHE) {
  window.TSCIRCUIT_MANIFOLD_LOADER_CACHE = null
}

const MANIFOLD_CDN_BASE_URL = "https://cdn.jsdelivr.net/npm/manifold-3d@3.2.1"

async function loadManifoldModule(): Promise<ManifoldToplevel | Error> {
  try {
    const existingManifoldFactory =
      window.ManifoldModule ?? window.MANIFOLD ?? window.MANIFOLD_MODULE

    if (existingManifoldFactory) {
      window.ManifoldModule = existingManifoldFactory
      const manifoldInstance: ManifoldToplevel = await existingManifoldFactory()
      manifoldInstance.setup()
      return manifoldInstance
    }

    return new Promise((resolve, reject) => {
      const handleManifoldScriptLoad = async () => {
        try {
          const loadedManifoldFactory =
            window.ManifoldModule ?? window.MANIFOLD ?? window.MANIFOLD_MODULE
          if (loadedManifoldFactory) {
            window.ManifoldModule = loadedManifoldFactory
            const manifoldInstance: ManifoldToplevel = await loadedManifoldFactory()
            manifoldInstance.setup()
            resolve(manifoldInstance)
          } else {
            reject(
              new Error(
                "ManifoldModule not found on window after script load.",
              ),
            )
          }
        } catch (error) {
          reject(error)
        }
      }

      window.addEventListener("tscircuit:manifoldLoaded", handleManifoldScriptLoad, { once: true })

      const manifoldCdnImportScript = document.createElement("script")
      manifoldCdnImportScript.type = "module"
      manifoldCdnImportScript.innerHTML = `
try {
  const { default: ManifoldModule } = await import('${MANIFOLD_CDN_BASE_URL}/manifold.js');
  window.ManifoldModule = ManifoldModule;
} catch (e) {
  console.error('Error importing manifold in dynamic script:', e);
} finally {
  window.dispatchEvent(new CustomEvent('tscircuit:manifoldLoaded'));
}
      `.trim()

      const onScriptError = () => {
        window.removeEventListener("tscircuit:manifoldLoaded", handleManifoldScriptLoad)
        reject(new Error("Failed to load Manifold loader script."))
      }

      manifoldCdnImportScript.addEventListener("error", onScriptError)
      document.body.appendChild(manifoldCdnImportScript)
    })
  } catch (error) {
    return error as Error
  }
}

export function useGlobalManifoldLoader(): {
  manifoldModule: ManifoldToplevel | null
  error: string | null
  isLoading: boolean
} {
  const initialState = useMemo(() => {
    if (typeof window === "undefined") {
      return { manifoldModule: null, error: null, isLoading: true }
    }

    const manifoldCache = window.TSCIRCUIT_MANIFOLD_LOADER_CACHE
    if (manifoldCache?.manifoldInstance) {
      if (manifoldCache.manifoldInstance instanceof Error) {
        return {
          manifoldModule: null,
          error: manifoldCache.manifoldInstance.message,
          isLoading: false,
        }
      } else {
        return { manifoldModule: manifoldCache.manifoldInstance, error: null, isLoading: false }
      }
    }

    return { manifoldModule: null, error: null, isLoading: true }
  }, [])

  const [manifoldModule, setManifoldModule] = useState<ManifoldToplevel | null>(
    initialState.manifoldModule,
  )
  const [error, setError] = useState<string | null>(initialState.error)
  const [isLoading, setIsLoading] = useState<boolean>(initialState.isLoading)

  useEffect(() => {
    let hasUnmounted = false

    const updateManifoldState = (manifoldInstance: ManifoldToplevel | Error | null) => {
      if (manifoldInstance instanceof Error) {
        setError(manifoldInstance.message)
        setManifoldModule(null)
      } else if (manifoldInstance) {
        setManifoldModule(manifoldInstance)
        setError(null)
      } else {
        setManifoldModule(null)
        setError("Unknown error occurred")
      }
      setIsLoading(false)
    }

    async function loadModule() {
      const manifoldCache = window.TSCIRCUIT_MANIFOLD_LOADER_CACHE

      if (manifoldCache?.manifoldInstance) {
        updateManifoldState(manifoldCache.manifoldInstance)
        return
      }

      if (manifoldCache) {
        try {
          const manifoldInstance = await manifoldCache.manifoldInstancePromise
          if (hasUnmounted) return
          updateManifoldState(manifoldInstance)
          return
        } catch (err) {
          if (hasUnmounted) return
          const errorInstance = err instanceof Error ? err : new Error("Unknown error")
          updateManifoldState(errorInstance)
          return
        }
      }

      const manifoldInstancePromise = loadManifoldModule().then(
        (manifoldInstance) => {
          if (window.TSCIRCUIT_MANIFOLD_LOADER_CACHE) {
            window.TSCIRCUIT_MANIFOLD_LOADER_CACHE.manifoldInstance = manifoldInstance
          }
          return manifoldInstance
        },
        (error) => {
          if (window.TSCIRCUIT_MANIFOLD_LOADER_CACHE) {
            window.TSCIRCUIT_MANIFOLD_LOADER_CACHE.manifoldInstance = error
          }
          return error
        }
      )

      window.TSCIRCUIT_MANIFOLD_LOADER_CACHE = { manifoldInstancePromise, manifoldInstance: null }

      try {
        const manifoldInstance = await manifoldInstancePromise
        if (hasUnmounted) return
        updateManifoldState(manifoldInstance)
      } catch (err) {
        if (hasUnmounted) return
        const errorInstance = err instanceof Error ? err : new Error("Unknown error")
        updateManifoldState(errorInstance)
      }
    }

    loadModule()

    return () => {
      hasUnmounted = true
    }
  }, [])

  return { manifoldModule, error, isLoading }
}
