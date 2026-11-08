import { assembly } from "@tscircuit/core"
import manifest from "./manifest.json"
import { models } from "./cad-models"

export const mechanicalParts = manifest.parts.filter(
  (part) =>
    part.group !== "clearance" && !("viewerOnly" in part && part.viewerOnly),
)

// These are the model author's offsets, in mm, not a collision-checked
// disassembly procedure. Zero-offset accessories remain in their original pose.
export const explosionStages = [
  { name: "access-panels", groups: ["door", "storage"] },
  { name: "case-screws", groups: ["case-fasteners"] },
  {
    name: "rear-housing",
    groups: ["rear", "battery", "rear-fasteners"],
    ids: ["battery-clip-m1", "battery-clip-1"],
  },
  { name: "internal-fasteners", groups: ["fasteners", "speaker-fasteners"] },
  { name: "front-housing", groups: ["front", "inserts"] },
  {
    name: "display",
    groups: ["display"],
    ids: ["lcd-slide-keeper-lower", "lcd-slide-keeper-upper"],
  },
  { name: "controls", groups: ["buttons", "joysticks", "cables"] },
  { name: "speaker-module", groups: ["speaker"], ids: ["speaker-retainer"] },
].map((stage) => ({
  name: stage.name,
  parts: mechanicalParts.filter(
    (part) => stage.groups.includes(part.group) || stage.ids?.includes(part.id),
  ),
}))

// Core plays moves within a stage in order. Parts sharing a translation must
// use one move so paired meshes (LCD, joysticks, fasteners) travel together.
function movesForStage(parts: typeof mechanicalParts) {
  const groups = new Map<string, { offset: number[]; names: string[] }>()
  for (const part of parts) {
    const key = part.explode.join(",")
    const group = groups.get(key) ?? { offset: part.explode, names: [] }
    group.names.push(part.id.replaceAll("-", "_"))
    groups.set(key, group)
  }
  return [...groups.values()]
}

/** Drop-in mechanical enclosure with native explosion stages. */
export function GameBoyEnclosure() {
  return (
    <assembly.device name="EnclosureR43">
      {mechanicalParts.map((part) => {
        const shift = (part as { modelOriginShiftMm?: number[] })
          .modelOriginShiftMm ?? [0, 0, 0]
        const props = {
          name: part.id.replaceAll("-", "_"),
          displayName: part.label,
          cadModel: {
            glbUrl: models[part.id as keyof typeof models],
            modelOriginPosition: {
              x: shift[0] ?? 0,
              y: shift[1] ?? 0,
              z: shift[2] ?? 0,
            },
            modelUnitToMmScale: 1,
          },
        }
        return part.printable ? (
          <assembly.printedpart
            key={part.id}
            {...props}
            material="pla"
            color={`#${(part.color ?? [128, 128, 128]).map((c) => c.toString(16).padStart(2, "0")).join("")}`}
          />
        ) : (
          <assembly.part key={part.id} {...props} />
        )
      })}
      {explosionStages.map((stage, index) => (
        <assembly.explosion.stage
          key={stage.name}
          name={stage.name}
          prevStageRef={index ? explosionStages[index - 1]!.name : undefined}
        >
          {movesForStage(stage.parts).map((move) => (
            <assembly.explosion.move
              key={move.names.join(",")}
              targetRefs={move.names}
              offX={move.offset[0]}
              offY={move.offset[1]}
              offZ={move.offset[2]}
            />
          ))}
        </assembly.explosion.stage>
      ))}
    </assembly.device>
  )
}
