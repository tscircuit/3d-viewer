// Keep the styles in the JS bundle so embedders don't need a separate CSS import.
export const explosionControlStyles = `
.tscircuit-explosion-control {
  position: absolute;
  inset: auto auto 12px 12px;
  box-sizing: border-box;
  width: 304px;
  max-width: calc(100% - 24px);
  max-height: calc(100% - 24px);
  overflow: auto;
  padding: 8px 12px 10px;
  border: 1px solid #3a404b;
  border-radius: 10px;
  background: #20242c;
  box-shadow: 0 6px 20px #0003;
  color: #f1f4f8;
  color-scheme: dark;
  font: 13px/1.4 system-ui, sans-serif;
  overflow-wrap: anywhere;
}
.tscircuit-explosion-control .explosion-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.tscircuit-explosion-control strong { font-weight: 650; }
.tscircuit-explosion-control .explosion-stage {
  margin-top: 3px;
  color: #bbc4d2;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.tscircuit-explosion-control .explosion-stage span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tscircuit-explosion-control .explosion-stage span:last-child { flex-shrink: 0; }
.tscircuit-explosion-control input[type="range"] {
  display: block;
  box-sizing: border-box;
  width: 100%;
  height: 22px;
  margin: 0;
  padding: 0;
  accent-color: #97c3ff;
  cursor: pointer;
}
.tscircuit-explosion-control .explosion-transport {
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 2px;
}
.tscircuit-explosion-control button {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 32px;
  min-height: 30px;
  margin: 0;
  padding: 0 4px;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.tscircuit-explosion-control button:hover:not(:disabled) { background: #363e4a; }
.tscircuit-explosion-control button:disabled { opacity: .42; cursor: default; }
.tscircuit-explosion-control button[aria-pressed="true"] {
  border-color: #617b9a;
  color: #b2d5ff;
}
.tscircuit-explosion-control .explosion-play {
  width: 80px;
  background: #c9ddfa;
  color: #17283e;
  font-weight: 650;
}
.tscircuit-explosion-control .explosion-play:hover:not(:disabled) { background: #e3eeff; }
.tscircuit-explosion-control .explosion-reset { margin-left: auto; }
.tscircuit-explosion-control .explosion-settings {
  flex-wrap: wrap;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #3a404b;
  color: #bbc4d2;
  font-size: 12px;
}
.tscircuit-explosion-control .explosion-settings label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  cursor: pointer;
}
.tscircuit-explosion-control input[type="checkbox"] {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: #97c3ff;
  cursor: pointer;
}
.tscircuit-explosion-control .explosion-duration { margin-left: auto; }
.tscircuit-explosion-control input[type="number"] {
  box-sizing: border-box;
  width: 54px;
  height: 26px;
  margin: 0;
  padding: 0 5px;
  border: 1px solid #596473;
  border-radius: 5px;
  background: #171b22;
  color: #f1f4f8;
  font: inherit;
  font-variant-numeric: tabular-nums;
}
.tscircuit-explosion-control :is(button, input):focus-visible {
  outline: 2px solid #97c3ff;
  outline-offset: 2px;
}
.tscircuit-explosion-control input[type="range"]:focus-visible { outline-offset: -1px; }
`
