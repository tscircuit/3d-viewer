import { useId } from "react"
import { zIndexMap } from "../../lib/utils/z-index-map"

export function AssemblyExplosionControl({
  stages,
  amount,
  onChange,
  error,
}: {
  stages: string[]
  amount: number
  onChange: (amount: number) => void
  error?: Error
}) {
  const id = useId()
  if (!stages.length && !error) return null
  const stage = amount === 0 ? "Assembled" : stages[Math.ceil(amount) - 1]
  return (
    <div
      style={{
        position: "absolute",
        bottom: 12,
        left: 12,
        maxWidth: "calc(100% - 24px)",
        padding: "8px 12px",
        borderRadius: 6,
        background: "#222",
        color: "white",
        fontSize: 12,
        zIndex: zIndexMap.htmlElements,
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
    >
      {error ? (
        <div role="alert">Cannot show assembly explosion: {error.message}</div>
      ) : (
        <>
          <label htmlFor={id}>Assembly explosion: {stage}</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              id={id}
              aria-label="Assembly explosion"
              aria-valuetext={stage}
              type="range"
              min={0}
              max={stages.length}
              step={0.01}
              value={amount}
              onChange={(event) => onChange(Number(event.target.value))}
            />
            <button
              type="button"
              onClick={() => onChange(0)}
              disabled={amount === 0}
            >
              Reset
            </button>
          </div>
        </>
      )}
    </div>
  )
}
