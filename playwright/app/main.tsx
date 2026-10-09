import { createRoot } from "react-dom/client"
import { RendererComparison } from "../../stories/renderer-comparison/RendererComparison"

const root = document.getElementById("root")
if (!root) throw new Error("Missing comparison application root")
const caseId = new URLSearchParams(location.search).get("case") ?? undefined
createRoot(root).render(<RendererComparison caseId={caseId} />)
