import { createRoot } from "react-dom/client"
import { BoardRemoval } from "../../stories/PocketMicC5Rx.stories"

localStorage.setItem(
  "cadViewerEngine",
  new URLSearchParams(location.search).get("engine") ?? "manifold",
)

createRoot(document.getElementById("root")!).render(
  <div style={{ width: 1100, height: 800 }}>
    <BoardRemoval />
  </div>,
)
