import { CadViewer } from "src/CadViewer"

export const EmptyBoard = () => {
  return (
    <CadViewer>
      <board width="0" height="0"></board>
    </CadViewer>
  )
}

export default {
  title: "EmptyBoard",
  component: EmptyBoard,
}
