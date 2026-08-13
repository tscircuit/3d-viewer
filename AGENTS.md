# AGENTS.md — @tscircuit/3d-viewer

React/three.js preview of a board and its components, rendered from Circuit
JSON. Consumed by `runframe`, which inlines it into its standalone bundle.

## Commands

```bash
bun install
bun test
bunx tsc --noEmit
bun run start          # React Cosmos fixtures — the fastest way to see a change
```

## Coordinate frames — read before changing any transform

This is, with `circuit-json-to-gltf`, the highest-risk area in the ecosystem for
silent geometry defects: a wrong transform still renders, so nothing throws and
review sees a plausible picture.

| Frame | Up | Units |
| --- | --- | --- |
| Circuit JSON (input) | **+Z** | mm |
| three.js scene | **+Y** | mm |

### Direction names

Directions name **where something is**, in board space: +X `right`, −X `left`,
+Y `top`, −Y `bottom`, +Z `above`, −Z `below` — published by `circuit-json` as
`InsertionDirection` (`from_right`, `from_top`, …).

**`front` and `back` are retired.** This package's `Front` camera preset is −Y,
while `core`, `checks` and `circuit-json-to-gltf` treated front as +Y. That
disagreement is the root of most defects in this area. Do not reintroduce the
names in new code, presets, comments or docs; name the axis outright ("the +X
face"). A named direction is a convenience, the axis is the truth.

Note also that `top`/`bottom` mean **±Y** as a *direction* but **±Z** as a *PCB
layer* (`layer="top"`). A layer is a Z concept, a direction is a Y concept.
Whenever a symbol named `top` or `bottom` crosses a boundary, say in its
docstring which of the two it is.

### Rules

1. **State the frame at every boundary** — which frame, what the axes mean,
   units (mm), which way is up, and whether the value is a point or a direction
   (a point picks up translation, a direction must not).
2. **Compose; never hand-roll a rotation matrix.** Hand-written
   `x*cos − y*sin` is how the `insertion_direction` flip bug survived: the
   direction math and the pad geometry were two independent implementations of
   "the same" transform that silently disagreed on bottom-layer parts.
3. **Derive from the reference transform.** Anything that follows a component —
   pads, silkscreen, a derived direction — must be computed from that
   component's matrix, so it cannot drift when the matrix changes. Cite the
   file, symbol and branch you copied from in a comment.
4. **A layer flip is a rotation, not an inversion.** Flipping to the bottom
   layer is a 180° rotation about the vertical axis; exactly two components
   invert. Negating all three is an improper transform (determinant −1) and
   renders the part as its own mirror image.
5. **Validate a convention before copying it.** Transforms here have repeatedly
   turned out to be compensations for bugs elsewhere. Find the origin commit or
   the pinning test first, and prefer removing the compensation at its source.

The current enclosure/frame contract is documented in the parametric-enclosures
RFC's **Faces** and **Aperture projection** sections. Read those together with
this file before adding another hardcoded rotation; the older standalone
coordinate-frame RFC was retired.

## Testing geometry

- Derive expectations from **where geometry actually lands**, not from the
  transform — a test that restates the implementation pins its bugs too.
- Make probes discriminating: a marker at `x = 0` cannot detect an X mirror, and
  90°/270° rotations cannot distinguish a wrong mirror axis (there, right and
  wrong agree exactly). Use off-axis markers and cover 0°/180° **and** 90°/270°,
  on both layers.
- **Never blind-rebaseline a snapshot.** Look at the image. A rebaseline here
  once silently disabled the very regression guard its test comment described.
