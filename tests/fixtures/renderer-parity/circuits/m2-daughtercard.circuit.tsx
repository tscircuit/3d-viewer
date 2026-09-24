import { EllipseCurve } from "three"
import { m2EvenPins, m2OddPins } from "../m2"

const keyNotch = [
  { x: -12.1, y: 5.525 },
  ...new EllipseCurve(-9.1, 6.125, 0.6, 0.6, -Math.PI / 2, Math.PI / 2)
    .getPoints(16)
    .map(({ x, y }) => ({ x, y })),
  { x: -12.1, y: 6.725 },
]

const EdgeContact = ({
  pin,
  layer,
  y,
}: {
  pin: number
  layer: "top" | "bottom"
  y: number
}) => (
  <smtpad
    portHints={[`pin${pin}`]}
    layer={layer}
    shape="rect"
    width={1.5}
    height={0.35}
    pcbX={-10.75}
    pcbY={y}
  />
)

// Mechanical coupon, not an electrically functional M.2 module.
// GS-12-1248 pp.8-9: 19.85-wide tongue, 0.8 thickness,
// 0.35-wide contacts at 0.50 pitch, 1.20-wide x 3.50-deep key slot.
// R0.60 notch root follows the full-radius detail. The 0.50 leading inset
// is below the 0.55 maximum; the 2.00 rear edge follows the reference card
// footprint in m2.ts, not the unrelated 3.50 notch-depth dimension.
// Square shoulders and the omitted thickness bevel remain simplifications.
export default () => (
  <board
    width={24}
    height={22}
    thickness={0.8}
    solderMaskColor="blue"
    routingDisabled
    schematicDisabled
    outline={[
      { x: -12, y: -9.925 },
      { x: -8.5, y: -9.925 },
      { x: -8.5, y: -11 },
      { x: 12, y: -11 },
      { x: 12, y: 11 },
      { x: -8.5, y: 11 },
      { x: -8.5, y: 9.925 },
      { x: -12, y: 9.925 },
    ]}
  >
    <cutout shape="polygon" points={keyNotch} />
    <chip
      name="EDGE1"
      cadModel={null}
      footprint={
        <footprint>
          {m2OddPins.map((pin) => (
            <EdgeContact
              key={pin}
              pin={pin}
              layer="top"
              y={-9.25 + ((pin - 1) / 2) * 0.5}
            />
          ))}
          {m2EvenPins.map((pin) => (
            <EdgeContact
              key={pin}
              pin={pin}
              layer="bottom"
              y={-9 + ((pin - 2) / 2) * 0.5}
            />
          ))}
        </footprint>
      }
    />
    <chip name="U1" footprint="soic8" pcbX={2} pcbY={2} />
    <resistor name="R1" resistance="1k" footprint="0805" pcbX={6} pcbY={-6} />
    <silkscreentext text="M KEY / 0.8mm" pcbX={6} pcbY={6} fontSize={1} />
  </board>
)
