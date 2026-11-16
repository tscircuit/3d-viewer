import { type CSSProperties, useEffect, useRef, useState } from "react"
import { zIndexMap } from "../../lib/utils/z-index-map"

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
}
const labelStyle: CSSProperties = {
  ...rowStyle,
  whiteSpace: "nowrap",
  cursor: "pointer",
}
const buttonStyle: CSSProperties = {
  display: "grid",
  flex: "none",
  placeItems: "center",
  width: 26,
  height: 26,
  margin: 0,
  padding: 0,
  border: 0,
  borderRadius: 4,
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
}
const disabledButtonStyle: CSSProperties = {
  ...buttonStyle,
  opacity: 0.4,
  cursor: "default",
}

const iconPaths = {
  close: "m6 6 12 12M18 6 6 18",
  previous: "M5 5v14m14-14L8 12l11 7z",
  reverse: "M17 5 6 12l11 7z",
  play: "m8 5 11 7-11 7z",
  pause: "M9 5v14m6-14v14",
  next: "M19 5v14M5 5l11 7-11 7z",
  reset: "M3 12a9 9 0 1 1 3 6.7M3 12V6m0 6h6",
}

function Icon({ name }: { name: keyof typeof iconPaths }) {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={iconPaths[name]} />
    </svg>
  )
}

export function AssemblyExplosionControl({
  stages,
  amount,
  onChange,
  error,
  onClose,
  showGuidelines = true,
  onShowGuidelinesChange,
}: {
  stages: string[]
  amount: number
  onChange: (amount: number) => void
  error?: Error
  onClose?: () => void
  showGuidelines?: boolean
  onShowGuidelinesChange?: (visible: boolean) => void
}) {
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
  const atStart = amount === 0
  const atEnd = amount >= stages.length
  const reversing = playing && direction === -1
  const resetDisabled = atStart && !playing
  const stage = atStart ? "Assembled" : stages[Math.ceil(amount) - 1]
  const playLabel = playing ? "Pause" : atEnd ? "Replay" : "Play"
  return (
    <section
      aria-label="Exploded view"
      style={{
        position: "absolute",
        bottom: 12,
        left: 12,
        zIndex: zIndexMap.htmlElements,
        boxSizing: "border-box",
        width: 344,
        maxWidth: "calc(100% - 24px)",
        maxHeight: "calc(100% - 24px)",
        overflow: "auto",
        padding: "4px 8px 6px",
        border: "1px solid #555",
        borderRadius: 6,
        background: "#262626",
        color: "#f2f2f2",
        colorScheme: "dark",
        accentColor: "#ddd",
        font: "13px/1.4 system-ui, sans-serif",
        overflowWrap: "anywhere",
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
    >
      <div style={rowStyle}>
        <strong style={{ whiteSpace: "nowrap" }}>Exploded view</strong>
        {!error && (
          <span
            title={stage}
            style={{
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "right",
              color: "#c6c6c6",
              fontSize: 12,
            }}
          >
            {stage}
          </span>
        )}
        {onClose && (
          <button
            type="button"
            style={buttonStyle}
            aria-label="Close exploded view"
            title="Close exploded view"
            onClick={() => {
              setPlaying(false)
              onClose()
            }}
          >
            <Icon name="close" />
          </button>
        )}
      </div>
      {error ? (
        <div role="alert">Cannot show assembly explosion: {error.message}</div>
      ) : (
        <>
          <input
            aria-label="Assembly explosion"
            aria-valuetext={stage}
            type="range"
            min={0}
            max={stages.length}
            step={0.01}
            value={amount}
            style={{
              display: "block",
              width: "100%",
              height: 20,
              margin: 0,
              padding: 0,
              cursor: "pointer",
            }}
            onChange={(event) => seek(Number(event.target.value))}
          />
          <div
            style={{
              ...rowStyle,
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{ ...rowStyle, gap: 1 }}
              role="group"
              aria-label="Playback"
            >
              <button
                type="button"
                style={atStart ? disabledButtonStyle : buttonStyle}
                aria-label="Previous explosion stage"
                title="Previous stage"
                disabled={atStart}
                onClick={() => seek(Math.max(0, Math.ceil(amount) - 1))}
              >
                <Icon name="previous" />
              </button>
              <button
                type="button"
                style={
                  reversing
                    ? { ...buttonStyle, background: "#444" }
                    : buttonStyle
                }
                aria-label="Play In Reverse"
                aria-pressed={reversing}
                title="Play in reverse"
                onClick={() => {
                  if (amount <= 0) onChange(stages.length)
                  setDirection(-1)
                  setPlaying(true)
                }}
              >
                <Icon name="reverse" />
              </button>
              <button
                type="button"
                style={buttonStyle}
                aria-label={playLabel}
                title={playLabel}
                onClick={() => {
                  if (!playing) {
                    setDirection(1)
                    if (amount >= stages.length) onChange(0)
                  }
                  setPlaying(!playing)
                }}
              >
                <Icon name={playing ? "pause" : "play"} />
              </button>
              <button
                type="button"
                style={atEnd ? disabledButtonStyle : buttonStyle}
                aria-label="Next explosion stage"
                title="Next stage"
                disabled={atEnd}
                onClick={() =>
                  seek(Math.min(stages.length, Math.floor(amount) + 1))
                }
              >
                <Icon name="next" />
              </button>
              <button
                type="button"
                style={resetDisabled ? disabledButtonStyle : buttonStyle}
                aria-label="Reset"
                title="Reset to assembled"
                onClick={() => seek(0)}
                disabled={resetDisabled}
              >
                <Icon name="reset" />
              </button>
            </div>
            <div
              style={{ ...rowStyle, flexWrap: "wrap", gap: 8, fontSize: 12 }}
            >
              {onShowGuidelinesChange && (
                <label style={labelStyle}>
                  <input
                    type="checkbox"
                    style={{ margin: 0, cursor: "pointer" }}
                    aria-label="Show guidelines"
                    checked={showGuidelines}
                    onChange={(event) =>
                      onShowGuidelinesChange(event.target.checked)
                    }
                  />
                  Guidelines
                </label>
              )}
              <label title="Seconds per stage" style={labelStyle}>
                <input
                  aria-label="Seconds per stage"
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={stageDuration}
                  style={{
                    boxSizing: "border-box",
                    width: 44,
                    height: 24,
                    margin: 0,
                    padding: "0 4px",
                    border: "1px solid #656565",
                    borderRadius: 4,
                    background: "#1c1c1c",
                    color: "inherit",
                    font: "inherit",
                  }}
                  onChange={(event) => {
                    const value = Number(event.target.value)
                    if (Number.isFinite(value) && value >= 0.1)
                      setStageDuration(value)
                  }}
                />
                s / stage
              </label>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
