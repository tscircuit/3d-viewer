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

async function createManifoldInstanceFromFactory(
  factory: ManifoldFactory,
): Promise<ManifoldToplevel> {
  const manifoldInstance: ManifoldToplevel = await factory()
  manifoldInstance.setup()
  return manifoldInstance
}

async function handleManifoldScriptLoadEvent(
  resolve: (value: ManifoldToplevel) => void,
  reject: (reason?: any) => void,
): Promise<void> {
  try {
    const loadedManifoldFactory =
      window.ManifoldModule ?? window.MANIFOLD ?? window.MANIFOLD_MODULE
    if (loadedManifoldFactory) {
      window.ManifoldModule = loadedManifoldFactory
      const manifoldInstance = await createManifoldInstanceFromFactory(
        loadedManifoldFactory,
      )
      resolve(manifoldInstance)
    } else {
      reject(new Error("ManifoldModule not found on window after script load."))
    }
  } catch (error) {
    reject(error)
  }
}

function handleManifoldScriptError(
  handleManifoldScriptLoad: () => Promise<void>,
  reject: (reason?: any) => void,
): () => void {
  return () => {
    window.removeEventListener(
      "tscircuit:manifoldLoaded",
      handleManifoldScriptLoad,
    )
    reject(new Error("Failed to load Manifold loader script."))
  }
}

function createManifoldImportScript(): HTMLScriptElement {
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
  return manifoldCdnImportScript
}

async function loadManifoldModule(): Promise<ManifoldToplevel | Error> {
  try {
    const existingManifoldFactory =
      window.ManifoldModule ?? window.MANIFOLD ?? window.MANIFOLD_MODULE

    if (existingManifoldFactory) {
      window.ManifoldModule = existingManifoldFactory
      return await createManifoldInstanceFromFactory(existingManifoldFactory)
    }

    return new Promise((resolve, reject) => {
      const handleManifoldScriptLoad = () =>
        handleManifoldScriptLoadEvent(resolve, reject)
      const onScriptError = handleManifoldScriptError(
        handleManifoldScriptLoad,
        reject,
      )

      window.addEventListener(
        "tscircuit:manifoldLoaded",
        handleManifoldScriptLoad,
        { once: true },
      )

      const manifoldCdnImportScript = createManifoldImportScript()
      manifoldCdnImportScript.addEventListener("error", onScriptError)
      document.body.appendChild(manifoldCdnImportScript)
    })
  } catch (error) {
    return error as Error
  }
}

function getInitialManifoldLoaderState(): {
  manifoldModule: ManifoldToplevel | null
  error: string | null
  isLoading: boolean
} {
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
      return {
        manifoldModule: manifoldCache.manifoldInstance,
        error: null,
        isLoading: false,
      }
    }
  }

  return { manifoldModule: null, error: null, isLoading: true }
}

function updateManifoldLoaderState(
  manifoldInstance: ManifoldToplevel | Error | null,
  setError: (error: string | null) => void,
  setManifoldModule: (module: ManifoldToplevel | null) => void,
  setIsLoading: (loading: boolean) => void,
): void {
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

async function loadManifoldModuleWithCaching(
  updateState: (manifoldInstance: ManifoldToplevel | Error | null) => void,
  hasUnmounted: { current: boolean },
): Promise<void> {
  const manifoldCache = window.TSCIRCUIT_MANIFOLD_LOADER_CACHE

  if (manifoldCache?.manifoldInstance) {
    updateState(manifoldCache.manifoldInstance)
    return
  }

  if (manifoldCache) {
    try {
      const manifoldInstance = await manifoldCache.manifoldInstancePromise
      if (hasUnmounted.current) return
      updateState(manifoldInstance)
      return
    } catch (err) {
      if (hasUnmounted.current) return
      const errorInstance =
        err instanceof Error ? err : new Error("Unknown error")
      updateState(errorInstance)
      return
    }
  }

  const manifoldInstancePromise = loadManifoldModule().then(
    (manifoldInstance) => {
      if (window.TSCIRCUIT_MANIFOLD_LOADER_CACHE) {
        window.TSCIRCUIT_MANIFOLD_LOADER_CACHE.manifoldInstance =
          manifoldInstance
      }
      return manifoldInstance
    },
    (error) => {
      if (window.TSCIRCUIT_MANIFOLD_LOADER_CACHE) {
        window.TSCIRCUIT_MANIFOLD_LOADER_CACHE.manifoldInstance = error
      }
      return error
    },
  )

  window.TSCIRCUIT_MANIFOLD_LOADER_CACHE = {
    manifoldInstancePromise,
    manifoldInstance: null,
  }

  try {
    const manifoldInstance = await manifoldInstancePromise
    if (hasUnmounted.current) return
    updateState(manifoldInstance)
  } catch (err) {
    if (hasUnmounted.current) return
    const errorInstance =
      err instanceof Error ? err : new Error("Unknown error")
    updateState(errorInstance)
  }
}

export function useGlobalManifoldLoader(): {
  manifoldModule: ManifoldToplevel | null
  error: string | null
  isLoading: boolean
} {
  const initialState = useMemo(getInitialManifoldLoaderState, [])

  const [manifoldModule, setManifoldModule] = useState<ManifoldToplevel | null>(
    initialState.manifoldModule,
  )
  const [error, setError] = useState<string | null>(initialState.error)
  const [isLoading, setIsLoading] = useState<boolean>(initialState.isLoading)

  useEffect(() => {
    const hasUnmounted = { current: false }

    const updateState = (manifoldInstance: ManifoldToplevel | Error | null) => {
      updateManifoldLoaderState(
        manifoldInstance,
        setError,
        setManifoldModule,
        setIsLoading,
      )
    }

    loadManifoldModuleWithCaching(updateState, hasUnmounted)

    return () => {
      hasUnmounted.current = true
    }
  }, [])

  return { manifoldModule, error, isLoading }
}
