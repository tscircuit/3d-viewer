import type { AnyCircuitElement } from "circuit-json"
import { useCallback, useState } from "react"
import { CadViewer, type CadViewerProps } from "src/CadViewer"

const createCircuit = (prefix: string): AnyCircuitElement[] =>
  [
    { name: "Lid", x: -12, color: [0.25, 0.3, 0.35, 1] },
    { name: "Battery", x: 0, color: [0.15, 0.5, 0.85, 1] },
    { name: "Base", x: 12, color: [0.65, 0.4, 0.2, 1] },
  ].flatMap(({ name, x, color }): AnyCircuitElement[] => [
    {
      type: "source_component",
      source_component_id: `${prefix}-source-${name}`,
      ftype: "simple_chip",
      name,
    },
    {
      type: "cad_component",
      cad_component_id: `${prefix}-cad-${name}`,
      source_component_id: `${prefix}-source-${name}`,
      position: { x, y: 0, z: 3 },
      rotation: { x: 0, y: 0, z: 0 },
      anchor_alignment: "center",
      model_object_fit: "contain_within_bounds",
      model_board_normal_direction: "z+",
      model_unit_to_mm_scale_factor: 1,
      model_jscad: {
        type: "colorize",
        color,
        shape: { type: "cuboid", size: [6, 6, 6] },
      },
    },
  ])

const circuits = [createCircuit("first"), createCircuit("second")]

export const Default = () => {
  const [circuitIndex, setCircuitIndex] = useState(0)
  const [ready, setReady] = useState(false)
  const onCameraControllerReady = useCallback<
    NonNullable<CadViewerProps["onCameraControllerReady"]>
  >((controller) => {
    setReady(Boolean(controller))
    controller?.animateTo({
      position: [0, 0, 50],
      target: [0, 0, 0],
      up: [0, 1, 0],
      durationMs: 0,
    })
  }, [])
  return (
    <div>
      <h1>Object visibility</h1>
      <p>
        Right-click a part to hide it. Right-click empty space and open “Show
        hidden objects” to restore one part, or “Unhide All Components” to
        restore them together. Try both rendering engines.
      </p>
      <button onClick={() => setCircuitIndex((index) => 1 - index)}>
        Switch circuit
      </button>
      <div
        style={{ height: 500 }}
        data-testid="visibility-viewer"
        data-ready={ready}
      >
        <CadViewer
          circuitJson={circuits[circuitIndex]}
          autoRotateDisabled
          onCameraControllerReady={onCameraControllerReady}
        />
      </div>
    </div>
  )
}

export default { title: "Object visibility", component: CadViewer }
