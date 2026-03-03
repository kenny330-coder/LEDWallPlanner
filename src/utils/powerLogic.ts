export interface PowerPoint {
    percent: number;
    watts: number;
}

export const powerData: PowerPoint[] = [
    { percent: 5, watts: 75.4 },
    { percent: 8, watts: 101.4 },
    { percent: 12, watts: 111.8 },
    { percent: 15, watts: 119.6 },
    { percent: 20, watts: 135.2 },
    { percent: 30, watts: 166.4 },
    { percent: 35, watts: 184.6 },
    { percent: 40, watts: 200.2 },
    { percent: 45, watts: 215.8 },
    { percent: 50, watts: 234.0 },
    { percent: 55, watts: 249.6 },
    { percent: 60, watts: 267.8 },
    { percent: 70, watts: 301.6 },
    { percent: 80, watts: 335.4 },
    { percent: 90, watts: 369.2 },
    { percent: 100, watts: 403.0 }
];

export function getWattsPerPanel(percent: number, maxWatts: number = 403.0, customCurve?: PowerPoint[]): number {
    const defaultMax = 403.0;

    // Use custom curve if provided
    if (customCurve && customCurve.length > 0) {
        // Sort curve just in case
        const sorted = [...customCurve].sort((a, b) => a.percent - b.percent);

        // Exact match
        const exact = sorted.find(p => p.percent === percent);
        if (exact) return exact.watts;

        // Interpolate
        for (let i = 0; i < sorted.length - 1; i++) {
            const p1 = sorted[i];
            const p2 = sorted[i + 1];
            if (percent >= p1.percent && percent <= p2.percent) {
                const slope = (p2.watts - p1.watts) / (p2.percent - p1.percent);
                return p1.watts + (percent - p1.percent) * slope;
            }
        }
        // Fallback to closest if out of range (shouldn't happen with 0-100)
        if (percent < sorted[0].percent) return sorted[0].watts;
        return sorted[sorted.length - 1].watts;
    }

    // Default Logic: Calculate base watts from the DVS 1.6mm curve
    let baseWatts = defaultMax;

    if (percent <= 5) {
        baseWatts = 75.4;
    } else {
        let found = false;
        // Find the interval using linear interpolation
        for (let i = 0; i < powerData.length - 1; i++) {
            const p1 = powerData[i];
            const p2 = powerData[i + 1];
            if (percent >= p1.percent && percent <= p2.percent) {
                const slope = (p2.watts - p1.watts) / (p2.percent - p1.percent);
                baseWatts = p1.watts + (percent - p1.percent) * slope;
                found = true;
                break;
            }
        }
        if (!found) baseWatts = defaultMax;
    }

    // Scale based on the panel's actual max power relative to the curve's max power
    return baseWatts * (maxWatts / defaultMax);
}

// Deprecated: calculate nits from fixed lux steps
// NEW: Calculate equivalent ambient lux from brightness percent for context
export function getAmbientLuxFromBrightness(percent: number, maxNits: number = 5000): number {
    // User requested calculation:
    // "if screen is 100% (5000 nit), lux is 10000".
    // "calculate based of max brightness * percent ... then whatever that brightness would be recommended for"
    // Implied formula: Lux = CurrentNits * 2.

    // Calculate current nits output
    const currentNits = (percent / 100) * maxNits;

    // Estimate Ambient Lux capability (2:1 contrast ratio roughly for visibility, or user's rule)
    return currentNits * 2;
}
