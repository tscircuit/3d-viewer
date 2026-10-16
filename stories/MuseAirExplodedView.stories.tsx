import type {
  AnyCircuitElement,
  Point3,
  SourceComponentBase,
} from "circuit-json"
import { useEffect, useState } from "react"
import { CadViewer } from "src/CadViewer"

const museAirReleaseId = "2085d6f0-60b7-4a04-ae10-7dd1e928ffb7"
const releaseAssetUrl = (filePath: string) =>
  `https://api.tscircuit.com/package_files/download?package_release_id=${museAirReleaseId}&file_path=${encodeURIComponent(filePath)}`

const circuitJsonUrl = releaseAssetUrl("dist/assembly/circuit.json")

type SourceComponentId = SourceComponentBase["source_component_id"]
type SourceComponentName = SourceComponentBase["name"]

interface LegacyMuseAirAssemblyPart {
  sourceComponentName: SourceComponentName
  explodeDirection: Point3
  explodeDistance: number
}

const legacyMuseAirAssemblyParts: LegacyMuseAirAssemblyPart[] = [
  {
    sourceComponentName: "ENCLOSURE_BASE",
    explodeDirection: { x: 0, y: 0, z: -1 },
    explodeDistance: 60,
  },
  {
    sourceComponentName: "SEN62_UNDER_PCB",
    explodeDirection: { x: 0, y: 0, z: -1 },
    explodeDistance: 32,
  },
  {
    sourceComponentName: "SENSOR_HOLDER",
    explodeDirection: { x: 0, y: 0, z: -1 },
    explodeDistance: 42,
  },
  {
    sourceComponentName: "SENSOR_RETENTION",
    explodeDirection: { x: 0, y: 0, z: -1 },
    explodeDistance: 50,
  },
  {
    sourceComponentName: "HOLDER_INTERNAL_SCREWS",
    explodeDirection: { x: 0, y: 0, z: -1 },
    explodeDistance: 22,
  },
  {
    sourceComponentName: "PCB_INTERNAL_SCREWS",
    explodeDirection: { x: 0, y: 0, z: 1 },
    explodeDistance: 22,
  },
  {
    sourceComponentName: "REMOVABLE_TOP_LID",
    explodeDirection: { x: 0, y: 0, z: 1 },
    explodeDistance: 58,
  },
  {
    sourceComponentName: "BUYDISPLAY_PANEL",
    explodeDirection: { x: 0, y: 0, z: 1 },
    explodeDistance: 38,
  },
  {
    sourceComponentName: "DISPLAY_GLASS",
    explodeDirection: { x: 0, y: 0, z: 1 },
    explodeDistance: 48,
  },
  {
    sourceComponentName: "LID_MICROPHONE_GASKET",
    explodeDirection: { x: 0, y: 0, z: 1 },
    explodeDistance: 68,
  },
  {
    sourceComponentName: "ASK_BUTTON_CAP",
    explodeDirection: { x: 0, y: 0, z: 1 },
    explodeDistance: 76,
  },
  {
    sourceComponentName: "GH6_SENSOR_HARNESS",
    explodeDirection: { x: -1, y: 0, z: 0 },
    explodeDistance: 52,
  },
  {
    sourceComponentName: "USB_POWER_CABLE",
    explodeDirection: { x: 1, y: -0.35, z: 0 },
    explodeDistance: 48,
  },
  {
    sourceComponentName: "DISPLAY_FLEX",
    explodeDirection: { x: 1, y: 0, z: 0.35 },
    explodeDistance: 46,
  },
  {
    sourceComponentName: "ENCLOSURE_SPEAKER",
    explodeDirection: { x: 0, y: 1, z: 0 },
    explodeDistance: 44,
  },
  {
    sourceComponentName: "SPEAKER_CONE",
    explodeDirection: { x: 0, y: 1, z: 0 },
    explodeDistance: 58,
  },
  {
    sourceComponentName: "GH2_SPEAKER_LEAD",
    explodeDirection: { x: 0.35, y: 1, z: 0 },
    explodeDistance: 50,
  },
]

const getExplodeOffset = ({
  explodeDirection,
  explodeDistance,
}: LegacyMuseAirAssemblyPart): Point3 => {
  const directionMagnitude = Math.hypot(
    explodeDirection.x,
    explodeDirection.y,
    explodeDirection.z,
  )
  return {
    x: (explodeDirection.x / directionMagnitude) * explodeDistance,
    y: (explodeDirection.y / directionMagnitude) * explodeDistance,
    z: (explodeDirection.z / directionMagnitude) * explodeDistance,
  }
}

/** Release v0.5.7 predates explodeDirection/explodeDistance. Add the
 * Circuit JSON field in this compatibility story only so the real public
 * MuseAir assets can exercise the viewer. Production code reads only
 * explode_offset.
 */
const addLegacyMuseAirExplodedViewOffsets = (
  circuitJson: AnyCircuitElement[],
): AnyCircuitElement[] => {
  const sourceComponentNames = new Map<SourceComponentId, SourceComponentName>()
  for (const circuitElement of circuitJson) {
    if (circuitElement.type !== "source_component") continue
    sourceComponentNames.set(
      circuitElement.source_component_id,
      circuitElement.name,
    )
  }
  const offsetsBySourceComponentName = new Map<SourceComponentName, Point3>(
    legacyMuseAirAssemblyParts.map((assemblyPart) => [
      assemblyPart.sourceComponentName,
      getExplodeOffset(assemblyPart),
    ]),
  )

  return circuitJson.map((circuitElement) => {
    if (circuitElement.type !== "cad_component") return circuitElement
    const sourceComponentName = sourceComponentNames.get(
      circuitElement.source_component_id,
    )
    const explodeOffset = sourceComponentName
      ? offsetsBySourceComponentName.get(sourceComponentName)
      : undefined
    if (
      !explodeOffset ||
      ("explode_offset" in circuitElement && circuitElement.explode_offset)
    ) {
      return circuitElement
    }
    return {
      ...circuitElement,
      explode_offset: explodeOffset,
    }
  })
}

const visualSnapshotCircuitJson = [
  {
    type: "source_component",
    source_component_id: "source_board",
    ftype: "subassembly",
    name: "CONTROL_BOARD",
  },
  {
    type: "source_component",
    source_component_id: "source_base",
    ftype: "subassembly",
    name: "ENCLOSURE_BASE",
  },
  {
    type: "source_component",
    source_component_id: "source_lid",
    ftype: "subassembly",
    name: "ENCLOSURE_LID",
  },
  {
    type: "cad_component",
    cad_component_id: "cad_board",
    source_component_id: "source_board",
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    model_jscad: { type: "cuboid", size: [48, 34, 2] },
    model_unit_to_mm_scale_factor: 1,
    model_object_fit: "contain_within_bounds",
    anchor_alignment: "center",
  },
  {
    type: "cad_component",
    cad_component_id: "cad_base",
    source_component_id: "source_base",
    position: { x: 0, y: 0, z: -5 },
    rotation: { x: 0, y: 0, z: 0 },
    model_jscad: { type: "cuboid", size: [58, 44, 6] },
    explode_offset: { x: 0, y: 0, z: -28 },
    model_unit_to_mm_scale_factor: 1,
    model_object_fit: "contain_within_bounds",
    anchor_alignment: "center",
  },
  {
    type: "cad_component",
    cad_component_id: "cad_lid",
    source_component_id: "source_lid",
    position: { x: 0, y: 0, z: 5 },
    rotation: { x: 0, y: 0, z: 0 },
    model_jscad: { type: "cuboid", size: [58, 44, 4] },
    explode_offset: { x: 0, y: 0, z: 28 },
    model_unit_to_mm_scale_factor: 1,
    model_object_fit: "contain_within_bounds",
    anchor_alignment: "center",
  },
] as AnyCircuitElement[]

export const MuseAirUsbAssembly = () => {
  const [circuitJson, setCircuitJson] = useState<AnyCircuitElement[]>()

  useEffect(() => {
    const controller = new AbortController()
    fetch(circuitJsonUrl, { signal: controller.signal })
      .then(async (response) => {
        const circuitJsonResponse = await response.json()
        if (!response.ok || !Array.isArray(circuitJsonResponse)) {
          throw new Error("Unable to load the MuseAir assembly circuit JSON")
        }
        return circuitJsonResponse as AnyCircuitElement[]
      })
      .then(addLegacyMuseAirExplodedViewOffsets)
      .then(setCircuitJson)
      .catch((error) => {
        if (error.name !== "AbortError") console.error(error)
      })
    return () => controller.abort()
  }, [])

  if (!circuitJson) return <div style={{ padding: 24 }}>Loading assembly…</div>

  return (
    <CadViewer
      circuitJson={circuitJson}
      autoRotateDisabled
      initialCameraPosition={[155, -155, 123]}
      resolveStaticAsset={releaseAssetUrl}
    />
  )
}

MuseAirUsbAssembly.storyName = "MuseAir USB Assembly"

export const VisualSnapshotFixture = () => (
  <CadViewer
    circuitJson={visualSnapshotCircuitJson}
    autoRotateDisabled
    initialCameraPosition={[70, -70, 55]}
  />
)

export default {
  title: "Assembly/Exploded View",
  parameters: { layout: "fullscreen" },
}
