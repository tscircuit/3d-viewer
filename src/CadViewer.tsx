import type { AnySoupElement } from "@tscircuit/soup"
import { useConvertChildrenToSoup } from "./hooks/use-convert-children-to-soup"
import { su } from "@tscircuit/soup-util"
import { useMemo } from "react"
import { soupToJscadShape } from "./soup-to-3d"

interface Props {
  soup?: AnySoupElement[]
  children?: any
}

export const CadViewer = ({ soup, children }: Props) => {
  soup ??= useConvertChildrenToSoup(children, soup)

  // TODO convert board

  const boardGeom = useMemo(() => soupToJscadShape(soup), [soup])

  const cad_components = su(soup).cad_component.list()

  return <div>{/* TODO */}</div>
}
