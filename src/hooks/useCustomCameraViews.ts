import { useState, useCallback, useEffect } from "react"

export interface CustomCameraView {
  id: string
  name: string
  position: readonly [number, number, number]
  target: readonly [number, number, number]
  up: readonly [number, number, number]
  createdAt: number
}

const CUSTOM_VIEWS_KEY = "cadViewerCustomCameraViews"

export function useCustomCameraViews() {
  const [customViews, setCustomViews] = useState<CustomCameraView[]>(() => {
    try {
      const stored = window.localStorage.getItem(CUSTOM_VIEWS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  // Persist custom views to localStorage
  useEffect(() => {
    window.localStorage.setItem(CUSTOM_VIEWS_KEY, JSON.stringify(customViews))
  }, [customViews])

  const saveCustomView = useCallback(
    (
      name: string,
      view: Omit<CustomCameraView, "id" | "name" | "createdAt">,
    ) => {
      const newView: CustomCameraView = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name,
        position: view.position,
        target: view.target,
        up: view.up,
        createdAt: Date.now(),
      }
      setCustomViews((prev) => [...prev, newView])
      return newView
    },
    [],
  )

  const deleteCustomView = useCallback((id: string) => {
    setCustomViews((prev) => prev.filter((view) => view.id !== id))
  }, [])

  const renameCustomView = useCallback((id: string, newName: string) => {
    setCustomViews((prev) =>
      prev.map((view) => (view.id === id ? { ...view, name: newName } : view)),
    )
  }, [])

  const updateCustomView = useCallback(
    (id: string, view: Omit<CustomCameraView, "id" | "name" | "createdAt">) => {
      setCustomViews((prev) =>
        prev.map((v) =>
          v.id === id
            ? {
                ...v,
                position: view.position,
                target: view.target,
                up: view.up,
              }
            : v,
        ),
      )
    },
    [],
  )

  return {
    customViews,
    saveCustomView,
    deleteCustomView,
    renameCustomView,
    updateCustomView,
  }
}
