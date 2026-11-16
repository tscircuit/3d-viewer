import { useEffect, useRef, useState } from "react"
import { zIndexMap } from "../../lib/utils/z-index-map"
import { explosionControlStyles } from "./explosion-control-styles"

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
  const stage = amount === 0 ? "Assembled" : stages[Math.ceil(amount) - 1]
  const playLabel = playing
    ? "Pause"
    : amount >= stages.length
      ? "Replay"
      : "Play"
  return (
    <section
      aria-label="Exploded view"
      className="tscircuit-explosion-control"
      style={{ zIndex: zIndexMap.htmlElements }}
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
    >
      <style>{explosionControlStyles}</style>
      <div className="explosion-row">
        <strong>Exploded view</strong>
        {!error && (
          <span className="explosion-stage" title={stage}>
            {stage}
          </span>
        )}
        {onClose && (
          <button
            type="button"
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
            onChange={(event) => seek(Number(event.target.value))}
          />
          <div className="explosion-row explosion-toolbar">
            <div className="explosion-row" role="group" aria-label="Playback">
              <button
                type="button"
                aria-label="Previous explosion stage"
                title="Previous stage"
                disabled={amount === 0}
                onClick={() => seek(Math.max(0, Math.ceil(amount) - 1))}
              >
                <Icon name="previous" />
              </button>
              <button
                type="button"
                aria-label="Play In Reverse"
                aria-pressed={playing && direction === -1}
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
                aria-label="Next explosion stage"
                title="Next stage"
                disabled={amount >= stages.length}
                onClick={() =>
                  seek(Math.min(stages.length, Math.floor(amount) + 1))
                }
              >
                <Icon name="next" />
              </button>
              <button
                type="button"
                aria-label="Reset"
                title="Reset to assembled"
                onClick={() => seek(0)}
                disabled={amount === 0 && !playing}
              >
                <Icon name="reset" />
              </button>
            </div>
            <div className="explosion-row explosion-settings">
              {onShowGuidelinesChange && (
                <label>
                  <input
                    type="checkbox"
                    aria-label="Show guidelines"
                    checked={showGuidelines}
                    onChange={(event) =>
                      onShowGuidelinesChange(event.target.checked)
                    }
                  />
                  Guidelines
                </label>
              )}
              <label title="Seconds per stage">
                <input
                  aria-label="Seconds per stage"
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={stageDuration}
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
