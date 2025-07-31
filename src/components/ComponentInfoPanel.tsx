import React from "react"

interface ComponentInfoPanelProps {
  circuitJson: any[]
  componentId: string | null
  onClose: () => void
}

export const ComponentInfoPanel: React.FC<ComponentInfoPanelProps> = ({
  circuitJson,
  componentId,
  onClose,
}) => {
  if (!componentId) return null

  // Find the component data
  const sourceComponent = circuitJson.find(
    (el) =>
      el.type === "source_component" &&
      (el.source_component_id === componentId ||
        el.cad_component_id === componentId),
  )

  const cadComponent = circuitJson.find(
    (el) =>
      el.type === "cad_component" &&
      (el.cad_component_id === componentId ||
        el.source_component_id === componentId),
  )

  const pcbComponent = circuitJson.find(
    (el) =>
      el.type === "pcb_component" &&
      (el.source_component_id === componentId ||
        el.pcb_component_id === componentId),
  )

  // Find related ports
  const sourcePorts = circuitJson.filter(
    (el) =>
      el.type === "source_port" &&
      el.source_component_id ===
        (sourceComponent?.source_component_id || componentId),
  )

  // Find SMT pads
  const smtPads = circuitJson.filter(
    (el) =>
      el.type === "pcb_smtpad" &&
      el.pcb_component_id === pcbComponent?.pcb_component_id,
  )

  const component = sourceComponent || cadComponent || pcbComponent
  if (!component) return null

  return (
    <div
      style={{
        position: "fixed",
        top: 60,
        right: 8,
        width: 320,
        maxHeight: "calc(100vh - 80px)",
        background: "#222",
        border: "1px solid #444",
        borderRadius: 8,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        zIndex: 1000,
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          background: "#333",
          borderBottom: "1px solid #444",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3
          style={{
            margin: 0,
            color: "#fff",
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          Component Info
        </h3>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#aaa",
            fontSize: 18,
            cursor: "pointer",
            padding: 4,
            borderRadius: 4,
            transition: "color 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#aaa")}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          padding: 16,
          maxHeight: "calc(100vh - 140px)",
          overflowY: "auto",
          color: "#fff",
        }}
      >
        {/* Basic Info */}
        <div style={{ marginBottom: 20 }}>
          <h4
            style={{
              margin: "0 0 8px 0",
              color: "#4CAF50",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Basic Information
          </h4>
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: "#aaa" }}>Name:</span>{" "}
              <span style={{ color: "#fff", fontWeight: 500 }}>
                {sourceComponent?.name ||
                  cadComponent?.name ||
                  pcbComponent?.name ||
                  "Unnamed"}
              </span>
            </div>
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: "#aaa" }}>Type:</span>{" "}
              <span style={{ color: "#fff" }}>
                {sourceComponent?.ftype || component.type}
              </span>
            </div>
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: "#aaa" }}>ID:</span>{" "}
              <span
                style={{ color: "#fff", fontFamily: "monospace", fontSize: 12 }}
              >
                {componentId}
              </span>
            </div>
          </div>
        </div>

        {/* Component Properties */}
        {sourceComponent && (
          <div style={{ marginBottom: 20 }}>
            <h4
              style={{
                margin: "0 0 8px 0",
                color: "#2196F3",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Component Properties
            </h4>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              {sourceComponent.resistance && (
                <div style={{ marginBottom: 6 }}>
                  <span style={{ color: "#aaa" }}>Resistance:</span>{" "}
                  <span style={{ color: "#fff" }}>
                    {sourceComponent.display_resistance ||
                      `${sourceComponent.resistance}Ω`}
                  </span>
                </div>
              )}
              {sourceComponent.capacitance && (
                <div style={{ marginBottom: 6 }}>
                  <span style={{ color: "#aaa" }}>Capacitance:</span>{" "}
                  <span style={{ color: "#fff" }}>
                    {sourceComponent.capacitance}
                  </span>
                </div>
              )}
              {sourceComponent.manufacturer_part_number && (
                <div style={{ marginBottom: 6 }}>
                  <span style={{ color: "#aaa" }}>Part Number:</span>{" "}
                  <span
                    style={{
                      color: "#fff",
                      fontFamily: "monospace",
                      fontSize: 12,
                    }}
                  >
                    {sourceComponent.manufacturer_part_number}
                  </span>
                </div>
              )}
              {sourceComponent.supplier_part_numbers &&
                Object.keys(sourceComponent.supplier_part_numbers).length >
                  0 && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: "#aaa" }}>Supplier Parts:</span>
                    <div style={{ marginTop: 4 }}>
                      {Object.entries(
                        sourceComponent.supplier_part_numbers,
                      ).map(([supplier, parts]) => (
                        <div
                          key={supplier}
                          style={{ marginLeft: 12, marginBottom: 2 }}
                        >
                          <span
                            style={{
                              color: "#888",
                              textTransform: "uppercase",
                              fontSize: 11,
                            }}
                          >
                            {supplier}:
                          </span>{" "}
                          <span
                            style={{
                              color: "#fff",
                              fontFamily: "monospace",
                              fontSize: 12,
                            }}
                          >
                            {Array.isArray(parts)
                              ? parts.join(", ")
                              : String(parts)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* PCB Layout */}
        {pcbComponent && (
          <div style={{ marginBottom: 20 }}>
            <h4
              style={{
                margin: "0 0 8px 0",
                color: "#FF9800",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              PCB Layout
            </h4>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: "#aaa" }}>Position:</span>{" "}
                <span style={{ color: "#fff", fontFamily: "monospace" }}>
                  ({pcbComponent.center?.x?.toFixed(2) || 0},{" "}
                  {pcbComponent.center?.y?.toFixed(2) || 0})
                </span>
              </div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: "#aaa" }}>Size:</span>{" "}
                <span style={{ color: "#fff" }}>
                  {pcbComponent.width?.toFixed(2) || 0} ×{" "}
                  {pcbComponent.height?.toFixed(2) || 0} mm
                </span>
              </div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: "#aaa" }}>Layer:</span>{" "}
                <span style={{ color: "#fff", textTransform: "capitalize" }}>
                  {pcbComponent.layer || "Unknown"}
                </span>
              </div>
              {pcbComponent.rotation !== undefined && (
                <div style={{ marginBottom: 6 }}>
                  <span style={{ color: "#aaa" }}>Rotation:</span>{" "}
                  <span style={{ color: "#fff" }}>
                    {pcbComponent.rotation}°
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3D Model */}
        {cadComponent && (
          <div style={{ marginBottom: 20 }}>
            <h4
              style={{
                margin: "0 0 8px 0",
                color: "#9C27B0",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              3D Model
            </h4>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: "#aaa" }}>Position:</span>{" "}
                <span style={{ color: "#fff", fontFamily: "monospace" }}>
                  ({cadComponent.position?.x?.toFixed(2) || 0},{" "}
                  {cadComponent.position?.y?.toFixed(2) || 0},{" "}
                  {cadComponent.position?.z?.toFixed(2) || 0})
                </span>
              </div>
              {cadComponent.rotation && (
                <div style={{ marginBottom: 6 }}>
                  <span style={{ color: "#aaa" }}>Rotation:</span>{" "}
                  <span style={{ color: "#fff", fontFamily: "monospace" }}>
                    ({cadComponent.rotation.x || 0}°,{" "}
                    {cadComponent.rotation.y || 0}°,{" "}
                    {cadComponent.rotation.z || 0}°)
                  </span>
                </div>
              )}
              {cadComponent.footprinter_string && (
                <div style={{ marginBottom: 6 }}>
                  <span style={{ color: "#aaa" }}>Footprint:</span>{" "}
                  <span style={{ color: "#fff" }}>
                    {cadComponent.footprinter_string}
                  </span>
                </div>
              )}
              {cadComponent.model_obj_url && (
                <div style={{ marginBottom: 6 }}>
                  <span style={{ color: "#aaa" }}>Model URL:</span>{" "}
                  <a
                    href={cadComponent.model_obj_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#4CAF50",
                      textDecoration: "none",
                      fontSize: 12,
                    }}
                  >
                    View Model
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ports */}
        {sourcePorts.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h4
              style={{
                margin: "0 0 8px 0",
                color: "#00BCD4",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Ports ({sourcePorts.length})
            </h4>
            <div style={{ fontSize: 12 }}>
              {sourcePorts.map((port, index) => (
                <div
                  key={port.source_port_id}
                  style={{
                    padding: "6px 8px",
                    background: "#2a2a2a",
                    borderRadius: 4,
                    marginBottom: 4,
                    border: "1px solid #333",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 2,
                    }}
                  >
                    <span style={{ color: "#fff", fontWeight: 500 }}>
                      {port.name || `Pin ${port.pin_number}`}
                    </span>
                    <span style={{ color: "#aaa", fontFamily: "monospace" }}>
                      #{port.pin_number}
                    </span>
                  </div>
                  {port.port_hints && port.port_hints.length > 0 && (
                    <div style={{ color: "#888", fontSize: 11 }}>
                      Hints: {port.port_hints.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SMT Pads */}
        {smtPads.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h4
              style={{
                margin: "0 0 8px 0",
                color: "#FFC107",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              SMT Pads ({smtPads.length})
            </h4>
            <div style={{ fontSize: 12 }}>
              {smtPads.map((pad, index) => (
                <div
                  key={pad.pcb_smtpad_id}
                  style={{
                    padding: "6px 8px",
                    background: "#2a2a2a",
                    borderRadius: 4,
                    marginBottom: 4,
                    border: "1px solid #333",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 2,
                    }}
                  >
                    <span style={{ color: "#fff", fontWeight: 500 }}>
                      {pad.port_hints?.[0] || `Pad ${index + 1}`}
                    </span>
                    <span style={{ color: "#aaa" }}>
                      {pad.shape} • {pad.layer}
                    </span>
                  </div>
                  <div style={{ color: "#888", fontSize: 11 }}>
                    Size: {pad.width?.toFixed(2) || 0} ×{" "}
                    {pad.height?.toFixed(2) || 0} mm
                  </div>
                  <div style={{ color: "#888", fontSize: 11 }}>
                    Position: ({pad.x?.toFixed(2) || 0},{" "}
                    {pad.y?.toFixed(2) || 0})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
