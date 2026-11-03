import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { ThreeContext, useThree } from "../react-three/ThreeContext"

// Board builders add their meshes straight to rootObject. Give them one
// identity-bearing parent so the board is picked and hidden as one object.
// Hiding toggles visibility instead of unmounting, so the board geometry is
// not rebuilt and textures are not disposed.
export const BoardGroup = ({
  pcbBoardId,
  hidden = false,
  children,
}: {
  /** The rendered pcb_board_id, or pcb_panel_id when a panel is rendered. */
  pcbBoardId?: string
  hidden?: boolean
  children: React.ReactNode
}) => {
  const scene = useThree()
  const group = useMemo(() => new THREE.Group(), [])
  group.name = "board"
  group.userData.pcb_board_id = pcbBoardId
  group.visible = !hidden
  useEffect(() => {
    scene.rootObject.add(group)
    return () => {
      scene.rootObject.remove(group)
    }
  }, [scene.rootObject, group])
  const context = useMemo(
    () => ({ ...scene, rootObject: group }),
    [scene, group],
  )
  return (
    <ThreeContext.Provider value={context}>{children}</ThreeContext.Provider>
  )
}
