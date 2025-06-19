/// <reference types="vite/client" />

declare module "*.wasm?base64" {
  const content: string
  export default content
}
