import { m2EvenPins, m2OddPins } from "./m2"

const SignalLand = ({ pin, x, y }: { pin: number; x: number; y: number }) => (
  <smtpad
    portHints={[`pin${pin}`]}
    layer="top"
    shape="rect"
    width={1.375}
    height={0.3}
    pcbX={x}
    pcbY={y}
  />
)

// Recommended PCB layout, MDT350X01401VT rev 2 (M key), rotated so
// native X runs along carrier +Y and native Z along carrier +X.
export const M2SocketFootprint = () => (
  <footprint>
    {m2OddPins.map((pin) => (
      <SignalLand
        key={pin}
        pin={pin}
        x={1.3125}
        y={9.25 - ((pin - 1) / 2) * 0.5}
      />
    ))}
    {m2EvenPins.map((pin) => (
      <SignalLand
        key={pin}
        pin={pin}
        x={-1.3125}
        y={9 - ((pin - 2) / 2) * 0.5}
      />
    ))}
    <smtpad
      portHints={["mount1"]}
      layer="top"
      shape="rect"
      width={2.75}
      height={1.2}
      pcbX={0.55}
      pcbY={-11.45}
    />
    <smtpad
      portHints={["mount2"]}
      layer="top"
      shape="rect"
      width={2.75}
      height={1.2}
      pcbX={0.55}
      pcbY={11.45}
    />
    <hole diameter={1.6} pcbX={0} pcbY={-10} />
    <hole diameter={1.1} pcbX={0} pcbY={10} />
  </footprint>
)
