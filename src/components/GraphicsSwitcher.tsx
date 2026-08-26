import React, { useState, useEffect, useRef } from 'react';
import { Upload, Layers, X, Play } from 'lucide-react';
import { saveMedia, listMedia, deleteMedia, type MediaItem } from '../utils/mediaStore';
import { useAppState } from '../context/StateContext';

function DragNumberInput({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        const startX = e.clientX;
        const startVal = value;
        let isDragging = false;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const dx = moveEvent.clientX - startX;
            if (Math.abs(dx) > 2) {
                isDragging = true;
                // Move 1 percentage point for every 2 pixels dragged
                onChange(startVal + Math.round(dx / 2));
            }
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            if (!isDragging && e.target === inputRef.current) {
                inputRef.current?.focus();
            }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'ew-resize' }} onMouseDown={handleMouseDown}>
            <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', width: '20px', pointerEvents: 'none' }}>{label}</label>
            <input 
                ref={inputRef}
                type="number" 
                value={Math.round(value)} 
                onChange={e => onChange(Number(e.target.value))}
                style={{ flex: 1, width: 0, padding: '2px 4px', fontSize: '0.75rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'ew-resize' }} 
            />
        </div>
    );
}

export function GraphicsSwitcher() {
    const { state, dispatch } = useAppState();
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [activeControlDve, setActiveControlDve] = useState<'dve1' | 'dve2'>('dve1');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadMedia = async () => {
        try {
            const items = await listMedia();
            // Sort to put default items first, then by creation date
            items.sort((a, b) => {
                if (a.isDefault && !b.isDefault) return -1;
                if (!a.isDefault && b.isDefault) return 1;
                return b.createdAt - a.createdAt;
            });
            setMediaItems(items);
        } catch (e) {
            console.error('Failed to load media list', e);
        }
    };

    useEffect(() => {
        loadMedia();
    }, []);

    const handleFile = async (file: File) => {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/mp4')) {
            alert('Only images and MP4 videos are supported.');
            return;
        }
        try {
            const newItem = await saveMedia(file);
            
            // Auto-assign to BG if it's the first upload and nothing is assigned
            if (mediaItems.length === 0 && !state.visualConfig.bgSourceId) {
                dispatch({ type: 'SET_VISUAL_CONFIG', payload: { bgSourceId: newItem.id } });
            }
            
            loadMedia();
        } catch (e) {
            console.error('Failed to save media', e);
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            Array.from(e.dataTransfer.files).forEach(f => handleFile(f));
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this graphic?')) {
            await deleteMedia(id);
            if (state.visualConfig.bgSourceId === id) {
                dispatch({ type: 'SET_VISUAL_CONFIG', payload: { bgSourceId: null } });
            }
            state.visualConfig.dves.forEach(dve => {
                if (dve.sourceId === id) {
                    dispatch({ type: 'UPDATE_DVE', payload: { id: dve.id, dve: { sourceId: null } } });
                }
            });
            loadMedia();
        }
    };

    const config = state.visualConfig;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                        Graphics Library
                    </div>
                    <button 
                        onClick={() => dispatch({ type: 'SET_VISUAL_CONFIG', payload: { showGraphicsSwitcher: false } })}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                        title="Close Graphics Switcher"
                    >
                        <X size={16} />
                    </button>
                </div>
                
                {/* Upload Zone */}
                <div 
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        border: `2px dashed ${isDragging ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                        borderRadius: '8px',
                        padding: '1.5rem 1rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: isDragging ? 'rgba(10,132,255,0.1)' : 'var(--glass-bg)',
                        transition: 'all 0.2s',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem'
                    }}
                >
                    <Upload size={24} color="var(--text-secondary)" />
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Click or drop to upload</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>PNG, JPG, MP4</div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept="image/*,video/mp4" 
                        multiple
                        onChange={e => {
                            if (e.target.files) Array.from(e.target.files).forEach(f => handleFile(f));
                            e.target.value = ''; // reset
                        }} 
                    />
                </div>

                {/* Media Grid */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '4px' }}>
                    {mediaItems.map(item => {
                        const isBg = config.bgSourceId === item.id;
                        const isDve1 = config.dves[0].sourceId === item.id;
                        const isDve2 = config.dves[1].sourceId === item.id;
                        return (
                            <div key={item.id} style={{ 
                                display: 'flex', 
                                gap: '0.75rem', 
                                padding: '0.5rem', 
                                background: 'var(--glass-bg)', 
                                border: `1px solid ${isBg || isDve1 || isDve2 ? 'var(--accent-blue)' : 'var(--glass-border)'}`, 
                                borderRadius: '6px',
                                alignItems: 'center',
                                position: 'relative'
                            }}>
                                <div style={{ 
                                    width: '60px', height: '45px', 
                                    borderRadius: '4px', overflow: 'hidden', 
                                    background: '#000', flexShrink: 0,
                                    backgroundImage: `url(${item.thumbnail})`,
                                    backgroundSize: 'cover', backgroundPosition: 'center',
                                    position: 'relative'
                                }}>
                                    {item.type === 'video' && (
                                        <div style={{ position: 'absolute', bottom: 2, left: 2, background: 'rgba(0,0,0,0.6)', borderRadius: '3px', padding: '1px 3px' }}>
                                            <Play size={10} color="#fff" />
                                        </div>
                                    )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.name}>
                                        {item.name}
                                        {item.isDefault && <span style={{ marginLeft: '4px', fontSize: '0.6rem', color: 'var(--accent-green)', background: 'rgba(52, 199, 89, 0.1)', padding: '1px 4px', borderRadius: '3px' }}>Default</span>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button 
                                            onClick={() => dispatch({ type: 'SET_VISUAL_CONFIG', payload: { bgSourceId: isBg ? null : item.id } })}
                                            style={{ 
                                                flex: 1, padding: '2px 0', fontSize: '0.65rem', fontWeight: 600, borderRadius: '4px', cursor: 'pointer',
                                                background: isBg ? 'var(--accent-blue)' : 'var(--glass-bg)',
                                                color: isBg ? '#fff' : 'var(--text-secondary)',
                                                border: `1px solid ${isBg ? 'var(--accent-blue)' : 'var(--glass-border)'}`
                                            }}
                                        >BG</button>
                                        <button 
                                            onClick={() => dispatch({ type: 'UPDATE_DVE', payload: { id: 'dve1', dve: { sourceId: isDve1 ? null : item.id } } })}
                                            style={{ 
                                                flex: 1, padding: '2px 0', fontSize: '0.65rem', fontWeight: 600, borderRadius: '4px', cursor: 'pointer',
                                                background: isDve1 ? '#8b5cf6' : 'var(--glass-bg)',
                                                color: isDve1 ? '#fff' : 'var(--text-secondary)',
                                                border: `1px solid ${isDve1 ? '#8b5cf6' : 'var(--glass-border)'}`
                                            }}
                                        >DVE 1</button>
                                        <button 
                                            onClick={() => dispatch({ type: 'UPDATE_DVE', payload: { id: 'dve2', dve: { sourceId: isDve2 ? null : item.id } } })}
                                            style={{ 
                                                flex: 1, padding: '2px 0', fontSize: '0.65rem', fontWeight: 600, borderRadius: '4px', cursor: 'pointer',
                                                background: isDve2 ? '#8b5cf6' : 'var(--glass-bg)',
                                                color: isDve2 ? '#fff' : 'var(--text-secondary)',
                                                border: `1px solid ${isDve2 ? '#8b5cf6' : 'var(--glass-border)'}`
                                            }}
                                        >DVE 2</button>
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => handleDelete(item.id, e)}
                                    style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '50%', padding: '4px', cursor: 'pointer', color: '#ef4444' }}
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        );
                    })}
                    {mediaItems.length === 0 && (
                        <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            No graphics uploaded yet.
                        </div>
                    )}
                </div>
            </div>

            {/* Switcher & DVE Controls */}
            <div style={{ background: 'var(--glass-bg)', borderRadius: '8px', border: '1px solid var(--glass-border)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Layers size={14} /> DVE Controls
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '6px' }}>
                    {(['dve1', 'dve2'] as const).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setActiveControlDve(mode)}
                            style={{
                                flex: 1, padding: '4px 0', fontSize: '0.7rem', fontWeight: 600, borderRadius: '4px', cursor: 'pointer',
                                background: activeControlDve === mode ? 'var(--glass-highlight)' : 'transparent',
                                color: activeControlDve === mode ? 'var(--text-primary)' : 'var(--text-secondary)',
                                border: 'none'
                            }}
                        >
                            {mode.toUpperCase()}
                        </button>
                    ))}
                </div>
                
                {(() => {
                    const activeDveState = config.dves.find(d => d.id === activeControlDve)!;
                    return (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <button
                                    onClick={() => dispatch({ type: 'UPDATE_DVE', payload: { id: activeControlDve, dve: { enabled: !activeDveState.enabled } } })}
                                    style={{
                                        background: activeDveState.enabled ? '#ef4444' : 'var(--glass-bg)',
                                        color: activeDveState.enabled ? '#fff' : 'var(--text-primary)',
                                        border: `1px solid ${activeDveState.enabled ? '#ef4444' : 'var(--glass-border)'}`,
                                        padding: '4px 12px',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '4px', width: '100%', justifyContent: 'center'
                                    }}
                                >
                                    {activeDveState.enabled ? 'CUT / FADE OFF' : 'FADE ON'}
                                </button>
                            </div>

                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Image Fit</div>
                            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '6px' }}>
                                {(['fit', 'fill'] as const).map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => dispatch({ type: 'UPDATE_DVE', payload: { id: activeControlDve, dve: { fitMode: mode } } })}
                                        style={{
                                            flex: 1, padding: '4px 0', fontSize: '0.7rem', fontWeight: 600, borderRadius: '4px', cursor: 'pointer',
                                            background: activeDveState.fitMode === mode ? 'var(--glass-highlight)' : 'transparent',
                                            color: activeDveState.fitMode === mode ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            border: 'none'
                                        }}
                                    >
                                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                    </button>
                                ))}
                            </div>

                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Box Mode</div>
                            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '6px' }}>
                                {(['16:9', 'custom'] as const).map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => dispatch({ type: 'UPDATE_DVE', payload: { id: activeControlDve, dve: { boxMode: mode } } })}
                                        style={{
                                            flex: 1, padding: '4px 0', fontSize: '0.7rem', fontWeight: 600, borderRadius: '4px', cursor: 'pointer',
                                            background: activeDveState.boxMode === mode ? 'var(--glass-highlight)' : 'transparent',
                                            color: activeDveState.boxMode === mode ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            border: 'none'
                                        }}
                                    >
                                        {mode === '16:9' ? '16:9 Locked' : 'Custom'}
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <DragNumberInput 
                                    label="X%" 
                                    value={activeDveState.rect.x} 
                                    onChange={v => dispatch({ type: 'UPDATE_DVE', payload: { id: activeControlDve, dve: { rect: { ...activeDveState.rect, x: v } } } })} 
                                />
                                <DragNumberInput 
                                    label="Y%" 
                                    value={activeDveState.rect.y} 
                                    onChange={v => dispatch({ type: 'UPDATE_DVE', payload: { id: activeControlDve, dve: { rect: { ...activeDveState.rect, y: v } } } })} 
                                />
                                <DragNumberInput 
                                    label="W%" 
                                    value={activeDveState.rect.w} 
                                    onChange={v => {
                                        const rect = { ...activeDveState.rect, w: Math.max(1, v) };
                                        if (activeDveState.boxMode === '16:9') {
                                            const screenW = state.screenCols * state.panelPixelsW;
                                            const screenH = state.screenRows * state.panelPixelsH;
                                            rect.h = (rect.w * screenW * 9) / (screenH * 16);
                                        }
                                        dispatch({ type: 'UPDATE_DVE', payload: { id: activeControlDve, dve: { rect } } });
                                    }} 
                                />
                                <DragNumberInput 
                                    label="H%" 
                                    value={activeDveState.rect.h} 
                                    onChange={v => {
                                        const rect = { ...activeDveState.rect, h: Math.max(1, v) };
                                        if (activeDveState.boxMode === '16:9') {
                                            const screenW = state.screenCols * state.panelPixelsW;
                                            const screenH = state.screenRows * state.panelPixelsH;
                                            rect.w = (rect.h * screenH * 16) / (screenW * 9);
                                        }
                                        dispatch({ type: 'UPDATE_DVE', payload: { id: activeControlDve, dve: { rect } } });
                                    }} 
                                />
                            </div>
                        </>
                    );
                })()}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                        <span>Fade Rate</span>
                        <span>{((config.fadeDurationMs || 500) / 1000).toFixed(1)}s</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" max="2000" step="100" 
                        value={config.fadeDurationMs || 500} 
                        onChange={e => dispatch({ type: 'SET_VISUAL_CONFIG', payload: { fadeDurationMs: Number(e.target.value) } })}
                        style={{ width: '100%' }}
                    />
                </div>
            </div>
        </div>
    );
}
