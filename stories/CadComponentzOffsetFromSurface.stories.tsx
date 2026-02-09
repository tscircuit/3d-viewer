import "tscircuit"
import { CadViewer } from "src/CadViewer"

const pinLabels = {
  pin1: ["CSA"],
  pin2: ["Out1"],
  pin3: ["Out2"],
  pin4: ["VS"],
  pin5: ["IN1"],
  pin6: ["ENA"],
  pin7: ["IN2"],
  pin8: ["GND"],
  pin9: ["VLS"],
  pin10: ["IN3"],
  pin11: ["ENB"],
  pin12: ["IN4"],
  pin13: ["Out3"],
  pin14: ["Out4"],
  pin15: ["CSB"],
} as const

export const CadComponentzOffsetFromSurface = () => (
  <CadViewer>
    <board>
      <chip
        name="U1"
        pinLabels={pinLabels}
        supplierPartNumbers={{
          jlcpcb: ["C434589"],
        }}
        manufacturerPartNumber="L298N"
        footprint={
          <footprint>
            <platedhole
              portHints={["pin15"]}
              pcbX="8.8900000000001mm"
              pcbY="-2.5399999999999636mm"
              outerDiameter="1.9999959999999999mm"
              holeDiameter="1.3000228mm"
              shape="circle"
            />
            <platedhole
              portHints={["pin14"]}
              pcbX="7.620000000000118mm"
              pcbY="2.5400000000000773mm"
              outerDiameter="1.9999959999999999mm"
              holeDiameter="1.3000228mm"
              shape="circle"
            />
            <platedhole
              portHints={["pin13"]}
              pcbX="6.350000000000023mm"
              pcbY="-2.5399999999999636mm"
              outerDiameter="1.9999959999999999mm"
              holeDiameter="1.3000228mm"
              shape="circle"
            />
            <platedhole
              portHints={["pin12"]}
              pcbX="5.080000000000041mm"
              pcbY="2.5400000000000773mm"
              outerDiameter="1.9999959999999999mm"
              holeDiameter="1.3000228mm"
              shape="circle"
            />
            <platedhole
              portHints={["pin11"]}
              pcbX="3.810000000000059mm"
              pcbY="-2.5399999999999636mm"
              outerDiameter="1.9999959999999999mm"
              holeDiameter="1.3000228mm"
              shape="circle"
            />
            <platedhole
              portHints={["pin10"]}
              pcbX="2.5400000000000773mm"
              pcbY="2.5400000000000773mm"
              outerDiameter="1.9999959999999999mm"
              holeDiameter="1.3000228mm"
              shape="circle"
            />
            <platedhole
              portHints={["pin9"]}
              pcbX="1.2699999999999818mm"
              pcbY="-2.5399999999999636mm"
              outerDiameter="1.9999959999999999mm"
              holeDiameter="1.3000228mm"
              shape="circle"
            />
            <platedhole
              portHints={["pin8"]}
              pcbX="0mm"
              pcbY="2.5400000000000773mm"
              outerDiameter="1.9999959999999999mm"
              holeDiameter="1.3000228mm"
              shape="circle"
            />
            <platedhole
              portHints={["pin7"]}
              pcbX="-1.2699999999999818mm"
              pcbY="-2.5399999999999636mm"
              outerDiameter="1.9999959999999999mm"
              holeDiameter="1.3000228mm"
              shape="circle"
            />
            <platedhole
              portHints={["pin6"]}
              pcbX="-2.5399999999999636mm"
              pcbY="2.5400000000000773mm"
              outerDiameter="1.9999959999999999mm"
              holeDiameter="1.3000228mm"
              shape="circle"
            />
            <platedhole
              portHints={["pin5"]}
              pcbX="-3.8099999999999454mm"
              pcbY="-2.5399999999999636mm"
              outerDiameter="1.9999959999999999mm"
              holeDiameter="1.3000228mm"
              shape="circle"
            />
            <platedhole
              portHints={["pin4"]}
              pcbX="-5.079999999999927mm"
              pcbY="2.5400000000000773mm"
              outerDiameter="1.9999959999999999mm"
              holeDiameter="1.3000228mm"
              shape="circle"
            />
            <platedhole
              portHints={["pin3"]}
              pcbX="-6.350000000000023mm"
              pcbY="-2.5399999999999636mm"
              outerDiameter="1.9999959999999999mm"
              holeDiameter="1.3000228mm"
              shape="circle"
            />
            <platedhole
              portHints={["pin2"]}
              pcbX="-7.6200000000000045mm"
              pcbY="2.5400000000000773mm"
              outerDiameter="1.9999959999999999mm"
              holeDiameter="1.3000228mm"
              shape="circle"
            />
            <platedhole
              portHints={["pin1"]}
              pcbX="-8.889999999999986mm"
              pcbY="-2.5399999999999636mm"
              outerDiameter="1.9999959999999999mm"
              holeDiameter="1.3000228mm"
              shape="circle"
            />
            <silkscreenpath
              route={[
                { x: -9.799954999999954, y: 5.48995600000012 },
                { x: 9.799954999999954, y: 5.48995600000012 },
              ]}
            />
            <silkscreenpath
              route={[
                { x: -9.799954999999954, y: 2.089988200000107 },
                { x: -9.799954999999954, y: 7.089978200000132 },
              ]}
            />
            <silkscreenpath
              route={[
                { x: 9.799954999999954, y: 7.089978200000132 },
                { x: 9.799954999999954, y: 2.089988200000107 },
              ]}
            />
            <silkscreenpath
              route={[
                { x: -9.799954999999954, y: 7.089978200000132 },
                { x: 9.799954999999954, y: 7.089978200000132 },
              ]}
            />
            <silkscreenpath
              route={[
                { x: -8.8900000000001, y: -1.524000000000001 },
                { x: -8.8900000000001, y: 1.9539711999999554 },
              ]}
            />
            <silkscreenpath
              route={[
                { x: -6.307886799999892, y: 2.089988200000107 },
                { x: -6.307886799999892, y: -1.3100049999998191 },
              ]}
            />
            <silkscreenpath
              route={[
                { x: -3.818686800000023, y: 2.089988200000107 },
                { x: -3.818686800000023, y: -1.3100049999998191 },
              ]}
            />
            <silkscreenpath
              route={[
                { x: -1.2786868000000595, y: 2.089988200000107 },
                { x: -1.2786868000000595, y: -1.3100049999998191 },
              ]}
            />
            <silkscreenpath
              route={[
                { x: 1.2866877999999815, y: 2.089988200000107 },
                { x: 1.2866877999999815, y: -1.3100049999998191 },
              ]}
            />
            <silkscreenpath
              route={[
                { x: 3.826687800000059, y: 2.089988200000107 },
                { x: 3.826687800000059, y: -1.3100049999998191 },
              ]}
            />
            <silkscreenpath
              route={[
                { x: 6.341313200000059, y: 2.089988200000107 },
                { x: 6.341313200000059, y: -1.3100049999998191 },
              ]}
            />
            <silkscreenpath
              route={[
                { x: 8.932113200000003, y: 2.089988200000107 },
                { x: 8.932113200000003, y: -1.3100049999998191 },
              ]}
            />
            <silkscreenpath
              route={[
                { x: 9.799954999999954, y: 2.089988200000107 },
                { x: 8.765743200000088, y: 2.089988200000107 },
              ]}
            />
            <silkscreenpath
              route={[
                { x: 6.474256800000035, y: 2.089988200000107 },
                { x: 6.225743200000011, y: 2.089988200000107 },
              ]}
            />
            <silkscreenpath
              route={[
                { x: 3.9342567999999574, y: 2.089988200000107 },
                { x: 3.6857431999999335, y: 2.089988200000107 },
              ]}
            />
            <silkscreenpath
              route={[
                { x: 1.3942568000001074, y: 2.089988200000107 },
                { x: 1.1457432000000836, y: 2.089988200000107 },
              ]}
            />
            <silkscreenpath
              route={[
                { x: -1.1457431999999699, y: 2.089988200000107 },
                { x: -1.3942567999999937, y: 2.089988200000107 },
              ]}
            />
            <silkscreenpath
              route={[
                { x: -3.685743200000047, y: 2.089988200000107 },
                { x: -3.9342567999999574, y: 2.089988200000107 },
              ]}
            />
            <silkscreenpath
              route={[
                { x: -6.225743199999897, y: 2.089988200000107 },
                { x: -6.474256799999921, y: 2.089988200000107 },
              ]}
            />
            <silkscreenpath
              route={[
                { x: -8.765743199999974, y: 2.089988200000107 },
                { x: -9.799954999999954, y: 2.089988200000107 },
              ]}
            />
          </footprint>
        }
        cadModel={{
          objUrl:
            "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=89c73df5b23b4905a2b0574d75ba4d41&pn=C434589",
          rotationOffset: { x: 0, y: 0, z: 0 },
          positionOffset: { x: 0, y: 0, z: 3.8 },
        }}
      />
    </board>
  </CadViewer>
)

CadComponentzOffsetFromSurface.storyName = "CAD Component zOffsetFromSurface"

export default {
  title: "CadComponent/zOffsetFromSurface",
}
