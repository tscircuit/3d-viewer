import { useLayerVisibility } from "../contexts/LayerVisibilityContext"

export const AppearanceMenu = () => {
  const { visibility, toggleLayer } = useLayerVisibility()

  return (
    <>
      <div
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          margin: "8px 0",
        }}
      />
      <div
        style={{
          padding: "8px 18px",
          fontSize: 13,
          color: "#a0a0a0",
          fontWeight: 600,
        }}
      >
        Appearance
      </div>
      <div
        style={{
          padding: "8px 18px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "#f5f6fa",
          fontWeight: 400,
          fontSize: 14,
          transition: "background 0.1s",
        }}
        onClick={() => toggleLayer("boardBody")}
        onMouseOver={(e) => (e.currentTarget.style.background = "#2d313a")}
        onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span style={{ width: 20 }}>{visibility.boardBody ? "✔" : ""}</span>
        Board Body
      </div>
      <div
        style={{
          padding: "8px 18px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "#f5f6fa",
          fontWeight: 400,
          fontSize: 14,
          transition: "background 0.1s",
        }}
        onClick={() => toggleLayer("topCopper")}
        onMouseOver={(e) => (e.currentTarget.style.background = "#2d313a")}
        onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span style={{ width: 20 }}>{visibility.topCopper ? "✔" : ""}</span>
        F.Cu
      </div>
      <div
        style={{
          padding: "8px 18px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "#f5f6fa",
          fontWeight: 400,
          fontSize: 14,
          transition: "background 0.1s",
        }}
        onClick={() => toggleLayer("bottomCopper")}
        onMouseOver={(e) => (e.currentTarget.style.background = "#2d313a")}
        onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span style={{ width: 20 }}>{visibility.bottomCopper ? "✔" : ""}</span>
        B.Cu
      </div>
      <div
        style={{
          padding: "8px 18px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "#f5f6fa",
          fontWeight: 400,
          fontSize: 14,
          transition: "background 0.1s",
        }}
        onClick={() => toggleLayer("topSilkscreen")}
        onMouseOver={(e) => (e.currentTarget.style.background = "#2d313a")}
        onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span style={{ width: 20 }}>{visibility.topSilkscreen ? "✔" : ""}</span>
        F.Silkscreen
      </div>
      <div
        style={{
          padding: "8px 18px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "#f5f6fa",
          fontWeight: 400,
          fontSize: 14,
          transition: "background 0.1s",
        }}
        onClick={() => toggleLayer("bottomSilkscreen")}
        onMouseOver={(e) => (e.currentTarget.style.background = "#2d313a")}
        onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span style={{ width: 20 }}>
          {visibility.bottomSilkscreen ? "✔" : ""}
        </span>
        B.Silkscreen
      </div>
      <div
        style={{
          padding: "8px 18px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "#f5f6fa",
          fontWeight: 400,
          fontSize: 14,
          transition: "background 0.1s",
        }}
        onClick={() => toggleLayer("smtModels")}
        onMouseOver={(e) => (e.currentTarget.style.background = "#2d313a")}
        onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span style={{ width: 20 }}>{visibility.smtModels ? "✔" : ""}</span>
        SMT Models
      </div>
    </>
  )
}
