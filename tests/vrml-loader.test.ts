import { expect, test } from "bun:test"
import { sanitizeVrmlIdentifiers } from "../src/utils/vrml.ts"

test("replaces hyphens in DEF and USE identifiers", () => {
  const input = `#VRML V2.0 utf8
Shape { appearance Appearance { material DEF PIN-01 Material { } } }
Shape { appearance Appearance{material USE PIN-01 } }`
  const output = sanitizeVrmlIdentifiers(input)
  expect(output).toContain("DEF PIN_01")
  expect(output).toContain("USE PIN_01")
  expect(output).not.toContain("PIN-01")
})
