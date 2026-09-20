import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { Matrix4, Vector3 } from "three"

export const TO92_SOURCE_SHA256 =
  "f0b61c32ecbf0067157adc5a3d4966ceadf5d6dafe93c51af35f76c41c71a54a"
export const TO92_NATIVE_OBJ_SHA256 =
  "2fc0c9de3dedaeff8db0769aafbf19ba9eab8b6ffa0ca93fa9aa53dd88916790"
export const TO92_NATIVE_OBJ_URL = new URL(
  "../tests/fixtures/renderer-parity/real-parts/assets/to92-native.obj",
  import.meta.url,
)

export type To92SourceVariant = "x" | "y" | "xy"

export const TO92_SOURCE_VARIANTS = {
  x: {
    filename: "to92-x.obj",
    rotationOffset: { x: 90, y: 0, z: 0 },
    sourceDatum: { x: 1.27, y: 0, z: 0 },
  },
  y: {
    filename: "to92-y.obj",
    rotationOffset: { x: 0, y: 90, z: 0 },
    sourceDatum: { x: 0, y: 0, z: 1.27 },
  },
  xy: {
    filename: "to92-xy.obj",
    rotationOffset: { x: 90, y: 90, z: 0 },
    sourceDatum: { x: 0, y: 0, z: 1.27 },
  },
} as const

export function getTo92SourceRotation(variant: To92SourceVariant): Matrix4 {
  const x = new Matrix4().makeRotationX(-Math.PI / 2)
  const y = new Matrix4().makeRotationY(-Math.PI / 2)
  switch (variant) {
    case "x":
      return x
    case "y":
      return y
    case "xy":
      // Inverse of Three's intrinsic XYZ(+90, +90, 0): Ry(-90) * Rx(-90).
      return y.multiply(x)
    default:
      throw new Error(`Unknown TO-92 source variant: ${variant}`)
  }
}

export function transformTo92Obj(
  nativeObj: string,
  variant: To92SourceVariant,
): string {
  const rotation = getTo92SourceRotation(variant)
  return nativeObj
    .split("\n")
    .map((line) => {
      const record = /^(v|vn)\s+(.*)$/.exec(line)
      if (!record) return line
      const coordinates = record[2]!.trim().split(/\s+/).map(Number)
      if (coordinates.length !== 3 || !coordinates.every(Number.isFinite)) {
        throw new Error(`Invalid native OBJ vector: ${line}`)
      }
      // Both records use a proper rotation only; preserve normal magnitudes.
      const point = new Vector3(
        coordinates[0]!,
        coordinates[1]!,
        coordinates[2]!,
      ).applyMatrix4(rotation)
      return `${record[1]} ${point.x} ${point.y} ${point.z}`
    })
    .join("\n")
}

export async function prepareRealPartAssets(
  outputAssetsDirectory: string,
): Promise<void> {
  const nativeObj = await readFile(TO92_NATIVE_OBJ_URL, "utf8")
  if (
    createHash("sha256").update(nativeObj).digest("hex") !==
    TO92_NATIVE_OBJ_SHA256
  ) {
    throw new Error(
      "Native TO-92 OBJ hash changed; review and recapture explicitly",
    )
  }
  const real = join(outputAssetsDirectory, "real")
  await mkdir(real, { recursive: true })
  await writeFile(join(real, "to92-native.obj"), nativeObj)
  for (const variant of ["x", "y", "xy"] as const) {
    await writeFile(
      join(real, TO92_SOURCE_VARIANTS[variant].filename),
      transformTo92Obj(nativeObj, variant),
    )
  }
}
