import { m2InsertionHeight } from "../m2"
import { M2SocketFootprint } from "../m2-socket-footprint"

export default () => (
  <board width={36} height={30} thickness={1.4} routingDisabled>
    <chip
      name="SOCKET1"
      manufacturerPartNumber="MDT350M01401VT"
      footprint={<M2SocketFootprint />}
      cadModel={{
        stepUrl: "assets/amphenol/MDT350M01401VT.stp",
        modelBoardNormalDirection: "y+",
        modelOriginPosition: { x: 0, y: 0, z: 0 },
        rotationOffset: { x: 0, y: 0, z: 90 },
      }}
    />
    <chip
      name="CARD1"
      cadModel={{
        glbUrl: "generated/m2-daughtercard.glb",
        // The Y-up export maps the insertion edge P=(-12,0,0) to G=(12,0,0).
        modelBoardNormalDirection: "y+",
        modelOriginPosition: { x: 12, y: 0, z: 0 },
        rotationOffset: { x: 0, y: 90, z: 0 },
        positionOffset: { x: 0, y: 0, z: m2InsertionHeight },
      }}
    />
    <resistor name="R1" resistance="1k" footprint="0805" pcbX={10} pcbY={-8} />
  </board>
)
