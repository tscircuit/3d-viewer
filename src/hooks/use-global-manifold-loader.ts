import { useState, useEffect } from "react"
import { ManifoldToplevel } from "manifold-3d"

interface ManifoldCacheItem {
  promise: Promise<ManifoldToplevel | Error>
  result: ManifoldToplevel | Error | null
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
    const existingManifold =
      window.ManifoldModule ?? window.MANIFOLD ?? window.MANIFOLD_MODULE

    if (existingManifold) {
      window.ManifoldModule = existingManifold
      const loadedModule: ManifoldToplevel = await existingManifold()
      loadedModule.setup()
      return loadedModule
    }

    return new Promise((resolve, reject) => {
      const eventName = "manifoldLoaded"

      const handleLoad = async () => {
        try {
          const loadedManifold =
            window.ManifoldModule ?? window.MANIFOLD ?? window.MANIFOLD_MODULE
          if (loadedManifold) {
            window.ManifoldModule = loadedManifold
            const loadedModule: ManifoldToplevel = await loadedManifold()
            loadedModule.setup()
            resolve(loadedModule)
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

      window.addEventListener(eventName, handleLoad, { once: true })

      const script = document.createElement("script")
      script.type = "module"
      script.innerHTML = `
try {
  const { default: ManifoldModule } = await import('${MANIFOLD_CDN_BASE_URL}/manifold.js');
  window.ManifoldModule = ManifoldModule;
} catch (e) {
  console.error('Error importing manifold in dynamic script:', e);
} finally {
  window.dispatchEvent(new CustomEvent('${eventName}'));
}
      `.trim()

      const scriptError = (err: any) => {
        window.removeEventListener(eventName, handleLoad)
        reject(new Error("Failed to load Manifold loader script."))
      }

      script.addEventListener("error", scriptError)
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
  const [manifoldModule, setManifoldModule] = useState<ManifoldToplevel | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    let hasUnmounted = false

    async function loadModule() {
      const cache = window.TSCIRCUIT_MANIFOLD_LOADER_CACHE

      if (cache) {
        if (cache.result) {
          if (cache.result instanceof Error) {
            setError(cache.result.message)
            setManifoldModule(null)
          } else {
            setManifoldModule(cache.result)
            setError(null)
          }
          setIsLoading(false)
          return
        }

        try {
          const result = await cache.promise
          if (hasUnmounted) return

          if (result instanceof Error) {
            setError(result.message)
            setManifoldModule(null)
          } else {
            setManifoldModule(result)
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

      const promise = loadManifoldModule().then((result) => {
        if (window.TSCIRCUIT_MANIFOLD_LOADER_CACHE) {
          window.TSCIRCUIT_MANIFOLD_LOADER_CACHE.result = result
        }
        return result
      })

      window.TSCIRCUIT_MANIFOLD_LOADER_CACHE = { promise, result: null }

      try {
        const result = await promise
        if (hasUnmounted) return

        if (result instanceof Error) {
          setError(result.message)
          setManifoldModule(null)
        } else {
          setManifoldModule(result)
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
