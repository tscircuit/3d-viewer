import { createRoot } from "react-dom/client"
import { RendererComparison } from "../../stories/renderer-comparison/RendererComparison"

const root = document.getElementById("root")
if (!root) throw new Error("Missing comparison application root")
const params = new URLSearchParams(location.search)
const caseId = params.get("case") ?? undefined
const manifestUrl = params.get("manifest") ?? undefined
createRoot(root).render(
  <RendererComparison caseId={caseId} manifestUrl={manifestUrl} />,
)
