import { useEffect, useMemo, useRef, useState } from "react"
import { useHotkeyRegistry } from "../hooks/useRegisteredHotkey"

interface KeyboardShortcutsDialogProps {
  open: boolean
  onClose: () => void
}

export const KeyboardShortcutsDialog = ({
  open,
  onClose,
}: KeyboardShortcutsDialogProps) => {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement | null>(null)
  const hotkeys = useHotkeyRegistry()

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }
  }, [open])

  const filteredHotkeys = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return hotkeys
    }
    return hotkeys.filter((hotkey) => {
      const haystack = `${hotkey.key} ${hotkey.description} ${hotkey.category}`
      return haystack.toLowerCase().includes(normalizedQuery)
    })
  }, [hotkeys, query])

  if (!open) {
    return null
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#1f1f23",
          color: "#f8f8ff",
          borderRadius: 12,
          width: "min(640px, 90vw)",
          maxHeight: "80vh",
          boxShadow:
            "0 20px 60px rgba(0, 0, 0, 0.45), 0 8px 20px rgba(0, 0, 0, 0.35)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <header
          style={{
            padding: "20px 24px 12px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h2
              style={{
                margin: 0,
                fontSize: "1.1rem",
                fontWeight: 600,
                letterSpacing: "0.02em",
              }}
            >
              Keyboard Shortcuts
            </h2>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search shortcuts..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{
              marginTop: 12,
              width: "calc(100% - 24px)",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              color: "white",
              fontSize: "0.95rem",
            }}
          />
        </header>

        <div style={{ overflowY: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.95rem",
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", color: "#a1a1b5" }}>
                <th style={{ padding: "12px 24px", width: "25%" }}>Key</th>
                <th style={{ padding: "12px 0" }}>Description</th>
                <th style={{ padding: "12px 24px", width: "25%" }}>Category</th>
              </tr>
            </thead>
            <tbody>
              {filteredHotkeys.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    style={{ padding: "24px", textAlign: "center" }}
                  >
                    No shortcuts found
                  </td>
                </tr>
              ) : (
                filteredHotkeys.map((hotkey) => (
                  <tr
                    key={hotkey.id}
                    style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}
                  >
                    <td style={{ padding: "12px 24px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid rgba(255, 255, 255, 0.3)",
                          borderRadius: 6,
                          minWidth: 36,
                          padding: "4px 8px",
                          fontFamily: "monospace",
                          fontSize: "0.95rem",
                        }}
                      >
                        {hotkey.key.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "12px 0" }}>{hotkey.description}</td>
                    <td style={{ padding: "12px 24px" }}>{hotkey.category}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
