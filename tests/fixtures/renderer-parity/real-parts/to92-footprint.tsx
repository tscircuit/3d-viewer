/** KiCad TO-92_Inline mounting geometry: 1.27 mm pitch, 0.75 mm holes. */
export function To92InlineFootprint() {
  return (
    <footprint>
      <platedhole
        portHints={["pin1"]}
        pcbX={0}
        pcbY={0}
        shape="circular_hole_with_rect_pad"
        holeDiameter={0.75}
        rectPadWidth={1.05}
        rectPadHeight={1.5}
      />
      <platedhole
        portHints={["pin2"]}
        pcbX={1.27}
        pcbY={0}
        shape="pill"
        holeWidth={0.75}
        holeHeight={0.75}
        outerWidth={1.05}
        outerHeight={1.5}
      />
      <platedhole
        portHints={["pin3"]}
        pcbX={2.54}
        pcbY={0}
        shape="pill"
        holeWidth={0.75}
        holeHeight={0.75}
        outerWidth={1.05}
        outerHeight={1.5}
      />
      <silkscreenpath
        route={[
          { x: -0.53, y: -1.85 },
          { x: 3.07, y: -1.85 },
        ]}
      />
    </footprint>
  )
}
