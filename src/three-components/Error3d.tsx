import type { CadComponent } from "circuit-json"
import { useState, useCallback, useEffect, useMemo } from "react"
import ContainerWithTooltip from "src/ContainerWithTooltip"
import { Html } from "src/react-three/Html"
import { Text } from "src/react-three/Text"
import { useThree } from "src/react-three/ThreeContext"
import * as THREE from "three"

export const Error3d = ({
  error,
  cad_component,
}: { error: any; cad_component?: CadComponent }) => {
  const { rootObject } = useThree()
  const [isHovered, setIsHovered] = useState(false)
  const [hoverPosition, setHoverPosition] = useState<
    [number, number, number] | null
  >(null)

  const handleHover = useCallback((e: any) => {
    if (e?.mousePosition) {
      setIsHovered(true)
      setHoverPosition(e.mousePosition)
    } else {
      setIsHovered(false)
      setHoverPosition(null)
    }
  }, [])

  const handleUnhover = useCallback(() => {
    setIsHovered(false)
    setHoverPosition(null)
  }, [])

  const position = useMemo(() => {
    if (cad_component?.position) {
      const p = [
        cad_component.position.x,
        cad_component.position.y,
        cad_component.position.z,
      ]
      // make sure the position doesn't have any NaN values
      return p.map((val) => (Number.isNaN(val) ? 0 : val))
    }
    return [0, 0, 0]
  }, [cad_component])

  const group = useMemo(() => {
    const g = new THREE.Group()
    g.position.fromArray(position as [number, number, number])
    return g
  }, [position])

  useEffect(() => {
    if (!rootObject) return
    rootObject.add(group)
    return () => {
      rootObject.remove(group)
    }
  }, [rootObject, group])

  return (
    <>
      <ContainerWithTooltip
        isHovered={isHovered}
        onHover={handleHover}
        onUnhover={handleUnhover}
        object={group}
      >
        <ErrorBox parent={group} />
        <Text
          parent={group}
          scale={[0.1, 0.1, 0.1]}
          color="red"
          anchorX="center"
          anchorY="middle"
          depthOffset={-99999}
        >
          {`${error.toString().slice(0, 50)}...`}
        </Text>
      </ContainerWithTooltip>
      {isHovered && hoverPosition ? (
        <Html
          position={hoverPosition}
          style={{
            fontFamily: "sans-serif",
            transform: "translate3d(-1rem, 0rem, 0)",
            backgroundColor: "white",
            padding: "6px",
            borderRadius: "4px",
            color: "red",
            pointerEvents: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            msUserSelect: "none",
          }}
        >
          {error.toString()}
        </Html>
      ) : null}
    </>
  )
}

const ErrorBox = ({ parent }: { parent: THREE.Object3D }) => {
  const mesh = useMemo(() => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({
        depthTest: false,
        transparent: true,
        color: "red",
        opacity: 0.5,
      }),
    )
    m.renderOrder = 999999
    m.rotation.fromArray([Math.PI / 4, Math.PI / 4, 0])
    return m
  }, [])

  useEffect(() => {
    parent.add(mesh)
    return () => {
      parent.remove(mesh)
    }
  }, [parent, mesh])

  return null
}
