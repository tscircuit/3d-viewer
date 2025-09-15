import { useEffect, useRef } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three-stdlib"
import { OrbitControls } from "three-stdlib"
import mediumMachinePinUrl from "./assets/MediumMachinePin v2.glb?url"

export const DirectGLB = () => {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mountRef.current) return

    console.log("Loading GLB from:", mediumMachinePinUrl)

    // Scene setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, 400 / 300, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer()
    renderer.setSize(400, 300)
    renderer.setClearColor(0x333333)
    mountRef.current.appendChild(renderer.domElement)

    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 5)
    scene.add(directionalLight)

    // Add a reference cube to help with scale
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1)
    const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial)
    scene.add(cube)

    // Load GLB
    const loader = new GLTFLoader()
    loader.load(
      mediumMachinePinUrl,
      (gltf) => {
        console.log("GLB loaded successfully:", gltf)
        const model = gltf.scene
        
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())
        
        console.log("Model size:", size)
        console.log("Model center:", center)
        console.log("Model position:", model.position)
        
        // Try different scales
        model.scale.set(100, 100, 100) // Make it 100x larger
        
        scene.add(model)
        
        // Position camera to see the model
        const maxDim = Math.max(size.x, size.y, size.z) * 100 // Account for scale
        camera.position.set(maxDim * 2, maxDim * 2, maxDim * 2)
        camera.lookAt(center)
        controls.target.copy(center)
        controls.update()
      },
      (progress) => {
        console.log("Loading progress:", progress)
      },
      (error) => {
        console.error("Error loading GLB:", error)
      }
    )

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      mountRef.current?.removeChild(renderer.domElement)
      renderer.dispose()
      controls.dispose()
    }
  }, [])

  return <div ref={mountRef} style={{ border: "1px solid #ccc" }} />
}

export default {
  title: "DirectGLB",
  component: DirectGLB,
}