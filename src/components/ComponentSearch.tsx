import React, { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { su } from "@tscircuit/circuit-json-util"
import type {
  AnyCircuitElement,
  AnySourceComponent,
  CadComponent,
  PcbComponent,
} from "circuit-json"

interface ComponentSearchProps {
  circuitJson: AnyCircuitElement[]
  onComponentSelect: (componentId: string | null) => void
  selectedComponentId: string | null
}

interface SearchableComponent {
  id: string
  name: string
  type: string
  cadComponentId?: string
}

export const ComponentSearch: React.FC<ComponentSearchProps> = ({
  circuitJson,
  onComponentSelect,
  selectedComponentId,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const searchableComponents = useMemo(() => {
    const components: SearchableComponent[] = []

    // Get all source components with their names
    const sourceComponents = circuitJson.filter(
      (el) => el.type === "source_component",
    )
    const cadComponents = su(circuitJson).cad_component.list()
    sourceComponents.forEach((sourceComp) => {
      const cadComp = cadComponents.find(
        (cad) => cad.source_component_id === sourceComp.source_component_id,
      )

      components.push({
        id: sourceComp.source_component_id,
        name: sourceComp.name || "Unnamed Component",
        type: sourceComp.type || "Unknown",
        cadComponentId: cadComp?.cad_component_id,
      })
    })

    console.log(69, circuitJson)
    return components
  }, [circuitJson])

  const filteredComponents = useMemo(() => {
    if (!searchTerm.trim()) return searchableComponents

    const term = searchTerm.toLowerCase()
    return searchableComponents.filter(
      (comp) =>
        comp.name.toLowerCase().includes(term) ||
        comp.type.toLowerCase().includes(term) ||
        comp.id.toLowerCase().includes(term),
    )
  }, [searchableComponents, searchTerm])

  const handleComponentClick = useCallback(
    (component: SearchableComponent) => {
      onComponentSelect(component.cadComponentId || component.id)
      setIsOpen(false)
      setSearchTerm("")
      setFocusedIndex(-1)
    },
    [onComponentSelect],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setFocusedIndex((prev) =>
            prev < filteredComponents.length - 1 ? prev + 1 : prev,
          )
          break
        case "ArrowUp":
          e.preventDefault()
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev))
          break
        case "Enter":
          e.preventDefault()
          if (focusedIndex >= 0 && filteredComponents[focusedIndex]) {
            handleComponentClick(filteredComponents[focusedIndex])
          }
          break
        case "Escape":
          setIsOpen(false)
          setSearchTerm("")
          setFocusedIndex(-1)
          break
      }
    },
    [isOpen, filteredComponents, focusedIndex, handleComponentClick],
  )

  const handleSearchClick = useCallback(() => {
    setIsOpen(true)
    setTimeout(() => searchInputRef.current?.focus(), 0)
  }, [])

  const handleClearSelection = useCallback(() => {
    onComponentSelect(null)
  }, [onComponentSelect])

  useEffect(() => {
    if (isOpen && resultsRef.current && focusedIndex >= 0) {
      const focusedElement = resultsRef.current.children[
        focusedIndex
      ] as HTMLElement
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: "nearest" })
      }
    }
  }, [focusedIndex, isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node) &&
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div
      style={{
        zIndex: 1000,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <button
            onClick={
              selectedComponentId ? handleClearSelection : handleSearchClick
            }
            style={{
              background: "#222",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "2px 4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              opacity: 0.7,
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = "1"
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = "0.7"
            }}
            title={selectedComponentId ? "Clear selection" : "Find Component"}
          >
            {selectedComponentId ? (
              <span style={{ fontSize: "10px", fontWeight: "bold" }}>✕</span>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            )}
          </button>
        </div>

        {isOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: 8,
              background: "#222",
              border: "1px solid #333",
              borderRadius: 8,
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
              width: 350,
              maxHeight: "70vh",
              zIndex: 1001,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "16px 16px 12px" }}>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search components..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setFocusedIndex(-1)
                }}
                onKeyDown={handleKeyDown}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #444",
                  borderRadius: 6,
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#333",
                  color: "#fff",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#666"
                  e.target.style.boxShadow =
                    "0 0 0 2px rgba(255, 255, 255, 0.1)"
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#444"
                  e.target.style.boxShadow = "none"
                }}
              />
            </div>

            <div
              ref={resultsRef}
              style={{
                maxHeight: "calc(70vh - 80px)",
                overflowY: "auto",
                borderTop: "1px solid #333",
              }}
            >
              {filteredComponents.length === 0 ? (
                <div
                  style={{
                    padding: "24px 16px",
                    color: "#999",
                    fontSize: 14,
                    textAlign: "center",
                  }}
                >
                  {searchTerm
                    ? "No components found"
                    : "No components available"}
                </div>
              ) : (
                filteredComponents.map((component, index) => {
                  const isSelected =
                    selectedComponentId ===
                    (component.cadComponentId || component.id)
                  const isFocused = index === focusedIndex

                  return (
                    <div
                      key={component.id}
                      onClick={() => handleComponentClick(component)}
                      style={{
                        padding: "14px 16px",
                        cursor: "pointer",
                        borderBottom:
                          index < filteredComponents.length - 1
                            ? "1px solid #333"
                            : "none",
                        background: isSelected
                          ? "#444"
                          : isFocused
                            ? "#2a2a2a"
                            : "transparent",
                        transition: "background-color 0.15s ease",
                      }}
                      onMouseEnter={() => setFocusedIndex(index)}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 15,
                            color: isSelected ? "#fff" : "#e5e5e5",
                            lineHeight: 1.2,
                          }}
                        >
                          {component.name}
                        </div>
                        {isSelected && (
                          <span
                            style={{
                              background: "#ef4444",
                              color: "white",
                              padding: "2px 6px",
                              borderRadius: 3,
                              fontSize: 10,
                              fontWeight: 600,
                              letterSpacing: "0.5px",
                            }}
                          >
                            SELECTED
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: isSelected ? "#ccc" : "#999",
                          marginBottom: 4,
                        }}
                      >
                        Type: {component.type}
                      </div>

                      {isSelected && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#aaa",
                            fontFamily: "monospace",
                            background: "#333",
                            padding: "4px 6px",
                            borderRadius: 3,
                            marginTop: 6,
                          }}
                        >
                          ID: {component.cadComponentId || component.id}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
