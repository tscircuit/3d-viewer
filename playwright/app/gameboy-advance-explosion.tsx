import React from "react"
import { createRoot } from "react-dom/client"
import { GameboyAdvanceDualRp2350 } from "../../stories/AssemblyExplosion.stories"
createRoot(document.getElementById("root")!).render(
  <div style={{ width: 1100, height: 800 }}>
    <GameboyAdvanceDualRp2350 />
  </div>,
)
