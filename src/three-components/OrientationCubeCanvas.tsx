import { useEffect, useRef } from "react"
import * as THREE from "three"
import { Text as TroikaText } from "troika-three-text"
import { useCameraController } from "../contexts/CameraControllerContext"
import { zIndexMap } from "../../lib/utils/z-index-map"

function computePointInFront(
  rotationVector: THREE.Euler,
  distance: number,
): THREE.Vector3 {
  // Create a quaternion from the rotation vector
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(rotationVector.x, rotationVector.y, rotationVector.z),
  )

  // Create a vector pointing forward (along the negative z-axis)
  const forwardVector = new THREE.Vector3(0, 0, 1)

  // Apply the rotation to the forward vector
  forwardVector.applyQuaternion(quaternion)

  // Scale the rotated vector by the distance
  const result = forwardVector.multiplyScalar(distance)

  return result
}

export const OrientationCubeCanvas = () => {
  const { mainCameraRef } = useCameraController()
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Create canvas
    const canvas = document.createElement("canvas")
    canvasRef.current = canvas
    containerRef.current.appendChild(canvas)

    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    })
    renderer.setSize(120, 120)
    renderer.setPixelRatio(window.devicePixelRatio)
    rendererRef.current = renderer

    // Create scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Create camera
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
    camera.up.set(0, 0, 1)
    cameraRef.current = camera

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, Math.PI / 2)
    scene.add(ambientLight)

    // Create cube group
    const group = new THREE.Group()
    group.rotation.fromArray([Math.PI / 2, 0, 0])

    const cubeSize = 1

    // Create cube mesh
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
      new THREE.MeshStandardMaterial({ color: "white" }),
    )
    group.add(box)

    // Create cube edges
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(
        new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
      ),
      new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 }),
    )
    group.add(edges)

    scene.add(group)

    // Create text labels
    const distanceFromCenter = 0.51

    const createTextMesh = (
      text: string,
      position: [number, number, number],
      rotation?: [number, number, number],
    ) => {
      const textMesh = new TroikaText()
      textMesh.text = text
      textMesh.position.fromArray(position)
      if (rotation) textMesh.rotation.fromArray(rotation)
      textMesh.color = "black"
      textMesh.fontSize = 0.25
      textMesh.anchorX = "center"
      textMesh.anchorY = "middle"
      textMesh.depthOffset = 0
      textMesh.font = null // Use browser's default sans-serif font
      textMesh.sync()
      return textMesh
    }

    const frontText = createTextMesh("Front", [0, 0, distanceFromCenter])
    const backText = createTextMesh(
      "Back",
      [0, 0, -distanceFromCenter],
      [0, Math.PI, 0],
    )
    const rightText = createTextMesh(
      "Right",
      [distanceFromCenter, 0, 0],
      [0, Math.PI / 2, 0],
    )
    const leftText = createTextMesh(
      "Left",
      [-distanceFromCenter, 0, 0],
      [0, -Math.PI / 2, 0],
    )
    const topText = createTextMesh(
      "Top",
      [0, distanceFromCenter, 0],
      [-Math.PI / 2, 0, 0],
    )
    const bottomText = createTextMesh(
      "Bottom",
      [0, -distanceFromCenter, 0],
      [Math.PI / 2, 0, 0],
    )

    group.add(frontText)
    group.add(backText)
    group.add(rightText)
    group.add(leftText)
    group.add(topText)
    group.add(bottomText)

    // Animation loop
    const animate = () => {
      if (mainCameraRef.current) {
        const cameraPosition = computePointInFront(
          mainCameraRef.current.rotation ?? new THREE.Euler(0, 0, 0),
          2,
        )

        if (!cameraPosition.equals(camera.position)) {
          camera.position.copy(cameraPosition)
          camera.lookAt(0, 0, 0)
        }
      }

      renderer.render(scene, camera)
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      frontText.dispose()
      backText.dispose()
      rightText.dispose()
      leftText.dispose()
      topText.dispose()
      bottomText.dispose()

      box.geometry.dispose()
      ;(box.material as THREE.Material).dispose()
      edges.geometry.dispose()
      ;(edges.material as THREE.Material).dispose()

      scene.clear()
      renderer.dispose()

      if (canvasRef.current && containerRef.current) {
        containerRef.current.removeChild(canvasRef.current)
      }
    }
  }, [mainCameraRef])

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 120,
        height: 120,
        zIndex: zIndexMap.orientationCube,
      }}
    />
  )
}
