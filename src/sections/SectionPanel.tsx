import type { CSSProperties } from "react"
import { useSection } from "./SectionContext"
import type { SectionAxis } from "./section-geometry"

const button: CSSProperties = {
  background: "#343434",
  color: "white",
  border: "1px solid #666",
  borderRadius: 4,
  padding: "5px 9px",
  cursor: "pointer",
}
export function SectionPanel() {
  const section = useSection()
  if (!section) return null
  const { spec, setSpec, editing, setEditing, bounds, openChains } = section
  const start = () => {
    if (!spec)
      setSpec({
        axis: "x",
        offset: bounds ? (bounds.min.x + bounds.max.x) / 2 : 0,
        flipped: false,
      })
    setEditing(true)
  }
  const clear = () => {
    setSpec(null)
    setEditing(false)
  }
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 5,
        font: "13px system-ui",
        color: "white",
        background: "#262626",
        border: "1px solid #555",
        borderRadius: 6,
        padding: 8,
        maxWidth: "calc(100% - 120px)",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    >
      {!editing || !spec ? (
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" style={button} onClick={start}>
            {spec ? "Section on · Edit" : "Section"}
          </button>
          {spec && (
            <button type="button" style={button} onClick={clear}>
              Clear
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 9, width: 220, maxWidth: "100%" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <strong>Section view</strong>
            <button
              type="button"
              style={button}
              onClick={() => setEditing(false)}
              aria-label="Close section controls"
            >
              ×
            </button>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {(["x", "y", "z"] as SectionAxis[]).map((axis) => (
              <button
                type="button"
                key={axis}
                style={{
                  ...button,
                  background: axis === spec.axis ? "#806225" : "#343434",
                }}
                aria-pressed={axis === spec.axis}
                onClick={() =>
                  setSpec({
                    ...spec,
                    axis,
                    offset: bounds
                      ? (bounds.min[axis] + bounds.max[axis]) / 2
                      : 0,
                  })
                }
              >
                {axis.toUpperCase()}
              </button>
            ))}
            <button
              type="button"
              style={{ ...button, marginLeft: "auto" }}
              onClick={() => setSpec({ ...spec, flipped: !spec.flipped })}
            >
              Flip side
            </button>
          </div>
          <label>
            Offset (mm){" "}
            <input
              aria-label="Section offset (mm)"
              type="number"
              step="0.1"
              value={Number(spec.offset.toFixed(4))}
              onChange={(e) => {
                if (
                  e.target.value !== "" &&
                  Number.isFinite(e.target.valueAsNumber)
                )
                  setSpec({ ...spec, offset: e.target.valueAsNumber })
              }}
              style={{ width: 85, float: "right" }}
            />
          </label>
          <input
            aria-label="Section position"
            type="range"
            min={bounds?.min[spec.axis] ?? -10}
            max={bounds?.max[spec.axis] ?? 10}
            step="any"
            value={spec.offset}
            onChange={(e) =>
              setSpec({ ...spec, offset: e.target.valueAsNumber })
            }
          />
          <span style={{ color: "#ccc", fontSize: 12 }}>
            Drag the plane or arrow to move the cut.
          </span>
          <button
            type="button"
            style={button}
            onClick={() => section.requestAlign()}
          >
            Look perpendicular
          </button>
          {openChains > 0 && (
            <span role="status" style={{ color: "#ffd666", fontSize: 12 }}>
              Some open model surfaces could not be filled.
            </span>
          )}
          <button type="button" style={button} onClick={clear}>
            Clear section
          </button>
        </div>
      )}
    </div>
  )
}
