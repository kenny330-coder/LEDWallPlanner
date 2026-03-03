import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceDot,
    ReferenceLine
} from 'recharts';
import { powerData, type PowerPoint } from '../utils/powerLogic';
import styles from '../styles/PowerChart.module.css';

interface PowerChartProps {
    currentBrightness: number; // 0-100
    currentWatts: number;
    maxWatts: number;
    customCurve?: PowerPoint[];
}

const PowerChart: React.FC<PowerChartProps> = ({ currentBrightness, currentWatts, maxWatts, customCurve }) => {
    // Generate data points for smooth curve
    const data = useMemo(() => {
        if (customCurve && customCurve.length > 0) {
            return [...customCurve].sort((a, b) => a.percent - b.percent);
        }

        // Default curve scaled
        const defaultMax = 403.0; // Base reference from DVS
        const scale = maxWatts / defaultMax;

        return powerData.map(p => ({
            percent: p.percent,
            watts: p.watts * scale
        }));
    }, [maxWatts, customCurve]);

    return (
        <div className={styles.chartContainer}>
            <h3 className={styles.chartTitle}>Power Curve (Watts per Panel)</h3>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis
                        dataKey="percent"
                        stroke="rgba(255, 255, 255, 0.4)"
                        tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 10 }}
                        label={{ value: 'Brightness %', position: 'insideBottomRight', offset: -5, fill: 'rgba(255, 255, 255, 0.6)', fontSize: 10 }}
                        type="number"
                        domain={[0, 100]}
                    />
                    <YAxis
                        stroke="rgba(255, 255, 255, 0.4)"
                        tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 10 }}
                        label={{ value: 'Watts', angle: -90, position: 'insideLeft', fill: 'rgba(255, 255, 255, 0.6)', fontSize: 10 }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(20, 30, 50, 0.8)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            color: '#fff',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                        }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: 'rgba(255, 255, 255, 0.7)' }}
                        cursor={{ stroke: 'rgba(255, 255, 255, 0.2)', strokeWidth: 1 }}
                        formatter={(val: any) => [`${Number(val).toFixed(1)} W`, 'Power']}
                        labelFormatter={(val) => `Brightness: ${val}%`}
                    />
                    <Line
                        type="monotone"
                        dataKey="watts"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                        activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
                        animationDuration={300}
                    />
                    <ReferenceLine x={currentBrightness} stroke="#ef4444" strokeDasharray="3 3" />
                    <ReferenceDot x={currentBrightness} y={currentWatts} r={5} fill="#ef4444" stroke="white" strokeWidth={2} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PowerChart;
