import React from "react"
import { Toaster, toast as hotToast } from "react-hot-toast"

export const useToast = () => {
  return {
    showToast: (message: string, duration: number = 2000) => {
      hotToast(message, { duration })
    },
  }
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <>
      {children}
      <Toaster position="bottom-right" />
    </>
  )
}
