import { CadViewer } from "src/CadViewer"

export const WithoutBoard = () => {
  return (
    <CadViewer>
      <chip name="chip1" />
    </CadViewer>
  )
}

export default {
  title: "WithoutBoard",
  component: WithoutBoard,
}
