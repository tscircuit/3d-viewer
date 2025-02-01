export function hash(buffer: ArrayBufferLike) {
  const view = new Uint8Array(buffer)
  let hash = 0
  for (let i = 0; i < view.length; i++) {
    hash = (hash * 31 + view[i]!) >>> 0
  }
  return hash.toString(16)
}

export function join(buffers: ArrayBufferLike[]) {
  const totalLength = buffers.reduce((sum, b) => sum + b.byteLength, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const buffer of buffers) {
    result.set(new Uint8Array(buffer), offset)
    offset += buffer.byteLength
  }
  return result.buffer
}
