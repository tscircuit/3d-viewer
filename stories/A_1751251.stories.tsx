import "tscircuit"
import { CadViewer } from "src/CadViewer"

const objUrl =
  "https://modelcdn.tscircuit.com/easyeda_models/assets/C91152.obj?uuid=0b4d57e4edc5417eb4c2c3fd5c88e90f"
const stepUrl =
  "https://modelcdn.tscircuit.com/easyeda_models/assets/C91152.step?uuid=0b4d57e4edc5417eb4c2c3fd5c88e90f"

export const A_1751251 = () => (
  <CadViewer>
    <board width="16mm" height="12mm">
      <chip
        name="A_1751251"
        footprint={
          <footprint>
            <platedhole
              portHints={["pin1"]}
              pcbX="-3.50012mm"
              pcbY="0mm"
              outerDiameter="2.1999956mm"
              holeDiameter="1.400048mm"
              shape="circle"
            />
            <platedhole
              portHints={["pin2"]}
              pcbX="0mm"
              pcbY="0mm"
              outerDiameter="2.1999956mm"
              holeDiameter="1.400048mm"
              shape="circle"
            />
            <platedhole
              portHints={["pin3"]}
              pcbX="3.50012mm"
              pcbY="0mm"
              outerDiameter="2.1999956mm"
              holeDiameter="1.400048mm"
              shape="circle"
            />
          </footprint>
        }
        cadModel={{
          objUrl,
          stepUrl,
          pcbRotationOffset: 0,
          modelOriginPosition: {
            x: 3.5,
            y: 0.000012700000070253736,
            z: -4.250007,
          },
        }}
      />
    </board>
  </CadViewer>
)

A_1751251.storyName = "A_1751251 Color Preservation"

export default {
  title: "Bugs/Embedded OBJ Material Colors",
}
