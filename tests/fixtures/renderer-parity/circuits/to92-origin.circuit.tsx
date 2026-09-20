import { To92InlineFootprint } from "../real-parts/to92-footprint"

export default () => (
  <board width="10mm" height="8mm" thickness="1.4mm" routingDisabled>
    <chip
      name="Q1"
      layer="top"
      footprint={<To92InlineFootprint />}
      cadModel={{ stepUrl: "assets/real/TO-92_Inline.step" }}
    />
  </board>
)
