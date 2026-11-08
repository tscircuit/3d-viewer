import { useEffect, useId, useRef, useState } from "react"
import { zIndexMap } from "../../lib/utils/z-index-map"

export function AssemblyExplosionControl({
  stages,
  amount,
  onChange,
  error,
  onClose,
}: {
  stages: string[]
  amount: number
  onChange: (amount: number) => void
  error?: Error
  onClose?: () => void
}) {
  const id = useId()
  const [playing, setPlaying] = useState(false)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [stageDuration, setStageDuration] = useState(2)
  const playback = useRef({ amount, onChange })
  playback.current = { amount, onChange }

  useEffect(() => {
    if (!playing || error || !stages.length) return
    let frame: number
    let previous = performance.now()
    const tick = (now: number) => {
      const next = Math.min(
        stages.length,
        Math.max(
          0,
          playback.current.amount +
            (direction * (now - previous)) / (stageDuration * 1000),
        ),
      )
      previous = now
      playback.current.amount = next
      playback.current.onChange(next)
      if (direction === 1 ? next >= stages.length : next <= 0) setPlaying(false)
      else frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, direction, stageDuration, stages.length, error])

  const seek = (value: number) => {
    setPlaying(false)
    onChange(value)
  }
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
      {onClose && (
        <button
          type="button"
          aria-label="Close exploded view"
          onClick={() => {
            setPlaying(false)
            onClose()
          }}
          style={{ float: "right", marginLeft: 12 }}
        >
          ×
        </button>
      )}
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
              onChange={(event) => seek(Number(event.target.value))}
            />
            <button
              type="button"
              onClick={() => seek(0)}
              disabled={amount === 0 && !playing}
            >
              Reset
            </button>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginTop: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              aria-label="Previous explosion stage"
              disabled={amount === 0}
              onClick={() => seek(Math.max(0, Math.ceil(amount) - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => {
                if (!playing) {
                  setDirection(1)
                  if (amount >= stages.length) onChange(0)
                }
                setPlaying(!playing)
              }}
            >
              {playing ? "Pause" : amount >= stages.length ? "Replay" : "Play"}
            </button>
            <button
              type="button"
              aria-pressed={playing && direction === -1}
              onClick={() => {
                if (amount <= 0) onChange(stages.length)
                setDirection(-1)
                setPlaying(true)
              }}
            >
              Play In Reverse
            </button>
            <button
              type="button"
              aria-label="Next explosion stage"
              disabled={amount >= stages.length}
              onClick={() =>
                seek(Math.min(stages.length, Math.floor(amount) + 1))
              }
            >
              Next
            </button>
            <label htmlFor={`${id}-duration`}>Seconds per stage</label>
            <input
              id={`${id}-duration`}
              type="number"
              min={0.1}
              step={0.1}
              value={stageDuration}
              style={{ width: 60 }}
              onChange={(event) => {
                const value = Number(event.target.value)
                if (Number.isFinite(value) && value >= 0.1)
                  setStageDuration(value)
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}
