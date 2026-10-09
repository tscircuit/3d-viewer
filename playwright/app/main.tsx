import { createRoot } from "react-dom/client"
import { RendererComparison } from "../../stories/renderer-comparison/RendererComparison"
import { Default as HiddenObjects } from "../../stories/HiddenObjects.stories"

const root = document.getElementById("root")
if (!root) throw new Error("Missing comparison application root")
const caseId = new URLSearchParams(location.search).get("case") ?? undefined
createRoot(root).render(
  new URLSearchParams(location.search).get("viewer") === "hidden-objects" ? (
    <HiddenObjects />
  ) : (
    <RendererComparison caseId={caseId} />
  ),
)
