declare module "@jscad/stl-serializer" {
  export function serialize(options: any, objects: any[]): any[]
}

declare module "*.wasm" {
  const value: string
  export default value
}
