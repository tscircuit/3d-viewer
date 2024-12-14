import type { AnySoupElement } from "@tscircuit/soup"
import { useConvertChildrenToSoup } from "./hooks/use-convert-children-to-soup"
import { su } from "@tscircuit/soup-util"
import { useEffect, useMemo, useState } from "react"
import { createBoardGeomFromSoup } from "./soup-to-3d"
import { useStlsFromGeom } from "./hooks/use-stls-from-geom"
import { STLModel } from "./three-components/STLModel"
import { CadViewerContainer } from "./CadViewerContainer"
import { MixedStlModel } from "./three-components/MixedStlModel"
import { Euler } from "three"
import { JscadModel } from "./three-components/JscadModel"
import { Footprinter3d } from "jscad-electronics"
import { FootprinterModel } from "./three-components/FootprinterModel"
import { tuple } from "./utils/tuple"
import { AnyCadComponent } from "./AnyCadComponent"
import { Text } from "@react-three/drei"
import { ThreeErrorBoundary } from "./three-components/ThreeErrorBoundary"

export const Error3d = ({ error }: { error: any }) => {
  const [rotation, setRotation] = useState(new Euler(0, 0, 0))

  // Rotating error, not sure if it's helpful
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setRotation((prev) => new Euler(prev.x, prev.y, prev.z + 0.01))
  //   }, 50)
  //   return () => clearInterval(interval)
  // }, [])

  return (
    <group rotation={rotation} position={[0, 0, 0]}>
      <mesh
        renderOrder={-99999}
        rotation={[Math.PI / 4, Math.PI / 4, 0]}
        ref={(mesh) => {
          if (mesh) {
            mesh.renderOrder = 999999
            // mesh.material.depthTest = false
            // mesh.material.depthWrite = false
            // mesh.material.transparent = true
          }
        }}
      >
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial
          depthTest={false}
          transparent
          color="red"
          opacity={0.5}
        />
      </mesh>
      <Text
        scale={[0.1, 0.1, 0.1]}
        color="red" // default
        anchorX="center" // default
        anchorY="middle" // default
        depthOffset={-99999}
      >
        {error.toString().slice(0, 50)}...
      </Text>
    </group>
  ) as any
}
