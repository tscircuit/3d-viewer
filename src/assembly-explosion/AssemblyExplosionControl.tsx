import { useEffect, useId, useRef, useState } from "react"
import { zIndexMap } from "../../lib/utils/z-index-map"
import type { ExplosionStageMetadata } from "./use-assembly-explosion"

function getDiscreteStageIndex(amount: number, stageCount: number): number {
  if (!Number.isFinite(amount) || amount <= 0 || stageCount <= 0) return 0
  return Math.min(stageCount, Math.ceil(amount))
}

export function AssemblyExplosionControl({
  stages,
  stageMetadata,
  amount,
  onChange,
  error,
  onClose,
  showGuidelines = true,
  onShowGuidelinesChange,
  onFit,
  fitOnStageChange = false,
  onFitOnStageChange,
}: {
  stages: string[]
  stageMetadata?: Record<string, ExplosionStageMetadata>
  amount: number
  onChange: (amount: number) => void
  error?: Error
  onClose?: () => void
  showGuidelines?: boolean
  onShowGuidelinesChange?: (visible: boolean) => void
  onFit?: () => void
  fitOnStageChange?: boolean
  onFitOnStageChange?: (enabled: boolean) => void
}) {
  const id = useId()
  const [playing, setPlaying] = useState(false)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [stageDuration, setStageDuration] = useState(2)
  const previousStageRef = useRef(getDiscreteStageIndex(amount, stages.length))
  const playback = useRef({
    amount,
    onChange,
    onFit,
    fitOnStageChange,
  })
  playback.current = {
    amount,
    onChange,
    onFit,
    fitOnStageChange,
  }

  useEffect(() => {
    const nextStage = getDiscreteStageIndex(amount, stages.length)
    if (nextStage !== previousStageRef.current) {
      previousStageRef.current = nextStage
      if (fitOnStageChange) onFit?.()
    }
  }, [amount, stages.length, fitOnStageChange, onFit])

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
      const nextStage = getDiscreteStageIndex(next, stages.length)
      const stageChanged = nextStage !== previousStageRef.current
      previousStageRef.current = nextStage
      playback.current.amount = next
      playback.current.onChange(next)
      if (stageChanged && playback.current.fitOnStageChange) {
        playback.current.onFit?.()
      }
      if (direction === 1 ? next >= stages.length : next <= 0) setPlaying(false)
      else frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, direction, stageDuration, stages.length, error])

  const seek = (value: number, explicitStageStep = false) => {
    const clamped = Number.isFinite(value)
      ? Math.max(0, Math.min(stages.length, value))
      : 0
    const nextStage = getDiscreteStageIndex(clamped, stages.length)
    const stageChanged = nextStage !== previousStageRef.current
    previousStageRef.current = nextStage
    setPlaying(false)
    onChange(clamped)
    if (fitOnStageChange && (stageChanged || explicitStageStep)) {
      onFit?.()
    }
  }
  if (!stages.length && !error) return null
  const stageId = amount === 0 ? undefined : stages[Math.ceil(amount) - 1]
  const currentMeta = stageId ? stageMetadata?.[stageId] : undefined
  const stageLabel =
    amount === 0 ? "Assembled" : currentMeta?.displayName?.trim() || stageId
  const instructions = currentMeta?.instructions?.trim() || undefined
  const diagnostics = currentMeta?.diagnostics ?? []
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
          <label htmlFor={id}>Assembly explosion: {stageLabel}</label>
          {onShowGuidelinesChange && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 8,
              }}
            >
              <input
                type="checkbox"
                checked={showGuidelines}
                onChange={(event) =>
                  onShowGuidelinesChange(event.target.checked)
                }
              />
              Show guidelines
            </label>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              id={id}
              aria-label="Assembly explosion"
              aria-valuetext={stageLabel}
              type="range"
              min={0}
              max={stages.length}
              step={0.01}
              value={amount}
              onChange={(event) => seek(Number(event.target.value), false)}
            />
            <button
              type="button"
              onClick={() => seek(0, true)}
              disabled={amount === 0 && !playing}
            >
              Reset
            </button>
            {onFit && (
              <button type="button" onClick={onFit}>
                Fit explosion
              </button>
            )}
          </div>
          {instructions && (
            <div
              data-testid="explosion-stage-instructions"
              style={{ marginTop: 6, whiteSpace: "pre-wrap" }}
            >
              {instructions}
            </div>
          )}
          {diagnostics.length > 0 && (
            <div
              data-testid="explosion-contact-diagnostics"
              style={{
                marginTop: 6,
                padding: "4px 6px",
                borderRadius: 4,
                background: "#3a2a14",
                color: "#ffd591",
              }}
            >
              {diagnostics.map((diagnostic, index) => (
                <div key={index}>
                  {diagnostic.kind === "annotated_unverified_contact"
                    ? `Unverified deformation contact (not physically validated): ${diagnostic.message}${diagnostic.rationale ? ` — ${diagnostic.rationale}` : ""}`
                    : diagnostic.kind === "incomplete_check"
                      ? `Incomplete clearance verification: ${diagnostic.message}`
                      : `Unverified contact diagnostic: ${diagnostic.message}`}
                </div>
              ))}
            </div>
          )}
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
              onClick={() => seek(Math.max(0, Math.ceil(amount) - 1), true)}
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => {
                if (!playing) {
                  setDirection(1)
                  if (amount >= stages.length) {
                    previousStageRef.current = 0
                    onChange(0)
                    if (fitOnStageChange) onFit?.()
                  }
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
                seek(Math.min(stages.length, Math.floor(amount) + 1), true)
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
            {onFitOnStageChange && (
              <label
                style={{ display: "inline-flex", gap: 4, alignItems: "center" }}
              >
                <input
                  type="checkbox"
                  checked={fitOnStageChange}
                  onChange={(event) => {
                    const enabled = event.target.checked
                    onFitOnStageChange(enabled)
                    if (enabled) onFit?.()
                  }}
                />
                Fit on stage change
              </label>
            )}
          </div>
        </>
      )}
    </div>
  )
}
