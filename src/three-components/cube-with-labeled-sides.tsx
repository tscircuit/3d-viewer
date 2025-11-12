import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { Text } from "src/react-three/Text"
import { useThree } from "src/react-three/ThreeContext"
import { useCameraController } from "../contexts/CameraControllerContext"

export const CubeWithLabeledSides = () => {
  const { scene } = useThree()
  const { cameraType } = useCameraController()

  useEffect(() => {
    if (!scene) return
    const ambientLight = new THREE.AmbientLight(0xffffff, Math.PI / 2)
    scene.add(ambientLight)
    return () => {
      scene.remove(ambientLight)
    }
  }, [scene])

  const group = useMemo(() => {
    const g = new THREE.Group()
    g.rotation.fromArray([Math.PI / 2, 0, 0])

    const cubeSize = cameraType === "perspective" ? 1 : 5

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
      new THREE.MeshStandardMaterial({ color: "white" }),
    )
    g.add(box)

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(
        new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
      ),
      new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 }),
    )
    g.add(edges)
    return g
  }, [cameraType])

  useEffect(() => {
    if (!scene) return
    scene.add(group)
    return () => {
      scene.remove(group)
    }
  }, [scene, group])

  const distanceFromCenter = cameraType === "perspective" ? 0.51 : 0.51 * 5

  return (
    <>
      <Text
        parent={group}
        position={[0, 0, distanceFromCenter]}
        fontSize={0.25}
        color="black"
      >
        Front
      </Text>
      <Text
        parent={group}
        position={[0, 0, -distanceFromCenter]}
        fontSize={0.25}
        color="black"
        rotation={[0, Math.PI, 0]}
      >
        Back
      </Text>
      <Text
        parent={group}
        position={[distanceFromCenter, 0, 0]}
        fontSize={0.25}
        color="black"
        rotation={[0, Math.PI / 2, 0]}
      >
        Right
      </Text>
      <Text
        parent={group}
        position={[-distanceFromCenter, 0, 0]}
        fontSize={0.25}
        color="black"
        rotation={[0, -Math.PI / 2, 0]}
      >
        Left
      </Text>
      <Text
        parent={group}
        position={[0, distanceFromCenter, 0]}
        fontSize={0.25}
        color="black"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        Top
      </Text>
      <Text
        parent={group}
        position={[0, -distanceFromCenter, 0]}
        fontSize={0.25}
        color="black"
        rotation={[Math.PI / 2, 0, 0]}
      >
        Bottom
      </Text>
    </>
  )
}
