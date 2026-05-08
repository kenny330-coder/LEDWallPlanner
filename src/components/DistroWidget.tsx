import React from 'react';
import type { DistroConfig, PowerCircuit } from '../context/StateContext';
import { getWattsPerPanel, type PowerPoint } from '../utils/powerLogic';

// ── Distro type catalogue ────────────────────────────────────────────────────
export const DISTRO_TYPES: Array<{
    id: DistroConfig['type'];
    label: string;
    shortLabel: string;
    inConnector: string;
    outConnector: string;
    circuitsPerDistro: number;
    description: string;
}> = [
    {
        id: 'soca-breakout',
        label: 'Socapex Breakout (6-way)',
        shortLabel: 'Soca → Pigtail',
        inConnector: 'Socapex 19-pin',
        outConnector: 'Pigtail / Bare',
        circuitsPerDistro: 6,
        description: '1 Socapex feeds 6 individually protected circuits via breakout',
    },
    {
        id: 'lex-lunchbox',
        label: 'Lex LSC Lunch Box (Soca → L6-20)',
        shortLabel: 'Lex Lunch Box',
        inConnector: 'Socapex 19-pin',
        outConnector: 'L6-20 Twist-Lock',
        circuitsPerDistro: 6,
        description: 'Industry-standard Lex LSC: 1 Soca in, 6 × L6-20 out with per-circuit CBs',
    },
    {
        id: 'cam-l620-6',
        label: 'Cam Lock Distro (6-way L6-20)',
        shortLabel: 'Cam → L6-20 ×6',
        inConnector: 'Cam Lock (200A)',
        outConnector: 'L6-20 Twist-Lock',
        circuitsPerDistro: 6,
        description: '1 Cam Lock input split into 6 × 20A L6-20 outputs',
    },
    {
        id: 'cam-l620-12',
        label: 'Cam Lock Distro (12-way L6-20)',
        shortLabel: 'Cam → L6-20 ×12',
        inConnector: 'Cam Lock (400A)',
        outConnector: 'L6-20 Twist-Lock',
        circuitsPerDistro: 12,
        description: '1 large Cam input split into 12 × 20A L6-20 outputs',
    },
    {
        id: 'cam-soca-4',
        label: 'Cam Lock → 4× Socapex',
        shortLabel: 'Cam → Soca ×4',
        inConnector: 'Cam Lock (400A)',
        outConnector: 'Socapex 19-pin',
        circuitsPerDistro: 24,
        description: '1 large Cam → 4 Soca connectors (24 circuits total via secondary breakouts)',
    },
    {
        id: 'l630-breakout',
        label: 'L6-30 Breakout (3-way L6-20)',
        shortLabel: 'L6-30 → L6-20 ×3',
        inConnector: 'L6-30 Twist-Lock',
        outConnector: 'L6-20 Twist-Lock',
        circuitsPerDistro: 3,
        description: '1 × 30A L6-30 broken out into 3 × 20A L6-20 legs',
    },
    {
        id: 'powercon-ring',
        label: 'Neutrik PowerCON Ring / Daisy',
        shortLabel: 'PowerCON Ring',
        inConnector: 'PowerCON True1 (16A)',
        outConnector: 'PowerCON True1',
        circuitsPerDistro: 1,
        description: 'PowerCON daisy-chain: each distro = 1 circuit feeding 1 cable run',
    },
    {
        id: 'cee32-l620',
        label: 'CEE 32A → L6-20 (6-way)',
        shortLabel: 'CEE32 → L6-20 ×6',
        inConnector: 'CEE 32A / IEC 309',
        outConnector: 'L6-20 Twist-Lock',
        circuitsPerDistro: 6,
        description: 'International standard: CEE 32A (blue) → 6 × L6-20 with CBs',
    },
    {
        id: 'custom',
        label: 'Custom / User Defined',
        shortLabel: 'Custom',
        inConnector: 'Custom',
        outConnector: 'Custom',
        circuitsPerDistro: 6,
        description: 'Define your own circuit count per distro unit',
    },
];

export const getDistroSpec = (type: DistroConfig['type']) =>
    DISTRO_TYPES.find(d => d.id === type) ?? DISTRO_TYPES[1];

// ── Widget ───────────────────────────────────────────────────────────────────
interface DistroWidgetProps {
    distroConfig: DistroConfig;
    circuits: PowerCircuit[];          // custom circuit list (may be empty)
    circuitsNeeded: number;            // auto-calculated from power math
    brightness: number;
    panelMaxWatts: number;
    voltage: number;
    circuitBreakerAmps: number;
    customCurve?: PowerPoint[];
    isDark: boolean;
}

const DistroWidget: React.FC<DistroWidgetProps> = ({
    distroConfig,
    circuits,
    circuitsNeeded,
    brightness,
    panelMaxWatts,
    voltage,
    circuitBreakerAmps,
    customCurve,
    isDark,
}) => {
    const spec = getDistroSpec(distroConfig.type);
    const cpd = distroConfig.circuitsPerDistro;

    const wattsPerPanel = getWattsPerPanel(brightness, panelMaxWatts, customCurve);
    const ampsPerCircuit = circuits.length > 0
        ? circuits.map(c => (c.panelIds.length * wattsPerPanel) / voltage)
        : null;

    // Effective total circuits = custom if defined, else auto-calculated
    const totalCircuits = circuits.length > 0 ? circuits.length : circuitsNeeded;
    const distroCount = Math.ceil(totalCircuits / cpd);

    const glass = isDark
        ? 'rgba(20,21,30,0.92)'
        : 'rgba(250,250,255,0.92)';
    const border = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,20,0.12)';
    const textPrimary = isDark ? '#e8e8f0' : '#111';
    const textSecondary = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';

    // ── Capacity colour ── green < 60 % / amber < 85 % / red >= 85 %
    const capColor = (amps: number) => {
        const pct = amps / circuitBreakerAmps;
        if (pct >= 0.85) return '#ef4444';
        if (pct >= 0.60) return '#f59e0b';
        return '#22c55e';
    };

    // ── Build list of distro units ──────────────────────────────────────────
    const units = Array.from({ length: distroCount }, (_, d) => {
        const slotStart = d * cpd;
        const slots: Array<{ circuitIndex: number; color: string; amps: number | null }> = [];
        for (let s = 0; s < cpd; s++) {
            const ci = slotStart + s;
            if (ci < totalCircuits) {
                slots.push({
                    circuitIndex: ci,
                    color: circuits[ci]?.color ?? '#6b7280',
                    amps: ampsPerCircuit ? ampsPerCircuit[ci] : null,
                });
            } else {
                slots.push({ circuitIndex: -1, color: 'transparent', amps: null });
            }
        }
        return { id: d, slots };
    });

    return (
        <div style={{
            position: 'absolute',
            bottom: '1rem',
            left: '1rem',
            zIndex: 800,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            maxWidth: '260px',
            pointerEvents: 'none',
            userSelect: 'none',
        }}>
            {/* Header badge */}
            <div style={{
                background: glass,
                border: `1px solid ${border}`,
                borderRadius: '10px',
                padding: '0.45rem 0.7rem',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}>
                {/* Bolt icon in amber */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {spec.shortLabel}
                    </div>
                    <div style={{ fontSize: '0.55rem', color: textSecondary, whiteSpace: 'nowrap' }}>
                        {spec.inConnector} → {spec.outConnector} • {cpd} circuits/unit
                    </div>
                </div>
                <div style={{
                    background: 'rgba(245,158,11,0.15)',
                    border: '1px solid rgba(245,158,11,0.35)',
                    borderRadius: '6px',
                    padding: '0.15rem 0.45rem',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#f59e0b',
                    whiteSpace: 'nowrap',
                }}>
                    {distroCount} unit{distroCount !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Distro units grid */}
            {units.map(unit => (
                <div key={unit.id} style={{
                    background: glass,
                    border: `1px solid ${border}`,
                    borderRadius: '10px',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                }}>
                    {/* Unit title bar */}
                    <div style={{
                        padding: '0.3rem 0.6rem',
                        borderBottom: `1px solid ${border}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                    }}>
                        {/* Distro box icon */}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="7" width="20" height="14" rx="2" />
                            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                        </svg>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Distro {unit.id + 1}
                        </span>
                        {/* Input connector pill */}
                        <div style={{
                            marginLeft: 'auto',
                            fontSize: '0.5rem',
                            color: textSecondary,
                            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                            borderRadius: '4px',
                            padding: '0.1rem 0.3rem',
                            whiteSpace: 'nowrap',
                        }}>
                            IN: {spec.inConnector}
                        </div>
                    </div>

                    {/* Circuit slots */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${Math.min(cpd, 6)}, 1fr)`,
                        gap: '4px',
                        padding: '0.5rem',
                    }}>
                        {unit.slots.map((slot, si) => {
                            if (slot.circuitIndex < 0) {
                                return (
                                    <div key={si} style={{
                                        height: '32px',
                                        borderRadius: '6px',
                                        border: `1px dashed ${border}`,
                                        opacity: 0.3,
                                    }} />
                                );
                            }
                            const isEmpty = circuits.length === 0 || !circuits[slot.circuitIndex];
                            return (
                                <div key={si} style={{
                                    height: '38px',
                                    borderRadius: '6px',
                                    border: `2px solid ${slot.color}`,
                                    background: `${slot.color}22`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '2px',
                                    boxShadow: `0 0 8px ${slot.color}44`,
                                    position: 'relative',
                                }}>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: isDark ? '#fff' : '#111', lineHeight: 1 }}>
                                        C{slot.circuitIndex + 1}
                                    </span>
                                    {slot.amps !== null && !isEmpty && (
                                        <span style={{ fontSize: '0.5rem', fontWeight: 600, color: capColor(slot.amps), lineHeight: 1 }}>
                                            {slot.amps.toFixed(1)}A
                                        </span>
                                    )}
                                    {/* OUT connector dot */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '-5px',
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: slot.color,
                                        border: `2px solid ${isDark ? '#14151e' : '#fff'}`,
                                        boxShadow: `0 0 6px ${slot.color}`,
                                    }} />
                                </div>
                            );
                        })}
                    </div>

                    {/* OUT connector label strip */}
                    <div style={{
                        padding: '0.25rem 0.6rem',
                        borderTop: `1px solid ${border}`,
                        fontSize: '0.5rem',
                        color: textSecondary,
                        textAlign: 'center',
                        letterSpacing: '0.04em',
                    }}>
                        OUT: {spec.outConnector}
                    </div>
                </div>
            ))}

            {/* Total summary */}
            <div style={{
                background: glass,
                border: `1px solid ${border}`,
                borderRadius: '8px',
                padding: '0.35rem 0.7rem',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                fontSize: '0.6rem',
                color: textSecondary,
                display: 'flex',
                justifyContent: 'space-between',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            }}>
                <span>{distroCount} distro unit{distroCount !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>{totalCircuits} circuits</span>
                <span>•</span>
                <span>{circuitBreakerAmps}A CBs</span>
            </div>
        </div>
    );
};

export default DistroWidget;
