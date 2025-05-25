import {
  CadViewer,
  useExportGltfUrl,
  useSaveGltfAs,
} from "../../src/CadViewer.tsx"

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
