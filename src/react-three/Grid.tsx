import React, { useEffect, useMemo } from "react"
import * as THREE from "three"
import { useFrame, useThree } from "./ThreeContext"

const vertexShader = `
  varying vec3 worldPosition;
  void main() {
    worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  varying vec3 worldPosition;
  uniform float cellSize;
  uniform float sectionSize;
  uniform vec3 gridColor;
  uniform vec3 sectionColor;
  uniform float fadeDistance;
  uniform float fadeStrength;

  float getGrid(float size) {
    vec2 r = worldPosition.xy / size;
    vec2 grid = abs(fract(r - 0.5) - 0.5) / fwidth(r);
    float line = min(grid.x, grid.y);
    return 1.0 - min(line * 1.5, 1.0);
  }

  void main() {
    float g1 = getGrid(cellSize);
    float g2 = getGrid(sectionSize);

    float d = distance(worldPosition.xy, cameraPosition.xy);
    float a = 1.0 - smoothstep(fadeDistance, fadeDistance * fadeStrength, d);

    vec3 color = mix(gridColor, sectionColor, g2);

    gl_FragColor = vec4(color, max(g1, g2) * a);
    if (gl_FragColor.a <= 0.0) discard;
  }
`

interface GridProps {
  rotation?: [number, number, number]
  infiniteGrid?: boolean
  cellSize?: number
  sectionSize?: number
  args?: [number?, number?] // Keep for compatibility, but don't use
}

export const Grid: React.FC<GridProps> = ({
  rotation,
  infiniteGrid,
  cellSize = 1,
  sectionSize = 10,
}) => {
  const { scene, camera } = useThree()
  const size = 1000 // A large plane for the "infinite" grid

  const gridMesh = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(size, size)
    // Rotate plane to be on XZ plane, like GridHelper
    geometry.rotateX(-Math.PI / 2)

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        cellSize: { value: cellSize },
        sectionSize: { value: sectionSize },
        gridColor: { value: new THREE.Color(0xeeeeee) },
        sectionColor: { value: new THREE.Color(0xccccff) },
        fadeDistance: { value: 100 }, // Fade out based on sectionSize
        fadeStrength: { value: 1.5 },
      },
      transparent: true,
      side: THREE.DoubleSide,
    })

    const mesh = new THREE.Mesh(geometry, material)
    if (rotation) {
      mesh.rotation.fromArray(rotation)
    }
    return mesh
  }, [size, cellSize, sectionSize, rotation])

  useFrame(() => {
    if (infiniteGrid) {
      gridMesh.position.set(camera.position.x, camera.position.y, 0)
    }
  })

  useEffect(() => {
    if (!scene || !gridMesh) return
    scene.add(gridMesh)
    return () => {
      scene.remove(gridMesh)
      gridMesh.geometry.dispose()
      if (Array.isArray(gridMesh.material)) {
        gridMesh.material.forEach((m) => m.dispose())
      } else {
        gridMesh.material.dispose()
      }
    }
  }, [scene, gridMesh])

  return null
}
