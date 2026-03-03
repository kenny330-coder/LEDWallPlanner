import { type PowerPoint } from '../utils/powerLogic';

export interface PanelSpec {
    id: string;
    manufacturer: string;
    model: string;
    widthMm: number;
    heightMm: number;
    pixelsW: number;
    pixelsH: number;
    weightKg: number;
    maxWatts: number;
    brightnessNits: number;
    customCurve?: PowerPoint[];
    panelsPerCase?: number;
    blanksPerCase?: number;
    supportCasesCount?: number;
    baseplateHeightMm?: number;  // Height of panel baseplate/footer system in mm
}

export const initialPanels: PanelSpec[] = [
    {
        id: 'dvs-vizra',
        manufacturer: 'DVS: Curved Wall',
        model: 'VIZRA',
        widthMm: 500,
        heightMm: 1000,
        pixelsW: 192,
        pixelsH: 384,
        weightKg: 11.8,
        maxWatts: 480,
        brightnessNits: 5000,
        panelsPerCase: 6,
        blanksPerCase: 8,
        supportCasesCount: 8,
        baseplateHeightMm: 102,  // ~4 in DVS panel foot
        customCurve: [
            { percent: 0, watts: 50.0 },
            { percent: 5, watts: 75.4 },
            { percent: 8, watts: 101.4 },
            { percent: 12, watts: 111.8 },
            { percent: 15, watts: 119.6 },
            { percent: 20, watts: 135.2 },
            { percent: 25, watts: 151.0 },
            { percent: 30, watts: 166.4 },
            { percent: 35, watts: 184.6 },
            { percent: 40, watts: 200.2 },
            { percent: 45, watts: 215.8 },
            { percent: 50, watts: 234.0 },
            { percent: 55, watts: 249.6 },
            { percent: 60, watts: 267.8 },
            { percent: 65, watts: 283.4 },
            { percent: 70, watts: 301.6 },
            { percent: 100, watts: 480.0 }
        ]
    }
];
