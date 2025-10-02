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

interface CanvasProps {
  children: React.ReactNode
  scene?: Record<string, any>
  camera?: Record<string, any>
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
      renderer.setSize(
        mountRef.current.clientWidth,
        mountRef.current.clientHeight,
      )
      renderer.setPixelRatio(window.devicePixelRatio)
      mountRef.current.appendChild(renderer.domElement)

      const camera = new THREE.PerspectiveCamera(
        75,
        mountRef.current.clientWidth / mountRef.current.clientHeight,
        0.1,
        1000,
      )
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
        if (mountRef.current) {
          camera.aspect =
            mountRef.current.clientWidth / mountRef.current.clientHeight
          camera.updateProjectionMatrix()
          renderer.setSize(
            mountRef.current.clientWidth,
            mountRef.current.clientHeight,
          )
        }
      }
      window.addEventListener("resize", handleResize)

      return () => {
        window.removeEventListener("resize", handleResize)
        cancelAnimationFrame(animationFrameId)
        if (mountRef.current && renderer.domElement) {
          mountRef.current.removeChild(renderer.domElement)
        }
        renderer.dispose()
        scene.remove(rootObject.current)
        if (window.__TSCIRCUIT_THREE_OBJECT === rootObject.current) {
          window.__TSCIRCUIT_THREE_OBJECT = undefined
        }
      }
    }, [scene, addFrameListener, removeFrameListener])

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
