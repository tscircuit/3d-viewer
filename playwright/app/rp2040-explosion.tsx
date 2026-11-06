import React from "react"
import { createRoot } from "react-dom/client"
import { ExportedCircuitJson } from "../../stories/Rp2040MotorAssembly.stories"
localStorage.setItem("cadViewerEngine", "manifold")
createRoot(document.getElementById("root")!).render(
  <div style={{ width: 1100, height: 950 }}>
    <ExportedCircuitJson />
  </div>,
)
