import { assembly } from "@tscircuit/core"
import manifest from "./manifest.json"
import { models } from "./cad-models"

export const mechanicalParts = manifest.parts.filter(
  (part) =>
    part.group !== "clearance" && !("viewerOnly" in part && part.viewerOnly),
)

type Offset = [number, number, number]
const namesFor = (parts: typeof mechanicalParts) =>
  parts.map((p) => p.id.replaceAll("-", "_"))
const select = (match: (part: (typeof mechanicalParts)[number]) => boolean) =>
  mechanicalParts.filter(match)

const userParts = select(
  (p) =>
    p.group === "door" ||
    p.group === "storage" ||
    /^aa-\d$/.test(p.id) ||
    p.id === "usb-c-cable",
)
const rearParts = select(
  (p) =>
    ["rear", "rear-fasteners", "case-fasteners"].includes(p.group) ||
    p.id === "aa-holder" ||
    p.id.startsWith("battery-clip"),
)
const frontParts = mechanicalParts.filter(
  (p) => !userParts.includes(p) && !rearParts.includes(p),
)
export const removalGroups = [
  { name: "user-items", parts: userParts, parking: [-220, -240, 0] as Offset },
  { name: "rear-housing", parts: rearParts, parking: [-220, 180, 0] as Offset },
  {
    name: "front-assembly",
    parts: frontParts,
    parking: [-220, 0, 0] as Offset,
  },
]
const move = (parts: typeof mechanicalParts, offset: Offset) => ({
  names: namesFor(parts),
  offset,
})
function removalMoves(group: (typeof removalGroups)[number]) {
  if (group.name === "user-items") {
    const door = select((p) => p.id === "battery-door")
    const cell = (i: number) => select((p) => p.id === `aa-${i}`)
    const sd = select((p) => p.id === "micro-sd-card")
    return [
      move(door, [0, 0, -45]),
      move(door, [0, -100, 0]),
      move(cell(1), [0, 0, -55]),
      move(cell(1), [-60, 0, 0]),
      move(cell(2), [0, 0, -55]),
      move(cell(2), [60, 0, 0]),
      move(cell(0), [0, 3, 0]),
      move(cell(0), [0, 0, -55]),
      move(cell(3), [0, -3, 0]),
      move(cell(3), [0, 0, -55]),
      move(sd, [0, -60, 0]),
      move(sd, [90, 0, 0]),
      move(
        select((p) => p.id === "usb-c-cable"),
        [0, 70, 0],
      ),
    ]
  }
  if (group.name === "rear-housing")
    return [
      move(
        group.parts.filter((p) => p.group === "case-fasteners"),
        [0, 0, -140],
      ),
      move(
        group.parts.filter((p) => p.group === "case-fasteners"),
        [0, -100, 0],
      ),
      move(
        group.parts.filter((p) => p.group !== "case-fasteners"),
        [0, 0, -65],
      ),
    ]
  if (group.name === "front-assembly") {
    const hardware = group.parts.filter((p) =>
      /^front-pcb-(screw|washer)/.test(p.id),
    )
    return [
      move(hardware, [0, 0, -45]),
      move(hardware, [0, -100, 0]),
      move(
        group.parts.filter((p) => !hardware.includes(p)),
        [0, 0, 65],
      ),
    ]
  }
  return [move(group.parts, [0, 0, -45])]
}

// Route along one axis at a time so a diagonal does not cut through the
// remaining assembly or previously parked groups. Attached front modules
// travel with the shell rather than having the shell slide through them.
export const explosionStages = removalGroups.flatMap((group) => [
  {
    name: `remove-${group.name}`,
    parts: group.parts,
    moves: removalMoves(group),
  },
  {
    name: `park-${group.name}-left`,
    parts: group.parts,
    moves: [
      move(group.parts, [group.parking[0], 0, 0]),
      ...(group.parking[1]
        ? [move(group.parts, [0, group.parking[1], 0])]
        : []),
    ],
  },
])

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
          {stage.moves.map((move, moveIndex) => (
            <assembly.explosion.move
              key={moveIndex}
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
