import { expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Box3, Euler, MathUtils, Matrix4, Mesh, Vector3 } from "three"
import { MTLLoader, OBJLoader } from "three-stdlib"
import {
  getTo92SourceRotation,
  prepareRealPartAssets,
  TO92_NATIVE_OBJ_SHA256,
  TO92_NATIVE_OBJ_URL,
  TO92_SOURCE_SHA256,
  TO92_SOURCE_VARIANTS,
  transformTo92Obj,
} from "../scripts/prepare-real-part-assets"

function vectors(text: string, kind: "v" | "vn"): Vector3[] {
  return text
    .split("\n")
    .filter((line) => line.startsWith(`${kind} `))
    .map((line) =>
      new Vector3().fromArray(line.split(/\s+/).slice(1).map(Number)),
    )
}

test("real TO-92 source rotations preserve native geometry, normals and materials", async () => {
  const source = await readFile(
    new URL(
      "./fixtures/renderer-parity/policy/TO-92_Inline.step",
      import.meta.url,
    ),
  )
  const native = await readFile(TO92_NATIVE_OBJ_URL, "utf8")
  expect(createHash("sha256").update(source).digest("hex")).toBe(
    TO92_SOURCE_SHA256,
  )
  expect(createHash("sha256").update(native).digest("hex")).toBe(
    TO92_NATIVE_OBJ_SHA256,
  )
  expect(native).toContain(`# Source SHA-256: ${TO92_SOURCE_SHA256}`)
  const positions = vectors(native, "v")
  const normals = vectors(native, "vn")
  const faces = native.split("\n").filter((line) => line.startsWith("f "))
  expect(positions).toHaveLength(660)
  expect(normals).toHaveLength(220)
  expect(faces).toHaveLength(220)
  const nativeBounds = new Box3().setFromPoints(positions)
  expect(nativeBounds.min.z).toBe(-2.5)
  expect(nativeBounds.max.z).toBe(7.3)
  const materials = native.match(/newmtl[\s\S]*?endmtl/g)!
  expect(materials).toHaveLength(2)
  expect(materials[0]).toContain(
    "Kd 0.0196078431372549 0.0196078431372549 0.0196078431372549",
  )
  expect(materials[1]).toContain(
    "Kd 0.6470588235294118 0.6392156862745098 0.5725490196078431",
  )

  for (const center of [0, 1.27, 2.54]) {
    const lead = positions.filter(
      (p) => p.z < 0 && Math.abs(p.x - center) < 0.3,
    )
    expect(lead).toHaveLength(18)
    const bounds = new Box3().setFromPoints(lead)
    expect(bounds.min.x).toBeCloseTo(center - 0.24, 12)
    expect(bounds.max.x).toBeCloseTo(center + 0.24, 12)
    expect(bounds.min.y).toBe(-0.19)
    expect(bounds.max.y).toBe(0.19)
    expect(Math.hypot(0.24, 0.19) * 2).toBeLessThan(0.75)
  }

  const directory = await mkdtemp(join(tmpdir(), "real-to92-assets-"))
  try {
    await prepareRealPartAssets(directory)
    expect((await readdir(join(directory, "real"))).sort()).toEqual([
      "to92-native.obj",
      "to92-x.obj",
      "to92-xy.obj",
      "to92-y.obj",
    ])
    expect(
      await readFile(join(directory, "real/to92-native.obj"), "utf8"),
    ).toBe(native)
    for (const variant of ["x", "y", "xy"] as const) {
      const definition = TO92_SOURCE_VARIANTS[variant]
      const rotated = transformTo92Obj(native, variant)
      expect(rotated).not.toBe(native)
      expect(
        await readFile(join(directory, "real", definition.filename), "utf8"),
      ).toBe(rotated)
      expect(rotated.match(/newmtl[\s\S]*?endmtl/g)).toEqual(materials)
      expect(
        rotated.split("\n").filter((line) => !/^(v|vn) /.test(line)),
      ).toEqual(native.split("\n").filter((line) => !/^(v|vn) /.test(line)))
      const { x, y, z } = definition.rotationOffset
      const authoredRotation = new Matrix4().makeRotationFromEuler(
        new Euler(
          MathUtils.degToRad(x),
          MathUtils.degToRad(y),
          MathUtils.degToRad(z),
          "XYZ",
        ),
      )
      expect(getTo92SourceRotation(variant).determinant()).toBeCloseTo(1, 12)
      const datum = new Vector3(1.27, 0, 0).applyMatrix4(
        getTo92SourceRotation(variant),
      )
      expect(
        datum.distanceTo(
          new Vector3(
            definition.sourceDatum.x,
            definition.sourceDatum.y,
            definition.sourceDatum.z,
          ),
        ),
      ).toBeLessThan(1e-12)
      for (const kind of ["v", "vn"] as const) {
        const expected = kind === "v" ? positions : normals
        const actual = vectors(rotated, kind)
        expect(actual).toHaveLength(expected.length)
        for (const [index, point] of actual.entries()) {
          expect(
            point.applyMatrix4(authoredRotation).distanceTo(expected[index]!),
          ).toBeLessThan(1e-12)
        }
      }

      // Use the viewer's embedded-MTL convention without importing React or an exporter.
      const materialCreator = new MTLLoader().parse(
        materials.join("\n"),
        "embedded.mtl",
      )
      const parsed = new OBJLoader()
        .setMaterials(materialCreator)
        .parse(rotated.replace(/newmtl[\s\S]*?endmtl/g, ""))
      let triangleCount = 0
      const loadedMaterials = new Set<string>()
      parsed.traverse((child) => {
        if (!(child instanceof Mesh)) return
        triangleCount += child.geometry.getAttribute("position").count / 3
        for (const material of Array.isArray(child.material)
          ? child.material
          : [child.material]) {
          loadedMaterials.add(material.name)
          material.dispose()
        }
        child.geometry.dispose()
      })
      expect(triangleCount).toBe(220)
      expect([...loadedMaterials].sort()).toEqual(["Material_0", "Material_1"])
    }
    await prepareRealPartAssets(directory)
    for (const variant of ["x", "y", "xy"] as const) {
      expect(
        await readFile(
          join(directory, "real", TO92_SOURCE_VARIANTS[variant].filename),
          "utf8",
        ),
      ).toBe(transformTo92Obj(native, variant))
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
  expect(() => transformTo92Obj("v 0 NaN 1\n", "x")).toThrow(
    "Invalid native OBJ vector",
  )
})
