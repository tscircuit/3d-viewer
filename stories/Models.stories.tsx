import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"
import myGlb from "./assets/myGlb.glb?url"
import myObjUrl from "./assets/myObj.obj?url"

export const GltfModel = () => (
  <CadViewer>
    <board width="5mm" height="5mm">
      <chip
        name="Glb"
        footprint={
          <footprint>
            <hole diameter="0.8mm" pcbX={0} pcbY={0} />
          </footprint>
        }
        cadModel={{
          gltfUrl: myGlb,
          rotationOffset: { x: 90, y: 0, z: 0 },
          positionOffset: { x: 0, y: 0, z: 0.6 },
        }}
      />
    </board>
  </CadViewer>
)
GltfModel.storyName = "GLTF Model"

const createObjCircuit = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="5mm" height="5mm">
      <chip
        name="Obj"
        pcbX={0}
        pcbY={0}
        cadModel={{
          objUrl: myObjUrl,
          rotationOffset: { x: 90, y: 0, z: 0 },
          positionOffset: { x: 0, y: 0, z: 0.6 },
        }}
        footprint={
          <footprint>
            <hole diameter="0.8mm" pcbX={0} pcbY={0} />
          </footprint>
        }
      />
    </board>,
  )

  return circuit.getCircuitJson()
}

export const OpenCascadeObj = () => {
  const circuitJson = createObjCircuit()
  return <CadViewer circuitJson={circuitJson as any} />
}
OpenCascadeObj.storyName = "OpenCascade OBJ"

export default {
  title: "Models/3D",
}
