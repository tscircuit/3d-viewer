import { circuitToSvg } from "../src/utils/circuit-to-svg.tsx"
import * as fs from "fs"
import * as path from "path"
import { expect } from "chai"
import circuitJson from "./assets/circuit.json"
import { test, bun } from "bun:test"

test("circuitToSvg", async () => {
    const options = {
        width: 800,
        height: 600,
        viewAngle: "isometric",
        backgroundColor: "#ffffff",
        padding: 20,
        zoom: 50
      }
  
      const svgString = await circuitToSvg(circuitJson, options)
      
    //   // Check if the SVG string contains the necessary SVG elements
    //   expect(svgString).to.contain("<svg")
    //   expect(svgString).to.contain("</svg>")
    //   expect(svgString).to.contain('xmlns="http://www.w3.org/2000/svg"')
    //   expect(svgString).to.contain('version="1.1"')
  
      // Optionally, write the SVG string to a file for manual inspection
      const outputPath = path.join(__dirname, "output.svg")
      fs.writeFileSync(outputPath, svgString)
})