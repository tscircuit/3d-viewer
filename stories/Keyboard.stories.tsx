import { fn } from "@storybook/test"
import { CadViewer } from "src/CadViewer"

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

export const Default = () => (
  <CadViewer>
    <board width="20mm" height="20mm">
      <resistor name="R1" resistance="1k" pcbY={8} footprint="0402" />
      <KeyswitchSocket name="SW1" layer="bottom" pcbX={0} pcbY={0} />
    </board>
  </CadViewer>
)

export default {
  title: "Keyboard",
  component: Default,
}
