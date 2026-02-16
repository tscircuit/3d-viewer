import { Circuit } from "@tscircuit/core"
import { useMemo } from "react"
import type { AnyCircuitElement } from "circuit-json"
import React from "react"

export const useConvertChildrenToCircuitJson = (
  children?: any,
): AnyCircuitElement[] => {
  return useMemo(() => {
    if (!children) return []
    const circuit = new Circuit()
    circuit.add(children)
    // circuit.render()
    const circuitJson = circuit.getCircuitJson() as AnyCircuitElement[]

    // Manually inject show_as_translucent_model for cad components
    // This is a workaround because @tscircuit/core doesn't pass this prop through yet
    const traverseChildren = (node: any) => {
      if (!node) return

      if (
        node.type === "cadmodel" &&
        node.props?.showAsTranslucentModel &&
        (node.props.gltfUrl || node.props.objUrl || node.props.modelUrl)
      ) {
        // Find the corresponding cad_component in circuitJson
        // This is a bit heuristic, matching by URL
        const url =
          node.props.gltfUrl || node.props.objUrl || node.props.modelUrl
        const cadComponent = circuitJson.find(
          (c) =>
            c.type === "cad_component" &&
            (c.model_glb_url === url ||
              c.model_obj_url === url ||
              c.model_gltf_url === url),
        )
        if (cadComponent) {
          // @ts-ignore
          cadComponent.show_as_translucent_model = true
        }
      }

      if (node.props?.children) {
        React.Children.forEach(node.props.children, traverseChildren)
      }

      // Also traverse other props that might contain React elements (like cadModel)
      if (node.props) {
        Object.values(node.props).forEach((prop: any) => {
          if (React.isValidElement(prop)) {
            traverseChildren(prop)
          }
        })
      }
    }

    React.Children.forEach(children, traverseChildren)

    return circuitJson
  }, [children])
}
