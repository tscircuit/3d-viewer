import { type SyntheticEvent, useId } from "react"
import { zIndexMap } from "../../lib/utils/z-index-map"

export const ExplodedViewControl = ({
  explodedViewAmount,
  onExplodedViewAmountChange,
}: {
  explodedViewAmount: number
  onExplodedViewAmountChange: (explodedViewAmount: number) => void
}) => {
  const sliderId = useId()
  const explodedPercent = Math.round(explodedViewAmount * 100)

  const stopPropagation = (event: SyntheticEvent) => {
    event.stopPropagation()
  }

  return (
    <div
      role="group"
      aria-label="Exploded view"
      onPointerDown={stopPropagation}
      onPointerUp={stopPropagation}
      onClick={stopPropagation}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      style={{
        position: "absolute",
        left: "50%",
        bottom: 18,
        transform: "translateX(-50%)",
        zIndex: zIndexMap.explodedViewControl,
        width: "min(360px, calc(100% - 112px))",
        minWidth: 220,
        height: 48,
        display: "grid",
        gridTemplateColumns: "auto minmax(80px, 1fr) 38px",
        alignItems: "center",
        gap: 12,
        padding: "0 12px 0 14px",
        border: "1px solid rgba(255, 255, 255, 0.14)",
        borderRadius: 10,
        background: "rgba(24, 24, 27, 0.9)",
        boxShadow:
          "0 16px 40px rgba(0, 0, 0, 0.24), inset 0 1px rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        color: "#fafafa",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <label
        htmlFor={sliderId}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ color: "#60a5fa" }}
        >
          <path d="m8 3-5 5 5 5" />
          <path d="M3 8h7" />
          <path d="m16 21 5-5-5-5" />
          <path d="M21 16h-7" />
          <path d="M9.5 7.5h5v9h-5z" />
        </svg>
        Explode
      </label>
      <input
        id={sliderId}
        data-testid="explode-slider"
        type="range"
        min={0}
        max={100}
        step={1}
        value={explodedPercent}
        aria-label="Explode assembly"
        aria-valuetext={
          explodedPercent === 0 ? "Assembled" : `${explodedPercent}% exploded`
        }
        onInput={(event) =>
          onExplodedViewAmountChange(Number(event.currentTarget.value) / 100)
        }
        style={{
          width: "100%",
          minWidth: 0,
          margin: 0,
          accentColor: "#60a5fa",
          cursor: "ew-resize",
        }}
      />
      <output
        htmlFor={sliderId}
        style={{
          color: explodedPercent === 0 ? "#a1a1aa" : "#f4f4f5",
          fontSize: 11,
          fontVariantNumeric: "tabular-nums",
          textAlign: "right",
        }}
      >
        {explodedPercent}%
      </output>
    </div>
  )
}
