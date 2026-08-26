import { type PowerPoint } from '../utils/powerLogic';

export interface DataFeed {
    id: string;
    resolution: 'hd' | '4k' | 'custom';
    offsetX: number;
    offsetY: number;
    fitMode: '1:1' | 'fit' | 'fill' | 'scaled';
    customWidth?: number;
    customHeight?: number;
    scalePercent?: number; // Used only when fitMode === 'scaled'
}

export interface DataPort {
    id: string;
    feedId?: string; // optional — ports can exist without a specific feed
    color: string;
    panelIds: string[];
}

export interface PowerCircuit {
    id: string;
    color: string;
    panelIds: string[];
}

// Connector types used in production LED power distribution
export type DistroConnectorType =
    | 'soca-breakout'   // Socapex 19-pin → 6 pigtail circuits
    | 'lex-lunchbox'    // Socapex in → 6x L6-20 out (Lex LSC style)
    | 'cam-l620-6'      // Cam Lock → 6x L6-20
    | 'cam-l620-12'     // Cam Lock → 12x L6-20
    | 'cam-soca-4'      // Cam Lock → 4x Socapex (24 circuits total)
    | 'l630-breakout'   // L6-30 → 3x L6-20
    | 'powercon-ring'   // Neutrik PowerCON daisy / ring
    | 'cee32-l620'      // CEE 32A (IEC 309) → 6x L6-20
    | 'custom';         // User-defined

export interface DistroConfig {
    type: DistroConnectorType;
    circuitsPerDistro: number; // how many wall circuits one distro unit feeds
    customLabel?: string;      // used when type === 'custom'
}

export interface DVEState {
    id: string; // 'dve1' | 'dve2'
    sourceId: string | null;
    enabled: boolean;
    fitMode: 'fit' | 'fill';
    boxMode: '16:9' | 'custom';
    rect: { x: number; y: number; w: number; h: number };
}

export interface AppState {
    projectName: string;
    brightness: number; // 0-100%
    // ambientLux removed as primary driver, now derived from brightness for display
    screenCols: number;
    screenRows: number;
    panelWidthMm: number;
    panelHeightMm: number;
    panelPixelsW: number;
    panelPixelsH: number;
    panelWeightKg: number; // Added for rigging load
    panelMaxWatts: number;
    maxNits: number;
    panelsPerCase: number;
    blanksPerCase: number;
    supportCasesCount: number;
    baseplateHeightMm: number;  // Panel spec baseplate/footer height
    voltage: number;
    circuitBreakerAmps: number;
    customCurve?: PowerPoint[];
    // Environment
    groundStackHeightMm: number;
    blanksCount: number;
    visualizerMode: 'power' | 'graphics' | 'staging' | 'data';
    stageConfig: {
        enabled: boolean;
        widthMm: number;
        heightMm: number;
        depthMm: number;
        offsetXMm: number; // 0 is center
        safeBufferMm: number;
    };
    visualConfig: {
        backgroundImage: string | null;
        showBackgroundImage: boolean;
        bgSourceId: string | null;
        dves: DVEState[];
        fadeDurationMs: number;
        showGraphicsSwitcher?: boolean;
        showCenterGuides: boolean;
        showThirdsGuides: boolean;
        showCoordinates: boolean;
        showResolutionOverlays: boolean;
        show16by9Overlay?: boolean;
        showViewingDistance?: boolean;
    };
    riggingConfig: {
        mode: 'ground-stack' | 'flown';      // Rigging mode
        trussType: 'F34' | 'F32' | 'T-Bar' | 'Box';  // Industry truss types
        trussSpanMm: number;                // Truss span width
        trussWeightKg: number;              // Self-weight per meter (kg/m)
        trimHeightMm: number;               // Bottom chord trim height from stage floor
        hookHeightMm: number;               // Motor hook height (grid/ceiling height)
        motorCount: number;                 // Number of hoists
        motorCapacity: 0.25 | 0.5 | 1 | 2; // WLL in tons
        bridleAngleDeg: number;             // Bridle angle (0 = single point / spreader beam)
        useSpreaderBeam: boolean;
        safetyFactor: 5 | 7 | 10;
        groundSupportType: 'towers' | 'baseplate';
        groundSupportHeightMm: number;      // Tower stack height (towers mode); baseplate uses panelSpec.baseplateHeightMm
    };
    dataConfig: {
        feeds: DataFeed[];
        ports: DataPort[];
        drawingPortId: string | null;
    };
    powerConfig?: {
        circuits: PowerCircuit[];
        drawingCircuitId: string | null;
    };
    distroConfig?: DistroConfig;
}

const defaultState: AppState = {
    projectName: 'Untitled Project',
    brightness: 15, // Default to Indoor
    screenCols: 10,
    screenRows: 3,
    panelWidthMm: 500,
    panelHeightMm: 1000,
    panelPixelsW: 192,
    panelPixelsH: 384,
    panelWeightKg: 12, // Default for 500x1000mm outdoor panel
    panelMaxWatts: 403,
    maxNits: 5000,
    panelsPerCase: 6,
    blanksPerCase: 8,
    supportCasesCount: 1,
    baseplateHeightMm: 102,  // ~4 in default (DVS VIZRA)
    voltage: 110,
    circuitBreakerAmps: 20,
    customCurve: undefined,
    // Environment
    groundStackHeightMm: 100, // Basic stand height
    blanksCount: 0,
    visualizerMode: 'power',
    stageConfig: {
        enabled: false,
        widthMm: 4877, // 16 ft
        heightMm: 610, // 2 ft
        depthMm: 2400,
        offsetXMm: 0,
        safeBufferMm: 152 // Default 6 inches
    },
    visualConfig: {
        backgroundImage: null,
        showBackgroundImage: true,
        bgSourceId: null,
        dves: [
            { id: 'dve1', sourceId: null, enabled: false, fitMode: 'fit', boxMode: '16:9', rect: { x: 10, y: 10, w: 30, h: 30 } },
            { id: 'dve2', sourceId: null, enabled: false, fitMode: 'fit', boxMode: '16:9', rect: { x: 50, y: 10, w: 30, h: 30 } }
        ],
        fadeDurationMs: 500,
        showGraphicsSwitcher: true,
        showCenterGuides: false,
        showThirdsGuides: false,
        showCoordinates: false,
        showResolutionOverlays: true,
        showViewingDistance: false,
    },
    dataConfig: {
        feeds: [],
        ports: [],
        drawingPortId: null,
    },
    riggingConfig: {
        mode: 'ground-stack',
        trussType: 'F34',
        trussSpanMm: 0,
        trussWeightKg: 8.5,
        trimHeightMm: 6096,
        hookHeightMm: 7620,
        motorCount: 4,
        motorCapacity: 1,
        bridleAngleDeg: 0,
        useSpreaderBeam: true,
        safetyFactor: 7,
        groundSupportType: 'baseplate',
        groundSupportHeightMm: 914,  // 3 ft default tower height
    },
    distroConfig: {
        type: 'lex-lunchbox',
        circuitsPerDistro: 6,
    },
};

export type Action =
    | { type: 'SET_PROJECT_NAME', payload: string }
    | { type: 'SET_BRIGHTNESS', payload: number }
    | { type: 'SET_SCREEN_DIMS', payload: { cols: number, rows: number } }
    | { type: 'SET_PANEL_DIMS', payload: { w: number, h: number } }
    | { type: 'SET_PANEL_RES', payload: { w: number, h: number } }
    | { type: 'SET_PANEL_WEIGHT', payload: number }
    | { type: 'SET_PANEL_MAX_WATTS', payload: number }
    | { type: 'SET_MAX_NITS', payload: number }
    | { type: 'SET_PANEL_LOGISTICS', payload: { panelsPerCase: number, blanksPerCase: number, supportCasesCount: number } }
    | { type: 'SET_BASEPLATE_HEIGHT', payload: number }
    | { type: 'SET_VOLTAGE', payload: number }
    | { type: 'SET_BREAKER', payload: number }
    | { type: 'SET_CUSTOM_CURVE', payload: PowerPoint[] | undefined }
    | { type: 'SET_GROUND_STACK', payload: number }
    | { type: 'SET_BLANKS_COUNT', payload: number }
    | { type: 'SET_STAGE_CONFIG', payload: Partial<AppState['stageConfig']> }
    | { type: 'SET_VISUAL_CONFIG', payload: Partial<AppState['visualConfig']> }
    | { type: 'SET_RIGGING_CONFIG', payload: Partial<AppState['riggingConfig']> }
    | { type: 'SET_VISUALIZER_MODE', payload: AppState['visualizerMode'] }
    | { type: 'ADD_DATA_FEED', payload: DataFeed }
    | { type: 'UPDATE_DATA_FEED', payload: { id: string, feed: Partial<DataFeed> } }
    | { type: 'REMOVE_DATA_FEED', payload: string }
    | { type: 'ADD_DATA_PORT', payload: DataPort }
    | { type: 'UPDATE_DATA_PORT', payload: { id: string, port: Partial<DataPort> } }
    | { type: 'REMOVE_DATA_PORT', payload: string }
    | { type: 'SET_DRAWING_PORT', payload: string | null }
    | { type: 'INIT_DATA_PORTS', payload: DataPort[] }
    | { type: 'CLEAR_PORT_PANELS', payload: string }
    | { type: 'ADD_POWER_CIRCUIT', payload: PowerCircuit }
    | { type: 'UPDATE_POWER_CIRCUIT', payload: { id: string, circuit: Partial<PowerCircuit> } }
    | { type: 'REMOVE_POWER_CIRCUIT', payload: string }
    | { type: 'SET_DRAWING_CIRCUIT', payload: string | null }
    | { type: 'INIT_POWER_CIRCUITS', payload: PowerCircuit[] }
    | { type: 'CLEAR_CIRCUIT_PANELS', payload: string }
    | { type: 'SET_DISTRO_CONFIG', payload: Partial<DistroConfig> }
    | { type: 'UPDATE_DVE', payload: { id: string, dve: Partial<DVEState> } }
    | { type: 'IMPORT_STATE', payload: AppState }
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'RESET_STATE' };

// ── History constants ────────────────────────────────────────────────────────
export const AUTOSAVE_KEY = 'led-planner-autosave-v1';
const MAX_HISTORY = 50;
// Ephemeral actions — don't pollute undo history
const NO_HISTORY = new Set<string>(['SET_DRAWING_CIRCUIT', 'SET_DRAWING_PORT']);

interface HistoryState {
    past: AppState[];
    present: AppState;
    future: AppState[];
}

/** Deep-merge a loaded/saved object with defaults to handle schema evolution. */
export function mergeWithDefaults(loaded: Partial<AppState>): AppState {
    const merged = { ...defaultState, ...loaded };
    
    if (merged.visualConfig) {
        // Migrate old base64 backgroundImage to IndexedDB
        if (merged.visualConfig.backgroundImage && !merged.visualConfig.bgSourceId) {
            const bgData = merged.visualConfig.backgroundImage;
            if (bgData.startsWith('data:image')) {
                fetch(bgData).then(res => res.blob()).then(blob => {
                    const file = new File([blob], 'migrated-bg.png', { type: blob.type });
                    import('../utils/mediaStore').then(({ saveMedia }) => {
                        saveMedia(file).then(() => {});
                    });
                });
            }
        }
        
        // Migrate old singular DVE to the new array
        if (!merged.visualConfig.dves || merged.visualConfig.dves.length === 0) {
            const legacyConfig = merged.visualConfig as any;
            
            // Fix old custom fitMode string if present
            let fitMode = legacyConfig.dveFitMode || 'fit';
            let boxMode = legacyConfig.dveBoxMode || '16:9';
            if (fitMode === 'custom') {
                fitMode = 'fill';
                boxMode = 'custom';
            }

            merged.visualConfig.dves = [
                {
                    id: 'dve1',
                    sourceId: legacyConfig.dveSourceId || null,
                    enabled: legacyConfig.dveEnabled || false,
                    fitMode,
                    boxMode,
                    rect: legacyConfig.dveRect || { x: 10, y: 10, w: 30, h: 30 }
                },
                { id: 'dve2', sourceId: null, enabled: false, fitMode: 'fit', boxMode: '16:9', rect: { x: 50, y: 10, w: 30, h: 30 } }
            ];
            
            // Delete legacy properties if they exist
            delete legacyConfig.dveSourceId;
            delete legacyConfig.dveEnabled;
            delete legacyConfig.dveFitMode;
            delete legacyConfig.dveBoxMode;
            delete legacyConfig.dveRect;
        }
    }

    return {
        ...merged,
        stageConfig:  { ...defaultState.stageConfig,  ...(loaded.stageConfig  || {}) },
        visualConfig: { ...defaultState.visualConfig, ...(loaded.visualConfig || {}) },
        dataConfig:   { ...defaultState.dataConfig,   ...(loaded.dataConfig   || {}), drawingPortId: null },
        powerConfig:  { circuits: [], ...(loaded.powerConfig || {}), drawingCircuitId: null },
        distroConfig: { ...defaultState.distroConfig!, ...(loaded.distroConfig || {}) },
        riggingConfig:{ ...defaultState.riggingConfig, ...(loaded.riggingConfig || {}) },
    };
}

function getInitialHistory(): HistoryState {
    try {
        const saved = localStorage.getItem(AUTOSAVE_KEY);
        if (saved) return { past: [], present: mergeWithDefaults(JSON.parse(saved)), future: [] };
    } catch (e) { console.warn('Auto-save restore failed:', e); }
    return { past: [], present: defaultState, future: [] };
}

import React, { createContext, useReducer, useContext, useEffect } from 'react';

function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'SET_PROJECT_NAME': return { ...state, projectName: action.payload };
        case 'SET_BRIGHTNESS': return { ...state, brightness: action.payload };
        case 'SET_SCREEN_DIMS': return { ...state, screenCols: action.payload.cols, screenRows: action.payload.rows };
        case 'SET_PANEL_DIMS': return { ...state, panelWidthMm: action.payload.w, panelHeightMm: action.payload.h };
        case 'SET_PANEL_RES': return { ...state, panelPixelsW: action.payload.w, panelPixelsH: action.payload.h };
        case 'SET_PANEL_WEIGHT': return { ...state, panelWeightKg: action.payload };
        case 'SET_PANEL_MAX_WATTS': return { ...state, panelMaxWatts: action.payload };
        case 'SET_MAX_NITS': return { ...state, maxNits: action.payload };
        case 'SET_PANEL_LOGISTICS': return { ...state, panelsPerCase: action.payload.panelsPerCase, blanksPerCase: action.payload.blanksPerCase, supportCasesCount: action.payload.supportCasesCount };
        case 'SET_VOLTAGE': return { ...state, voltage: action.payload };
        case 'SET_BREAKER': return { ...state, circuitBreakerAmps: action.payload };
        case 'SET_CUSTOM_CURVE': return { ...state, customCurve: action.payload };
        case 'SET_GROUND_STACK': return { ...state, groundStackHeightMm: action.payload };
        case 'SET_BASEPLATE_HEIGHT': {
            const heightMm = action.payload;
            // If currently in baseplate mode, sync groundStackHeightMm immediately
            const syncGround = state.riggingConfig.mode === 'ground-stack' && state.riggingConfig.groundSupportType === 'baseplate';
            return { ...state, baseplateHeightMm: heightMm, groundStackHeightMm: syncGround ? heightMm : state.groundStackHeightMm };
        }
        case 'SET_BLANKS_COUNT': return { ...state, blanksCount: action.payload };
        case 'SET_STAGE_CONFIG': return { ...state, stageConfig: { ...state.stageConfig, ...action.payload } };
        case 'SET_VISUAL_CONFIG': return { ...state, visualConfig: { ...state.visualConfig, ...action.payload } };
        case 'UPDATE_DVE': 
            return {
                ...state,
                visualConfig: {
                    ...state.visualConfig,
                    dves: state.visualConfig.dves.map(dve => 
                        dve.id === action.payload.id ? { ...dve, ...action.payload.dve } : dve
                    )
                }
            };
        case 'SET_VISUALIZER_MODE': return { ...state, visualizerMode: action.payload };
        case 'SET_RIGGING_CONFIG': {
            const next = { ...state.riggingConfig, ...action.payload };
            let newGroundStack = state.groundStackHeightMm;
            if (next.mode === 'ground-stack') {
                if (next.groundSupportType === 'baseplate') {
                    newGroundStack = state.baseplateHeightMm;
                } else if (next.groundSupportType === 'towers') {
                    newGroundStack = next.groundSupportHeightMm;
                }
            } else if (next.mode === 'flown') {
                newGroundStack = 0;
            }
            return { ...state, riggingConfig: next, groundStackHeightMm: newGroundStack };
        }
        case 'ADD_DATA_FEED':
            return { ...state, dataConfig: { ...state.dataConfig, feeds: [...state.dataConfig.feeds, action.payload] } };
        case 'UPDATE_DATA_FEED':
            return { ...state, dataConfig: { ...state.dataConfig, feeds: state.dataConfig.feeds.map(f => f.id === action.payload.id ? { ...f, ...action.payload.feed } : f) } };
        case 'REMOVE_DATA_FEED':
            // Removing a feed also removes its dependent ports
            return { ...state, dataConfig: { ...state.dataConfig, feeds: state.dataConfig.feeds.filter(f => f.id !== action.payload), ports: state.dataConfig.ports.filter(p => p.feedId !== action.payload) } };
        case 'ADD_DATA_PORT':
            return { ...state, dataConfig: { ...state.dataConfig, ports: [...state.dataConfig.ports, action.payload] } };
        case 'UPDATE_DATA_PORT':
            return { ...state, dataConfig: { ...state.dataConfig, ports: state.dataConfig.ports.map(p => p.id === action.payload.id ? { ...p, ...action.payload.port } : p) } };
        case 'REMOVE_DATA_PORT':
            return { ...state, dataConfig: { ...state.dataConfig, ports: state.dataConfig.ports.filter(p => p.id !== action.payload), drawingPortId: state.dataConfig.drawingPortId === action.payload ? null : state.dataConfig.drawingPortId } };
        case 'SET_DRAWING_PORT':
            return { ...state, dataConfig: { ...state.dataConfig, drawingPortId: action.payload } };
        case 'INIT_DATA_PORTS':
            return { ...state, dataConfig: { ...state.dataConfig, ports: action.payload, drawingPortId: null } };
        case 'CLEAR_PORT_PANELS':
            return { ...state, dataConfig: { ...state.dataConfig, ports: state.dataConfig.ports.map(p => p.id === action.payload ? { ...p, panelIds: [] } : p) } };
        case 'ADD_POWER_CIRCUIT':
            return { ...state, powerConfig: { ...(state.powerConfig || { circuits: [], drawingCircuitId: null }), circuits: [...(state.powerConfig?.circuits || []), action.payload] } };
        case 'UPDATE_POWER_CIRCUIT':
            return { ...state, powerConfig: { ...(state.powerConfig || { circuits: [], drawingCircuitId: null }), circuits: (state.powerConfig?.circuits || []).map(c => c.id === action.payload.id ? { ...c, ...action.payload.circuit } : c) } };
        case 'REMOVE_POWER_CIRCUIT':
            return { ...state, powerConfig: { ...(state.powerConfig || { circuits: [], drawingCircuitId: null }), circuits: (state.powerConfig?.circuits || []).filter(c => c.id !== action.payload), drawingCircuitId: state.powerConfig?.drawingCircuitId === action.payload ? null : (state.powerConfig?.drawingCircuitId || null) } };
        case 'SET_DRAWING_CIRCUIT':
            return { ...state, powerConfig: { ...(state.powerConfig || { circuits: [], drawingCircuitId: null }), drawingCircuitId: action.payload } };
        case 'INIT_POWER_CIRCUITS':
            return { ...state, powerConfig: { ...(state.powerConfig || { circuits: [], drawingCircuitId: null }), circuits: action.payload, drawingCircuitId: null } };
        case 'CLEAR_CIRCUIT_PANELS':
            return { ...state, powerConfig: { ...(state.powerConfig || { circuits: [], drawingCircuitId: null }), circuits: (state.powerConfig?.circuits || []).map(c => c.id === action.payload ? { ...c, panelIds: [] } : c) } };
        case 'SET_DISTRO_CONFIG':
            return { ...state, distroConfig: { ...(state.distroConfig || defaultState.distroConfig!), ...action.payload } };
        case 'IMPORT_STATE': 
            // Deep merge to ensure all new state features are present even if loading an old project file
            return {
                ...defaultState,
                ...action.payload,
                stageConfig: { ...defaultState.stageConfig, ...(action.payload.stageConfig || {}) },
                visualConfig: { ...defaultState.visualConfig, ...(action.payload.visualConfig || {}) },
                dataConfig: { 
                    ...defaultState.dataConfig, 
                    ...(action.payload.dataConfig || {}),
                    drawingPortId: null // Always reset drawing state on load
                },
                powerConfig: {
                    circuits: [],
                    ...(action.payload.powerConfig || {}),
                    drawingCircuitId: null // reset
                },
                distroConfig: { ...defaultState.distroConfig!, ...(action.payload.distroConfig || {}) },
                riggingConfig: { ...defaultState.riggingConfig, ...(action.payload.riggingConfig || {}) }
            };
        default: return state;
    }
}

// ── History reducer — wraps the state reducer ─────────────────────────────────
function historyReducer(history: HistoryState, action: Action): HistoryState {
    if (action.type === 'UNDO') {
        if (history.past.length === 0) return history;
        const previous = history.past[history.past.length - 1];
        return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] };
    }
    if (action.type === 'REDO') {
        if (history.future.length === 0) return history;
        const next = history.future[0];
        return { past: [...history.past, history.present], present: next, future: history.future.slice(1) };
    }
    if (action.type === 'RESET_STATE') {
        return { past: [], present: defaultState, future: [] };
    }
    // IMPORT_STATE: apply but clear history
    if (action.type === 'IMPORT_STATE') {
        return { past: [], present: reducer(history.present, action), future: [] };
    }
    const newPresent = reducer(history.present, action);
    if (newPresent === history.present) return history;
    if (NO_HISTORY.has(action.type)) return { ...history, present: newPresent };
    return {
        past: [...history.past.slice(-(MAX_HISTORY - 1)), history.present],
        present: newPresent,
        future: [],
    };
}

const StateContext = createContext<{
    state: AppState;
    dispatch: React.Dispatch<Action>;
    canUndo: boolean;
    canRedo: boolean;
} | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [history, dispatch] = useReducer(historyReducer, undefined, getInitialHistory);

    // Auto-save: debounced write whenever present state changes
    useEffect(() => {
        const t = setTimeout(() => {
            try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(history.present)); }
            catch (e) { console.warn('Auto-save failed:', e); }
        }, 800);
        return () => clearTimeout(t);
    }, [history.present]);

    return (
        <StateContext.Provider value={{ state: history.present, dispatch, canUndo: history.past.length > 0, canRedo: history.future.length > 0 }}>
            {children}
        </StateContext.Provider>
    );
};

export const useAppState = () => {
    const context = useContext(StateContext);
    if (!context) throw new Error("useAppState must be used within AppProvider");
    return context;
};
