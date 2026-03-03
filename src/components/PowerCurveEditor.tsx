import React, { useState, useEffect } from 'react';
import { type PowerPoint } from '../utils/powerLogic';
import styles from '../styles/PowerCurveEditor.module.css';
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot
} from 'recharts';
import { X, Save, Plus, Trash2 } from 'lucide-react';

interface PowerCurveEditorProps {
    isOpen: boolean;
    onClose: () => void;
    initialCurve?: PowerPoint[];
    maxWatts: number;
    productName: string;
    onSave: (curve: PowerPoint[]) => void;
}

const DEFAULT_CURVE: PowerPoint[] = [
    { percent: 0, watts: 0 },
    { percent: 10, watts: 30 },
    { percent: 20, watts: 60 },
    { percent: 30, watts: 90 },
    { percent: 40, watts: 120 },
    { percent: 50, watts: 150 },
    { percent: 60, watts: 180 },
    { percent: 70, watts: 210 },
    { percent: 80, watts: 240 },
    { percent: 90, watts: 270 },
    { percent: 100, watts: 300 }
];

const PowerCurveEditor: React.FC<PowerCurveEditorProps> = ({
    isOpen, onClose, initialCurve, maxWatts, productName, onSave
}) => {
    if (!isOpen) return null;

    const [points, setPoints] = useState<PowerPoint[]>([]);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

    // Initialize
    useEffect(() => {
        let p = initialCurve && initialCurve.length > 0 ? [...initialCurve] : [...DEFAULT_CURVE];

        // Ensure 0 and 100 exist
        if (!p.find(x => x.percent === 0)) p.push({ percent: 0, watts: 0 });
        if (!p.find(x => x.percent === 100)) p.push({ percent: 100, watts: maxWatts });

        p.sort((a, b) => a.percent - b.percent);
        setPoints(p);
        setSelectedIdx(null);
    }, [isOpen, initialCurve, maxWatts]);

    const handlePointSelect = (idx: number) => {
        setSelectedIdx(idx);
    };

    const handlePercentChange = (val: string) => {
        if (selectedIdx === null) return;
        const p = points[selectedIdx];
        if (p.percent === 0 || p.percent === 100) return; // Prevent moving endpoints

        const newPct = Math.max(1, Math.min(99, Number(val))); // Clamp 1-99
        // Check collision? For now allow, sort will handle it but maybe weird.
        // Actually, let's just update and sort.

        const newPoints = [...points];
        newPoints[selectedIdx] = { ...p, percent: newPct };

        // Sort
        newPoints.sort((a, b) => a.percent - b.percent);
        setPoints(newPoints);

        // Find new index of the point we were editing (using watts and newPct to find unique match if possible, or just newPct)
        // Since watts could be same, finding by object reference would be best but we shallow copied objects.
        // Let's find by content.
        const newIdx = newPoints.findIndex(x => x.percent === newPct && x.watts === p.watts);
        if (newIdx !== -1) setSelectedIdx(newIdx);
    };

    const handleWattsChange = (val: string) => {
        if (selectedIdx === null) return;
        const newWatts = Math.max(0, Number(val));
        const newPoints = [...points];
        newPoints[selectedIdx] = { ...newPoints[selectedIdx], watts: newWatts };
        setPoints(newPoints);
    };

    const handleDelete = () => {
        if (selectedIdx === null) return;
        const p = points[selectedIdx];
        if (p.percent === 0 || p.percent === 100) return; // Protect ends

        const newPoints = points.filter((_, i) => i !== selectedIdx);
        setPoints(newPoints);
        setSelectedIdx(null);
    };

    const handleAddPoint = () => {
        // Find largest gap
        let maxGap = 0;
        let insertAfter = -1;

        for (let i = 0; i < points.length - 1; i++) {
            const gap = points[i + 1].percent - points[i].percent;
            if (gap > maxGap) {
                maxGap = gap;
                insertAfter = i;
            }
        }

        if (insertAfter !== -1 && maxGap > 1) {
            const p1 = points[insertAfter];
            const p2 = points[insertAfter + 1];
            const newPct = Math.round(p1.percent + maxGap / 2);
            // Linear interpolate watts as start
            const slope = (p2.watts - p1.watts) / (p2.percent - p1.percent);
            const newWatts = Math.round(p1.watts + (newPct - p1.percent) * slope);

            const newPoints = [...points];
            newPoints.splice(insertAfter + 1, 0, { percent: newPct, watts: newWatts });
            setPoints(newPoints);
            setSelectedIdx(insertAfter + 1);
        }
    };

    const handleSave = () => {
        onSave(points);
        onClose();
    };

    const selectedPoint = selectedIdx !== null ? points[selectedIdx] : null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div>
                        <h2>Power vs Brightness Curve</h2>
                        <div className={styles.subHeader}>Editing: {productName} (Max: {maxWatts}W)</div>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}><X size={24} /></button>
                </div>

                <div className={styles.content}>
                    <div className={styles.chartSection}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={points}
                                margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                                onClick={(e) => {
                                    if (e && typeof e.activeTooltipIndex === 'number') {
                                        handlePointSelect(e.activeTooltipIndex);
                                    }
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis
                                    dataKey="percent"
                                    stroke="#94a3b8"
                                    label={{ value: 'Brightness %', position: 'bottom', offset: 0, fill: '#94a3b8' }}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    label={{ value: 'Watts', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', color: '#f1f5f9' }}
                                    formatter={(value: any) => [`${value} W`, 'Power']}
                                    labelFormatter={(label: any) => `Brightness: ${label}%`}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="watts"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                                    activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }}
                                    animationDuration={300}
                                />
                                {selectedPoint && (
                                    <ReferenceDot
                                        x={selectedPoint.percent}
                                        y={selectedPoint.watts}
                                        r={6}
                                        fill="#ef4444"
                                        stroke="white"
                                    />
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className={styles.dataSection}>
                        <div className={styles.dataHeader}>
                            <h3>Data Points</h3>
                            <button onClick={handleAddPoint} className={styles.btnPrimary} style={{ width: 'auto', padding: '0.25rem 0.75rem' }}>
                                <Plus size={16} /> Add
                            </button>
                        </div>

                        <div className={styles.pointList}>
                            {points.map((p, idx) => (
                                <div
                                    key={p.percent}
                                    className={`${styles.pointRow} ${selectedIdx === idx ? styles.active : ''}`}
                                    onClick={() => handlePointSelect(idx)}
                                >
                                    <div className={styles.pointLabel}>
                                        <span className={styles.pointPct}>{p.percent}%</span>
                                    </div>
                                    <span className={styles.pointVal}>{p.watts} W</span>
                                </div>
                            ))}
                        </div>

                        {selectedPoint ? (
                            <div className={styles.editPanel}>
                                <div className={styles.editTitle}>Edit Point ({selectedPoint.percent}%)</div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.inputLabel}>Brightness (%)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="99"
                                        className={styles.numberInput}
                                        value={selectedPoint.percent}
                                        onChange={(e) => handlePercentChange(e.target.value)}
                                        disabled={selectedPoint.percent === 0 || selectedPoint.percent === 100}
                                        style={{ opacity: (selectedPoint.percent === 0 || selectedPoint.percent === 100) ? 0.5 : 1 }}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.inputLabel}>Power Draw (Watts)</label>
                                    <input
                                        type="number"
                                        className={styles.numberInput}
                                        value={selectedPoint.watts}
                                        onChange={(e) => handleWattsChange(e.target.value)}
                                    />
                                </div>
                                {(selectedPoint.percent !== 0 && selectedPoint.percent !== 100) && (
                                    <button onClick={handleDelete} className={styles.btnDanger} style={{ width: '100%' }}>
                                        <Trash2 size={16} style={{ marginBottom: '-2px', marginRight: '4px' }} /> Delete Point
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className={styles.editPanel} style={{ textAlign: 'center', color: '#64748b' }}>
                                Select a point to edit
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
                    <button onClick={handleSave} className={styles.saveBtn}>
                        <Save size={18} /> Save Curve
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PowerCurveEditor;
