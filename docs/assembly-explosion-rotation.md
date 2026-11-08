# Rotation during assembly explosion playback

`CadViewer` accepts `assemblyExplosionRotations` alongside an ordinary authored
explosion program. This is a viewer extension: core's circuit JSON explosion
moves currently describe translation only. The array must accompany the circuit
when another viewer loads it.

```tsx
import { CadViewer, type AssemblyExplosionRotation } from "@tscircuit/3d-viewer"

const rotations: AssemblyExplosionRotation[] = [{
  stageName: "EnclosureR43.flip-front-cover",
  moveIndex: 0, // ordered move within this stage; defaults to zero
  axis: "x",
  angleDegrees: 180,
  pivot: [-220, 0, 73], // fixed point in current circuit-world coordinates, mm
}]

<CadViewer circuitJson={assembled} assemblyExplosionRotations={rotations} />
```

The cue rotates the existing move's CAD targets together about the specified
pivot. Author a zero-translation move to give a flip its own stage. If a move also
translates, the translation is applied before the rotation. Later translations
remain in circuit-world XYZ, including when the target has already flipped.
Angles interpolate through their signed degree value, so `180` and `-180` take
opposite routes. Stage speed, Pause, reverse playback, seeking, and Reset all use
the same timeline. Reset restores original position, orientation, and scale;
geometry and model data remain shared rather than being rebuilt per frame.

Reference-surface and PCB-mounted-component rotation are not supported. Unknown
stage/move cues, duplicate cues, and nonfinite values are rejected. Rotation does
not perform runtime collision avoidance. Check the full swept path, not only
its endpoints. The GBA example includes a swept-envelope regression test and an
offline mesh audit; its remaining extraction limitations are recorded with the
fixture.
