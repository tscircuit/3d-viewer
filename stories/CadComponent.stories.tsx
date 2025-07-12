import { CadViewer } from "src/CadViewer"

export const Default = () => (
  <CadViewer>
    <board width={20} height={20}>
      <chip
        name="U1"
        footprint={"ssop24_p0.65_pw0.5_pl0.8_w8"}
        cadModel={{
          objUrl: "/easyeda-models/47443b588a77418ba6b4ea51975c36c0",
        }}
      />
    </board>
  </CadViewer>
)

export const BottomLayer = () => (
  <CadViewer>
    <board width={20} height={20}>
      <chip
        name="U1"
        layer={"bottom"}
        footprint={"ssop24_p0.65_pw0.5_pl0.8_w8"}
        cadModel={{
          objUrl: "/easyeda-models/47443b588a77418ba6b4ea51975c36c0",
        }}
      />
    </board>
  </CadViewer>
)

export const SSOPRotated = () => (
  <CadViewer>
    <board width={20} height={20}>
      <chip
        name="U1"
        pcbRotation={90}
        footprint={"ssop24_p0.65_pw0.5_pl0.8_w8"}
        cadModel={{
          objUrl: "/easyeda-models/47443b588a77418ba6b4ea51975c36c0",
        }}
      />
    </board>
  </CadViewer>
)

export default {
  title: "CadComponent",
  component: Default,
}
