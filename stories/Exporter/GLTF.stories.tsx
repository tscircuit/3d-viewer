import { useExportGltfUrl, useSaveGltfAs } from "src/hooks/index.ts"
import { CadViewer } from "../../src/CadViewer.tsx"

export default { title: "GLTF exporter" }

export const DownloadLink = () => {
  const [ref, url] = useExportGltfUrl()

  return (
    <>
      <a download="pcb.gltf" href={url}>
        download
      </a>

      <CadViewer ref={ref}>
        <board width="7mm" height="5mm">
          <capacitor
            capacitance="1000pF"
            footprint="0402"
            name="C1"
            pcbRotation={90}
          />
          <resistor
            resistance="10kOhm"
            footprint="0402"
            name="R1"
            pcbX="1mm"
            pcbY=".5mm"
          />
        </board>
      </CadViewer>
    </>
  )
}

export const SaveButton = () => {
  const [ref, saveAs] = useSaveGltfAs()

  return (
    <>
      <button onClick={() => saveAs("pcb.glb")}>save</button>

      <CadViewer ref={ref}>
        <board width="12mm" height="12mm">
          <chip name="U1" footprint="tssop16" />
        </board>
      </CadViewer>
    </>
  )
}

export const RightClickMenu = () => {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <CadViewer>
        <board width="10mm" height="8mm">
          <capacitor
            capacitance="1000pF"
            footprint="0402"
            name="C1"
            pcbX="2mm"
            pcbY="2mm"
          />
          <resistor
            resistance="10kOhm"
            footprint="0402"
            name="R1"
            pcbX="6mm"
            pcbY="4mm"
          />
          <chip name="U1" footprint="soic8" pcbX="4mm" pcbY="6mm" />
        </board>
      </CadViewer>
    </div>
  )
}

import { useRef } from "react"
export const RefForwarding = () => {
  const ref = useRef<any>(null)

  return (
    <>
      <button
        onClick={() => {
          if (ref.current) {
            // eslint-disable-next-line no-console
            console.log("CadViewer ref.current:", ref.current)
          } else {
            // eslint-disable-next-line no-console
            console.log("CadViewer ref is null")
          }
        }}
      >
        Log CadViewer ref
      </button>
      <CadViewer ref={ref}>
        <board width="10mm" height="8mm">
          <capacitor
            capacitance="1000pF"
            footprint="0402"
            name="C1"
            pcbX="2mm"
            pcbY="2mm"
          />
          <resistor
            resistance="10kOhm"
            footprint="0402"
            name="R1"
            pcbX="6mm"
            pcbY="4mm"
          />
          <chip name="U1" footprint="soic8" pcbX="4mm" pcbY="6mm" />
        </board>
      </CadViewer>
    </>
  )
}
