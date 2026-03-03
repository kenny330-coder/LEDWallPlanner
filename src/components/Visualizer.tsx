import React, { useMemo, useState, useRef } from 'react';
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { Plus, Minus, RefreshCcw } from 'lucide-react';
import { useAppState } from '../context/StateContext';
import styles from '../styles/Visualizer.module.css';

interface VisualizerProps {
    maxPanelsPerCircuit: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ maxPanelsPerCircuit }) => {
    const { state } = useAppState();
    const { screenCols, screenRows, panelWidthMm, panelHeightMm, panelPixelsW, panelPixelsH, groundStackHeightMm, stageConfig, blanksCount, brightness, riggingConfig } = state;

    // Track theme so cells re-render when it changes
    const [isDark, setIsDark] = React.useState(
        () => document.documentElement.getAttribute('data-theme') !== 'light'
    );
    React.useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.getAttribute('data-theme') !== 'light');
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    // Local state for Coordinate Inspector and Circuit Hover highlight
    const [hoverCoords, setHoverCoords] = useState<{ x: number, y: number } | null>(null);
    const [hoveredCircuit, setHoveredCircuit] = useState<number | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const transformRef = useRef<ReactZoomPanPinchRef>(null);

    // Reset view when screen dimensions change
    React.useEffect(() => {
        if (transformRef.current) {
            transformRef.current.resetTransform();
        }
    }, [screenCols, screenRows, panelWidthMm, panelHeightMm, blanksCount, groundStackHeightMm]);

    const blanks = blanksCount || 0;
    const totalRows = screenRows + blanks;
    const totalWidthMm = screenCols * panelWidthMm;
    const totalHeightMm = totalRows * panelHeightMm;

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!state.visualConfig?.showCoordinates || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Clamp to bounds
        const clampedX = Math.max(0, Math.min(x, rect.width));
        const clampedY = Math.max(0, Math.min(y, rect.height));

        const widthRatio = clampedX / rect.width;
        // Invert Y because graphics usually origin top-left, but pixels might be wanted from bottom? 
        // Standard screen coords are top-left 0,0. Let's stick to that.
        const heightRatio = clampedY / rect.height;

        const totalPixelsW = screenCols * panelPixelsW;
        const totalPixelsH = totalRows * panelPixelsH;

        setHoverCoords({
            x: Math.round(widthRatio * totalPixelsW),
            y: Math.round(heightRatio * totalPixelsH)
        });
    };

    const handleMouseLeave = () => {
        setHoverCoords(null);
        setHoveredCircuit(null);   // clear circuit highlight when mouse leaves grid
    };

    // Calculate Stage overlap in pixels
    // screenBottomY is the bottom of the active visualizer area (which includes Blanks at bottom)
    const screenBottomY = groundStackHeightMm || 0;
    const stageTopY = (stageConfig?.enabled && stageConfig?.heightMm) ? stageConfig.heightMm : 0;

    // Total visual dimensions (Active + Blanks)
    const totalPixelsW = screenCols * (panelPixelsW || 192);
    // Redeclaring totalPixelsH safely
    const totalPixelsH = (screenRows + (blanksCount || 0)) * (panelPixelsH || 192);
    const activePixelsH = screenRows * (panelPixelsH || 192);

    // Calculate Active Pixels Blocked (excluding blanks)
    const blanksHeightMm = (blanksCount || 0) * panelHeightMm;
    const obstructionHeightMm = Math.max(0, (stageConfig?.heightMm || 0) - (groundStackHeightMm || 0));
    const activeObstructionMm = Math.max(0, obstructionHeightMm - blanksHeightMm);
    const blockedActivePixels = Math.round((activeObstructionMm / panelHeightMm) * (panelPixelsH || 192));

    // Determine overlapping height
    let overlapHeightMm = 0;
    if (stageConfig?.enabled && stageTopY > screenBottomY) {
        overlapHeightMm = Math.min(stageTopY - screenBottomY, totalHeightMm);
    }

    // Visual Overlap (Red Box) - Relative to Total Visual Height
    const overlapPixelsH = Math.round((overlapHeightMm / totalHeightMm) * totalPixelsH);

    // SAFE AREA METRICS: Blanks Logic (continued)
    const activeHeightMm = screenRows * panelHeightMm;

    // Obstruction hitting the visual object (bottom-up)
    // Obstruction Height = overlapHeightMm (clamped to visual height)
    // But we need total obstruction height including buffer (even if above visual) for safety calc
    const bufferMm = stageConfig?.safeBufferMm ?? 152;
    const obstructionWithBufferMm = obstructionHeightMm + bufferMm;

    // Blocked Active Height = Max(0, ObstructionWithBuffer - Blanks)
    const blockedActiveMm = Math.max(0, obstructionWithBufferMm - blanksHeightMm);
    // Safe Active Height
    const safeActiveHeightMm = Math.max(0, activeHeightMm - blockedActiveMm);
    // Safe Active Pixels
    const safeActivePixels = Math.round((safeActiveHeightMm / activeHeightMm) * activePixelsH);

    // Safe Area Metrics - useful for future extension
    // const safePixelsH = (screenRows * panelPixelsH) - overlapPixelsH;

    const { grid, currentCircuit } = useMemo(() => {
        let currCircuit = 1;
        let runningCount = 0;
        const totalR = screenRows + (blanksCount || 0);
        const g = Array.from({ length: totalR }).map(() => Array(screenCols).fill(0));

        // Horizontal Snake Cabling for Active Screen
        for (let r = 0; r < screenRows; r++) {
            const isEven = r % 2 === 0;
            if (isEven) {
                for (let c = 0; c < screenCols; c++) {
                    runningCount++;
                    if (runningCount > maxPanelsPerCircuit) {
                        currCircuit++;
                        runningCount = 1;
                    }
                    g[r][c] = currCircuit;
                }
            } else {
                for (let c = screenCols - 1; c >= 0; c--) {
                    runningCount++;
                    if (runningCount > maxPanelsPerCircuit) {
                        currCircuit++;
                        runningCount = 1;
                    }
                    g[r][c] = currCircuit;
                }
            }
        }

        // Mark Blanks
        for (let r = screenRows; r < totalR; r++) {
            for (let c = 0; c < screenCols; c++) {
                g[r][c] = -1; // -1 indicates Blank
            }
        }

        return { grid: g, currentCircuit: currCircuit };
    }, [screenCols, screenRows, blanksCount, maxPanelsPerCircuit]);

    const aspectRatio = (screenCols * panelWidthMm) / ((screenRows + (blanksCount || 0)) * panelHeightMm);

    // ── Circuit cell colour palette ────────────────────────────────────────────
    // Each accent provided as a solid hex + raw R,G,B values for rgba() blending.
    // Palette is carefully spread for maximum circuit-to-circuit distinctiveness.
    const circuitAccents = [
        { solid: '#0a84ff', rgb: '10,132,255', name: 'Blue' },  // C1 systemBlue
        { solid: '#30d158', rgb: '48,209,88', name: 'Green' },  // C2 systemGreen
        { solid: '#ff453a', rgb: '255,69,58', name: 'Red' },  // C3 systemRed
        { solid: '#ffd60a', rgb: '255,214,10', name: 'Yellow' },  // C4 systemYellow
        { solid: '#bf5af2', rgb: '191,90,242', name: 'Purple' },  // C5 systemPurple
        { solid: '#ff9f0a', rgb: '255,159,10', name: 'Orange' },  // C6 systemOrange
        { solid: '#5ac8fa', rgb: '90,200,250', name: 'Teal' },  // C7 systemTeal
        { solid: '#ff375f', rgb: '255,55,95', name: 'Pink' },  // C8 systemPink
        { solid: '#5e5ce6', rgb: '94,92,230', name: 'Indigo' },  // C9 systemIndigo
        { solid: '#40c8e0', rgb: '64,200,224', name: 'Cyan' },  // C10
        { solid: '#a2845e', rgb: '162,132,94', name: 'Brown' },  // C11 earthy contrast
        { solid: '#78d282', rgb: '120,210,130', name: 'Mint' },  // C12
    ];

    // ── Build per-circuit cell styles ───────────────────────────────────────────
    // Dark mode: near-black base with a BOLD colour wash so circuits are clearly
    // distinguishable at any grid size. Specular top glow adds the glass finish.
    // Light mode: crisp white base with a strong saturated colour overlay.
    const getCellStyle = (accent: typeof circuitAccents[0]) => {
        const { rgb, solid } = accent;
        if (isDark) {
            return {
                bg: `rgba(14, 14, 20, 0.95)`,
                // Bold colour wash: 0.42 top → 0.22 mid → 0.08 corner — unmistakable
                bgImage: [
                    `linear-gradient(150deg,`,
                    `  rgba(${rgb},0.42) 0%,`,
                    `  rgba(${rgb},0.22) 50%,`,
                    `  rgba(${rgb},0.06) 100%)`,
                ].join('\n'),
                border: `1px solid rgba(${rgb},0.60)`,
                boxShadow: [
                    `inset 0 1.5px 0 rgba(${rgb},0.80)`, // bright specular top
                    `inset 0 0 18px rgba(${rgb},0.12)`,  // inner bloom
                    `0 0 6px rgba(${rgb},0.25)`,          // outer halo
                ].join(', '),
                labelColor: solid,
                labelShadow: `0 0 10px rgba(${rgb},0.80)`,
            };
        } else {
            // Light mode: strong saturated fill so panels pop clearly on the white #f2f2f7 background.
            // Low white base (0.20) lets the colour wash dominate rather than bleaching it out.
            return {
                bg: `rgba(255,255,255,0.20)`,
                bgImage: [
                    `linear-gradient(150deg,`,
                    `  rgba(${rgb},0.75) 0%,`,
                    `  rgba(${rgb},0.48) 50%,`,
                    `  rgba(${rgb},0.22) 100%)`,
                ].join('\n'),
                border: `1.5px solid rgba(${rgb},0.90)`,
                boxShadow: [
                    `inset 0 1.5px 0 rgba(255,255,255,0.80)`,
                    `inset 0 0 18px rgba(${rgb},0.20)`,
                    `0 2px 7px rgba(${rgb},0.38)`,
                ].join(', '),
                labelColor: '#fff',                              // white label — max contrast on saturated fill
                labelShadow: `0 1px 4px rgba(0,0,0,0.70), 0 0 8px rgba(${rgb},0.60)`,
            };
        }
    };


    const widthFeet = (screenCols * panelWidthMm * 0.00328084).toFixed(1);
    // Total height includes ground support offset when in ground-stack mode
    const screenOnlyHeightMm = (screenRows + (blanksCount || 0)) * panelHeightMm;
    const groundOffsetMm = (riggingConfig?.mode === 'ground-stack' && groundStackHeightMm > 0) ? groundStackHeightMm : 0;
    const totalDisplayHeightMm = screenOnlyHeightMm + groundOffsetMm;
    const heightFeet = (screenOnlyHeightMm * 0.00328084).toFixed(1);
    const totalHeightWithSupportFt = (totalDisplayHeightMm * 0.00328084).toFixed(1);

    const renderResolutionOverlays = () => {
        const overlays = [];
        // 1. 1080p Tiles (Green)
        {
            const rasterW = 1920;
            const rasterH = 1080;
            const colsNeeded = Math.ceil(totalPixelsW / rasterW);
            const rowsNeeded = Math.ceil(totalPixelsH / rasterH);

            for (let r = 0; r < rowsNeeded; r++) {
                for (let c = 0; c < colsNeeded; c++) {
                    const leftPercent = ((c * rasterW) / totalPixelsW) * 100;
                    const topPercent = ((r * rasterH) / totalPixelsH) * 100;
                    const widthPercent = (rasterW / totalPixelsW) * 100;
                    const heightPercent = (rasterH / totalPixelsH) * 100;

                    overlays.push(
                        <div key={`hd-${r}-${c}`} style={{
                            position: 'absolute',
                            left: `${leftPercent}%`,
                            top: `${topPercent}%`,
                            width: `${widthPercent}%`,
                            height: `${heightPercent}%`,
                            border: '1px dashed #34d399', // emerald-400
                            boxSizing: 'border-box',
                            pointerEvents: 'none',
                            zIndex: 20,
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'flex-start',
                            padding: '2px',
                        }}>
                            <span style={{
                                backgroundColor: '#34d399',
                                color: 'black',
                                padding: '1px 3px',
                                fontSize: '9px',
                                fontWeight: 'bold',
                                borderRadius: '0 0 2px 0',
                                opacity: 0.8
                            }}>
                                HD
                            </span>
                        </div>
                    );
                }
            }
        }
        // 2. 4K Tiles (Amber)
        {
            const rasterW = 3840;
            const rasterH = 2160;
            const colsNeeded = Math.ceil(totalPixelsW / rasterW);
            const rowsNeeded = Math.ceil(totalPixelsH / rasterH);

            for (let r = 0; r < rowsNeeded; r++) {
                for (let c = 0; c < colsNeeded; c++) {
                    const leftPercent = ((c * rasterW) / totalPixelsW) * 100;
                    const topPercent = ((r * rasterH) / totalPixelsH) * 100;
                    const widthPercent = (rasterW / totalPixelsW) * 100;
                    const heightPercent = (rasterH / totalPixelsH) * 100;

                    overlays.push(
                        <div key={`4k-${r}-${c}`} style={{
                            position: 'absolute',
                            left: `${leftPercent}%`,
                            top: `${topPercent}%`,
                            width: `${widthPercent}%`,
                            height: `${heightPercent}%`,
                            border: '2px solid #fbbf24', // amber-400
                            boxSizing: 'border-box',
                            pointerEvents: 'none',
                            zIndex: 25,
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'flex-end',
                            padding: '2px',
                        }}>
                            <span style={{
                                backgroundColor: '#fbbf24',
                                color: 'black',
                                padding: '2px 4px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                borderRadius: '0 0 0 2px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
                            }}>
                                4K
                            </span>
                        </div>
                    );
                }
            }
        }
        return overlays;
    };

    return (
        <div className={styles.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <h3 className={styles.title}>
                    Wall Map
                </h3>
            </div>

            <div className={styles.canvasContainer} style={{
                position: 'relative',
                marginTop: '1.5rem',
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                // Padding gives the absolute-positioned rulers room to breathe
                paddingLeft: '3rem',
                paddingTop: '2rem',
                paddingBottom: groundStackHeightMm > 0 ? '2.5rem' : '0.5rem',
                overflow: 'visible',
            }}>
                <TransformWrapper
                    ref={transformRef}
                    initialScale={1}
                    minScale={0.1}
                    maxScale={8}
                    centerOnInit
                    wheel={{ step: 0.1 }}
                >
                    {({ zoomIn, zoomOut, resetTransform }) => (
                        <>
                            <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 1000, display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => zoomIn()} style={{ padding: '0.6rem', background: 'var(--glass-bg)', backdropFilter: 'blur(4px)', color: 'var(--text-primary)', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} title="Zoom In"><Plus size={18} /></button>
                                <button onClick={() => zoomOut()} style={{ padding: '0.6rem', background: 'var(--glass-bg)', backdropFilter: 'blur(4px)', color: 'var(--text-primary)', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} title="Zoom Out"><Minus size={18} /></button>
                                <button onClick={() => resetTransform()} style={{ padding: '0.6rem', background: 'var(--glass-bg)', backdropFilter: 'blur(4px)', color: 'var(--text-primary)', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} title="Reset View"><RefreshCcw size={18} /></button>
                            </div>
                            <TransformComponent
                                wrapperStyle={{ width: '100%', height: '100%', overflow: 'visible' }}
                                contentStyle={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}
                            >
                                {/* ══ TRUSS VISUAL (flown) ══ */}
                                {riggingConfig?.mode === 'flown' && (() => {
                                    const rc = riggingConfig;
                                    const motorCount = rc.motorCount || 4;
                                    const TRUSS_H = 36;
                                    const CHAIN_H = 44;
                                    return (
                                        <div style={{ width: '100%', height: TRUSS_H + CHAIN_H, position: 'relative', marginBottom: '28px', flexShrink: 0 }}>
                                            {Array.from({ length: motorCount }).map((_, i) => {
                                                const xPct = motorCount === 1 ? 50 : ((i / (motorCount - 1)) * 80 + 10);
                                                return (
                                                    <React.Fragment key={i}>
                                                        <div style={{ position: 'absolute', left: `${xPct}%`, top: 0, width: '2px', height: CHAIN_H, background: 'repeating-linear-gradient(to bottom, #fbbf24 0px, #fbbf24 6px, transparent 6px, transparent 12px)', transform: 'translateX(-50%)' }} />
                                                        <div style={{ position: 'absolute', left: `${xPct}%`, top: CHAIN_H - 8, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '8px solid #fbbf24', zIndex: 2 }} />
                                                        {motorCount <= 8 && <div style={{ position: 'absolute', left: `${xPct}%`, top: 2, transform: 'translateX(-50%)', fontSize: '8px', color: '#fbbf24', fontWeight: 700, whiteSpace: 'nowrap', backgroundColor: 'rgba(0,0,0,0.55)', padding: '0 2px', borderRadius: '2px' }}>M{i + 1}</div>}
                                                    </React.Fragment>
                                                );
                                            })}
                                            {/* Per-type truss profile */}
                                            {(() => {
                                                const web = isDark ? 'rgba(148,163,184,0.55)' : 'rgba(71,85,105,0.55)';
                                                const webThin = isDark ? 'rgba(148,163,184,0.35)' : 'rgba(71,85,105,0.35)';
                                                const chordGrad = isDark
                                                    ? 'linear-gradient(90deg,#94a3b8,#cbd5e1,#94a3b8)'
                                                    : 'linear-gradient(90deg,#475569,#64748b,#475569)';
                                                const shadow = isDark ? '0 0 8px rgba(148,163,184,0.4)' : '0 1px 4px rgba(0,0,0,0.3)';

                                                // ── F34: 4-chord dense box truss ────────────────────
                                                if (rc.trussType === 'F34') return (
                                                    <div style={{ position: 'absolute', left: 0, right: 0, top: CHAIN_H, height: TRUSS_H }}>
                                                        {/* Top double chord */}
                                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: chordGrad, borderRadius: '2px 2px 0 0', boxShadow: shadow }} />
                                                        <div style={{ position: 'absolute', top: 5, left: 0, right: 0, height: 3, background: chordGrad }} />
                                                        {/* Bottom double chord */}
                                                        <div style={{ position: 'absolute', bottom: 5, left: 0, right: 0, height: 3, background: chordGrad }} />
                                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: chordGrad, borderRadius: '0 0 2px 2px', boxShadow: shadow }} />
                                                        {/* Dense X-web */}
                                                        <svg style={{ position: 'absolute', top: 8, left: 0, width: '100%', height: TRUSS_H - 16 }} preserveAspectRatio="none" viewBox="0 0 160 20">
                                                            {Array.from({ length: 20 }).map((_, i) => (
                                                                <line key={i} x1={i % 2 === 0 ? i * 8 : (i + 1) * 8} y1={i % 2 === 0 ? 0 : 20} x2={i % 2 === 0 ? (i + 1) * 8 : i * 8} y2={i % 2 === 0 ? 20 : 0} stroke={web} strokeWidth="0.9" />
                                                            ))}
                                                        </svg>
                                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '9px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#334155', backgroundColor: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(241,245,249,0.92)', padding: '1px 6px', borderRadius: '3px', letterSpacing: '0.08em', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                                                            F34 · Trim {(rc.trimHeightMm / 304.8).toFixed(0)}ft · {rc.motorCount}× {rc.motorCapacity}T
                                                        </div>
                                                    </div>
                                                );

                                                // ── F32: 2-chord lighter box truss ──────────────────
                                                if (rc.trussType === 'F32') return (
                                                    <div style={{ position: 'absolute', left: 0, right: 0, top: CHAIN_H, height: TRUSS_H }}>
                                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: chordGrad, borderRadius: '2px 2px 0 0', boxShadow: shadow }} />
                                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: chordGrad, borderRadius: '0 0 2px 2px', boxShadow: shadow }} />
                                                        {/* Wider-spaced single diagonals */}
                                                        <svg style={{ position: 'absolute', top: 3, left: 0, width: '100%', height: TRUSS_H - 6 }} preserveAspectRatio="none" viewBox="0 0 160 26">
                                                            {Array.from({ length: 12 }).map((_, i) => (
                                                                <line key={i} x1={i % 2 === 0 ? i * (160 / 12) : (i + 1) * (160 / 12)} y1={i % 2 === 0 ? 0 : 26} x2={i % 2 === 0 ? (i + 1) * (160 / 12) : i * (160 / 12)} y2={i % 2 === 0 ? 26 : 0} stroke={web} strokeWidth="0.7" />
                                                            ))}
                                                        </svg>
                                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '9px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#334155', backgroundColor: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(241,245,249,0.92)', padding: '1px 6px', borderRadius: '3px', letterSpacing: '0.08em', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                                                            F32 · Trim {(rc.trimHeightMm / 304.8).toFixed(0)}ft · {rc.motorCount}× {rc.motorCapacity}T
                                                        </div>
                                                    </div>
                                                );

                                                // ── T-Bar: single top chord + drop posts ────────────
                                                if (rc.trussType === 'T-Bar') return (
                                                    <div style={{ position: 'absolute', left: 0, right: 0, top: CHAIN_H, height: TRUSS_H }}>
                                                        {/* Wide flat top chord (the cap of the T) */}
                                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 7, background: chordGrad, borderRadius: '3px 3px 0 0', boxShadow: shadow }} />
                                                        {/* Vertical drop posts (the stem of the T) */}
                                                        {Array.from({ length: 9 }).map((_, i) => (
                                                            <div key={i} style={{ position: 'absolute', left: `${(i / 8) * 100}%`, top: 7, width: 2, height: TRUSS_H - 7, background: chordGrad, transform: 'translateX(-1px)' }} />
                                                        ))}
                                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '9px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#334155', backgroundColor: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(241,245,249,0.92)', padding: '1px 6px', borderRadius: '3px', letterSpacing: '0.08em', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                                                            T-Bar · Trim {(rc.trimHeightMm / 304.8).toFixed(0)}ft · {rc.motorCount}× {rc.motorCapacity}T
                                                        </div>
                                                    </div>
                                                );

                                                // ── Box: heavy double-border box truss ──────────────
                                                return (
                                                    <div style={{ position: 'absolute', left: 0, right: 0, top: CHAIN_H, height: TRUSS_H }}>
                                                        {/* Triple top chord */}
                                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: chordGrad, borderRadius: '2px 2px 0 0', boxShadow: shadow }} />
                                                        <div style={{ position: 'absolute', top: 6, left: 0, right: 0, height: 2, background: chordGrad }} />
                                                        {/* Triple bottom chord */}
                                                        <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, height: 2, background: chordGrad }} />
                                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, background: chordGrad, borderRadius: '0 0 2px 2px', boxShadow: shadow }} />
                                                        {/* Cross-hatch web */}
                                                        <svg style={{ position: 'absolute', top: 8, left: 0, width: '100%', height: TRUSS_H - 16 }} preserveAspectRatio="none" viewBox="0 0 160 20">
                                                            {Array.from({ length: 16 }).map((_, i) => (<line key={`u${i}`} x1={i * 10} y1="0" x2={(i + 1) * 10} y2="20" stroke={web} strokeWidth="0.8" />))}
                                                            {Array.from({ length: 16 }).map((_, i) => (<line key={`d${i}`} x1={(i + 1) * 10} y1="0" x2={i * 10} y2="20" stroke={webThin} strokeWidth="0.6" />))}
                                                        </svg>
                                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '9px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#334155', backgroundColor: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(241,245,249,0.92)', padding: '1px 6px', borderRadius: '3px', letterSpacing: '0.08em', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                                                            Box · Trim {(rc.trimHeightMm / 304.8).toFixed(0)}ft · {rc.motorCount}× {rc.motorCapacity}T
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                            <div style={{ position: 'absolute', right: '-1.8rem', top: CHAIN_H + TRUSS_H / 2 - 5, fontSize: '7px', color: '#fbbf24', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                <div style={{ width: 6, height: 1, background: '#fbbf24' }} />{(rc.trimHeightMm / 304.8).toFixed(0)}ft
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Wrapper for aspect ratio enforcement - Screen + Ground Stack */}
                                <div style={{
                                    position: 'relative',
                                    width: aspectRatio > 1 ? '100%' : 'auto',
                                    height: aspectRatio <= 1 ? '100%' : 'auto',
                                    aspectRatio: `${aspectRatio}`,
                                    maxHeight: '100%',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>

                                    {/* Width Ruler (Top) */}
                                    <div style={{
                                        position: 'absolute',
                                        left: 0,
                                        right: 0,
                                        top: '-1.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: '1.5rem'
                                    }}>
                                        <div style={{
                                            color: 'var(--text-primary)',
                                            fontWeight: 'bold',
                                            fontSize: '12px',
                                            display: 'flex',
                                            gap: '0.75rem',
                                            alignItems: 'center'
                                        }}>
                                            <span>{widthFeet} ft</span>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 'normal' }}>({totalPixelsW} px)</span>
                                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>WIDTH</span>
                                        </div>
                                    </div>

                                    {/* Height Ruler (Left) */}
                                    <div style={{
                                        position: 'absolute',
                                        left: '-2.5rem',
                                        top: 0,
                                        bottom: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '1.5rem'
                                    }}>
                                        <div style={{
                                            writingMode: 'vertical-rl',
                                            transform: 'rotate(180deg)',
                                            color: 'var(--text-primary)',
                                            fontWeight: 'bold',
                                            fontSize: '12px',
                                            whiteSpace: 'nowrap',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}>
                                            <span>{heightFeet} ft</span>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 'normal' }}>({activePixelsH} px)</span>
                                            {groundOffsetMm > 0 && (
                                                <span style={{ fontSize: '9px', color: 'var(--accent-blue)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                    {totalHeightWithSupportFt}ft {riggingConfig?.groundSupportType === 'baseplate' ? 'with baseplate' : 'with towers'}
                                                </span>
                                            )}
                                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>HEIGHT</span>
                                        </div>
                                    </div>

                                    {/* 1. Grid (Base Layer) */}
                                    <div
                                        ref={canvasRef}
                                        onMouseMove={handleMouseMove}
                                        onMouseLeave={handleMouseLeave}
                                        style={{
                                            flex: 1,
                                            display: 'grid',
                                            gridTemplateColumns: `repeat(${screenCols}, 1fr)`,
                                            gridTemplateRows: `repeat(${screenRows + (blanksCount || 0)}, 1fr)`,
                                            gap: '1px',
                                            backgroundColor: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(180,180,195,0.5)',
                                            border: isDark
                                                ? '1px solid rgba(255,255,255,0.12)'
                                                : '1px solid rgba(180,180,200,0.6)',
                                            borderRadius: '4px',
                                            overflow: 'hidden',
                                            position: 'relative',
                                            cursor: state.visualConfig?.showCoordinates ? 'crosshair' : 'default',
                                            boxShadow: isDark
                                                ? '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
                                                : '0 4px 20px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
                                        }}>


                                        {/* Active Area Background Image */}
                                        {state.visualConfig?.backgroundImage && state.visualConfig?.showBackgroundImage !== false && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: `${(screenRows / (screenRows + (blanksCount || 0))) * 100}%`,
                                                backgroundImage: `url(${state.visualConfig.backgroundImage})`,
                                                backgroundSize: 'cover', // Or '100% 100%' depending on preference. 'cover' with fit? User said "fit".
                                                // Usually 'fit' means 'contain', but for mapping we want to FILL the tiles.
                                                // 'cover' crops. '100% 100%' stretches.
                                                // If I use 'cover', it looks nice. If I use 'contain', it leaves gaps.
                                                // User said "placed with a 'fit' placement".
                                                // I'll use 'cover' centering.
                                                backgroundPosition: 'center',
                                                zIndex: 0
                                            }} />
                                        )}

                                        {grid.map((row, r) => (
                                            row.map((cid, c) => {
                                                const isBlank = cid === -1;
                                                const isObstructionMode = stageConfig?.enabled;
                                                const hasImage = !!state.visualConfig?.backgroundImage && state.visualConfig?.showBackgroundImage !== false;
                                                const accent = circuitAccents[(cid - 1) % circuitAccents.length];

                                                let bgColor: string;
                                                let cellBorder: string;
                                                let cellBoxShadow: string | undefined;
                                                let cellBgImage: string | undefined;
                                                let cellOpacity = 1;
                                                let labelColor = 'rgba(255,255,255,0.5)';
                                                let labelShadow: string | undefined;

                                                if (isBlank) {
                                                    // Blank panels: distinct diagonal-hatch pattern — clearly not active
                                                    bgColor = isDark ? 'rgba(20,20,26,0.88)' : 'rgba(195,195,208,0.40)';
                                                    cellBgImage = isDark
                                                        ? 'repeating-linear-gradient(-45deg, transparent 0px, transparent 5px, rgba(255,255,255,0.035) 5px, rgba(255,255,255,0.035) 6px)'
                                                        : 'repeating-linear-gradient(-45deg, transparent 0px, transparent 5px, rgba(0,0,0,0.055) 5px, rgba(0,0,0,0.055) 6px)';
                                                    cellBorder = isDark
                                                        ? '1px solid rgba(255,255,255,0.07)'
                                                        : '1px solid rgba(150,150,170,0.45)';
                                                } else if (hasImage) {
                                                    bgColor = isDark ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.15)';
                                                    cellBorder = '1px solid rgba(255,255,255,0.08)';
                                                } else if (isObstructionMode) {
                                                    // Obstruction mode: blue glow scales with brightness slider
                                                    // Floor raised to 0.28 — always clearly visible even at 0%
                                                    const bFrac = Math.max(0, Math.min(100, brightness)) / 100;
                                                    const bgOpacity = 0.28 + bFrac * 0.36; // 0.28 → 0.64
                                                    const borderOpacity = 0.35 + bFrac * 0.35; // 0.35 → 0.70
                                                    const glowOpacity = 0.20 + bFrac * 0.35; // 0.20 → 0.55
                                                    bgColor = isDark
                                                        ? `rgba(10, 80, 160, ${bgOpacity.toFixed(3)})`
                                                        : `rgba(56, 140, 240, ${(bgOpacity * 0.82).toFixed(3)})`;
                                                    cellBorder = isDark
                                                        ? `1px solid rgba(56, 160, 255, ${borderOpacity.toFixed(3)})`
                                                        : `1px solid rgba(30, 120, 220, ${(borderOpacity * 0.9).toFixed(3)})`;
                                                    cellBoxShadow = isDark
                                                        ? `inset 0 0 ${10 + bFrac * 18}px rgba(56,160,255,${glowOpacity.toFixed(3)})`
                                                        : `inset 0 0 ${8 + bFrac * 14}px rgba(30,120,220,${(glowOpacity * 0.85).toFixed(3)})`;
                                                } else {
                                                    // Frosted colored glass — theme-aware
                                                    const cs = getCellStyle(accent);
                                                    bgColor = cs.bg;
                                                    cellBgImage = cs.bgImage;
                                                    cellBorder = cs.border;
                                                    cellBoxShadow = cs.boxShadow;
                                                    labelColor = cs.labelColor;
                                                    labelShadow = cs.labelShadow;
                                                }

                                                // ── Circuit hover highlight ─────────────────────────────
                                                // Hovered circuit gets brighter; others stay at full opacity
                                                const isActive = hoveredCircuit !== null && cid === hoveredCircuit;
                                                const cellFilter = isActive
                                                    ? 'brightness(1.55) saturate(1.30)'
                                                    : undefined;

                                                return (
                                                    <div
                                                        key={`${r}-${c}`}
                                                        className={styles.cell}
                                                        onMouseEnter={!isBlank ? () => setHoveredCircuit(cid) : undefined}
                                                        style={{
                                                            backgroundColor: bgColor,
                                                            backgroundImage: cellBgImage,
                                                            border: cellBorder,
                                                            opacity: cellOpacity,
                                                            filter: cellFilter,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            position: 'relative',
                                                            boxShadow: cellBoxShadow,
                                                            // Smooth transition for hover in/out
                                                            transition: 'opacity 0.12s ease-out, filter 0.12s ease-out',
                                                            cursor: !isBlank ? 'crosshair' : 'default',
                                                        }}
                                                        title={isBlank ? 'Blank Panel' : (!isObstructionMode ? `R${r + 1} C${c + 1} — Circuit ${cid}` : undefined)}
                                                    >
                                                        {isBlank && (
                                                            // Subtle BLK label — visible but doesn't compete with active panels
                                                            <span style={{
                                                                fontSize: '7px',
                                                                fontWeight: 700,
                                                                color: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.30)',
                                                                letterSpacing: '0.10em',
                                                                userSelect: 'none',
                                                            }}>BLK</span>
                                                        )}
                                                        {!isObstructionMode && !isBlank && !hasImage && (
                                                            <span
                                                                className={styles.circuitLabel}
                                                                style={{
                                                                    fontSize: '8px',
                                                                    fontWeight: 700,
                                                                    color: labelColor,
                                                                    letterSpacing: '0.04em',
                                                                    textShadow: labelShadow,
                                                                }}
                                                            >C{cid}</span>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ))}


                                        {/* Guides (Relative to Safe Area) */}
                                        {(() => {
                                            const obstructionMm = stageConfig?.enabled
                                                ? Math.max(0, stageConfig.heightMm - (groundStackHeightMm || 0)) + (stageConfig.safeBufferMm ?? 152)
                                                : 0;
                                            const safeHeightMm = Math.max(0, totalHeightMm - obstructionMm);
                                            const safeHeightPct = (safeHeightMm / totalHeightMm) * 100;

                                            return (
                                                <>
                                                    {state.visualConfig?.showCenterGuides && (
                                                        <>
                                                            {/* Horizontal Center of Safe Area */}
                                                            <div style={{ position: 'absolute', top: `${safeHeightPct / 2}%`, left: 0, width: '100%', height: '1px', backgroundColor: '#00ff00', zIndex: 120, opacity: 0.8, pointerEvents: 'none' }}></div>
                                                            {/* Vertical Center (Cropped to Safe Area) */}
                                                            <div style={{ position: 'absolute', top: 0, left: '50%', width: '1px', height: `${safeHeightPct}%`, backgroundColor: '#00ff00', zIndex: 120, opacity: 0.8, pointerEvents: 'none' }}></div>
                                                        </>
                                                    )}
                                                    {state.visualConfig?.showThirdsGuides && (
                                                        <>
                                                            {/* Horiz Thirds of Safe Area */}
                                                            <div style={{ position: 'absolute', top: `${safeHeightPct / 3}%`, left: 0, width: '100%', height: '1px', backgroundColor: '#06b6d4', zIndex: 120, opacity: 0.6, pointerEvents: 'none', borderTop: '1px dashed #06b6d4' }}></div>
                                                            <div style={{ position: 'absolute', top: `${safeHeightPct * 2 / 3}%`, left: 0, width: '100%', height: '1px', backgroundColor: '#06b6d4', zIndex: 120, opacity: 0.6, pointerEvents: 'none', borderTop: '1px dashed #06b6d4' }}></div>
                                                            {/* Vert Thirds (Cropped to Safe Area) */}
                                                            <div style={{ position: 'absolute', top: 0, left: '33.33%', width: '1px', height: `${safeHeightPct}%`, backgroundColor: '#06b6d4', zIndex: 120, opacity: 0.6, pointerEvents: 'none', borderLeft: '1px dashed #06b6d4' }}></div>
                                                            <div style={{ position: 'absolute', top: 0, left: '66.66%', width: '1px', height: `${safeHeightPct}%`, backgroundColor: '#06b6d4', zIndex: 120, opacity: 0.6, pointerEvents: 'none', borderLeft: '1px dashed #06b6d4' }}></div>
                                                        </>
                                                    )}
                                                </>
                                            );
                                        })()}

                                        {/* Coords Tooltip */}
                                        {state.visualConfig?.showCoordinates && hoverCoords && (
                                            <div style={{
                                                position: 'absolute',
                                                left: hoverCoords.x / (screenCols * panelPixelsW) * 100 + '%',
                                                top: hoverCoords.y / (screenRows * panelPixelsH) * 100 + '%',
                                                transform: 'translate(10px, 10px)',
                                                backgroundColor: 'rgba(0,0,0,0.8)',
                                                color: 'white',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                zIndex: 200,
                                                pointerEvents: 'none',
                                                whiteSpace: 'nowrap',
                                                border: '1px solid #555'
                                            }}>
                                                X: {hoverCoords.x} | Y: {hoverCoords.y}
                                            </div>
                                        )}

                                        {/* Resolution Overlays */}
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            pointerEvents: 'none'
                                        }}>
                                            {state.visualConfig?.showResolutionOverlays !== false && renderResolutionOverlays()}
                                        </div>
                                    </div>

                                    {/* STAGE OBSTRUCTION OVERLAY */}
                                    {stageConfig?.enabled && (
                                        <>
                                            {/* Blocked Area Overlays (Physical Stage) */}
                                            {overlapPixelsH > 0 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    left: `${50 + (stageConfig.offsetXMm / totalWidthMm) * 100}%`,
                                                    transform: 'translateX(-50%)',
                                                    width: `${(stageConfig.widthMm / totalWidthMm) * 100}%`,
                                                    height: `${(overlapPixelsH / totalPixelsH) * 100}%`,
                                                    // Bold hazard pattern: diagonal red/black stripes
                                                    background: `repeating-linear-gradient(
                                                        -45deg,
                                                        rgba(239,68,68,0.82) 0px,
                                                        rgba(239,68,68,0.82) 10px,
                                                        rgba(0,0,0,0.75) 10px,
                                                        rgba(0,0,0,0.75) 20px
                                                    )`,
                                                    borderTop: '3px solid #ef4444',
                                                    borderLeft: '2px solid #ef4444',
                                                    borderRight: '2px solid #ef4444',
                                                    boxShadow: 'inset 0 0 0 1px rgba(255,100,100,0.4), 0 0 20px rgba(239,68,68,0.4)',
                                                    zIndex: 50,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    fontWeight: 'bold',
                                                    fontSize: '12px',
                                                    textAlign: 'center',
                                                    padding: '4px',
                                                    pointerEvents: 'none',
                                                    gap: '2px',
                                                }}>
                                                    <span style={{
                                                        background: 'rgba(0,0,0,0.7)',
                                                        color: '#ff6b6b',
                                                        padding: '3px 10px',
                                                        borderRadius: '4px',
                                                        letterSpacing: '0.12em',
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        textShadow: '0 0 8px rgba(255,80,80,0.8)',
                                                        border: '1px solid rgba(239,68,68,0.6)',
                                                    }}>BLOCKED</span>
                                                    <span style={{ fontSize: '10px', color: 'rgba(255,200,200,0.9)', background: 'rgba(0,0,0,0.5)', padding: '1px 6px', borderRadius: '3px' }}>
                                                        {Math.round((stageConfig.widthMm / totalWidthMm) * totalPixelsW)}px W x {blockedActivePixels}px H
                                                    </span>
                                                </div>
                                            )}

                                            {/* Safe Buffer Zone (Wrapped) */}
                                            {overlapPixelsH > 0 && (
                                                <>
                                                    {/* Buffer Outline Box — theme-safe colour via property */}
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: 0,
                                                        left: `${50 + (stageConfig.offsetXMm / totalWidthMm) * 100}%`,
                                                        transform: 'translateX(-50%)',
                                                        width: `${((stageConfig.widthMm + (stageConfig.safeBufferMm ?? 152) * 2) / totalWidthMm) * 100}%`,
                                                        height: `${((Math.max(0, stageConfig.heightMm - (groundStackHeightMm || 0)) + (stageConfig.safeBufferMm ?? 152)) / totalHeightMm) * 100}%`,
                                                        pointerEvents: 'none',
                                                        zIndex: 105,
                                                        border: '2px dashed var(--accent-teal)',
                                                        borderBottom: 'none',
                                                        backgroundColor: 'rgba(90, 200, 250, 0.08)',
                                                        display: 'flex',
                                                        justifyContent: 'center',
                                                        alignItems: 'flex-start'
                                                    }}>
                                                        <div style={{
                                                            backgroundColor: 'var(--accent-teal)',
                                                            padding: '2px 6px',
                                                            color: '#000',
                                                            fontSize: '10px',
                                                            fontWeight: 'bold',
                                                            borderRadius: '0 0 4px 4px',
                                                            marginTop: '-1px'
                                                        }}>
                                                            BUFFER
                                                        </div>
                                                    </div>

                                                    {/* Left Safe Width Indicator */}
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: 10,
                                                        left: 0,
                                                        width: `${Math.max(0, 50 + (stageConfig.offsetXMm / totalWidthMm) * 100 - ((stageConfig.widthMm + (stageConfig.safeBufferMm ?? 152) * 2) / totalWidthMm) * 100 / 2)}%`,
                                                        height: '20px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        zIndex: 110,
                                                        borderBottom: '1px solid var(--accent-teal)'
                                                    }}>
                                                        <span style={{ fontSize: '10px', color: 'var(--accent-teal)', backgroundColor: 'rgba(0,0,0,0.75)', padding: '0 4px', borderRadius: '2px' }}>
                                                            {Math.max(0, Math.round((totalPixelsW) * (0.5 + (stageConfig.offsetXMm / totalWidthMm) - ((stageConfig.widthMm + (stageConfig.safeBufferMm ?? 152) * 2) / totalWidthMm) / 2)))} px
                                                        </span>
                                                    </div>

                                                    {/* Right Safe Width Indicator */}
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: 10,
                                                        right: 0,
                                                        width: `${Math.max(0, 100 - (50 + (stageConfig.offsetXMm / totalWidthMm) * 100 + ((stageConfig.widthMm + (stageConfig.safeBufferMm ?? 152) * 2) / totalWidthMm) * 100 / 2))}%`,
                                                        height: '20px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        zIndex: 110,
                                                        borderBottom: '1px solid var(--accent-teal)'
                                                    }}>
                                                        <span style={{ fontSize: '10px', color: 'var(--accent-teal)', backgroundColor: 'rgba(0,0,0,0.75)', padding: '0 4px', borderRadius: '2px' }}>
                                                            {Math.max(0, Math.round((totalPixelsW) * (1 - (0.5 + (stageConfig.offsetXMm / totalWidthMm) + ((stageConfig.widthMm + (stageConfig.safeBufferMm ?? 152) * 2) / totalWidthMm) / 2))))} px
                                                        </span>
                                                    </div>

                                                    {/* Top Safe Height Indicator */}
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: '50%',
                                                        transform: 'translateX(-50%)',
                                                        height: `${(safeActiveHeightMm / totalHeightMm) * 100}%`,
                                                        width: '20px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        zIndex: 110,
                                                        borderLeft: '1px solid var(--accent-teal)'
                                                    }}>
                                                        <span style={{
                                                            fontSize: '10px',
                                                            color: 'var(--accent-teal)',
                                                            backgroundColor: 'rgba(0,0,0,0.75)',
                                                            padding: '0 4px',
                                                            borderRadius: '2px',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {safeActivePixels} px
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* GROUND STACK VISUAL — hidden when flown */}
                                {groundStackHeightMm > 0 && riggingConfig?.mode !== 'flown' && (
                                    <div style={{
                                        width: '100%',
                                        height: '28px',
                                        flexShrink: 0,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'flex-start',
                                        marginTop: '2px',
                                    }}>
                                        <div style={{
                                            width: '100%',
                                            height: '1rem',
                                            borderLeft: '1px solid var(--text-secondary)',
                                            borderRight: '1px solid var(--text-secondary)',
                                            borderTop: '1px solid var(--text-secondary)',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            position: 'relative'
                                        }}>
                                            <span style={{
                                                position: 'absolute',
                                                top: '100%',
                                                fontSize: '10px',
                                                color: 'var(--text-secondary)',
                                                marginTop: '2px'
                                            }}>
                                                {riggingConfig?.groundSupportType === 'baseplate'
                                                    ? `Baseplate: ${groundStackHeightMm}mm (${(groundStackHeightMm / 25.4).toFixed(1)} in)`
                                                    : `Towers: ${(groundStackHeightMm / 304.8).toFixed(1)} ft`}
                                            </span>
                                            <div style={{ width: '2px', height: '100%', backgroundColor: 'var(--text-secondary)', position: 'absolute', left: '15%' }}></div>
                                            <div style={{ width: '2px', height: '100%', backgroundColor: 'var(--text-secondary)', position: 'absolute', right: '15%' }}></div>
                                            {riggingConfig?.groundSupportType === 'towers' && (
                                                <>
                                                    <div style={{ width: '2px', height: '100%', backgroundColor: 'var(--text-secondary)', position: 'absolute', left: '40%' }}></div>
                                                    <div style={{ width: '2px', height: '100%', backgroundColor: 'var(--text-secondary)', position: 'absolute', right: '40%' }}></div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </TransformComponent>
                        </>
                    )}
                </TransformWrapper>
            </div>

            <div className={styles.legend}>
                {Array.from({ length: currentCircuit }).map((_, i) => {
                    const accent = circuitAccents[i % circuitAccents.length];
                    return (
                        <div key={i} className={styles.legendItem}>
                            <span
                                className={styles.dot}
                                style={{
                                    backgroundColor: accent.solid,
                                    filter: `drop-shadow(0 0 4px ${accent.solid}) drop-shadow(0 0 2px ${accent.solid})`,
                                }}
                            />
                            C{i + 1}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Visualizer;
