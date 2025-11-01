import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from "react"
import * as THREE from "three"
import { ThreeContext, ThreeContextState } from "./ThreeContext"
import { HoverProvider } from "./HoverContext"
import { removeExistingCanvases } from "./remove-existing-canvases"
import { configureRenderer } from "./configure-renderer"

declare global {
  interface Window {
    __TSCIRCUIT_THREE_OBJECT?: THREE.Object3D
  }
}

type CanvasCameraProps = {
  up?: [number, number, number]
  position?: [number, number, number]
  type?: "perspective" | "orthographic"
  frustumSize?: number
}

interface CanvasProps {
  children: React.ReactNode
  scene?: Record<string, any>
  camera?: CanvasCameraProps
  style?: React.CSSProperties
}

export const Canvas = forwardRef<THREE.Object3D, CanvasProps>(
  ({ children, scene: sceneProps, camera: cameraProps, style }, ref) => {
    const mountRef = useRef<HTMLDivElement>(null)
    const [contextState, setContextState] = useState<ThreeContextState | null>(
      null,
    )
    const frameListeners = useRef<Array<(time: number, delta: number) => void>>(
      [],
    )
    const lastCameraStateRef = useRef<{
      position: THREE.Vector3
      quaternion: THREE.Quaternion
      up: THREE.Vector3
    } | null>(null)

    const addFrameListener = useCallback(
      (listener: (time: number, delta: number) => void) => {
        frameListeners.current.push(listener)
      },
      [],
    )

    const removeFrameListener = useCallback(
      (listener: (time: number, delta: number) => void) => {
        frameListeners.current = frameListeners.current.filter(
          (l) => l !== listener,
        )
      },
      [],
    )

    const scene = useMemo(() => new THREE.Scene(), [])
    if (sceneProps?.up) {
      scene.up.set(sceneProps.up.x, sceneProps.up.y, sceneProps.up.z)
    }

    const rootObject = useRef(new THREE.Object3D())
    useImperativeHandle(ref, () => rootObject.current)

    useEffect(() => {
      if (!mountRef.current) return

      removeExistingCanvases(mountRef.current)

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      configureRenderer(renderer)
      const width = mountRef.current.clientWidth || 1
      const height = mountRef.current.clientHeight || 1
      renderer.setSize(width, height)
      renderer.setPixelRatio(window.devicePixelRatio)
      mountRef.current.appendChild(renderer.domElement)

      const isOrthographic = cameraProps?.type === "orthographic"
      const frustumSize = cameraProps?.frustumSize ?? 20
      const aspect = width / height || 1

      const camera = isOrthographic
        ? new THREE.OrthographicCamera(
            (-frustumSize * aspect) / 2,
            (frustumSize * aspect) / 2,
            frustumSize / 2,
            -frustumSize / 2,
            0.1,
            2000,
          )
        : new THREE.PerspectiveCamera(75, aspect, 0.1, 1000)

      const previousState = lastCameraStateRef.current
      if (previousState) {
        camera.position.copy(previousState.position)
        camera.quaternion.copy(previousState.quaternion)
        camera.up.copy(previousState.up)
        camera.updateMatrixWorld()
      } else {
        if (cameraProps?.up) {
          camera.up.set(cameraProps.up[0], cameraProps.up[1], cameraProps.up[2])
        }
        if (cameraProps?.position) {
          camera.position.set(
            cameraProps.position[0],
            cameraProps.position[1],
            cameraProps.position[2],
          )
        }
        camera.lookAt(0, 0, 0)
      }
      camera.updateProjectionMatrix()

      scene.add(rootObject.current)
      window.__TSCIRCUIT_THREE_OBJECT = rootObject.current

      setContextState({
        scene,
        camera,
        renderer,
        rootObject: rootObject.current,
        addFrameListener,
        removeFrameListener,
      })

      let animationFrameId: number
      const clock = new THREE.Clock()

      const animate = () => {
        const time = clock.getElapsedTime()
        const delta = clock.getDelta()
        frameListeners.current.forEach((listener) => listener(time, delta))
        renderer.render(scene, camera)
        animationFrameId = requestAnimationFrame(animate)
      }
      animate()

      const handleResize = () => {
        if (!mountRef.current) return
        const newWidth = mountRef.current.clientWidth || 1
        const newHeight = mountRef.current.clientHeight || 1
        const newAspect = newWidth / newHeight || 1
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.aspect = newAspect
        } else if (camera instanceof THREE.OrthographicCamera) {
          const nextFrustumSize = cameraProps?.frustumSize ?? frustumSize
          const halfHeight = nextFrustumSize / 2
          const halfWidth = halfHeight * newAspect
          camera.left = -halfWidth
          camera.right = halfWidth
          camera.top = halfHeight
          camera.bottom = -halfHeight
        }
        camera.updateProjectionMatrix()
        renderer.setSize(newWidth, newHeight)
      }
      window.addEventListener("resize", handleResize)

      return () => {
        window.removeEventListener("resize", handleResize)
        cancelAnimationFrame(animationFrameId)
        lastCameraStateRef.current = {
          position: camera.position.clone(),
          quaternion: camera.quaternion.clone(),
          up: camera.up.clone(),
        }
        if (mountRef.current && renderer.domElement) {
          mountRef.current.removeChild(renderer.domElement)
        }
        renderer.dispose()
        scene.remove(rootObject.current)
        if (window.__TSCIRCUIT_THREE_OBJECT === rootObject.current) {
          window.__TSCIRCUIT_THREE_OBJECT = undefined
        }
        setContextState(null)
      }
    }, [
      scene,
      addFrameListener,
      removeFrameListener,
      cameraProps?.type,
      cameraProps?.frustumSize,
    ])

    return (
      <div ref={mountRef} style={{ width: "100%", height: "100%", ...style }}>
        {contextState && (
          <ThreeContext.Provider value={contextState}>
            <HoverProvider>{children}</HoverProvider>
          </ThreeContext.Provider>
        )}
      </div>
    )
  },
)
