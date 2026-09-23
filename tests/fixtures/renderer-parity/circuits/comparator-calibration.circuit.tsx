export default () => (
  <board width={10} height={8} thickness={1.4} routingDisabled>
    <chip
      name="Q1"
      cadModel={{
        stepUrl: "assets/real/TO-92_Inline.step",
        modelOriginPosition: { x: 1.27, y: 0, z: 0 },
        // Comparator-only pose; this is not a physical mounting example.
        rotationOffset: { x: 35, y: 25, z: 15 },
      }}
    />
  </board>
)
