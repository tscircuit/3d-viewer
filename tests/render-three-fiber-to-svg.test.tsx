import { Grid } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import { test, expect } from "bun:test"
import { renderThreeFiberToSvg } from "src/convert-circuit-json-to-3d-svg/render-three-fiber-to-svg"
import { applyJsdomShim } from "src/utils/jsdom-shim"
import { JSDOM } from "jsdom"
import { SVGRenderer } from "three/examples/jsm/renderers/SVGRenderer.js"

test("convert circuit json to 3d", async () => {
  const dom = new JSDOM()
  applyJsdomShim(dom)

  const svg = await renderThreeFiberToSvg(
    <Canvas
    // gl={(canvas) => {
    //   // Return a new svg renderer
    //   const renderer = new SVGRenderer()
    //   renderer.setSize(canvas.width, canvas.height)
    //   return renderer
    // }}
    >
      <ambientLight intensity={Math.PI / 2} />
      <pointLight position={[-10, -10, 10]} decay={0} intensity={Math.PI / 4} />
      <Grid
        rotation={[Math.PI / 2, 0, 0]}
        infiniteGrid={true}
        cellSize={1}
        sectionSize={10}
      />
    </Canvas>,
  )

  console.log(svg)
})
