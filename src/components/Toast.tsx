import type React from "react"
import { useEffect, useState } from "react"
import type { ToastProps } from "../types/Toast"

export const Toast: React.FC<ToastProps> = ({
  message,
  duration = 2000,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Fade in
    requestAnimationFrame(() => {
      setIsVisible(true)
    })

    // Auto dismiss
    const timer = setTimeout(() => {
      setIsVisible(false)
      if (onDismiss) {
        setTimeout(onDismiss, 300) // Wait for fade out animation
      }
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        background: "rgba(0, 0, 0, 0.9)",
        color: "#fff",
        padding: "12px 20px",
        borderRadius: 6,
        fontSize: 14,
        fontWeight: 500,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        zIndex: 10000,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
        pointerEvents: "none",
        userSelect: "none",
        maxWidth: 300,
      }}
    >
      {message}
    </div>
  )
}
