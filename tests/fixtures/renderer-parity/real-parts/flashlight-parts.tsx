import type { ChipProps } from "tscircuit"

// C165948 / TYPE-C-31-M-12, recovered from policy/flashlight.circuit.json.
// Coordinates are local to its PCB bounds center, not its offset CAD anchor.
const usbContacts = [
  { pin: "pin1", label: "A1", signal: "GND1", x: -3.350006 },
  { pin: "pin2", label: "B12", signal: "GND2", x: -3.050032 },
  { pin: "pin3", label: "A4", signal: "VBUS1", x: -2.549906 },
  { pin: "pin4", label: "B9", signal: "VBUS2", x: -2.249932 },
  { pin: "pin5", label: "B8", signal: "SBU2", x: -1.75006 },
  { pin: "pin6", label: "A5", signal: "CC1", x: -1.249934 },
  { pin: "pin7", label: "B7", signal: "DM2", x: -0.750062 },
  { pin: "pin8", label: "A6", signal: "DP1", x: -0.249936 },
  { pin: "pin9", label: "A7", signal: "DM1", x: 0.249936 },
  { pin: "pin10", label: "B6", signal: "DP2", x: 0.750062 },
  { pin: "pin11", label: "A8", signal: "SBU1", x: 1.24968 },
  { pin: "pin12", label: "B5", signal: "CC2", x: 1.75006 },
  { pin: "pin13", label: "A9", signal: "VBUS1", x: 2.55016 },
  { pin: "pin14", label: "B4", signal: "VBUS2", x: 2.249932 },
  { pin: "pin15", label: "A12", signal: "GND1", x: 3.350006 },
  { pin: "pin16", label: "B1", signal: "GND2", x: 3.050032 },
] as const

function UsbContactPad({ pin, label, x }: (typeof usbContacts)[number]) {
  return (
    <smtpad
      portHints={[pin, label]}
      pcbX={x}
      pcbY={2.73658645}
      layer="top"
      shape="rect"
      width={0.2999994}
      height={1.2999974}
    />
  )
}

export function FlashlightUsbCFootprint() {
  return (
    <footprint>
      {usbContacts.map((contact) => (
        <UsbContactPad key={contact.pin} {...contact} />
      ))}
      <platedhole
        pcbX={4.325112}
        pcbY={-2.48658695}
        shape="pill"
        outerWidth={1.1999976}
        outerHeight={1.7999964}
        holeWidth={0.7999984}
        holeHeight={1.3999972}
      />
      <platedhole
        pcbX={4.325112}
        pcbY={1.69323705}
        shape="pill"
        outerWidth={1.1999976}
        outerHeight={1.999996}
        holeWidth={0.7999984}
        holeHeight={1.5999968}
      />
      <platedhole
        pcbX={-4.325112}
        pcbY={1.69323705}
        shape="pill"
        outerWidth={1.1999976}
        outerHeight={1.999996}
        holeWidth={0.7999984}
        holeHeight={1.5999968}
      />
      <platedhole
        pcbX={-4.325112}
        pcbY={-2.48658695}
        shape="pill"
        outerWidth={1.1999976}
        outerHeight={1.7999964}
        holeWidth={0.7999984}
        holeHeight={1.3999972}
      />
      <hole pcbX={-2.899918} pcbY={1.46811045} diameter={0.7500112} />
      <hole pcbX={2.899918} pcbY={1.46811045} diameter={0.7500112} />
    </footprint>
  )
}

export function FlashlightUsbC(
  props: Pick<ChipProps, "name" | "pcbX" | "pcbY" | "pcbRotation" | "cadModel">,
) {
  return (
    <chip
      {...props}
      manufacturerPartNumber="TYPE-C-31-M-12"
      supplierPartNumbers={{ jlcpcb: ["C165948"] }}
      pinLabels={Object.fromEntries(
        usbContacts.map(({ pin, label, signal }) => [pin, [signal, label]]),
      )}
      internallyConnectedPins={[
        ["pin1", "pin15"],
        ["pin2", "pin16"],
        ["pin3", "pin13"],
        ["pin4", "pin14"],
      ]}
      footprint={<FlashlightUsbCFootprint />}
    />
  )
}
