import { createRoot } from "react-dom/client"
import { RendererComparison } from "../../stories/renderer-comparison/RendererComparison"
import { Lamp, LampGlb } from "../../stories/EdgeDisplay.stories"

const root = document.getElementById("root")
if (!root) throw new Error("Missing comparison application root")
const caseId = new URLSearchParams(location.search).get("case") ?? undefined
const edges = new URLSearchParams(location.search).get("edges")
createRoot(root).render(
  edges ? (
    <div data-testid="edge-demo" style={{ width: 800, height: 620 }}>
      {edges === "glb" ? <LampGlb /> : <Lamp />}
    </div>
  ) : (
    <RendererComparison caseId={caseId} />
  ),
)
