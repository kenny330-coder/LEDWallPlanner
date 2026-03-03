import React, { useMemo, useState, useEffect } from 'react';
import { useAppState } from '../context/StateContext';
import styles from '../styles/Settings.module.css';
import { getAmbientLuxFromBrightness } from '../utils/powerLogic';

import { initialPanels, type PanelSpec } from '../data/panelSpecs';
import { ChevronDown, Check, Moon, Monitor, Cloud, Sun, Zap, Layers, Eye, Activity, Anchor } from 'lucide-react';


const InchesInput: React.FC<{
    valueMm: number;
    onChangeMm: (val: number) => void;
    label: string;
    description?: string;
}> = ({ valueMm, onChangeMm, label, description }) => {
    const [localVal, setLocalVal] = useState<string>('');
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) {
            setLocalVal(valueMm ? (valueMm / 25.4).toFixed(2) : '');
        }
    }, [valueMm, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalVal(e.target.value);
    };

    const commitChange = () => {
        const num = parseFloat(localVal);
        if (!isNaN(num)) {
            onChangeMm(Math.round(num * 25.4));
        } else if (localVal === '') {
            onChangeMm(0);
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        commitChange();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        }
    };

    return (
        <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>{label}</label>
            <input
                type="text"
                inputMode="decimal"
                value={localVal}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={styles.input}
                title={description}
            />
        </div>
    );
};

const FeetDimensionInput: React.FC<{
    valuePanels: number;
    panelMm: number;
    onChangePanels: (panels: number) => void;
    label: string;
}> = ({ valuePanels, panelMm, onChangePanels, label }) => {
    const [localVal, setLocalVal] = useState<string>('');
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) {
            const ft = (valuePanels * panelMm) / 304.8;
            setLocalVal(ft > 0 ? ft.toFixed(2).replace(/\.?0+$/, '') : '');
        }
    }, [valuePanels, panelMm, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalVal(e.target.value);
    };

    const commitChange = () => {
        const val = parseFloat(localVal);
        if (!isNaN(val) && val > 0 && panelMm > 0) {
            // calculate the maximum number of panels that fit without exceeding the feet
            let panels = Math.floor((val * 304.8) / panelMm);
            panels = Math.max(1, panels);
            onChangePanels(panels);
            // After calculating the nearest panel count, immediately snap the text
            // value to display exactly how large that panel array is in feet
            const actualFt = (panels * panelMm) / 304.8;
            setLocalVal(actualFt.toFixed(2).replace(/\.?0+$/, ''));
        } else if (localVal === '') {
            onChangePanels(1);
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        commitChange();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        }
    };

    return (
        <div className={styles.inputGroup} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label className={styles.inputLabel} style={{ marginBottom: '0.25rem' }}>{label}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button
                    onClick={() => onChangePanels(Math.max(1, valuePanels - 1))}
                    className={styles.input}
                    style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer', flexShrink: 0 }}
                >-</button>
                <input
                    type="text"
                    inputMode="decimal"
                    value={localVal}
                    onChange={handleChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className={styles.input}
                    style={{ textAlign: 'center', width: '100%' }}
                    title={`Target size in feet. Max full panels that fit without going over.`}
                />
                <button
                    onClick={() => onChangePanels(valuePanels + 1)}
                    className={styles.input}
                    style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer', flexShrink: 0 }}
                >+</button>
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--accent-blue)', marginTop: '0.35rem', fontWeight: 600 }}>
                {valuePanels} {valuePanels === 1 ? 'panel' : 'panels'}
            </div>
        </div>
    );
};

interface DropdownOption {
    value: number;
    label: string;
}

const SelectDropdown: React.FC<{
    label: string;
    value: number;
    options: DropdownOption[];
    onSelect: (val: number) => void;
    isOpen: boolean;
    setIsOpen: (val: boolean) => void;
}> = ({ label, value, options, onSelect, isOpen, setIsOpen }) => {
    const selected = options.find(o => o.value === value);
    return (
        <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>{label}</label>
            <div
                className={styles.input}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderColor: isOpen ? 'var(--accent-blue)' : undefined
                }}
            >
                <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{selected?.label || value}</span>
                <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text-secondary)' }} />
            </div>
            {isOpen && (
                <div style={{
                    marginTop: '0.4rem',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-xs)',
                    background: 'var(--glass-bg)',
                    backdropFilter: 'saturate(180%) blur(20px)',
                    WebkitBackdropFilter: 'saturate(180%) blur(20px)',
                    boxShadow: 'var(--glass-shadow)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    zIndex: 100,
                }}>
                    {options.map((opt, idx) => {
                        const isSelected = opt.value === value;
                        return (
                            <div
                                key={opt.value}
                                onClick={() => { onSelect(opt.value); setIsOpen(false); }}
                                style={{
                                    padding: '0.65rem 0.85rem',
                                    borderBottom: idx < options.length - 1 ? '1px solid var(--glass-border)' : 'none',
                                    cursor: 'pointer',
                                    background: isSelected ? 'rgba(10,132,255,0.12)' : 'transparent',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)',
                                    fontSize: '0.85rem',
                                    fontWeight: isSelected ? 600 : 400,
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = isSelected ? 'rgba(10,132,255,0.18)' : 'var(--glass-highlight)')}
                                onMouseLeave={e => (e.currentTarget.style.background = isSelected ? 'rgba(10,132,255,0.12)' : 'transparent')}
                            >
                                <span>{opt.label}</span>
                                {isSelected && <Check size={14} color="var(--accent-blue)" />}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const CollapsibleSection: React.FC<{
    title: string;
    storageKey: string;
    defaultOpen?: boolean;
    icon?: React.ReactNode;
    children: React.ReactNode;
}> = ({ title, storageKey, defaultOpen = false, icon, children }) => {
    const [isOpen, setIsOpen] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved !== null ? saved === 'true' : defaultOpen;
        } catch { return defaultOpen; }
    });

    useEffect(() => {
        localStorage.setItem(storageKey, String(isOpen));
    }, [isOpen, storageKey]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* The "Apple Style" Container: A unified glass surface */}
            <div style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: '16px', // Premium rounded corners
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                boxShadow: isOpen ? 'var(--glass-shadow)' : '0 1px 3px rgba(0,0,0,0.05)',
            }}>
                {/* Header Row */}
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        padding: '12px 16px',
                        background: isOpen ? 'var(--glass-highlight)' : 'transparent',
                        borderBottom: isOpen ? '1px solid var(--glass-border)' : '1px solid transparent',
                        transition: 'border-bottom 0.3s ease, background 0.2s ease',
                    }}
                    onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.background = 'var(--glass-highlight)'; }}
                    onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Icon Wrapper */}
                        {icon && React.isValidElement(icon) && (
                            <div style={{
                                color: isOpen ? 'var(--accent-blue)' : 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'color 0.3s ease',
                            }}>
                                {React.cloneElement(icon as React.ReactElement<any>, { size: 18, strokeWidth: 2 })}
                            </div>
                        )}
                        <span style={{
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            color: isOpen ? 'var(--text-primary)' : 'var(--text-secondary)',
                            letterSpacing: '0.01em',
                            transition: 'color 0.3s ease'
                        }}>
                            {title}
                        </span>
                    </div>

                    {/* Chevron with animation */}
                    <div style={{
                        color: 'var(--text-secondary)',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        opacity: 0.7
                    }}>
                        <ChevronDown size={16} strokeWidth={2.5} />
                    </div>
                </div>

                {/* Content Area - Animated Unveil */}
                <div style={{
                    maxHeight: isOpen ? '1000px' : '0px',
                    opacity: isOpen ? 1 : 0,
                    overflow: 'hidden', // Crucial for transition
                    transition: 'max-height 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease-in-out',
                }}>
                    <div style={{ padding: '16px', paddingTop: '12px' }}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

interface SettingsPanelProps {
    availablePanels?: PanelSpec[];
    onSelectPanel?: (panel: PanelSpec) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ availablePanels = initialPanels, onSelectPanel }) => {
    const { state, dispatch } = useAppState();

    const [selectedPanelId, setSelectedPanelId] = useState<string>('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isVoltageOpen, setIsVoltageOpen] = useState(false);
    const [isBreakerOpen, setIsBreakerOpen] = useState(false);
    const [dimUnit, setDimUnit] = useState<'panels' | 'ft'>('panels');

    useEffect(() => {
        const lastId = localStorage.getItem('lastSelectedPanelId');
        if (lastId && availablePanels) {
            const p = availablePanels.find(x => x.id === lastId);
            if (p) {
                setSelectedPanelId(lastId);
                if (onSelectPanel) onSelectPanel(p);
            }
        }
    }, [availablePanels]); // Added dependency

    const handlePanelSelect = (p: PanelSpec) => {
        setSelectedPanelId(p.id);
        localStorage.setItem('lastSelectedPanelId', p.id);
        if (onSelectPanel) onSelectPanel(p);
        setIsDropdownOpen(false);
    };



    // Non-linear slider logic must be inside the component
    const toSliderPos = (b: number) => {
        if (b <= 30) return (b / 30) * 60;
        return 60 + ((b - 30) / 70) * 40;
    };

    const fromSliderPos = (p: number) => {
        if (p <= 60) return (p / 60) * 30;
        return 30 + ((p - 60) / 40) * 70;
    };


    // Local state for smooth slider movement
    const [sliderPos, setSliderPos] = useState(toSliderPos(state.brightness));

    // Sync if external state changes
    useEffect(() => {
        const target = toSliderPos(state.brightness);
        if (Math.abs(target - sliderPos) > 0.5) {
            setSliderPos(target);
        }
    }, [state.brightness]);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const pos = Number(e.target.value);
        setSliderPos(pos);
        const b = fromSliderPos(pos);
        const roundedB = Math.round(b);
        dispatch({ type: 'SET_BRIGHTNESS', payload: roundedB });
    };

    const estimatedLux = useMemo(() => getAmbientLuxFromBrightness(state.brightness, state.maxNits), [state.brightness, state.maxNits]);

    // Marker positions removed — presets now use pill buttons

    // Removed handleSelectPanel



    return (
        <div className={styles.panel}>


            {/* Modal Removed */}

            {/* Panel Presets */}
            <div className={styles.section}>
                <label className={styles.label}>Panel Library</label>
                <div
                    className={styles.input}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    style={{
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderColor: isDropdownOpen ? 'var(--accent-blue)' : undefined
                    }}
                >
                    <span style={{ color: selectedPanelId ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {selectedPanelId
                            ? (() => { const p = availablePanels.find(x => x.id === selectedPanelId); return p ? `${p.manufacturer} ${p.model}` : 'Select Panel...'; })()
                            : 'Select Panel...'
                        }
                    </span>
                    <ChevronDown size={16} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>

                {isDropdownOpen && (
                    <div style={{
                        marginTop: '0.5rem',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '0.375rem',
                        backgroundColor: 'var(--input-bg)',
                        backdropFilter: 'blur(10px)',
                        overflow: 'hidden'
                    }}>
                        {availablePanels.map(p => {
                            const isSelected = selectedPanelId === p.id;
                            return (
                                <div
                                    key={p.id}
                                    onClick={() => handlePanelSelect(p)}
                                    style={{
                                        padding: '0.75rem',
                                        borderBottom: '1px solid var(--glass-border)',
                                        cursor: 'pointer',
                                        backgroundColor: isSelected ? 'var(--glass-highlight)' : 'transparent',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isSelected ? 'var(--glass-highlight)' : 'var(--glass-bg)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected ? 'var(--glass-highlight)' : 'transparent'}
                                >
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{p.manufacturer} {p.model}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem', display: 'flex', gap: '0.75rem' }}>
                                            <span>{(p.widthMm / p.pixelsW).toFixed(1)}mm</span>
                                            <span>{p.brightnessNits} nits</span>
                                            <span>{p.weightKg}kg</span>
                                        </div>
                                    </div>
                                    {isSelected && <Check size={16} color="var(--accent-blue)" />}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Screen Dimensions */}
            <div className={styles.section}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className={styles.label} style={{ marginBottom: 0 }}>Dimensions</label>
                    <div style={{ display: 'flex', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '999px', padding: '2px' }}>
                        <button
                            onClick={() => setDimUnit('panels')}
                            style={{
                                padding: '2px 8px', borderRadius: '999px', border: 'none',
                                background: dimUnit === 'panels' ? 'var(--accent-blue)' : 'transparent',
                                color: dimUnit === 'panels' ? '#fff' : 'var(--text-secondary)',
                                fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', outline: 'none'
                            }}
                        >Panels</button>
                        <button
                            onClick={() => setDimUnit('ft')}
                            style={{
                                padding: '2px 8px', borderRadius: '999px', border: 'none',
                                background: dimUnit === 'ft' ? 'var(--accent-blue)' : 'transparent',
                                color: dimUnit === 'ft' ? '#fff' : 'var(--text-secondary)',
                                fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', outline: 'none'
                            }}
                        >Feet</button>
                    </div>
                </div>

                <div className={styles.row}>
                    {dimUnit === 'panels' ? (
                        <>
                            <div className={styles.inputGroup}>
                                <label className={styles.inputLabel}>Width (Panels)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <button
                                        onClick={() => dispatch({ type: 'SET_SCREEN_DIMS', payload: { cols: Math.max(1, state.screenCols - 1), rows: state.screenRows } })}
                                        className={styles.input}
                                        style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer' }}
                                    >-</button>
                                    <input
                                        type="number"
                                        min="1"
                                        value={state.screenCols}
                                        onChange={(e) => dispatch({ type: 'SET_SCREEN_DIMS', payload: { cols: Number(e.target.value), rows: state.screenRows } })}
                                        className={styles.input}
                                        style={{ textAlign: 'center' }}
                                    />
                                    <button
                                        onClick={() => dispatch({ type: 'SET_SCREEN_DIMS', payload: { cols: state.screenCols + 1, rows: state.screenRows } })}
                                        className={styles.input}
                                        style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer' }}
                                    >+</button>
                                </div>
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.inputLabel}>Height (Panels)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <button
                                        onClick={() => dispatch({ type: 'SET_SCREEN_DIMS', payload: { cols: state.screenCols, rows: Math.max(1, state.screenRows - 1) } })}
                                        className={styles.input}
                                        style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer' }}
                                    >-</button>
                                    <input
                                        type="number"
                                        min="1"
                                        value={state.screenRows}
                                        onChange={(e) => dispatch({ type: 'SET_SCREEN_DIMS', payload: { cols: state.screenCols, rows: Number(e.target.value) } })}
                                        className={styles.input}
                                        style={{ textAlign: 'center' }}
                                    />
                                    <button
                                        onClick={() => dispatch({ type: 'SET_SCREEN_DIMS', payload: { cols: state.screenCols, rows: state.screenRows + 1 } })}
                                        className={styles.input}
                                        style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer' }}
                                    >+</button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <FeetDimensionInput
                                label="Max Fit W (ft)"
                                valuePanels={state.screenCols}
                                panelMm={state.panelWidthMm}
                                onChangePanels={(cols) => dispatch({ type: 'SET_SCREEN_DIMS', payload: { cols, rows: state.screenRows } })}
                            />
                            <FeetDimensionInput
                                label="Max Fit H (ft)"
                                valuePanels={state.screenRows}
                                panelMm={state.panelHeightMm}
                                onChangePanels={(rows) => dispatch({ type: 'SET_SCREEN_DIMS', payload: { cols: state.screenCols, rows } })}
                            />
                        </>
                    )}
                </div>
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--glass-highlight)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border-t)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Panel Specification</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>Dimensions</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                {state.panelWidthMm} × {state.panelHeightMm} <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>mm</span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', marginTop: '0.1rem' }}>
                                {(state.panelWidthMm / 25.4).toFixed(1)} × {(state.panelHeightMm / 25.4).toFixed(1)} <span style={{ opacity: 0.7 }}>in</span>
                            </div>
                        </div>

                        <div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>Weight & Base</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                {state.panelWeightKg} <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>kg</span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', marginTop: '0.1rem' }}>
                                {(state.panelWeightKg * 2.20462).toFixed(1)} <span style={{ opacity: 0.7 }}>lbs</span> | Base: {(state.groundStackHeightMm || 0)}mm
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ height: '1rem' }} />

            {/* Stage Obstruction (Collapsible) */}
            <CollapsibleSection title="Stage Obstruction" storageKey="spp_stage_open" defaultOpen={false} icon={<Layers />}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Mask Obstruction</span>
                    <button
                        role="switch"
                        aria-checked={state.stageConfig?.enabled || false}
                        onClick={() => dispatch({ type: 'SET_STAGE_CONFIG', payload: { enabled: !state.stageConfig?.enabled } })}
                        style={{
                            width: '40px',
                            height: '22px',
                            backgroundColor: state.stageConfig?.enabled ? 'var(--accent-blue)' : 'var(--glass-border)',
                            borderRadius: '9999px',
                            position: 'relative',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            padding: 0,
                            outline: 'none'
                        }}
                    >
                        <span style={{
                            display: 'block',
                            width: '18px',
                            height: '18px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: state.stageConfig?.enabled ? '20px' : '2px',
                            transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* Blanks Row */}
                    <div className={styles.row}>
                        <div className={styles.inputGroup} style={{ flex: 1 }}>
                            <label className={styles.inputLabel}>Blank Rows (Bottom)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <button
                                    onClick={() => dispatch({ type: 'SET_BLANKS_COUNT', payload: Math.max(0, (state.blanksCount || 0) - 1) })}
                                    className={styles.input}
                                    style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer' }}
                                >-</button>
                                <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={state.blanksCount || 0}
                                    onChange={(e) => dispatch({ type: 'SET_BLANKS_COUNT', payload: Math.max(0, parseInt(e.target.value) || 0) })}
                                    className={styles.input}
                                    style={{ textAlign: 'center' }}
                                />
                                <button
                                    onClick={() => dispatch({ type: 'SET_BLANKS_COUNT', payload: (state.blanksCount || 0) + 1 })}
                                    className={styles.input}
                                    style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer' }}
                                >+</button>
                            </div>
                        </div>
                        <div style={{ flex: 1 }}></div>
                    </div>

                    <div className={styles.row}>
                        {/* Stage Width — ±4 ft per click */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                            <label className={styles.inputLabel}>Stage W (ft)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <button
                                    onClick={() => dispatch({ type: 'SET_STAGE_CONFIG', payload: { widthMm: Math.max(0, state.stageConfig.widthMm - Math.round(4 * 304.8)) } })}
                                    className={styles.input}
                                    style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer', flexShrink: 0 }}
                                    title="−4 ft"
                                >-</button>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className={styles.input}
                                    style={{ textAlign: 'center' }}
                                    value={(state.stageConfig.widthMm / 304.8).toFixed(2).replace(/\.?0+$/, '')}
                                    onChange={(e) => {
                                        const n = parseFloat(e.target.value);
                                        if (!isNaN(n)) dispatch({ type: 'SET_STAGE_CONFIG', payload: { widthMm: Math.round(n * 304.8) } });
                                    }}
                                />
                                <button
                                    onClick={() => dispatch({ type: 'SET_STAGE_CONFIG', payload: { widthMm: state.stageConfig.widthMm + Math.round(4 * 304.8) } })}
                                    className={styles.input}
                                    style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer', flexShrink: 0 }}
                                    title="+4 ft"
                                >+</button>
                            </div>
                        </div>
                        {/* Stage Height — ±6 in per click */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                            <label className={styles.inputLabel}>Stage H (ft)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <button
                                    onClick={() => dispatch({ type: 'SET_STAGE_CONFIG', payload: { heightMm: Math.max(0, state.stageConfig.heightMm - Math.round(6 * 25.4)) } })}
                                    className={styles.input}
                                    style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer', flexShrink: 0 }}
                                    title="−6 in"
                                >-</button>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className={styles.input}
                                    style={{ textAlign: 'center' }}
                                    value={(state.stageConfig.heightMm / 304.8).toFixed(2).replace(/\.?0+$/, '')}
                                    onChange={(e) => {
                                        const n = parseFloat(e.target.value);
                                        if (!isNaN(n)) dispatch({ type: 'SET_STAGE_CONFIG', payload: { heightMm: Math.round(n * 304.8) } });
                                    }}
                                />
                                <button
                                    onClick={() => dispatch({ type: 'SET_STAGE_CONFIG', payload: { heightMm: state.stageConfig.heightMm + Math.round(6 * 25.4) } })}
                                    className={styles.input}
                                    style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer', flexShrink: 0 }}
                                    title="+6 in"
                                >+</button>
                            </div>
                        </div>
                    </div>
                    <div className={styles.row}>
                        {/* Offset X — ±4 ft per click, can be negative */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                            <label className={styles.inputLabel} title="0 is center, positive is right, negative is left">Offset X (ft)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <button
                                    onClick={() => dispatch({ type: 'SET_STAGE_CONFIG', payload: { offsetXMm: state.stageConfig.offsetXMm - Math.round(4 * 304.8) } })}
                                    className={styles.input}
                                    style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer', flexShrink: 0 }}
                                    title="−4 ft (left)"
                                >-</button>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className={styles.input}
                                    style={{ textAlign: 'center' }}
                                    value={(state.stageConfig.offsetXMm / 304.8).toFixed(2).replace(/\.?0+$/, '')}
                                    onChange={(e) => {
                                        const n = parseFloat(e.target.value);
                                        if (!isNaN(n)) dispatch({ type: 'SET_STAGE_CONFIG', payload: { offsetXMm: Math.round(n * 304.8) } });
                                        else if (e.target.value === '' || e.target.value === '-') dispatch({ type: 'SET_STAGE_CONFIG', payload: { offsetXMm: 0 } });
                                    }}
                                />
                                <button
                                    onClick={() => dispatch({ type: 'SET_STAGE_CONFIG', payload: { offsetXMm: state.stageConfig.offsetXMm + Math.round(4 * 304.8) } })}
                                    className={styles.input}
                                    style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer', flexShrink: 0 }}
                                    title="+4 ft (right)"
                                >+</button>
                            </div>
                        </div>
                        <div style={{ flex: 1 }}></div>
                    </div>
                    <div className={styles.row}>
                        <InchesInput
                            label="Safe Buffer (in)"
                            valueMm={state.stageConfig.safeBufferMm ?? 152}
                            onChangeMm={(v) => dispatch({ type: 'SET_STAGE_CONFIG', payload: { safeBufferMm: v } })}
                            description="Height above stage considered safe"
                        />
                        <div style={{ flex: 1 }}></div> {/* Spacer for alignment */}
                    </div>
                </div>
            </CollapsibleSection>

            {/* Brightness Control */}
            <CollapsibleSection title="Screen Usage" storageKey="spp_usage_open" defaultOpen={true} icon={<Activity />}>
                {/* Top row: brightness % + nits */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '0.15rem' }}>Brightness</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.03em' }}>
                            {state.brightness.toFixed(0)}<span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)', marginLeft: '2px' }}>%</span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '0.15rem' }}>Output</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-blue)', lineHeight: 1 }}>
                            {Math.round((state.brightness / 100) * state.maxNits).toLocaleString()}
                            <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-secondary)', marginLeft: '3px' }}>nits</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#fbbf24', marginTop: '0.25rem', fontWeight: 500 }}>~{estimatedLux.toFixed(0)} Lux</div>
                    </div>
                </div>

                {/* Context badge */}
                <div style={{ marginBottom: '1rem' }}>
                    {(() => {
                        const b = state.brightness;
                        let label = 'Custom';
                        let color = 'var(--text-secondary)';
                        let bg = 'var(--glass-bg)';
                        let Icon = Sun; // Default icon

                        if (b <= 12) {
                            label = 'Stage / Dark Venue';
                            color = '#c084fc';
                            bg = 'rgba(192,132,252,0.12)';
                            Icon = Moon;
                        }
                        else if (b <= 20) {
                            label = 'Indoor / Studio';
                            color = '#60a5fa';
                            bg = 'rgba(96,165,250,0.12)';
                            Icon = Monitor;
                        }
                        else if (b <= 50) {
                            label = 'Semi-Outdoor';
                            color = '#34d399';
                            bg = 'rgba(52,211,153,0.12)';
                            Icon = Cloud;
                        }
                        else {
                            label = 'Daylight / Outdoor';
                            color = '#fbbf24';
                            bg = 'rgba(251,191,36,0.12)';
                            Icon = Sun;
                        }

                        return (
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '0.2rem 0.65rem',
                                borderRadius: '999px',
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                color,
                                background: bg,
                                border: `1px solid ${color}40`
                            }}>
                                <Icon size={12} strokeWidth={2.5} />
                                {label}
                            </span>
                        );
                    })()}
                </div>

                {/* Slider with custom fill track */}
                <div style={{ position: 'relative', height: '24px', display: 'flex', alignItems: 'center' }}>
                    {/* Track background + fill */}
                    <div style={{ position: 'absolute', left: 0, right: 0, height: '4px', borderRadius: '2px', background: 'var(--glass-border)', overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
                        <div style={{ height: '100%', width: `${sliderPos}%`, background: 'linear-gradient(to right, #60a5fa, #0a84ff)', borderRadius: '2px', transition: 'width 0.05s' }} />
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.1"
                        value={sliderPos}
                        onChange={handleSliderChange}
                        className={styles.range}
                        style={{ width: '100%', margin: 0, cursor: 'pointer', position: 'relative', zIndex: 10, background: 'transparent' }}
                    />
                </div>

                {/* Preset Buttons */}
                <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
                    {[
                        { label: 'Stage', value: 10, color: '#c084fc' },
                        { label: 'Indoor', value: 15, color: '#60a5fa' },
                        { label: 'Semi-OD', value: 40, color: '#34d399' },
                        { label: 'Daylight', value: 70, color: '#fbbf24' },
                        { label: 'Max', value: 100, color: '#f87171' },
                    ].map(preset => {
                        const isActive = Math.abs(state.brightness - preset.value) < 1;
                        return (
                            <button
                                key={preset.label}
                                onClick={() => dispatch({ type: 'SET_BRIGHTNESS', payload: preset.value })}
                                style={{
                                    flex: 1,
                                    padding: '0.3rem 0.25rem',
                                    borderRadius: '8px',
                                    border: `1px solid ${isActive ? preset.color : 'rgba(255,255,255,0.1)'}`,
                                    background: isActive ? `${preset.color}22` : 'rgba(255,255,255,0.05)',
                                    color: isActive ? preset.color : 'var(--text-secondary)',
                                    fontSize: '0.62rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {preset.label}
                            </button>
                        );
                    })}
                </div>
            </CollapsibleSection>

            {/* ─── RIGGING ─────────────────────────────────────── */}
            <CollapsibleSection title="Rigging" storageKey="spp_rigging_open" defaultOpen={false} icon={<Anchor />}>
                {(() => {
                    const rc = state.riggingConfig;
                    // Wall weight for load calculations
                    const totalPanels = state.screenCols * state.screenRows;
                    const wallWeightKg = totalPanels * (state.panelWeightKg || 12);
                    const trussSpanMm = rc.trussSpanMm > 0 ? rc.trussSpanMm : (state.screenCols * state.panelWidthMm + 610); // wall width + 2ft margin
                    const trussWeightKg = (trussSpanMm / 1000) * rc.trussWeightKg; // kg/m × span
                    const totalSuspendedKg = wallWeightKg + trussWeightKg;
                    const totalSuspendedLbs = totalSuspendedKg * 2.20462;

                    // Bridle derating: cos(angle/2) — ETCP standard
                    const bridleFactor = rc.useSpreaderBeam || rc.bridleAngleDeg === 0
                        ? 1.0
                        : Math.cos((rc.bridleAngleDeg / 2) * (Math.PI / 180));
                    const loadPerMotorKg = (totalSuspendedKg / rc.motorCount) / bridleFactor;
                    const loadPerMotorLbs = loadPerMotorKg * 2.20462;
                    const motorWLLLbs = rc.motorCapacity * 2000; // tons to lbs
                    const motorWLLKg = rc.motorCapacity * 907.185;
                    const achievedSafetyFactor = motorWLLKg / loadPerMotorKg;
                    const isSafe = achievedSafetyFactor >= rc.safetyFactor;
                    const chainDropMm = rc.hookHeightMm - rc.trimHeightMm;

                    // Mode pills
                    const modes: { key: typeof rc.mode; label: string }[] = [
                        { key: 'ground-stack', label: 'Ground Stack' },
                        { key: 'flown', label: 'Flown' },
                    ];

                    const dispatchRig = (payload: Partial<typeof rc>) =>
                        dispatch({ type: 'SET_RIGGING_CONFIG', payload });

                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                            {/* Mode toggle */}
                            <div>
                                <label className={styles.inputLabel} style={{ marginBottom: '0.4rem', display: 'block' }}>Rigging Mode</label>
                                <div style={{ display: 'flex', gap: '0.35rem' }}>
                                    {modes.map(m => (
                                        <button
                                            key={m.key}
                                            onClick={() => dispatchRig({ mode: m.key })}
                                            style={{
                                                flex: 1, padding: '0.4rem 0.25rem',
                                                borderRadius: '8px', cursor: 'pointer',
                                                border: `1px solid ${rc.mode === m.key ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                                                background: rc.mode === m.key ? 'rgba(10,132,255,0.15)' : 'var(--glass-bg)',
                                                color: rc.mode === m.key ? 'var(--accent-blue)' : 'var(--text-secondary)',
                                                fontSize: '0.72rem', fontWeight: 600,
                                                transition: 'all 0.15s',
                                            }}
                                        >{m.label}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Truss controls — only when flown */}
                            {rc.mode === 'flown' && (
                                <>
                                    {/* Truss Type pill row */}
                                    <div>
                                        <label className={styles.inputLabel} style={{ marginBottom: '0.4rem', display: 'block' }}>Truss Type</label>
                                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                            {(['F34', 'F32', 'T-Bar', 'Box'] as const).map(t => (
                                                <button key={t}
                                                    onClick={() => {
                                                        const weights: Record<string, number> = { 'F34': 8.5, 'F32': 6.2, 'T-Bar': 4.1, 'Box': 11.8 };
                                                        dispatchRig({ trussType: t, trussWeightKg: weights[t] });
                                                    }}
                                                    style={{
                                                        flex: 1, padding: '0.35rem 0.25rem',
                                                        borderRadius: '8px', cursor: 'pointer',
                                                        border: `1px solid ${rc.trussType === t ? '#bf5af2' : 'var(--glass-border)'}`,
                                                        background: rc.trussType === t ? 'rgba(191,90,242,0.15)' : 'var(--glass-bg)',
                                                        color: rc.trussType === t ? '#bf5af2' : 'var(--text-secondary)',
                                                        fontSize: '0.72rem', fontWeight: 600,
                                                    }}
                                                >{t}</button>
                                            ))}
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                            {rc.trussWeightKg} kg/m · {trussWeightKg.toFixed(1)} kg total ({(trussWeightKg * 2.20462).toFixed(1)} lbs)
                                        </div>
                                    </div>

                                    {/* Trim height row */}
                                    <div className={styles.row}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                                            <label className={styles.inputLabel}>Trim Height (ft)</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <button onClick={() => dispatchRig({ trimHeightMm: Math.max(0, rc.trimHeightMm - 305) })} className={styles.input} style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer', flexShrink: 0 }}>-</button>
                                                <input type="text" inputMode="decimal" className={styles.input} style={{ textAlign: 'center' }}
                                                    value={(rc.trimHeightMm / 304.8).toFixed(2).replace(/\.?0+$/, '')}
                                                    onChange={e => { const n = parseFloat(e.target.value); if (!isNaN(n)) dispatchRig({ trimHeightMm: Math.round(n * 304.8) }); }}
                                                />
                                                <button onClick={() => dispatchRig({ trimHeightMm: rc.trimHeightMm + 305 })} className={styles.input} style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer', flexShrink: 0 }}>+</button>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                                            <label className={styles.inputLabel}>Grid / Hook Height (ft)</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <button onClick={() => dispatchRig({ hookHeightMm: Math.max(rc.trimHeightMm + 610, rc.hookHeightMm - 305) })} className={styles.input} style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer', flexShrink: 0 }}>-</button>
                                                <input type="text" inputMode="decimal" className={styles.input} style={{ textAlign: 'center' }}
                                                    value={(rc.hookHeightMm / 304.8).toFixed(2).replace(/\.?0+$/, '')}
                                                    onChange={e => { const n = parseFloat(e.target.value); if (!isNaN(n)) dispatchRig({ hookHeightMm: Math.round(n * 304.8) }); }}
                                                />
                                                <button onClick={() => dispatchRig({ hookHeightMm: rc.hookHeightMm + 305 })} className={styles.input} style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer', flexShrink: 0 }}>+</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '-0.4rem' }}>
                                        Chain drop: {(chainDropMm / 304.8).toFixed(1)} ft · Trim-to-grid: {(chainDropMm / 25.4).toFixed(0)} in
                                    </div>

                                    {/* Motor row */}
                                    <div className={styles.row}>
                                        {/* Motor count */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                                            <label className={styles.inputLabel}>Motors</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <button onClick={() => dispatchRig({ motorCount: Math.max(1, rc.motorCount - 1) })} className={styles.input} style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer', flexShrink: 0 }}>-</button>
                                                <input type="number" min="1" max="12" className={styles.input} style={{ textAlign: 'center' }}
                                                    value={rc.motorCount}
                                                    onChange={e => dispatchRig({ motorCount: Math.max(1, parseInt(e.target.value) || 1) })}
                                                />
                                                <button onClick={() => dispatchRig({ motorCount: Math.min(12, rc.motorCount + 1) })} className={styles.input} style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer', flexShrink: 0 }}>+</button>
                                            </div>
                                        </div>
                                        {/* Motor capacity */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                                            <label className={styles.inputLabel}>Capacity</label>
                                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                                {([0.25, 0.5, 1, 2] as const).map(cap => (
                                                    <button key={cap}
                                                        onClick={() => dispatchRig({ motorCapacity: cap })}
                                                        style={{
                                                            flex: 1, padding: '0.4rem 0.1rem',
                                                            borderRadius: '7px', cursor: 'pointer',
                                                            border: `1px solid ${rc.motorCapacity === cap ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                                                            background: rc.motorCapacity === cap ? 'rgba(10,132,255,0.15)' : 'var(--glass-bg)',
                                                            color: rc.motorCapacity === cap ? 'var(--accent-blue)' : 'var(--text-secondary)',
                                                            fontSize: '0.65rem', fontWeight: 600,
                                                        }}
                                                    >{cap}T</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bridle / Spreader */}
                                    <div className={styles.row}>
                                        <div style={{ flex: 1 }}>
                                            <label className={styles.inputLabel} style={{ marginBottom: '0.3rem', display: 'block' }}>Spreader Beam</label>
                                            <button
                                                onClick={() => dispatchRig({ useSpreaderBeam: !rc.useSpreaderBeam })}
                                                style={{
                                                    width: '100%', padding: '0.4rem',
                                                    borderRadius: '8px', cursor: 'pointer',
                                                    border: `1px solid ${rc.useSpreaderBeam ? '#30d158' : 'var(--glass-border)'}`,
                                                    background: rc.useSpreaderBeam ? 'rgba(48,209,88,0.15)' : 'var(--glass-bg)',
                                                    color: rc.useSpreaderBeam ? '#30d158' : 'var(--text-secondary)',
                                                    fontSize: '0.72rem', fontWeight: 600,
                                                }}
                                            >{rc.useSpreaderBeam ? '✓ Spreader Beam' : 'No Spreader Beam'}</button>
                                        </div>
                                        {!rc.useSpreaderBeam && (
                                            <div style={{ flex: 1 }}>
                                                <label className={styles.inputLabel} style={{ marginBottom: '0.3rem', display: 'block' }}>Bridle Angle (°)</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <button onClick={() => dispatchRig({ bridleAngleDeg: Math.max(0, rc.bridleAngleDeg - 5) })} className={styles.input} style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer', flexShrink: 0 }}>-</button>
                                                    <input type="number" min="0" max="120" className={styles.input} style={{ textAlign: 'center' }}
                                                        value={rc.bridleAngleDeg}
                                                        onChange={e => dispatchRig({ bridleAngleDeg: Math.min(120, Math.max(0, parseInt(e.target.value) || 0)) })}
                                                    />
                                                    <button onClick={() => dispatchRig({ bridleAngleDeg: Math.min(120, rc.bridleAngleDeg + 5) })} className={styles.input} style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer', flexShrink: 0 }}>+</button>
                                                </div>
                                            </div>
                                        )}
                                        {rc.useSpreaderBeam && <div style={{ flex: 1 }} />}
                                    </div>

                                    {/* Safety Factor */}
                                    <div>
                                        <label className={styles.inputLabel} style={{ marginBottom: '0.4rem', display: 'block' }}>Working Load Limit Safety Factor</label>
                                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                                            {([5, 7, 10] as const).map(sf => (
                                                <button key={sf}
                                                    onClick={() => dispatchRig({ safetyFactor: sf })}
                                                    style={{
                                                        flex: 1, padding: '0.4rem 0.25rem',
                                                        borderRadius: '8px', cursor: 'pointer',
                                                        border: `1px solid ${rc.safetyFactor === sf ? '#fbbf24' : 'var(--glass-border)'}`,
                                                        background: rc.safetyFactor === sf ? 'rgba(251,191,36,0.15)' : 'var(--glass-bg)',
                                                        color: rc.safetyFactor === sf ? '#fbbf24' : 'var(--text-secondary)',
                                                        fontSize: '0.72rem', fontWeight: 600,
                                                    }}
                                                >{sf}:1{sf === 5 ? ' Static' : sf === 7 ? ' Dynamic' : ' High'}</button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Live Safety Readout */}
                                    <div style={{
                                        borderRadius: '10px',
                                        padding: '0.65rem 0.85rem',
                                        background: isSafe ? 'rgba(48,209,88,0.08)' : 'rgba(255,69,58,0.10)',
                                        border: `1px solid ${isSafe ? 'rgba(48,209,88,0.3)' : 'rgba(255,69,58,0.4)'}`,
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Load / Motor</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                                                {loadPerMotorLbs.toFixed(0)} <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-secondary)' }}>lbs</span>
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{loadPerMotorKg.toFixed(0)} kg · WLL {motorWLLLbs.toFixed(0)} lbs</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Safety Factor</div>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: isSafe ? '#30d158' : '#ff453a', lineHeight: 1 }}>
                                                {achievedSafetyFactor.toFixed(1)}:1
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: isSafe ? '#30d158' : '#ff453a', fontWeight: 600 }}>req. {rc.safetyFactor}:1 {isSafe ? '✓ PASS' : '✗ FAIL'}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Total Load</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                                                {(totalSuspendedLbs).toFixed(0)} <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-secondary)' }}>lbs</span>
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{totalSuspendedKg.toFixed(0)} kg incl. truss</div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Ground support — only for ground-stack */}
                            {rc.mode === 'ground-stack' && (() => {
                                const baseplateH = state.baseplateHeightMm;


                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        {/* Support type toggle */}
                                        <div>
                                            <label className={styles.inputLabel} style={{ marginBottom: '0.4rem', display: 'block' }}>Ground Support Type</label>
                                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                                                {(['towers', 'baseplate'] as const).map(g => (
                                                    <button key={g}
                                                        onClick={() => {
                                                            dispatchRig({ groundSupportType: g });
                                                            // Auto-sync groundStackHeightMm
                                                            if (g === 'baseplate') {
                                                                dispatch({ type: 'SET_GROUND_STACK', payload: baseplateH });
                                                            } else {
                                                                dispatch({ type: 'SET_GROUND_STACK', payload: rc.groundSupportHeightMm });
                                                            }
                                                        }}
                                                        style={{
                                                            flex: 1, padding: '0.4rem 0.25rem',
                                                            borderRadius: '8px', cursor: 'pointer',
                                                            border: `1px solid ${rc.groundSupportType === g ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                                                            background: rc.groundSupportType === g ? 'rgba(10,132,255,0.15)' : 'var(--glass-bg)',
                                                            color: rc.groundSupportType === g ? 'var(--accent-blue)' : 'var(--text-secondary)',
                                                            fontSize: '0.72rem', fontWeight: 600, textTransform: 'capitalize',
                                                        }}
                                                    >{g === 'baseplate' ? 'Baseplate' : 'Ground Towers'}</button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Tower height input */}
                                        {rc.groundSupportType === 'towers' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                <label className={styles.inputLabel}>Tower Height (ft)</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <button
                                                        onClick={() => {
                                                            const h = Math.max(0, rc.groundSupportHeightMm - 152);
                                                            dispatchRig({ groundSupportHeightMm: h });
                                                            dispatch({ type: 'SET_GROUND_STACK', payload: h });
                                                        }}
                                                        className={styles.input} style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer', flexShrink: 0 }}>-</button>
                                                    <input type="text" inputMode="decimal" className={styles.input} style={{ textAlign: 'center' }}
                                                        value={(rc.groundSupportHeightMm / 304.8).toFixed(2).replace(/\.?0+$/, '')}
                                                        onChange={e => {
                                                            const n = parseFloat(e.target.value);
                                                            if (!isNaN(n)) {
                                                                const h = Math.round(n * 304.8);
                                                                dispatchRig({ groundSupportHeightMm: h });
                                                                dispatch({ type: 'SET_GROUND_STACK', payload: h });
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const h = rc.groundSupportHeightMm + 152;
                                                            dispatchRig({ groundSupportHeightMm: h });
                                                            dispatch({ type: 'SET_GROUND_STACK', payload: h });
                                                        }}
                                                        className={styles.input} style={{ width: 'auto', padding: '0.5rem', cursor: 'pointer', flexShrink: 0 }}>+</button>
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                                    {(rc.groundSupportHeightMm / 25.4).toFixed(0)} in · adds to total screen height
                                                </div>
                                            </div>
                                        )}

                                        {/* Baseplate info */}
                                        {rc.groundSupportType === 'baseplate' && (
                                            <div style={{
                                                borderRadius: '8px', padding: '0.5rem 0.75rem',
                                                background: 'rgba(10,132,255,0.06)', border: '1px solid rgba(10,132,255,0.2)',
                                            }}>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Baseplate Height</div>
                                                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                    {(baseplateH / 25.4).toFixed(1)} in <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 400 }}>({baseplateH} mm)</span>
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>From panel spec · included in total height</div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                        </div>
                    );
                })()}
            </CollapsibleSection>

            {/* Visual Aids (Collapsible) */}
            <CollapsibleSection title="Visual Aids" storageKey="spp_visuals_open" defaultOpen={false} icon={<Eye />}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>

                    {/* Background Image */}
                    <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Background Mockup</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                        dispatch({ type: 'SET_VISUAL_CONFIG', payload: { backgroundImage: ev.target?.result as string } });
                                    };
                                    reader.readAsDataURL(file);
                                } else {
                                    dispatch({ type: 'SET_VISUAL_CONFIG', payload: { backgroundImage: null } });
                                }
                            }}
                            className={styles.input}
                            style={{ padding: '4px' }}
                        />
                        {state.visualConfig?.backgroundImage && (
                            <button
                                onClick={() => {
                                    dispatch({ type: 'SET_VISUAL_CONFIG', payload: { backgroundImage: null } });
                                }}
                                style={{ marginTop: '4px', background: 'transparent', border: 'none', color: '#ef4444', fontSize: '10px', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                            >
                                Clear Image
                            </button>
                        )}
                    </div>

                    {/* Guides Toggles */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                id="resOverlays"
                                checked={state.visualConfig?.showResolutionOverlays ?? true}
                                onChange={(e) => dispatch({ type: 'SET_VISUAL_CONFIG', payload: { showResolutionOverlays: e.target.checked } })}
                                style={{ cursor: 'pointer' }}
                            />
                            <label htmlFor="resOverlays" style={{ color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>HD / 4K</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: state.visualConfig?.backgroundImage ? 1 : 0.5 }}>
                            <input
                                type="checkbox"
                                id="bgImageToggle"
                                disabled={!state.visualConfig?.backgroundImage}
                                checked={state.visualConfig?.showBackgroundImage ?? true}
                                onChange={(e) => dispatch({ type: 'SET_VISUAL_CONFIG', payload: { showBackgroundImage: e.target.checked } })}
                                style={{ cursor: state.visualConfig?.backgroundImage ? 'pointer' : 'default' }}
                            />
                            <label htmlFor="bgImageToggle" style={{ color: 'var(--text-secondary)', fontSize: '12px', cursor: state.visualConfig?.backgroundImage ? 'pointer' : 'default' }}>Mockup</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                id="centerGuides"
                                checked={state.visualConfig?.showCenterGuides || false}
                                onChange={(e) => dispatch({ type: 'SET_VISUAL_CONFIG', payload: { showCenterGuides: e.target.checked } })}
                                style={{ cursor: 'pointer' }}
                            />
                            <label htmlFor="centerGuides" style={{ color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>Center</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                id="thirdsGuides"
                                checked={state.visualConfig?.showThirdsGuides || false}
                                onChange={(e) => dispatch({ type: 'SET_VISUAL_CONFIG', payload: { showThirdsGuides: e.target.checked } })}
                                style={{ cursor: 'pointer' }}
                            />
                            <label htmlFor="thirdsGuides" style={{ color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>Thirds</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                id="coordInspector"
                                checked={state.visualConfig?.showCoordinates || false}
                                onChange={(e) => dispatch({ type: 'SET_VISUAL_CONFIG', payload: { showCoordinates: e.target.checked } })}
                                style={{ cursor: 'pointer' }}
                            />
                            <label htmlFor="coordInspector" style={{ color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>Coords</label>
                        </div>
                    </div>

                </div>
            </CollapsibleSection>

            {/* Power Settings */}
            <CollapsibleSection title="Power Specs" storageKey="spp_power_open" defaultOpen={true} icon={<Zap />}>
                <SelectDropdown
                    label="Voltage (V)"
                    value={state.voltage}
                    options={[
                        { value: 110, label: "110V / 120V (Standard Wall Outlet)" },
                        { value: 208, label: "208V (Commercial / 3-Phase Leg)" },
                        { value: 240, label: "240V (High Power / Split Phase)" }
                    ]}
                    onSelect={(v) => dispatch({ type: 'SET_VOLTAGE', payload: v })}
                    isOpen={isVoltageOpen}
                    setIsOpen={setIsVoltageOpen}
                />
                <SelectDropdown
                    label="Breaker Size (Amps)"
                    value={state.circuitBreakerAmps}
                    options={[
                        { value: 15, label: "15A (Residential Standard)" },
                        { value: 20, label: "20A (Commercial / Production)" },
                        { value: 30, label: "30A (Twist-Lock / L6-30)" },
                        { value: 50, label: "50A (Range / CS / Camlock)" }
                    ]}
                    onSelect={(v) => dispatch({ type: 'SET_BREAKER', payload: v })}
                    isOpen={isBreakerOpen}
                    setIsOpen={setIsBreakerOpen}
                />
            </CollapsibleSection>

            <div className={styles.footer}>
                <p>Estimated Circuits assumes 80% safety factor on breakers.</p>
                <p style={{ marginTop: '0.5rem', fontStyle: 'italic', opacity: 0.5 }}>
                    Drag slider to set brightness % based on usage.
                </p>
            </div>
        </div>
    );
};

export default SettingsPanel;
