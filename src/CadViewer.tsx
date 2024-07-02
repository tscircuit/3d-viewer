import type { AnySoupElement } from "@tscircuit/soup"
import { useConvertChildrenToSoup } from "./hooks/use-convert-children-to-soup"
import { su } from "@tscircuit/soup-util"
import { useMemo } from "react"
import { createBoardGeomFromSoup } from "./soup-to-3d"
import { useStlsFromGeom } from "./hooks/use-stls-from-geom"
import { STLModel } from "./three-components/STLModel"
import { CadViewerContainer } from "./CadViewerContainer"
import { MixedStlModel } from "./three-components/MixedStlModel"

interface Props {
  soup?: AnySoupElement[]
  children?: any
}

export const CadViewer = ({ soup, children }: Props) => {
  soup ??= useConvertChildrenToSoup(children, soup)

  // TODO convert board

  const boardGeom = useMemo(() => createBoardGeomFromSoup(soup), [soup])

  const { stls, loading } = useStlsFromGeom(boardGeom)

  const cad_components = su(soup).cad_component.list()

  // TODO canvas/camera etc.
  return (
    <CadViewerContainer>
      {stls.map(({ stlUrl, color }, index) => (
        <STLModel
          key={stlUrl}
          stlUrl={stlUrl}
          color={color}
          opacity={index === 0 ? 0.95 : 1}
        />
      ))}
      {/* <MixedStlModel url="/easyeda-models/84af7f0f6529479fb6b1c809c61d205f" /> */}
      <MixedStlModel
        url="/easyeda-models/dc694c23844346e9981bdbac7bb76421"
        position={[0, 0, 0.5]}
        rotation={[0, 0, Math.PI / 2]}
      />
      <MixedStlModel
        url="/easyeda-models/c7acac53bcbc44d68fbab8f60a747688"
        position={[-5.65, 0, 0.5]}
        rotation={[0, 0, Math.PI / 2]}
      />
      <MixedStlModel
        url="/easyeda-models/c7acac53bcbc44d68fbab8f60a747688"
        position={[6.75, 0, 0.5]}
        rotation={[0, 0, 0]}
      />
    </CadViewerContainer>
  )
}
