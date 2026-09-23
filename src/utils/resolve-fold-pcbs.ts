import type { AnyCircuitElement } from "circuit-json"

/** An explicit render option overrides the CAD state stored in Circuit JSON. */
export function resolveFoldPcbs(
  circuitJson: AnyCircuitElement[],
  foldPcbs?: boolean,
): boolean {
  return (
    foldPcbs ??
    circuitJson.some(
      (element) =>
        element.type === "cad_component" && element.is_on_folded_board === true,
    )
  )
}
