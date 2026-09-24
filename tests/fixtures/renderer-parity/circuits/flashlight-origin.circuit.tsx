import { FlashlightUsbC } from "../real-parts/flashlight-parts"

export default function FlashlightOriginCircuit() {
  return (
    <board width={12} height={30} thickness={1.4}>
      <FlashlightUsbC
        name="J1"
        pcbX={0}
        pcbY={-10.7874994}
        pcbRotation={0}
        cadModel={{
          objUrl: "assets/real/flashlight-usb.obj",
          // The captured part's CAD anchor is 2.5 mm below its PCB center.
          positionOffset: { x: 0, y: -2.5, z: 0 },
          rotationOffset: { x: 0, y: 0, z: 180 },
        }}
      />
      <pushbutton
        name="SW1"
        footprint="pushbutton_id1.3mm_od2mm"
        supplierPartNumbers={{ jlcpcb: ["C110153"] }}
        pcbX={0}
        pcbY={0}
        pcbRotation={90}
      />
      <resistor
        name="R1"
        resistance="1k"
        footprint="res0603"
        pcbX={0}
        pcbY={7}
      />
      <led name="D1" color="red" footprint="0603" pcbX={0} pcbY={12} />
    </board>
  )
}
