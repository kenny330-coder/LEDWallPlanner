import { type PowerPoint } from '../utils/powerLogic';

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
        showCenterGuides: boolean;
        showThirdsGuides: boolean;
        showCoordinates: boolean;
        showResolutionOverlays: boolean;
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
    // Environment
    groundStackHeightMm: 100, // Basic stand height
    blanksCount: 0,
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
        showCenterGuides: false,
        showThirdsGuides: false,
        showCoordinates: false,
        showResolutionOverlays: true,
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
    | { type: 'IMPORT_STATE', payload: AppState };

import React, { createContext, useReducer, useContext } from 'react';

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
        case 'SET_RIGGING_CONFIG': {
            const next = { ...state.riggingConfig, ...action.payload };
            // Auto-sync groundStackHeightMm when switching support type
            let newGroundStack = state.groundStackHeightMm;
            if (next.mode === 'ground-stack') {
                if (next.groundSupportType === 'baseplate') {
                    newGroundStack = state.baseplateHeightMm;
                } else if (next.groundSupportType === 'towers') {
                    newGroundStack = next.groundSupportHeightMm;
                }
            } else if (next.mode === 'flown') {
                newGroundStack = 0; // Screen hangs — no ground offset
            }
            return { ...state, riggingConfig: next, groundStackHeightMm: newGroundStack };
        }
        case 'IMPORT_STATE': return action.payload;
        default: return state;
    }
}

const StateContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, defaultState);

    return (
        <StateContext.Provider value={{ state, dispatch }}>
            {children}
        </StateContext.Provider>
    );
};

export const useAppState = () => {
    const context = useContext(StateContext);
    if (!context) throw new Error("useAppState must be used within AppProvider");
    return context;
};
