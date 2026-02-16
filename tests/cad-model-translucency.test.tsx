import { test, expect } from "bun:test"
import { Circuit } from "@tscircuit/core"

test("cadmodel should support showAsTranslucentModel", () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <chip
        name="U1"
        footprint="soic8"
        cadModel={
          <cadassembly>
            <cadmodel
              showAsTranslucentModel={true}
              modelUrl="http://example.com/model.glb"
            />
          </cadassembly>
        }
      />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()
  const cadComponent = circuitJson.find((c) => c.type === "cad_component")

  expect(cadComponent).toBeDefined()
  // @ts-ignore
  expect(cadComponent.show_as_translucent_model).toBe(true)
})
