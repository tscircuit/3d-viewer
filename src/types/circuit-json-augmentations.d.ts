import "circuit-json"

declare module "circuit-json" {
  interface CadComponent {
    componentType?: "smd" | "through_hole" | "virtual"
  }
}
