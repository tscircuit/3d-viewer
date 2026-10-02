declare module "@jscad/stl-serializer" {
  export function serialize(options: any, objects: any[]): any[]
}

declare module "https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/+esm" {
  const factory: (config?: {
    locateFile?: (path: string) => string
  }) => Promise<unknown>
  export default factory
}

// Public Text API used by the viewer; troika-three-text ships JavaScript only.
declare module "troika-three-text" {
  import { Mesh, type ColorRepresentation } from "three"

  export class Text extends Mesh {
    text: string
    font: string | null
    fontSize: number
    color: ColorRepresentation
    anchorX: number | "left" | "center" | "right"
    anchorY:
      | number
      | "top"
      | "top-baseline"
      | "top-cap"
      | "top-ex"
      | "middle"
      | "bottom-baseline"
      | "bottom"
    depthOffset: number
    sync(callback?: () => void): void
    dispose(): void
  }
}
