export function replaceGlobalProperty({
  propertyName,
  propertyValue,
}: {
  propertyName: keyof typeof globalThis
  propertyValue: unknown
}): () => void {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    propertyName,
  )
  Object.defineProperty(globalThis, propertyName, {
    configurable: true,
    value: propertyValue,
  })

  return () => {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, propertyName, originalDescriptor)
    } else {
      Reflect.deleteProperty(globalThis, propertyName)
    }
  }
}
