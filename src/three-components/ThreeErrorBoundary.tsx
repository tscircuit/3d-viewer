import React from "react"

interface Props {
  children: React.ReactNode
  fallback: (props: { error: Error }) => any
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ThreeErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override render() {
    if (this.state.hasError && this.state.error) {
      // return this.props.fallback({ error: this.state.error })
    }

    return this.props.children
  }
}
