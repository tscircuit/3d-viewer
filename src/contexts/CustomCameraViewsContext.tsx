import type * as React from "react"
import { createContext, useContext } from "react"
import {
  useCustomCameraViews,
  type CustomCameraView,
} from "../hooks/useCustomCameraViews"

interface CustomCameraViewsContextValue {
  customViews: CustomCameraView[]
  saveCustomView: (
    name: string,
    view: Omit<CustomCameraView, "id" | "name" | "createdAt">,
  ) => CustomCameraView
  deleteCustomView: (id: string) => void
  renameCustomView: (id: string, newName: string) => void
  updateCustomView: (
    id: string,
    view: Omit<CustomCameraView, "id" | "name" | "createdAt">,
  ) => void
}

const CustomCameraViewsContext = createContext<
  CustomCameraViewsContextValue | undefined
>(undefined)

export const CustomCameraViewsProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const value = useCustomCameraViews()

  return (
    <CustomCameraViewsContext.Provider value={value}>
      {children}
    </CustomCameraViewsContext.Provider>
  )
}

export const useCustomCameraViewsContext = () => {
  const context = useContext(CustomCameraViewsContext)
  if (!context) {
    throw new Error(
      "useCustomCameraViewsContext must be used within a CustomCameraViewsProvider",
    )
  }
  return context
}
