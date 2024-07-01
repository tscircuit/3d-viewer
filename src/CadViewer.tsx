import type { AnySoupElement } from "@tscircuit/soup"
import { useConvertChildrenToSoup } from "./hooks/use-convert-children-to-soup"
import { su } from "@tscircuit/soup-util"

interface Props {
  soup?: AnySoupElement[]
  children?: any
}

export const CadViewer = ({ soup, children }: Props) => {
  soup ??= useConvertChildrenToSoup(children, soup)

  // TODO convert board

  const cad_components = su(soup).cad_component.list()

  return <div>{/* TODO */}</div>
}
