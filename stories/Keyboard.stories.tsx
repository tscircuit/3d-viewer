import { fn } from "@storybook/test"
import { CadViewer } from "src/CadViewer"
import keyboard60 from "./assets/keyboard-default60.json"
import nineKeyKeyboard from "./assets/nine-key-keyboard.json"
import { ManifoldViewer } from "src"

/**
 * A switch shaft you can use to connect a pluggable Kailh socket.
 *
 * Datasheet: https://wmsc.lcsc.com/wmsc/upload/file/pdf/v2/lcsc/2211090930_Kailh-CPG151101S11-1_C5184526.pdf
 */
export const KeyswitchSocket = (props: {
  name: string
  pcbX?: number
  pcbY?: number
  layer?: "top" | "bottom"
}) => (
  <chip
    {...props}
    cadModel={{
      objUrl: "/easyeda/C5184526",
    }}
    footprint={
      <footprint>
        {/* <silkscreentext text={props.name} /> */}
        <smtpad
          shape="rect"
          width="2.55mm"
          height="2.5mm"
          portHints={["pin1"]}
          layer="top"
        />
        <smtpad
          shape="rect"
          width="2.55mm"
          height="2.5mm"
          portHints={["pin2"]}
          layer="top"
        />
        <hole name="H1" diameter="3mm" />
        <hole name="H2" diameter="3mm" />
        <constraint xDist="6.35mm" centerToCenter left=".H1" right=".H2" />
        <constraint yDist="2.54mm" centerToCenter top=".H1" bottom=".H2" />
        <constraint edgeToEdge xDist="11.3mm" left=".pin1" right=".pin2" />
        <constraint sameY for={[".pin1", ".H1"]} />
        <constraint sameY for={[".pin2", ".H2"]} />
        <constraint
          edgeToEdge
          xDist={(11.3 - 6.35 - 3) / 2}
          left=".pin1"
          right=".H1"
        />
      </footprint>
    }
  />
)

/**
 * Keyswitch (Brown)
 *
 * https://www.lcsc.com/datasheet/lcsc_datasheet_1912111437_Kailh-CPG1511F01S03_C400227.pdf
 */
const Keyswitch = (props: { name: string; pcbX?: number; pcbY?: number }) => {
  return (
    <chip
      {...props}
      cadModel={{
        objUrl: "/easyeda/C400227",
        rotationOffset: { x: 180, y: 0, z: -90 },
      }}
      footprint={
        <footprint>
          <smtpad
            shape="rect"
            width="0.1mm"
            height="0.1mm"
            portHints={["pin1"]}
            layer="top"
          />
          <hole diameter={2.5} pcbX={0} pcbY={0} />
        </footprint>
      }
    />
  )
}

export const Default = () => (
  <ManifoldViewer circuitJson={nineKeyKeyboard as any} />
)

export const Default60 = () => <ManifoldViewer circuitJson={keyboard60} />

export default {
  title: "Keyboard",
  component: Default,
}
