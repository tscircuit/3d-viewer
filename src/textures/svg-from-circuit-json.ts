import type {
  AnyCircuitElement,
  PcbBoard,
  PcbTrace,
  PcbVia,
  PcbPlatedHole,
} from "circuit-json";
import { su, getElementRenderLayers } from "@tscircuit/circuit-json-util";
import { splitTraceIntoLayerSegments } from "../utils/trace-layer-segments";
import { colors as defaultColors } from "../geoms/constants";

export interface SvgFromCircuitJsonOptions {
  circuitJson: AnyCircuitElement[];
  boardData: PcbBoard;
  layer: "top" | "bottom";
  width: number;
  height: number;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  };
  colors?: {
    copper?: string;
    silkscreen?: string;
    soldermask?: string;
    substrate?: string;
  };
}

/**
 * Creates an SVG representation of a PCB layer from circuit JSON.
 * This generates high-quality vector graphics suitable for resvg-wasm rendering.
 */
export function createSvgFromCircuitJson(
  options: SvgFromCircuitJsonOptions,
): string {
  const {
    circuitJson,
    boardData,
    layer,
    width,
    height,
    bounds,
    colors: colorOverrides,
  } = options;

  const copperColor = colorOverrides?.copper ?? toHex(defaultColors.copper);
  const silkscreenColor = colorOverrides?.silkscreen ?? "#FFFFFF";
  const soldermaskColor =
    colorOverrides?.soldermask ?? toHex(defaultColors.fr4SolderMaskGreen);
  const substrateColor =
    colorOverrides?.substrate ?? toHex(defaultColors.fr4Tan);

  const pcbRenderLayer = layer === "top" ? "top_copper" : "bottom_copper";
  const silkscreenLayer = layer === "top" ? "top" : "bottom";

  // Get elements
  const pcbTraces = su(circuitJson).pcb_trace.list();
  const pcbVias = su(circuitJson).pcb_via.list();
  const pcbPlatedHoles = su(circuitJson).pcb_plated_hole.list();
  const pcbSmtPads = su(circuitJson).pcb_smtpad.list();
  const pcbHoles = su(circuitJson).pcb_hole.list();

  // Filter by layer
  const tracesOnLayer = pcbTraces.flatMap((trace) =>
    getElementRenderLayers(trace).includes(pcbRenderLayer)
      ? splitTraceIntoLayerSegments(trace, layer)
      : [],
  );

  const platedHolesOnLayer = pcbPlatedHoles.filter((hole: PcbPlatedHole) =>
    hole.layers.includes(layer),
  );

  const smtPadsOnLayer = pcbSmtPads.filter((pad) => pad.layer === layer);

  const silkscreenElements = circuitJson.filter((element) => {
    const elementType = element.type as string;
    return (
      elementType.startsWith("pcb_silkscreen_") &&
      "layer" in element &&
      element.layer === layer
    );
  });

  // Calculate scale
  const scaleX = width / bounds.width;
  const scaleY = height / bounds.height;

  // SVG coordinate transform: flip Y axis for PCB coordinates (Y up) to SVG (Y down)
  const transformX = (x: number) => (x - bounds.minX) * scaleX;
  const transformY = (y: number) => height - (y - bounds.minY) * scaleY;

  const svgParts: string[] = [];

  // SVG header
  svgParts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  );

  // Background (soldermask/substrate)
  if (boardData.outline && boardData.outline.length > 0) {
    // Draw board outline with soldermask color
    const outlinePath = createOutlinePath(
      boardData.outline,
      transformX,
      transformY,
    );
    svgParts.push(
      `  <path d="${outlinePath}" fill="${soldermaskColor}" stroke="none" />`,
    );
  } else {
    // Rectangular board
    const rectX = transformX(bounds.minX);
    const rectY = transformY(bounds.maxY);
    const rectW = bounds.width * scaleX;
    const rectH = bounds.height * scaleY;
    svgParts.push(
      `  <rect x="${rectX}" y="${rectY}" width="${rectW}" height="${rectH}" fill="${soldermaskColor}" />`,
    );
  }

  // Draw copper elements (traces, pads, plated holes)
  svgParts.push(`  <g fill="${copperColor}" stroke="${copperColor}">`);

  // Traces
  for (const trace of tracesOnLayer) {
    if (trace.route.length >= 2) {
      const path = createTracePath(trace.route, transformX, transformY);
      // Get width from first route point (only wire points have width)
      const firstPoint = trace.route[0];
      const strokeWidth =
        (firstPoint?.route_type === "wire" ? (firstPoint as any).width : 0.1) *
        Math.min(scaleX, scaleY);
      svgParts.push(
        `    <path d="${path}" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`,
      );
    }
  }

  // SMT Pads
  for (const pad of smtPadsOnLayer) {
    if (pad.shape === "rect" || pad.shape === "circle") {
      const cx = transformX(pad.x);
      const cy = transformY(pad.y);
      if (pad.shape === "rect" && pad.width && pad.height) {
        const w = pad.width * scaleX;
        const h = pad.height * scaleY;
        const x = cx - w / 2;
        const y = cy - h / 2;
        svgParts.push(
          `    <rect x="${x}" y="${y}" width="${w}" height="${h}" />`,
        );
      } else if (pad.shape === "circle" && pad.radius) {
        const r = pad.radius * Math.min(scaleX, scaleY);
        svgParts.push(`    <circle cx="${cx}" cy="${cy}" r="${r}" />`);
      }
    }
  }

  // Plated holes on this layer
  for (const hole of platedHolesOnLayer) {
    const cx = transformX(hole.x);
    const cy = transformY(hole.y);
    if (hole.shape === "circle") {
      const outerR = (hole.outer_diameter / 2) * Math.min(scaleX, scaleY);
      const innerR = (hole.hole_diameter / 2) * Math.min(scaleX, scaleY);
      // Draw ring for plated hole
      svgParts.push(`    <circle cx="${cx}" cy="${cy}" r="${outerR}" />`);
    } else if (hole.shape === "oval" || hole.shape === "pill") {
      // Simplified oval/pill rendering
      const outerWidth = (hole.outer_width ?? 1.0) * Math.min(scaleX, scaleY);
      const outerHeight = (hole.outer_height ?? 1.0) * Math.min(scaleX, scaleY);
      const rx = outerWidth / 2;
      const ry = outerHeight / 2;
      svgParts.push(
        `    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" />`,
      );
    }
  }

  // Vias
  for (const via of pcbVias) {
    const cx = transformX(via.x);
    const cy = transformY(via.y);
    const outerR = (via.outer_diameter / 2) * Math.min(scaleX, scaleY);
    svgParts.push(`    <circle cx="${cx}" cy="${cy}" r="${outerR}" />`);
  }

  svgParts.push("  </g>");

  // Draw silkscreen elements
  if (silkscreenElements.length > 0) {
    svgParts.push(
      `  <g fill="${silkscreenColor}" stroke="${silkscreenColor}">`,
    );

    for (const element of silkscreenElements) {
      const elementType = element.type as string;

      if (elementType === "pcb_silkscreen_line") {
        const line = element as any;
        const x1 = transformX(line.x1);
        const y1 = transformY(line.y1);
        const x2 = transformX(line.x2);
        const y2 = transformY(line.y2);
        const strokeWidth =
          (line.stroke_width ?? 0.1) * Math.min(scaleX, scaleY);
        svgParts.push(
          `    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${strokeWidth}" />`,
        );
      } else if (elementType === "pcb_silkscreen_rect") {
        const rect = element as any;
        const cx = transformX(rect.center?.x ?? rect.x);
        const cy = transformY(rect.center?.y ?? rect.y);
        const w = (rect.width ?? 1) * scaleX;
        const h = (rect.height ?? 1) * scaleY;
        const x = cx - w / 2;
        const y = cy - h / 2;
        const strokeWidth =
          (rect.stroke_width ?? 0.1) * Math.min(scaleX, scaleY);
        svgParts.push(
          `    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke-width="${strokeWidth}" />`,
        );
      } else if (elementType === "pcb_silkscreen_circle") {
        const circle = element as any;
        const cx = transformX(circle.center?.x ?? circle.x);
        const cy = transformY(circle.center?.y ?? circle.y);
        const r = (circle.radius ?? 0.5) * Math.min(scaleX, scaleY);
        const strokeWidth =
          (circle.stroke_width ?? 0.1) * Math.min(scaleX, scaleY);
        svgParts.push(
          `    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke-width="${strokeWidth}" />`,
        );
      } else if (elementType === "pcb_silkscreen_path") {
        const path = element as any;
        if (path.route?.length >= 2) {
          const d = createTracePath(path.route, transformX, transformY);
          const strokeWidth =
            (path.stroke_width ?? 0.1) * Math.min(scaleX, scaleY);
          svgParts.push(
            `    <path d="${d}" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`,
          );
        }
      } else if (elementType === "pcb_silkscreen_text") {
        const text = element as any;
        const x = transformX(text.anchor_position?.x ?? text.x);
        const y = transformY(text.anchor_position?.y ?? text.y);
        const fontSize = (text.font_size ?? 1) * Math.min(scaleX, scaleY);
        const textStr = escapeXml(text.text ?? "");
        // Note: rotation not supported in this simplified version
        svgParts.push(
          `    <text x="${x}" y="${y}" fill="${silkscreenColor}" font-size="${fontSize}" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle">${textStr}</text>`,
        );
      }
    }

    svgParts.push("  </g>");
  }

  // Non-plated holes (cutouts)
  for (const hole of pcbHoles) {
    const cx = transformX(hole.x);
    const cy = transformY(hole.y);
    if (hole.hole_shape === "circle") {
      const r = (hole.hole_diameter / 2) * Math.min(scaleX, scaleY);
      // Use soldermask color to "erase" the copper
      svgParts.push(
        `  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${soldermaskColor}" stroke="none" />`,
      );
    }
  }

  // Board outline stroke
  if (boardData.outline && boardData.outline.length > 0) {
    const outlinePath = createOutlinePath(
      boardData.outline,
      transformX,
      transformY,
    );
    const strokeWidth = 2; // 2px outline in screen space
    svgParts.push(
      `  <path d="${outlinePath}" fill="none" stroke="${darken(soldermaskColor)}" stroke-width="${strokeWidth}" />`,
    );
  }

  // Close SVG
  svgParts.push("</svg>");

  return svgParts.join("\n");
}

/**
 * Create an SVG path from a trace route
 */
function createTracePath(
  route: Array<{ x: number; y: number }>,
  transformX: (x: number) => number,
  transformY: (y: number) => number,
): string {
  if (route.length === 0) return "";

  const parts: string[] = [];
  parts.push(`M ${transformX(route[0]!.x)} ${transformY(route[0]!.y)}`);

  for (let i = 1; i < route.length; i++) {
    parts.push(`L ${transformX(route[i]!.x)} ${transformY(route[i]!.y)}`);
  }

  return parts.join(" ");
}

/**
 * Create an SVG path from board outline
 */
function createOutlinePath(
  outline: Array<{ x: number; y: number }>,
  transformX: (x: number) => number,
  transformY: (y: number) => number,
): string {
  if (outline.length === 0) return "";

  const parts: string[] = [];
  parts.push(`M ${transformX(outline[0]!.x)} ${transformY(outline[0]!.y)}`);

  for (let i = 1; i < outline.length; i++) {
    parts.push(`L ${transformX(outline[i]!.x)} ${transformY(outline[i]!.y)}`);
  }

  parts.push("Z");
  return parts.join(" ");
}

/**
 * Convert RGB array to hex color string
 */
function toHex(rgb: number[]): string {
  const r = Math.round(rgb[0]! * 255)
    .toString(16)
    .padStart(2, "0");
  const g = Math.round(rgb[1]! * 255)
    .toString(16)
    .padStart(2, "0");
  const b = Math.round(rgb[2]! * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${r}${g}${b}`;
}

/**
 * Darken a hex color slightly for outlines
 */
function darken(hex: string): string {
  // Simple darkening - reduce each channel by 20%
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) * 0.8);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) * 0.8);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) * 0.8);

  const rs = Math.round(r).toString(16).padStart(2, "0");
  const gs = Math.round(g).toString(16).padStart(2, "0");
  const bs = Math.round(b).toString(16).padStart(2, "0");

  return `#${rs}${gs}${bs}`;
}

/**
 * Escape special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
