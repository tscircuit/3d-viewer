import "react"

declare global {
  namespace JSX {
    interface IntrinsicElements {
      cadmodel: any
    }
  }
}

declare module "@tscircuit/props" {
  interface CadModelProps {
    showAsTranslucentModel?: boolean
  }
}
