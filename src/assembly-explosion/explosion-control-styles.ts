// Keep the styles in the JS bundle so embedders don't need a separate CSS import.
export const explosionControlStyles = `
.tscircuit-explosion-control {
  position: absolute;
  bottom: 12px;
  left: 12px;
  box-sizing: border-box;
  width: 344px;
  max-width: calc(100% - 24px);
  max-height: calc(100% - 24px);
  overflow: auto;
  padding: 4px 8px 6px;
  border: 1px solid #555;
  border-radius: 6px;
  background: #262626;
  color: #f2f2f2;
  color-scheme: dark;
  accent-color: #ddd;
  font: 13px/1.4 system-ui, sans-serif;
  overflow-wrap: anywhere;
}
.tscircuit-explosion-control .explosion-row,
.tscircuit-explosion-control label {
  display: flex;
  align-items: center;
  gap: 4px;
}
.tscircuit-explosion-control strong { white-space: nowrap; }
.tscircuit-explosion-control .explosion-stage {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
  color: #c6c6c6;
  font-size: 12px;
}
.tscircuit-explosion-control .explosion-toolbar {
  justify-content: space-between;
  flex-wrap: wrap;
}
.tscircuit-explosion-control .explosion-toolbar > [role="group"] { gap: 1px; }
.tscircuit-explosion-control .explosion-settings {
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
}
.tscircuit-explosion-control input[type="range"] {
  display: block;
  width: 100%;
  height: 20px;
  margin: 0;
  padding: 0;
  cursor: pointer;
}
.tscircuit-explosion-control button {
  display: grid;
  flex: none;
  place-items: center;
  width: 26px;
  height: 26px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.tscircuit-explosion-control button:hover:not(:disabled),
.tscircuit-explosion-control button[aria-pressed="true"] { background: #444; }
.tscircuit-explosion-control button:disabled { opacity: .4; cursor: default; }
.tscircuit-explosion-control label { white-space: nowrap; cursor: pointer; }
.tscircuit-explosion-control input[type="checkbox"] { margin: 0; cursor: pointer; }
.tscircuit-explosion-control input[type="number"] {
  box-sizing: border-box;
  width: 44px;
  height: 24px;
  margin: 0;
  padding: 0 4px;
  border: 1px solid #656565;
  border-radius: 4px;
  background: #1c1c1c;
  color: inherit;
  font: inherit;
}
.tscircuit-explosion-control :is(button, input):focus-visible {
  outline: 1px solid #fff;
  outline-offset: 1px;
}
.tscircuit-explosion-control input[type="range"]:focus-visible { outline-offset: -1px; }
`
