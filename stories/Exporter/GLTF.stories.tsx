import { CadViewer, useExportGltfUrl, useSaveGltfAs } from "../../src/index.tsx"

export default { title: "GLTF exporter" }

export const DownloadLink = () => {
  const [ref, url] = useExportGltfUrl()

  return (
    <>
      <a download="pcb.gltf" href={url}>
        download
      </a>

      <CadViewer ref={ref}>
        <board width="10mm" height="10mm">
          <capacitor
            capacitance="1000pF"
            footprint="0402"
            name="C1"
            pcbRotation={90}
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
        <board width="10mm" height="40mm">
          <chip name="U1" footprint="tssop16" />
        </board>
      </CadViewer>
    </>
  )
}
