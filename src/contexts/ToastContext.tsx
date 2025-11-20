import React, { createContext, useContext, useState, useCallback } from "react"
import { Toast } from "../components/Toast"
import type { ToastProps } from "../types/Toast"

interface ToastContextType {
  showToast: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within ToastProvider")
  }
  return context
}

interface ToastItem extends ToastProps {
  id: number
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextIdRef = React.useRef(0)

  const showToast = useCallback((message: string, duration?: number) => {
    const id = nextIdRef.current
    nextIdRef.current += 1
    setToasts((prev) => [...prev, { id, message, duration }])
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          duration={toast.duration}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}
    </ToastContext.Provider>
  )
}
