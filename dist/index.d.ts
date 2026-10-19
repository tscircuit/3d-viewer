import * as React$1 from 'react';
import { AnyCircuitElement, PcbBoard } from 'circuit-json';
import * as THREE from 'three';
import { GLTFExporterOptions } from 'three-stdlib';
import { ManifoldToplevel } from 'manifold-3d';
import { JSDOM } from 'jsdom';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/** Same component identity contract as the PCB viewer. */
interface ViewSchematicComponentEvent {
    source_component_id: string;
    pcb_component_id: string;
    refdes: string;
}

type CameraPreset = "Custom" | "Top Down" | "Top Left Corner" | "Top Right Corner" | "Left Sideview" | "Right Sideview" | "Front" | "Top Center Angled";
interface CameraAnimationConfig {
    position: readonly [number, number, number];
    target?: readonly [number, number, number];
    up?: readonly [number, number, number];
    durationMs?: number;
}
interface CameraController {
    animateTo: (config: CameraAnimationConfig) => void;
    animateToPreset: (preset: CameraPreset) => void;
}
declare const CameraAnimatorWithContext: React$1.FC;

type ReferenceObjectType = "banana" | "credit-card" | "14in-macbook";

interface Props {
    /**
     * @deprecated Use circuitJson instead.
     */
    soup?: AnyCircuitElement[];
    circuitJson?: AnyCircuitElement[];
    autoRotateDisabled?: boolean;
    clickToInteractEnabled?: boolean;
    cameraType?: "orthographic" | "perspective";
    onUserInteraction?: () => void;
    onCameraControllerReady?: (controller: CameraController | null) => void;
    resolveStaticAsset?: (modelUrl: string) => string;
    referenceObject?: ReferenceObjectType | null;
    hiddenCadComponentIds?: ReadonlySet<string>;
}
declare const CadViewerJscad: React$1.ForwardRefExoticComponent<Props & {
    children?: React$1.ReactNode | undefined;
} & React$1.RefAttributes<THREE.Object3D<THREE.Object3DEventMap>>>;

type CadViewerProps = Omit<React.ComponentProps<typeof CadViewerJscad>, "circuitJson" | "hiddenCadComponentIds"> & {
    circuitJson?: any[];
    foldPcbs?: boolean;
    /** Enable right-click navigation using the same identity as the PCB viewer. */
    onViewSchematicComponent?: (event: ViewSchematicComponentEvent) => void;
};
declare const CadViewer: (props: CadViewerProps) => React$1.JSX.Element;

interface CircuitToSvgOptions {
    width?: number;
    height?: number;
    viewAngle?: "top" | "isometric" | "front" | "side";
    backgroundColor?: string;
    padding?: number;
    zoom?: number;
    camera?: {
        position: {
            x: number;
            y: number;
            z: number;
        };
        lookAt?: {
            x: number;
            y: number;
            z: number;
        };
    };
}
declare function convertCircuitJsonTo3dSvg(circuitJson: AnyCircuitElement[], options?: CircuitToSvgOptions): Promise<string>;

type Options = Omit<GLTFExporterOptions, "animations" | "includeCustomExtensions">;
declare function useSaveGltfAs(options?: Options & {
    filename?: string;
}): [
    ref3D: React$1.ForwardedRef<THREE.Object3D>,
    saveAs: (filename?: string) => Promise<void>
];
declare function useExportGltfUrl(options?: Options): [
    ref3D: React$1.ForwardedRef<THREE.Object3D>,
    url: string | undefined,
    error: ErrorEvent | undefined
];

interface LayerVisibilityState {
    boardBody: boolean;
    topCopper: boolean;
    bottomCopper: boolean;
    keepout: boolean;
    adhesive: boolean;
    solderPaste: boolean;
    topSilkscreen: boolean;
    bottomSilkscreen: boolean;
    topMask: boolean;
    bottomMask: boolean;
    throughHoleModels: boolean;
    smtModels: boolean;
    translucentModels: boolean;
    modelsNotInPosFile: boolean;
    modelsMarkedDNP: boolean;
    modelBoundingBoxes: boolean;
    threedAxis: boolean;
    pcbNotes: boolean;
    backgroundStart: boolean;
    backgroundEnd: boolean;
    /**
     * Three-state display for the single assembled enclosure CAD entity. This is
     * viewer state, not Circuit JSON: hidden to work unobstructed, translucent to
     * check openings against the board, opaque to inspect the print itself.
     */
    enclosure: EnclosureVisibility;
}
type EnclosureVisibility = "hidden" | "translucent" | "opaque";

interface CombinedBoardTextures {
    topBoard?: THREE.CanvasTexture | null;
    bottomBoard?: THREE.CanvasTexture | null;
    /** Geometry-only alpha masks used for relief, never as color maps. */
    topMaskedCopper?: THREE.CanvasTexture | null;
    bottomMaskedCopper?: THREE.CanvasTexture | null;
}

interface ManifoldGeoms {
    board?: {
        geometry: THREE.BufferGeometry;
        color: THREE.Color;
        material: PcbBoard["material"];
        isFaux?: boolean;
    };
    platedHoles?: Array<{
        key: string;
        geometry: THREE.BufferGeometry;
        color: THREE.Color;
    }>;
    vias?: Array<{
        key: string;
        geometry: THREE.BufferGeometry;
        color: THREE.Color;
    }>;
}
interface UseManifoldBoardBuilderResult {
    geoms: ManifoldGeoms | null;
    textures: CombinedBoardTextures | null;
    pcbThickness: number | null;
    error: string | null;
    isLoading: boolean;
    boardData: PcbBoard | null;
    isFauxBoard: boolean;
}
declare const useManifoldBoardBuilder: (manifoldJSModule: ManifoldToplevel | null, circuitJson: AnyCircuitElement[], visibility: LayerVisibilityState) => UseManifoldBoardBuilderResult;

declare function applyJsdomShim(jsdom: JSDOM): void;

type CameraControls = Pick<OrbitControls, "target"> & {
    update: () => unknown;
};
type CameraSessionContext = {
    controls: CameraControls;
    cameraSessionScope?: string;
};

type CameraSessionContextInput = CameraControls | CameraSessionContext;
declare const saveCameraToSession: (camera: THREE.Camera, cameraSessionContext: CameraSessionContextInput) => void;
declare const loadCameraFromSession: (camera: THREE.Camera, cameraSessionContext: CameraSessionContextInput) => boolean;
interface CameraControllerContextValue {
    controlsRef: React$1.MutableRefObject<OrbitControls | null>;
    mainCameraRef: React$1.MutableRefObject<THREE.Camera | null>;
    defaultTarget: THREE.Vector3;
    baseDistance: number;
    controller: CameraController | null;
    setController: (controller: CameraController | null) => void;
    getPresetConfig: (preset: CameraPreset) => CameraAnimationConfig | null;
    handleControlsChange: (controls: OrbitControls | null) => void;
    cameraType: "perspective" | "orthographic";
    setCameraType: (type: "perspective" | "orthographic") => void;
    cameraPosition: readonly [number, number, number] | null;
    setCameraPosition: (position: readonly [number, number, number]) => void;
    cameraRotation: THREE.Euler;
    setCameraRotation: (rotation: THREE.Euler) => void;
    saveCameraToSession: typeof saveCameraToSession;
    loadCameraFromSession: typeof loadCameraFromSession;
}
interface CameraControllerProviderProps {
    children: React$1.ReactNode;
    defaultTarget: THREE.Vector3;
    initialCameraPosition?: readonly [number, number, number];
    initialCameraType?: "perspective" | "orthographic";
}
declare const CameraControllerProvider: React$1.FC<CameraControllerProviderProps>;
declare const useCameraController: () => CameraControllerContextValue;

declare const useCameraSession: ({ cameraSessionScope, }?: {
    cameraSessionScope?: string;
}) => {
    handleCameraCreated: (camera: THREE.Camera) => void;
    handleControlsChange: () => void;
};

export { CadViewer, type CadViewerProps, CameraAnimatorWithContext, CameraControllerProvider, type ManifoldGeoms, type ViewSchematicComponentEvent, applyJsdomShim, convertCircuitJsonTo3dSvg, loadCameraFromSession, saveCameraToSession, useCameraController, useCameraSession, useExportGltfUrl, useManifoldBoardBuilder, useSaveGltfAs };
