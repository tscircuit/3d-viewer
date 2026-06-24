import React from "react"

interface Props {
  children: React.ReactNode
  fallback: (props: { error: Error }) => any
  resetKey?: string
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

  override componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null })
    }
  }

  override render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback({ error: this.state.error })
    }

    return this.props.children
  }
}
