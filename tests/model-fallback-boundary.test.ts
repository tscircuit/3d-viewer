import { expect, test } from "bun:test"
import { getModelFallbackBoundaryKey } from "../src/AnyCadComponent"
import { ThreeErrorBoundary } from "../src/three-components/ThreeErrorBoundary"

function createBoundary(resetKey: string) {
  const boundary = new ThreeErrorBoundary({
    resetKey,
    fallback: () => null,
    children: null,
  } as any) as any

  boundary.setState = (nextState: any) => {
    boundary.state = {
      ...boundary.state,
      ...(typeof nextState === "function"
        ? nextState(boundary.state, boundary.props)
        : nextState),
    }
  }

  return boundary
}

test("ThreeErrorBoundary clears captured errors when resetKey changes", () => {
  const boundary = createBoundary("component-a|0|old.glb")
  boundary.state = ThreeErrorBoundary.getDerivedStateFromError(
    new Error("old model failed"),
  )

  const previousProps = boundary.props
  boundary.props = { ...boundary.props, resetKey: "component-a|0|new.glb" }
  boundary.componentDidUpdate(previousProps)

  expect(boundary.state).toEqual({ hasError: false, error: null })
})

test("ThreeErrorBoundary keeps captured errors when resetKey is unchanged", () => {
  const boundary = createBoundary("component-a|0|old.glb")
  const error = new Error("old model failed")
  boundary.state = ThreeErrorBoundary.getDerivedStateFromError(error)

  boundary.componentDidUpdate(boundary.props)

  expect(boundary.state).toEqual({ hasError: true, error })
})

test("model fallback boundary key changes when model URLs change", () => {
  const oldKey = getModelFallbackBoundaryKey({
    cadComponentId: "component-a",
    fallbackModelIndex: 0,
    gltfUrl: "https://cdn.example.com/old.glb",
    url: null,
    stepUrl: null,
  })
  const newKey = getModelFallbackBoundaryKey({
    cadComponentId: "component-a",
    fallbackModelIndex: 0,
    gltfUrl: "https://cdn.example.com/new.glb",
    url: null,
    stepUrl: null,
  })

  expect(newKey).not.toBe(oldKey)
})
