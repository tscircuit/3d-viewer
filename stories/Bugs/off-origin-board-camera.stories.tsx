import type { AnyCircuitElement } from "circuit-json"
import { useEffect, useState } from "react"
import { CadViewer } from "src/CadViewer"

const offOriginCircuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "beaglebone_black_board",
    center: { x: 417, y: 293 },
    width: 86.4,
    height: 54.6,
    thickness: 1.6,
    material: "fr4",
    num_layers: 2,
  },
]

const centeredCircuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "centered_board",
    center: { x: 0, y: 0 },
    width: 45,
    height: 45,
    thickness: 1.6,
    material: "fr4",
    num_layers: 2,
  },
]

export const BeagleBoneBlackCoordinates = () => (
  <CadViewer circuitJson={offOriginCircuitJson} autoRotateDisabled />
)

export const SwitchFromOffOriginToCenteredBoard = () => {
  const [showCenteredBoard, setShowCenteredBoard] = useState(false)

  useEffect(() => {
    const switchBoardTimeout = window.setTimeout(() => {
      setShowCenteredBoard(true)
    }, 1_000)

    return () => window.clearTimeout(switchBoardTimeout)
  }, [])

  return (
    <CadViewer
      circuitJson={
        showCenteredBoard ? centeredCircuitJson : offOriginCircuitJson
      }
      autoRotateDisabled
    />
  )
}

export const SwitchBoardSizeThroughJsxChildren = () => {
  const [showSmallBoard, setShowSmallBoard] = useState(false)

  useEffect(() => {
    const switchBoardTimeout = window.setTimeout(() => {
      setShowSmallBoard(true)
    }, 1_000)

    return () => window.clearTimeout(switchBoardTimeout)
  }, [])

  return (
    <CadViewer autoRotateDisabled>
      <board
        width={showSmallBoard ? "45mm" : "450mm"}
        height={showSmallBoard ? "45mm" : "450mm"}
      />
    </CadViewer>
  )
}

export default {
  title: "Bugs/Off-Origin Board Camera",
  component: BeagleBoneBlackCoordinates,
}
