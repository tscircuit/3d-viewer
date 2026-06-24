import { LayerRef } from "circuit-json"
import { useEffect, useMemo, useState } from "react"
import { CadViewer } from "src/CadViewer"

const StressCombinedTextures = ({
  boardHeightMm,
  updateMs,
  remountEveryTicks,
}: {
  boardHeightMm: number
  updateMs: number
  remountEveryTicks: number
}) => {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((prev) => prev + 1)
    }, updateMs)

    return () => window.clearInterval(timer)
  }, [updateMs])

  const viewerKey = Math.floor(tick / remountEveryTicks)

  const silkscreenRows = useMemo(() => {
    return Array.from({ length: 120 }, (_, i) => {
      const y = -boardHeightMm / 2 + 2 + i * ((boardHeightMm - 4) / 120)
      const layer: LayerRef = i % 2 === 0 ? "top" : "bottom"
      return {
        key: `row-${i}`,
        layer,
        xMm: i % 3 === 0 ? -3 : i % 3 === 1 ? 0 : 3,
        yMm: y,
      }
    })
  }, [boardHeightMm])

  return (
    <CadViewer key={`combined-texture-repro-${viewerKey}`} autoRotateDisabled>
      <board width="10mm" height={`${boardHeightMm}mm`}>
        <copperpour
          connectsTo="net.GND"
          layer="top"
          coveredWithSolderMask
          name="TopPour"
        />
        <copperpour
          connectsTo="net.GND"
          layer="bottom"
          coveredWithSolderMask
          name="BottomPour"
        />

        {silkscreenRows.map((row, i) => (
          <silkscreentext
            // @ts-ignore
            key={row.key}
            layer={row.layer}
            pcbX={`${row.xMm}mm`}
            pcbY={`${row.yMm}mm`}
            text={`W-${tick % 1000}-${i}`}
            fontSize="0.9mm"
          />
        ))}
      </board>
    </CadViewer>
  )
}

export const EditLoop = () => (
  <StressCombinedTextures
    boardHeightMm={120}
    updateMs={180}
    remountEveryTicks={80}
  />
)

EditLoop.storyName = "Edit Loop"

export const EditLoopLargeTallBoard = () => (
  <StressCombinedTextures
    boardHeightMm={300}
    updateMs={120}
    remountEveryTicks={60}
  />
)

EditLoopLargeTallBoard.storyName = "Edit Loop Large Tall Board"

export default {
  title: "Bugs/Combined Texture White Regression",
}
