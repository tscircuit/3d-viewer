import { To92InlineFootprint } from "../real-parts/to92-footprint"

export default () => (
  <board width="10mm" height="8mm" thickness="1.4mm" routingDisabled>
    <chip
      name="Q1"
      layer="top"
      footprint={<To92InlineFootprint />}
      cadModel={{
        objUrl: "assets/real/to92-x.obj",
        rotationOffset: { x: 90, y: 0, z: 0 },
        modelOriginPosition: { x: 1.27, y: 0, z: 0 },
      }}
    />
  </board>
)
