import React from "react"
import { createRoot } from "react-dom/client"
import { Flex17AdjustableSpur } from "../../stories/AssemblyExplosion.stories"
createRoot(document.getElementById("root")!).render(
  <div style={{ width: 1100, height: 800 }}>
    <Flex17AdjustableSpur />
  </div>,
)
