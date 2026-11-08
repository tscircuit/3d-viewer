import type { AssemblyExplosionRotation } from "../../../src/assembly-explosion/rotation-playback"

// The cover has already cleared the PCB and been parked at x=-220, z=65.
// Flip around its middle so the inside faces upward toward the workbench camera.
export const gameboyExplosionRotations: AssemblyExplosionRotation[] = [
  {
    stageName: "EnclosureR43.flip-front-cover",
    axis: "x",
    angleDegrees: 180,
    pivot: [-220, 0, 73],
  },
]
