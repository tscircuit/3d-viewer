import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { CadViewer } from "../../src/CadViewer"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 30,
    height: 20,
    thickness: 1.6,
    num_layers: 2,
  },
]

function Fixture() {
  const [source, setSource] = useState(
    new URLSearchParams(location.search).get("source") ?? "url",
  )
  const [bytes, setBytes] = useState<ArrayBuffer>()
  useEffect(() => {
    if (source !== "bytes" || bytes) return
    const controller = new AbortController()
    fetch("renderer-test.glb", { signal: controller.signal })
      .then((response) => response.arrayBuffer())
      .then(setBytes)
    return () => controller.abort()
  }, [source, bytes])

  return (
    <>
      <nav>
        <button type="button" onClick={() => setSource("url")}>
          Use GLB URL
        </button>
        <button type="button" onClick={() => setSource("json")}>
          Use Circuit JSON
        </button>
      </nav>
      <div style={{ width: "100vw", height: "calc(100vh - 40px)" }}>
        {source === "bytes" && !bytes ? (
          <div>Loading GLB bytes...</div>
        ) : (
          <CadViewer
            circuitJson={circuitJson}
            glbUrl={source === "url" ? "renderer-test.glb" : undefined}
            glbData={source === "bytes" ? bytes : undefined}
            autoRotateDisabled
          />
        )}
      </div>
    </>
  )
}

createRoot(document.getElementById("root")!).render(<Fixture />)
