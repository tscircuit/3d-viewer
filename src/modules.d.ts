declare module "@jscad/stl-serializer" {
  export function serialize(options: any, objects: any[]): any[]
}

declare module "https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/+esm" {
  const factory: () => Promise<unknown>
  export default factory
}
