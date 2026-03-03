import React, { useState } from 'react';
import styles from '../styles/Modal.module.css';
import { type PanelSpec } from '../data/panelSpecs';
import { X, Plus, Trash2, Edit2, Save, Zap } from 'lucide-react';
import PowerCurveEditor from './PowerCurveEditor';
import { type PowerPoint } from '../utils/powerLogic';

interface PanelLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    panels: PanelSpec[];
    onSavePanels: (panels: PanelSpec[]) => void;
    onSelectPanel: (panel: PanelSpec) => void;
}

const PanelLibraryModal: React.FC<PanelLibraryModalProps> = ({ isOpen, onClose, panels, onSavePanels, onSelectPanel }) => {
    if (!isOpen) return null;

    const [localPanels, setLocalPanels] = useState<PanelSpec[]>(panels);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<PanelSpec | null>(null);
    const [editingCurveId, setEditingCurveId] = useState<string | null>(null);

    const handleEdit = (panel: PanelSpec) => {
        setEditingId(panel.id);
        setEditForm({
            panelsPerCase: 6,
            blanksPerCase: 8,
            supportCasesCount: 1,
            ...panel
        });
    };

    const handleAddNew = () => {
        const newPanel: PanelSpec = {
            id: Date.now().toString(),
            manufacturer: 'New',
            model: 'Panel',
            widthMm: 500,
            heightMm: 500,
            pixelsW: 104,
            pixelsH: 104,
            weightKg: 8,
            maxWatts: 150,
            brightnessNits: 1000,
            panelsPerCase: 6,
            blanksPerCase: 8,
            supportCasesCount: 1,
            baseplateHeightMm: 102,
        };
        setLocalPanels([...localPanels, newPanel]);
        handleEdit(newPanel);
    };

    const handleSaveEdit = () => {
        if (editForm) {
            const updated = localPanels.map(p => p.id === editForm.id ? editForm : p);
            setLocalPanels(updated);
            onSavePanels(updated);
            setEditingId(null);
            setEditForm(null);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this panel?')) {
            const updated = localPanels.filter(p => p.id !== id);
            setLocalPanels(updated);
            onSavePanels(updated);
        }
    };

    const handleSelect = (panel: PanelSpec) => {
        onSelectPanel(panel);
        onClose();
    };

    const handleSaveCurve = (curve: PowerPoint[]) => {
        if (editingCurveId) {
            const updated = localPanels.map(p => {
                if (p.id === editingCurveId) {
                    return { ...p, customCurve: curve };
                }
                return p;
            });
            setLocalPanels(updated);
            onSavePanels(updated);
            setEditingCurveId(null);
        }
    };

    const editingCurvePanel = localPanels.find(p => p.id === editingCurveId);

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>Panel Library</h2>
                    <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
                </div>

                <div className={styles.content}>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Manufacturer</th>
                                    <th>Model</th>
                                    <th>Size (mm)</th>
                                    <th>Pixels</th>
                                    <th>Weight</th>
                                    <th>Max Power</th>
                                    <th>Nits</th>
                                    <th>Panels/Case</th>
                                    <th>Blanks/Case</th>
                                    <th>Support</th>
                                    <th title="Baseplate/footer height in mm">Baseplate (mm)</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {localPanels.map(panel => (
                                    <tr key={panel.id} className={editingId === panel.id ? styles.editingRow : ''}>
                                        {editingId === panel.id && editForm ? (
                                            <>
                                                <td><input value={editForm.manufacturer} onChange={e => setEditForm({ ...editForm, manufacturer: e.target.value })} className={styles.editInput} /></td>
                                                <td><input value={editForm.model} onChange={e => setEditForm({ ...editForm, model: e.target.value })} className={styles.editInput} /></td>
                                                <td>
                                                    <div className={styles.dualInput}>
                                                        <input type="number" value={editForm.widthMm} onChange={e => setEditForm({ ...editForm, widthMm: Number(e.target.value) })} title="Width" />
                                                        <span>x</span>
                                                        <input type="number" value={editForm.heightMm} onChange={e => setEditForm({ ...editForm, heightMm: Number(e.target.value) })} title="Height" />
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className={styles.dualInput}>
                                                        <input type="number" value={editForm.pixelsW} onChange={e => setEditForm({ ...editForm, pixelsW: Number(e.target.value) })} title="Px Width" />
                                                        <span>x</span>
                                                        <input type="number" value={editForm.pixelsH} onChange={e => setEditForm({ ...editForm, pixelsH: Number(e.target.value) })} title="Px Height" />
                                                    </div>
                                                </td>
                                                <td><input type="number" value={editForm.weightKg} onChange={e => setEditForm({ ...editForm, weightKg: Number(e.target.value) })} className={styles.editInput} style={{ width: '60px' }} /> kg</td>
                                                <td><input type="number" value={editForm.maxWatts} onChange={e => setEditForm({ ...editForm, maxWatts: Number(e.target.value) })} className={styles.editInput} style={{ width: '60px' }} /> W</td>
                                                <td><input type="number" value={editForm.brightnessNits} onChange={e => setEditForm({ ...editForm, brightnessNits: Number(e.target.value) })} className={styles.editInput} style={{ width: '60px' }} /></td>
                                                <td><input type="number" value={editForm.panelsPerCase || 6} onChange={e => setEditForm({ ...editForm, panelsPerCase: Number(e.target.value) })} className={styles.editInput} style={{ width: '40px' }} /></td>
                                                <td><input type="number" value={editForm.blanksPerCase || 8} onChange={e => setEditForm({ ...editForm, blanksPerCase: Number(e.target.value) })} className={styles.editInput} style={{ width: '40px' }} /></td>
                                                <td><input type="number" value={editForm.supportCasesCount || 1} onChange={e => setEditForm({ ...editForm, supportCasesCount: Number(e.target.value) })} className={styles.editInput} style={{ width: '40px' }} /></td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            title="Baseplate / footer height in mm"
                                                            value={editForm.baseplateHeightMm ?? 102}
                                                            onChange={e => setEditForm({ ...editForm, baseplateHeightMm: Number(e.target.value) })}
                                                            className={styles.editInput}
                                                            style={{ width: '52px' }}
                                                        />
                                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>mm</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className={styles.actions}>
                                                        <button onClick={handleSaveEdit} className={styles.saveBtn} title="Save"><Save size={16} /></button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td>{panel.manufacturer}</td>
                                                <td>{panel.model}</td>
                                                <td>{panel.widthMm} x {panel.heightMm}</td>
                                                <td>{panel.pixelsW} x {panel.pixelsH}</td>
                                                <td>{panel.weightKg} kg</td>
                                                <td>{panel.maxWatts} W</td>
                                                <td>{panel.brightnessNits}</td>
                                                <td>{panel.panelsPerCase || 6}</td>
                                                <td>{panel.blanksPerCase || 8}</td>
                                                <td>{panel.supportCasesCount || 1}</td>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    {panel.baseplateHeightMm ?? 102} mm
                                                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: '3px' }}>
                                                        ({((panel.baseplateHeightMm ?? 102) / 25.4).toFixed(1)} in)
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className={styles.actions}>
                                                        <button onClick={() => handleSelect(panel)} className={styles.selectBtn}>Select</button>
                                                        <button onClick={() => setEditingCurveId(panel.id)} className={styles.iconBtn} title="Edit Power Curve"><Zap size={14} /></button>
                                                        <button onClick={() => handleEdit(panel)} className={styles.iconBtn}><Edit2 size={14} /></button>
                                                        <button onClick={() => handleDelete(panel.id)} className={styles.iconBtnDanger}><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <button onClick={handleAddNew} className={styles.addBtn}>
                        <Plus size={16} /> Add New Panel
                    </button>
                </div>
            </div>

            {editingCurvePanel && (
                <PowerCurveEditor
                    isOpen={!!editingCurveId}
                    onClose={() => setEditingCurveId(null)}
                    initialCurve={editingCurvePanel.customCurve}
                    maxWatts={editingCurvePanel.maxWatts}
                    productName={`${editingCurvePanel.manufacturer} ${editingCurvePanel.model}`}
                    onSave={handleSaveCurve}
                />
            )}
        </div>
    );
};

export default PanelLibraryModal;
