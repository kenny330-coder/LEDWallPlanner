import React from 'react';
import type { AppState } from '../context/StateContext';
import { Eye } from 'lucide-react';

export const PixelDistanceGraph: React.FC<{ state: AppState }> = ({ state }) => {
    const { panelWidthMm, panelPixelsW, screenCols, screenRows, panelPixelsH, dataConfig } = state;
    
    // Calculate physical pitch
    const physicalPitchMm = panelWidthMm / panelPixelsW;
    const baseViewingDistanceFt = physicalPitchMm * 3.28084;
    
    // Wall resolution
    const wallW = screenCols * panelPixelsW;
    const wallH = screenRows * panelPixelsH;
    
    // Evaluate feeds to find worst-case scaling
    let maxScale = 1.0;
    
    if (dataConfig?.feeds?.length > 0) {
        dataConfig.feeds.forEach(feed => {
            let feedW = 1920;
            let feedH = 1080;
            if (feed.resolution === '4k') { feedW = 3840; feedH = 2160; }
            if (feed.resolution === 'custom') { feedW = feed.customWidth || 1920; feedH = feed.customHeight || 1080; }
            
            let scaleX = 1;
            let scaleY = 1;
            
            if (feed.fitMode === 'fit') {
                const ratio = Math.min(wallW / feedW, wallH / feedH);
                scaleX = ratio;
                scaleY = ratio;
            } else if (feed.fitMode === 'fill') {
                const ratio = Math.max(wallW / feedW, wallH / feedH);
                scaleX = ratio;
                scaleY = ratio;
            }
            
            // We only care about upscaling (scale > 1) which creates larger effective pitch
            maxScale = Math.max(maxScale, scaleX, scaleY);
        });
    }

    // Determine scale cleanly
    const isScaled = maxScale > 1.01; // Allow slight float rounding
    const isIntegerScale = isScaled && Math.abs(Math.round(maxScale) - maxScale) < 0.05;
    
    // Interpolation penalty: if non-integer upscale, it gets blurrier so you need to stand slightly further back
    const blurPenalty = (isScaled && !isIntegerScale) ? 1.25 : 1.0;
    
    const effectivePitchMm = physicalPitchMm * maxScale;
    const effectiveViewingDistanceFt = effectivePitchMm * 3.28084 * blurPenalty;
    
    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--glass-bg)',
            minWidth: '380px',
            border: '1px solid var(--glass-border)',
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            zIndex: 100,
            pointerEvents: 'none'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Eye size={14} color="var(--accent-blue)" /> Optimal Viewing Distance
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                    Physical Pitch: {physicalPitchMm.toFixed(2)}mm
                </span>
            </div>
            
            <div style={{ position: 'relative', height: '18px', background: 'var(--glass-highlight)', borderRadius: '99px', marginTop: '0.4rem', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                {/* Physical Distance Marker */}
                <div style={{
                    position: 'absolute',
                    top: 0, bottom: 0,
                    left: 0,
                    width: `${Math.min(100, (baseViewingDistanceFt / 50) * 100)}%`,
                    background: 'rgba(10, 132, 255, 0.2)',
                    borderRight: '1.5px solid var(--accent-blue)'
                }} />
                
                {/* Effective Scaled Marker (if scaled) */}
                {isScaled && (
                    <div style={{
                        position: 'absolute',
                        top: 0, bottom: 0,
                        left: `${Math.min(100, (baseViewingDistanceFt / 50) * 100)}%`,
                        width: `${Math.min(100, ((effectiveViewingDistanceFt - baseViewingDistanceFt) / 50) * 100)}%`,
                        background: isIntegerScale ? 'rgba(52, 211, 153, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        borderRight: `1.5px dashed ${isIntegerScale ? '#34d399' : '#f59e0b'}`
                    }} />
                )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                <span>0 ft</span>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <span style={{ color: 'var(--accent-blue)' }}>{baseViewingDistanceFt.toFixed(1)} ft (Native)</span>
                    {isScaled && (
                        <span style={{ color: isIntegerScale ? '#34d399' : '#f59e0b' }}>
                            {effectiveViewingDistanceFt.toFixed(1)} ft ({isIntegerScale ? 'Integer Scaled' : 'Interpolated'})
                        </span>
                    )}
                </div>
            </div>
            
            {isScaled && (
                <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '0.2rem', textAlign: 'right' }}>
                    Image is scaled by {maxScale.toFixed(2)}x. 
                    {!isIntegerScale && " Non-integer scaling causes blur, requiring greater distance."}
                </div>
            )}
        </div>
    );
};
