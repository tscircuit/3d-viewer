import { useState, useEffect } from "react"
import { ManifoldToplevel } from "manifold-3d"

interface ManifoldCacheItem {
  loadingPromise: Promise<ManifoldToplevel | Error>
  manifoldInstance: ManifoldToplevel | Error | null
}

declare global {
  interface Window {
    TSCIRCUIT_MANIFOLD_LOADER_CACHE: ManifoldCacheItem | null
    ManifoldModule: any
    MANIFOLD?: any
    MANIFOLD_MODULE?: any
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
      const manifoldLoadedEventName = "manifoldLoaded"

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

      window.addEventListener(manifoldLoadedEventName, handleManifoldScriptLoad, { once: true })

      const script = document.createElement("script")
      script.type = "module"
      script.innerHTML = `
try {
  const { default: ManifoldModule } = await import('${MANIFOLD_CDN_BASE_URL}/manifold.js');
  window.ManifoldModule = ManifoldModule;
} catch (e) {
  console.error('Error importing manifold in dynamic script:', e);
} finally {
  window.dispatchEvent(new CustomEvent('${manifoldLoadedEventName}'));
}
      `.trim()

      const onScriptError = (err: any) => {
        window.removeEventListener(manifoldLoadedEventName, handleManifoldScriptLoad)
        reject(new Error("Failed to load Manifold loader script."))
      }

      script.addEventListener("error", onScriptError)
      document.body.appendChild(script)
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
  const getInitialState = () => {
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
  }

  const initialState = getInitialState()
  const [manifoldModule, setManifoldModule] = useState<ManifoldToplevel | null>(
    initialState.manifoldModule,
  )
  const [error, setError] = useState<string | null>(initialState.error)
  const [isLoading, setIsLoading] = useState<boolean>(initialState.isLoading)

  useEffect(() => {
    let hasUnmounted = false

    async function loadModule() {
      const manifoldCache = window.TSCIRCUIT_MANIFOLD_LOADER_CACHE

      if (manifoldCache) {
        if (manifoldCache.manifoldInstance) {
          if (manifoldCache.manifoldInstance instanceof Error) {
            setError(manifoldCache.manifoldInstance.message)
            setManifoldModule(null)
          } else {
            setManifoldModule(manifoldCache.manifoldInstance)
            setError(null)
          }
          setIsLoading(false)
          return
        }

        try {
          const manifoldInstance = await manifoldCache.loadingPromise
          if (hasUnmounted) return

          if (manifoldInstance instanceof Error) {
            setError(manifoldInstance.message)
            setManifoldModule(null)
          } else {
            setManifoldModule(manifoldInstance)
            setError(null)
          }
          setIsLoading(false)
        } catch (err) {
          if (hasUnmounted) return
          setError(err instanceof Error ? err.message : "Unknown error")
          setManifoldModule(null)
          setIsLoading(false)
        }
        return
      }

      const loadingPromise = loadManifoldModule().then((manifoldInstance) => {
        if (window.TSCIRCUIT_MANIFOLD_LOADER_CACHE) {
          window.TSCIRCUIT_MANIFOLD_LOADER_CACHE.manifoldInstance = manifoldInstance
        }
        return manifoldInstance
      }).catch((error) => {
        if (window.TSCIRCUIT_MANIFOLD_LOADER_CACHE) {
          window.TSCIRCUIT_MANIFOLD_LOADER_CACHE.manifoldInstance = error
        }
        throw error
      })

      window.TSCIRCUIT_MANIFOLD_LOADER_CACHE = { loadingPromise, manifoldInstance: null }

      try {
        const manifoldInstance = await loadingPromise
        if (hasUnmounted) return

        if (manifoldInstance instanceof Error) {
          setError(manifoldInstance.message)
          setManifoldModule(null)
        } else {
          setManifoldModule(manifoldInstance)
          setError(null)
        }
        setIsLoading(false)
      } catch (err) {
        if (hasUnmounted) return
        setError(err instanceof Error ? err.message : "Unknown error")
        setManifoldModule(null)
        setIsLoading(false)
      }
    }

    loadModule()

    return () => {
      hasUnmounted = true
    }
  }, [])

  return { manifoldModule, error, isLoading }
}
