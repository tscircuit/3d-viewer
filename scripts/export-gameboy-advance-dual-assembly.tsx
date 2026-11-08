import { gameboyExplosionRotations } from "../stories/fixtures/gameboy-advance-dual-assembly/rotations"
import { createHash } from "node:crypto"
import {
  buildGameboyAssembly,
  packageReleaseId,
} from "../stories/fixtures/gameboy-advance-dual-assembly/build"
const input = process.argv[2]
if (!input)
  throw new Error(
    "Usage: bun scripts/export-gameboy-advance-dual-assembly.tsx <published-circuit.json>",
  )
const original = await Bun.file(input).json()
const assembled = await buildGameboyAssembly(original)
const directory = new URL(
  "../stories/fixtures/gameboy-advance-dual-assembly/",
  import.meta.url,
)
const hash = (value: string) => createHash("sha256").update(value).digest("hex")
await Bun.write(
  new URL("assembled.circuit.json", directory),
  JSON.stringify(assembled) + "\n",
)
await Bun.write(
  new URL("rotation-program.json", directory),
  JSON.stringify(gameboyExplosionRotations, null, 2) + "\n",
)
await Bun.write(
  new URL("generation.json", directory),
  JSON.stringify(
    {
      source: "https://tscircuit.com/abse/gameboy-advance-dual-rp2350",
      version: "0.3.0-review.8",
      packageReleaseId,
      originalRecordCount: original.length,
      originalSha256: hash(JSON.stringify(original)),
      assembledSha256: hash(JSON.stringify(assembled)),
      rotationsSha256: hash(JSON.stringify(gameboyExplosionRotations)),
    },
    null,
    2,
  ) + "\n",
)
console.log(
  `Preserved ${original.length} records; appended ${assembled.length - original.length} explosion records`,
)
