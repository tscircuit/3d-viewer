import type { AnySoupElement } from "@tscircuit/soup"
import { useRenderedElements } from "@tscircuit/react-fiber"

export const useConvertChildrenToSoup = (
  children?: any,
  defaultSoup?: AnySoupElement[],
): AnySoupElement[] => {
  const { elements } = useRenderedElements(children)

  return (elements as any) ?? defaultSoup!
}
