import React, { useMemo, useState, useEffect } from 'react';
import { AppProvider, useAppState } from './context/StateContext';
import SettingsPanel from './components/SettingsPanel';
import Visualizer from './components/Visualizer';
import { GraphicsSwitcher } from './components/GraphicsSwitcher';
import PowerChart from './components/PowerChart';
import PanelLibraryModal from './components/PanelLibraryModal';
import { initialPanels, type PanelSpec } from './data/panelSpecs';
import { getDistroSpec } from './components/DistroWidget';

import { getWattsPerPanel } from './utils/powerLogic';
import { Download, Zap, Sun, Moon, Package, Cpu, Save, Upload, Settings as SettingsIcon, MonitorSmartphone, Monitor, Network, Wand2, RotateCcw, Undo2, Redo2, FilePlus, Menu } from 'lucide-react';
import { generateSpecSheet } from './utils/generateSpecSheet';
import styles from './styles/App.module.css';
import pkg from '../package.json';

// ── Warm circuit color palette — 10 distinct warm hues ──────────────────────
const CIRCUIT_COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#f59e0b', // amber-500
  '#eab308', // yellow-500
  '#e11d48', // rose-600
  '#c2410c', // orange-700
  '#b45309', // amber-700
  '#dc2626', // red-600
  '#fb923c', // orange-400
  '#fbbf24', // amber-400
];

const DashboardContent: React.FC = () => {
  const { state, dispatch, canUndo, canRedo } = useAppState();

  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'idle'>('idle');

  const renderCardWrapper = (id: number, className: string, content: React.ReactNode) => {
    const isExpanded = expandedCard === id;
    return (
      <React.Fragment key={id}>
        <div 
           className={className} 
           style={{ cursor: 'pointer', opacity: isExpanded ? 0 : 1 }}
           onClick={() => setExpandedCard(id)}
        >
            {content}
        </div>
        {isExpanded && (
            <div className={styles.cardOverlay} onClick={() => setExpandedCard(null)}>
                <div className={`${className} ${styles.cardExpanded}`} onClick={e => e.stopPropagation()}>
                    {content}
                    <button className={styles.closeCardBtn} onClick={() => setExpandedCard(null)}>✕</button>
                </div>
            </div>
        )}
      </React.Fragment>
    );
  };

  // Library State
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [availablePanels, setAvailablePanels] = useState<PanelSpec[]>(() => {
    try {
      const saved = localStorage.getItem('led-power-planner-panel-library');
      if (saved) return JSON.parse(saved);
    } catch (e) { console.error('Failed to load panel library', e); }
    return initialPanels;
  });

  useEffect(() => {
    localStorage.setItem('led-power-planner-panel-library', JSON.stringify(availablePanels));
  }, [availablePanels]);

  // Theme Mode: 'dark' | 'light' | 'auto'
  // 'auto' tracks the OS preference in real-time.
  type ThemeMode = 'dark' | 'light' | 'auto';
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('led-power-planner-theme-v3');
    if (saved === 'light' || saved === 'dark' || saved === 'auto') return saved as ThemeMode;
    // Migrate from old key
    const legacy = localStorage.getItem('led-power-planner-theme-v2');
    if (legacy === 'light' || legacy === 'dark') return legacy as ThemeMode;
    return 'auto'; // Default to auto
  });

  // Resolved theme (what actually gets applied to DOM)
  const getSystemTheme = () =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('led-power-planner-theme-v3');
    const legacy = localStorage.getItem('led-power-planner-theme-v2');
    const mode = (saved === 'light' || saved === 'dark' || saved === 'auto') ? saved
      : (legacy === 'light' || legacy === 'dark') ? legacy
        : 'auto';
    return mode === 'auto' ? getSystemTheme() : mode as 'dark' | 'light';
  });

  // Keep resolvedTheme in sync whenever themeMode or system preference changes
  useEffect(() => {
    if (themeMode !== 'auto') {
      setResolvedTheme(themeMode);
      return;
    }
    // Auto: set initial and listen for changes
    setResolvedTheme(getSystemTheme());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setResolvedTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themeMode]);

  const [feedsResolution, setFeedsResolution] = useState<'hd' | '4k'>(() => {
    return (localStorage.getItem('led-feeds-resolution') as 'hd' | '4k') || 'hd';
  });

  useEffect(() => {
    localStorage.setItem('led-feeds-resolution', feedsResolution);
  }, [feedsResolution]);

  // Apply resolved theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  // Persist theme mode
  useEffect(() => {
    localStorage.setItem('led-power-planner-theme-v3', themeMode);
  }, [themeMode]);

  // Cycle: dark → light → auto
  const toggleTheme = () => {
    setThemeMode(prev => prev === 'dark' ? 'light' : prev === 'light' ? 'auto' : 'dark');
  };

  const [updateUrl, setUpdateUrl] = useState<string | null>(null);

  // ── Keyboard shortcuts: Undo (⌘Z) / Redo (⌘⇧Z) ─────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch]);

  // ── Auto-save visual indicator ─────────────────────────────────────────────
  useEffect(() => {
    setSaveStatus('saving');
    const tSaved = setTimeout(() => setSaveStatus('saved'), 1000);
    const tIdle  = setTimeout(() => setSaveStatus('idle'),  2800);
    return () => { clearTimeout(tSaved); clearTimeout(tIdle); };
  }, [state]);

  useEffect(() => {
    // -------------------------------------------------------------
    // AUTOMATIC UPDATE CHECKER
    // 1. We check the raw version.json file directly from your GitHub repository's main branch.
    // 2. When you want to trigger an update notification, just adjust the version inside 
    //    your local `version.json`, along with the new OneDrive/Box link, and push it to GitHub!
    // -------------------------------------------------------------
    // Delay this check by 3 seconds so it doesn't affect initial load performance
    const timer = setTimeout(() => {
      // Add a timestamp query param to completely bust raw.githubusercontent's 5-minute cache
      const UPDATE_CHECK_URL = `https://raw.githubusercontent.com/kenny330-coder/LEDWallPlanner/main/version.json?t=${Date.now()}`;

      // Setup an abort controller to kill the fetch if it hangs for more than 5 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const xhr = new XMLHttpRequest();
      xhr.open('GET', UPDATE_CHECK_URL, true);
      // Aggressive set of headers specifically to force raw.githubusercontent to completely dump its Edge Cache
      xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      xhr.setRequestHeader('Pragma', 'no-cache');
      xhr.setRequestHeader('Expires', '0');

      xhr.onload = function () {
        clearTimeout(timeoutId);
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data && data.version && data.version !== pkg.version) {
              console.log(`[Update Check] Remote: v${data.version} | Local: v${pkg.version}`);

              // Standard semver comparator (handles 1.0.10 vs 1.0.9 accurately across all JS engines)
              const parseSemVer = (v: string) => v.replace(/[^0-9.]/g, '').split('.').map(Number);
              const vRemote = parseSemVer(data.version);
              const vLocal = parseSemVer(pkg.version);

              let isNewer = false;
              for (let i = 0; i < Math.max(vRemote.length, vLocal.length); i++) {
                const numR = vRemote[i] || 0;
                const numL = vLocal[i] || 0;
                if (numR > numL) { isNewer = true; break; }
                if (numR < numL) { isNewer = false; break; }
              }

              if (isNewer && data.link) {
                setUpdateUrl(data.link);
              }
            }
          } catch (e) {
            console.log('Update JSON parsing failed:', e);
          }
        }
      };

      xhr.onerror = function () {
        clearTimeout(timeoutId);
        console.log('Update check failed or offline.');
      };

      // Set timeout abort
      controller.signal.addEventListener('abort', () => {
        xhr.abort();
      });

      xhr.send();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleSelectPanel = (panel: PanelSpec) => {
    dispatch({ type: 'SET_PANEL_DIMS', payload: { w: panel.widthMm, h: panel.heightMm } });
    dispatch({ type: 'SET_PANEL_RES', payload: { w: panel.pixelsW, h: panel.pixelsH } });
    dispatch({ type: 'SET_PANEL_WEIGHT', payload: panel.weightKg });
    dispatch({ type: 'SET_PANEL_MAX_WATTS', payload: panel.maxWatts });
    dispatch({ type: 'SET_MAX_NITS', payload: panel.brightnessNits });
    dispatch({ type: 'SET_PANEL_LOGISTICS', payload: { panelsPerCase: panel.panelsPerCase || 6, blanksPerCase: panel.blanksPerCase || 8, supportCasesCount: panel.supportCasesCount || 1 } });
    dispatch({ type: 'SET_BASEPLATE_HEIGHT', payload: panel.baseplateHeightMm ?? 102 });
  };

  const [resetKey, setResetKey] = useState(0);

  const handleNewProject = () => {
    if (window.confirm('Start a new project? Your current project is auto-saved and can be restored by pressing Cancel then reopening, but the undo history will be cleared.')) {
      dispatch({ type: 'RESET_STATE' });
      localStorage.removeItem('lastSelectedPanelId');
      setResetKey(prev => prev + 1);
    }
  };

  const handleSaveConfig = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    // Slug the project name for the filename: lowercase, spaces → dashes, strip non-alphanum
    const slug = (state.projectName || 'led-project')
      .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const exportFileDefaultName = `${slug}-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleLoadConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files.length > 0) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          if (event.target?.result) {
            const loadedState = JSON.parse(event.target.result as string);
            if ('screenCols' in loadedState && 'brightness' in loadedState) {
              dispatch({ type: 'IMPORT_STATE', payload: loadedState });
            } else {
              alert('Invalid configuration file.');
            }
          }
        } catch (err) {
          console.error(err);
          alert('Error parsing configuration file.');
        }
      };
    }
  };

  // Use state.brightness as source of truth now
  const brightnessPercent = state.brightness;
  const targetNits = (brightnessPercent / 100) * state.maxNits;

  // Power Calc
  const wattsPerPanel = useMemo(() => getWattsPerPanel(brightnessPercent, state.panelMaxWatts, state.customCurve), [brightnessPercent, state.panelMaxWatts, state.customCurve]);
  const totalPanels = state.screenCols * state.screenRows;
  const totalWatts = totalPanels * wattsPerPanel;

  // Electrical
  const circuitCapacityAmps = state.circuitBreakerAmps * 0.8;
  const maxPanelsPerCircuit = Math.floor((circuitCapacityAmps * state.voltage) / wattsPerPanel);
  const saferMaxPanelsPerCircuit = Math.max(1, maxPanelsPerCircuit);

  const circuitsNeeded = Math.ceil(totalPanels / saferMaxPanelsPerCircuit);


  // Physical & Heat
  const totalHeatBTU = totalWatts * 3.41214;
  const totalWeightKg = totalPanels * (state.panelWeightKg || 12);
  const totalWeightLbs = totalWeightKg * 2.20462;

  // Graphics & Data
  const totalPixelsW = state.screenCols * state.panelPixelsW;
  const totalPixelsH = state.screenRows * state.panelPixelsH;
  const totalPixels = totalPixelsW * totalPixelsH;
  const requiredPorts = Math.max(1, Math.ceil(totalPixels / 650000));

  // Auto-initialize data ports when entering data mode
  useEffect(() => {
    if (state.visualizerMode !== 'data') return;
    if (state.dataConfig.ports.length > 0) return; // already initialized
    const portColors = [
      '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
      '#ef4444', '#06b6d4', '#f97316', '#ec4899',
      '#84cc16', '#a78bfa', '#34d399', '#fb923c'
    ];
    const newPorts = Array.from({ length: requiredPorts }, (_, i) => ({
      id: `port-init-${i}-${Date.now()}`,
      color: portColors[i % portColors.length],
      panelIds: []
    }));
    dispatch({ type: 'INIT_DATA_PORTS', payload: newPorts });
  }, [state.visualizerMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const getAspectRatioAnalysis = (w: number, h: number) => {
    if (h === 0 || w === 0) return { label: '0:0', color: '#64748b', desc: 'Invalid' };
    const ratio = w / h;

    const mult169 = ratio / (16 / 9);
    let closestMult = Math.round(mult169);

    if (Math.abs(mult169 - 0.5) < Math.abs(mult169 - closestMult)) {
      closestMult = 0.5;
    }
    if (closestMult === 0) closestMult = 1;

    const targetRatio = closestMult === 0.5 ? (9 / 16) : (16 / 9 * closestMult);
    const diff = Math.abs(ratio - targetRatio) / targetRatio;

    let baseString = `${closestMult}x 16:9`;
    if (closestMult === 0.5) baseString = "9:16 Portrait";
    if (closestMult === 1) baseString = "16:9 Standard";
    if (closestMult === 2) baseString = "32:9 (Dual 16:9)";
    if (closestMult === 3) baseString = "48:9 (Triple 16:9)";

    let color = '#ef4444'; // Red
    let prefix = "";

    if (diff <= 0.02) {
      color = '#22c55e'; // Green
      prefix = "Perfect";
    } else if (diff <= 0.08) {
      color = '#eab308'; // Yellow
      prefix = "Close to";
    } else if (diff <= 0.18) {
      color = '#f97316'; // Orange
      prefix = "Roughly";
    }

    let desc = `${prefix} ${baseString}`.trim();

    if (diff > 0.18) {
      if (Math.abs(ratio - (4 / 3)) < 0.03) desc = "Exact 4:3 Classic";
      else if (Math.abs(ratio - (16 / 10)) < 0.03) desc = "Exact 16:10 WUXGA";
      else if (Math.abs(ratio - (21 / 9)) < 0.03) desc = "Exact 21:9 Ultrawide";
      else if (Math.abs(ratio - 1) < 0.03) desc = "Exact 1:1 Square";
      else desc = "Custom Composition";
    }

    return {
      label: `${ratio.toFixed(2)}:1`,
      color,
      desc
    };
  };

  const handleExport = () => {
    generateSpecSheet(state);
  };

  return (
    <div className={styles.container}>
      <div className={styles.titleBar} />
      {/* Ambient blobs — give glass panels something to refract */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', width: '700px', height: '700px',
          top: '-200px', right: '-150px',
          background: 'radial-gradient(circle, var(--glow-blue) 0%, transparent 65%)',
          filter: 'blur(80px)', borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute', width: '600px', height: '600px',
          bottom: '-150px', left: '80px',
          background: 'radial-gradient(circle, var(--glow-purple) 0%, transparent 65%)',
          filter: 'blur(80px)', borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute', width: '400px', height: '400px',
          top: '40%', left: '35%',
          background: 'radial-gradient(circle, var(--glow-green) 0%, transparent 65%)',
          filter: 'blur(60px)', borderRadius: '50%'
        }} />
      </div>

      <button
        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        title="Toggle Settings Pane"
        style={{ 
          position: 'absolute',
          top: '0.75rem',
          left: isSettingsOpen ? '19.2rem' : '0.75rem',
          zIndex: 5001,
          background: 'transparent', 
          border: 'none', 
          color: 'var(--text-primary)', 
          cursor: 'pointer', 
          WebkitAppRegion: 'no-drag',
          padding: '0.4rem',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        } as React.CSSProperties}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--glass-highlight)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <Menu size={20} />
      </button>

      <div style={{
        width: isSettingsOpen ? '22rem' : '0',
        opacity: isSettingsOpen ? 1 : 0,
        transform: isSettingsOpen ? 'translateX(0)' : 'translateX(-22rem)',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        flexShrink: 0,
        zIndex: 10
      }}>
        <div style={{ width: '22rem', height: '100%' }}>
          <SettingsPanel key={resetKey} availablePanels={availablePanels} onSelectPanel={handleSelectPanel} />
        </div>
      </div>

      <PanelLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        panels={availablePanels}
        onSavePanels={setAvailablePanels}
        onSelectPanel={handleSelectPanel}
      />

      <main className={styles.main}>
        <header className={styles.header}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className={styles.projectNameWrap}>
              <span className={styles.projectNameLabel}>Project Name</span>
              <input
                className={styles.projectNameInput}
                value={state.projectName ?? 'Untitled Project'}
                onChange={(e) => dispatch({ type: 'SET_PROJECT_NAME', payload: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                placeholder="Untitled Project"
                aria-label="Project name"
                title="Click to rename project"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            {updateUrl && (
              <button
                onClick={() => window.open(updateUrl, '_blank')}
                className={`${styles.exportBtn} update-badge`}
                title="A new version of LED Power Planner is available!"
                style={{
                  borderRadius: '999px',
                  padding: '0.45rem 0.85rem',
                  background: 'var(--accent-green)',
                  color: '#ffffff',
                  border: 'none',
                  gap: '0.35rem',
                  fontWeight: '600',
                  fontSize: '0.8rem',
                }}
              >
                <Download size={14} /> Update Available
              </button>
            )}

            {/* Auto-save indicator — fixed width so buttons never reflow */}
            <span style={{
              width: '52px', textAlign: 'right', fontSize: '0.65rem',
              color: 'var(--text-secondary)',
              opacity: saveStatus !== 'idle' ? 1 : 0,
              transition: 'opacity 0.5s ease',
              pointerEvents: 'none',
            }}>
              {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
            </span>

            {/* Project file actions — grouped in a pill container */}
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', padding: '0.2rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '999px', backdropFilter: 'blur(12px)' }}>
              <button onClick={handleNewProject} className={styles.exportBtn} title="New Project" style={{ borderRadius: '999px', padding: '0.4rem 0.85rem', gap: '0.4rem', fontSize: '0.8rem' }}>
                <FilePlus size={14} /> New
              </button>
              <button onClick={handleSaveConfig} className={styles.exportBtn} title="Save project as JSON file" style={{ borderRadius: '999px', padding: '0.4rem 0.85rem', gap: '0.4rem', fontSize: '0.8rem' }}>
                <Save size={14} /> Save
              </button>
              <label className={styles.exportBtn} style={{ cursor: 'pointer', borderRadius: '999px', padding: '0.4rem 0.85rem', gap: '0.4rem', fontSize: '0.8rem' }} title="Open a saved project JSON file">
                <Upload size={14} /> Open
                <input type="file" accept=".json" onChange={handleLoadConfig} style={{ display: 'none' }} />
              </label>
            </div>

            {/* Undo / Redo */}
            <div style={{ display: 'flex', gap: '0.15rem', alignItems: 'center', padding: '0.2rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '999px', backdropFilter: 'blur(12px)' }}>
              <button
                onClick={() => dispatch({ type: 'UNDO' })}
                disabled={!canUndo}
                className={styles.exportBtn}
                title="Undo (⌘Z)"
                style={{ borderRadius: '999px', padding: '0.45rem 0.7rem', opacity: canUndo ? 1 : 0.35, cursor: canUndo ? 'pointer' : 'not-allowed' }}
              >
                <Undo2 size={15} />
              </button>
              <button
                onClick={() => dispatch({ type: 'REDO' })}
                disabled={!canRedo}
                className={styles.exportBtn}
                title="Redo (⌘⇧Z)"
                style={{ borderRadius: '999px', padding: '0.45rem 0.7rem', opacity: canRedo ? 1 : 0.35, cursor: canRedo ? 'pointer' : 'not-allowed' }}
              >
                <Redo2 size={15} />
              </button>
            </div>

            {/* Utility icon buttons */}
            <button onClick={() => setIsLibraryOpen(true)} className={styles.exportBtn} title="Panel Library" style={{ borderRadius: '999px', padding: '0.45rem 0.7rem' }}>
              <SettingsIcon size={16} />
            </button>
            <button
              onClick={toggleTheme}
              className={styles.exportBtn}
              title={themeMode === 'dark' ? 'Switch to Light Mode' : themeMode === 'light' ? 'Switch to Auto Mode' : 'Switch to Dark Mode'}
              style={{ borderRadius: '999px', padding: '0.45rem 0.7rem', position: 'relative' }}
            >
              {themeMode === 'dark' ? <Moon size={16} /> : themeMode === 'light' ? <Sun size={16} /> : <MonitorSmartphone size={16} />}
              {themeMode === 'auto' && (
                <span style={{
                  position: 'absolute', top: '2px', right: '2px',
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: 'var(--accent-blue)',
                  boxShadow: '0 0 4px var(--accent-blue)'
                }} />
              )}
            </button>

            <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 0.25rem' }}></div>

            {/* Primary CTA */}
            <button onClick={handleExport} className={styles.exportBtn} style={{ background: 'var(--accent-blue)', color: 'white', borderRadius: '999px', padding: '0.45rem 1.1rem', border: 'none', boxShadow: '0 2px 12px var(--glow-blue)', gap: '0.4rem' }}>
              <Download size={16} /> Export PDF
            </button>
          </div>
        </header>

        <div className={styles.statsGrid}>
          {/* Card 1: Power & Electrical */}
          {renderCardWrapper(1, `${styles.statCard} ${styles.statCardPower}`, (
            <>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Power & Heat</span>
              <Zap size={16} color="var(--accent-yellow)" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem', paddingBottom: '0.1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Circuits ({state.circuitBreakerAmps}A)</div>
                   <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                     <span style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{circuitsNeeded}</span>
                     <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Req.</span>
                   </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Brightness Target</div>
                   <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                     <span style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{targetNits.toFixed(0)}</span>
                     <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Nits <span style={{ fontSize: '0.7rem' }}>({brightnessPercent.toFixed(0)}%)</span></span>
                   </div>
                </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid var(--glass-border)' }}>
                <div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Total Power</div>
                   <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{(totalWatts / 1000).toFixed(2)} <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-secondary)' }}>kW</span></div>
                </div>
                <div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Heat Output</div>
                   <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{(totalHeatBTU / 1000).toFixed(1)}k <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-secondary)' }}>BTU/hr</span></div>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginTop: '0.4rem' }}>
                <div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Per Panel</div>
                   <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{wattsPerPanel.toFixed(1)} <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-secondary)' }}>W</span></div>
                </div>
            </div>
          </>))}

          {/* Card 2: Data & Processing */}
          {renderCardWrapper(2, `${styles.statCard} ${styles.statCardCircuit}`, (
            <>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Processing & Output</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', overflow: 'hidden' }}>
                      <button onClick={() => setFeedsResolution('hd')} style={{ background: feedsResolution === 'hd' ? 'var(--accent-blue)' : 'transparent', color: feedsResolution === 'hd' ? 'white' : 'var(--text-secondary)', border: 'none', padding: '1px 8px', fontSize: '0.6rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', outline: 'none' }}>HD</button>
                      <button onClick={() => setFeedsResolution('4k')} style={{ background: feedsResolution === '4k' ? 'var(--accent-blue)' : 'transparent', color: feedsResolution === '4k' ? 'white' : 'var(--text-secondary)', border: 'none', padding: '1px 8px', fontSize: '0.6rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', outline: 'none' }}>4K</button>
                  </div>
                  <Cpu size={16} color="var(--accent-blue)" />
              </div>
            </div>

            {(() => {
                const is4K = feedsResolution === '4k';
                const feedW = is4K ? 3840 : 1920;
                const feedH = is4K ? 2160 : 1080;
                
                const feedsNoMap = Math.ceil(totalPixelsW / feedW) * Math.ceil(totalPixelsH / feedH);
                const feedsWithMap = Math.ceil(totalPixels / (feedW * feedH));
                
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                               <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{is4K ? '4K Feeds / Ports' : 'HD Feeds / Ports'}</div>
                               <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', marginTop: '2px' }}>
                                 <span style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{feedsWithMap}</span>
                                 <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '0.55rem', fontWeight: 600, color: 'var(--accent-blue)', textTransform: 'uppercase', lineHeight: 1.1 }}>W/ Pixel</span>
                                    <span style={{ fontSize: '0.55rem', fontWeight: 600, color: 'var(--accent-blue)', textTransform: 'uppercase', lineHeight: 1.1 }}>Mapping</span>
                                 </div>
                               </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                               <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{is4K ? '4K Straight Grid' : 'HD Straight Grid'}</div>
                               <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', marginTop: '2px' }}>
                                 <span style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{feedsNoMap}</span>
                                 <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '0.55rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', lineHeight: 1.1 }}>Straight</span>
                                    <span style={{ fontSize: '0.55rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', lineHeight: 1.1 }}>Rectangles</span>
                                 </div>
                               </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid var(--glass-border)' }}>
                            <div>
                               <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Physical Data Ports</div>
                               <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{Math.ceil(totalPixels / 650000)} <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-secondary)' }}>Total Processor Ports Recommended</span></div>
                            </div>
                        </div>
                    </div>
                );
            })()}
          </>))}

          {/* Card 3: Weight & Logistics */}
          {renderCardWrapper(3, `${styles.statCard} ${styles.statCardWeight}`, (
            <>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Logistics & Cases</span>
              <Package size={16} color="var(--accent-purple)" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem', paddingBottom: '0.1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Total Cases</div>
                   <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                     <span style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{Math.ceil(totalPanels / state.panelsPerCase) + Math.ceil(((state.blanksCount || 0) * state.screenCols) / state.blanksPerCase) + state.supportCasesCount}</span>
                     <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Req.</span>
                   </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Active Panels</div>
                   <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                     <span style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{totalPanels}</span>
                     <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Total</span>
                   </div>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid var(--glass-border)' }}>
                <div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Total Weight</div>
                   <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{totalWeightLbs.toFixed(0)} <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-secondary)' }}>lbs</span></div>
                </div>
                <div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Metric Weight</div>
                   <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{totalWeightKg.toFixed(0)} <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-secondary)' }}>kg</span></div>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginTop: '0.4rem' }}>
                <div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Case Breakdown</div>
                   <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{Math.ceil(totalPanels / state.panelsPerCase)} Active + {Math.ceil(((state.blanksCount || 0) * state.screenCols) / state.blanksPerCase)} Blank + {state.supportCasesCount} Support</div>
                </div>
                {(() => {
                    const panelHeightFt = (state.panelHeightMm || 500) / 304.8;
                    let setupMins = 45;
                    let strikeMins = 30;
                    let crewScore = 0;
                    let minCrew = 4;

                    const numBlanks = state.blanksCount || 0;
                    for (let b = 0; b < numBlanks; b++) {
                        const rowTopFt = (b + 1) * panelHeightFt;
                        let rowSetupTime = 1.0 * 0.66;
                        let rowStrikeTime = 0.4 * 0.66;
                        let rowCrewWeight = 1.0 * 0.66;

                        if (rowTopFt > 7.0) {
                            rowSetupTime = 1.5 * 0.66;
                            rowStrikeTime = 0.6 * 0.66;
                            rowCrewWeight = 2.0 * 0.66;
                            minCrew = 8;
                        }

                        setupMins += (rowSetupTime * state.screenCols);
                        strikeMins += (rowStrikeTime * state.screenCols);
                        crewScore += (rowCrewWeight * state.screenCols);
                    }

                    for (let r = 0; r < state.screenRows; r++) {
                        const rowTopFt = (numBlanks + r + 1) * panelHeightFt;
                        let rowSetupTime = 1.0;
                        let rowStrikeTime = 0.4;
                        let rowCrewWeight = 1.0;

                        if (rowTopFt > 7.0) {
                            rowSetupTime = 1.5;
                            rowStrikeTime = 0.6;
                            rowCrewWeight = 2.0;
                            minCrew = 8; // Demand more base crew for ladder work
                        }

                        setupMins += (rowSetupTime * state.screenCols);
                        strikeMins += (rowStrikeTime * state.screenCols);
                        crewScore += (rowCrewWeight * state.screenCols);
                    }

                    const recCrew = Math.max(minCrew, Math.round(crewScore / 45));
                    return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.2rem', paddingTop: '0.4rem', borderTop: '1px solid var(--glass-border)' }}>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Est. Setup / Strike</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{(setupMins / 60).toFixed(1)}h / {(strikeMins / 60).toFixed(1)}h</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Rec. Crew Size</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{recCrew} Techs</div>
                            </div>
                        </div>
                    );
                })()}
            </div>
          </>))}

          {/* Card 4: Graphics & Dimensions */}
          {renderCardWrapper(4, `${styles.statCard} ${styles.statCardIndigo}`, (
            <>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Graphics Canvas</span>
              <Monitor size={16} color="var(--accent-indigo)" />
            </div>
            <div className={styles.statValueContainer}>
              <span className={styles.statValue}>{totalPixelsW} <span style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', fontWeight: 400, margin: '0 2px' }}>×</span> {totalPixelsH}</span>
              <span className={styles.statUnit}> px</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid var(--glass-border)' }}>
                {(() => {
                    const aspect = getAspectRatioAnalysis(totalPixelsW, totalPixelsH);
                    return (
                        <div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Aspect Target</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <div style={{ 
                                    width: '6px', 
                                    height: '6px', 
                                    flexShrink: 0,
                                    borderRadius: '50%', 
                                    backgroundColor: aspect.color,
                                    boxShadow: `0 0 6px ${aspect.color}`
                                }} title="16:9 Compatibility Target" />
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1, letterSpacing: '0.01em' }}>{aspect.label}</div>
                            </div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 500 }}>{aspect.desc}</div>
                        </div>
                    );
                })()}
                <div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Total Pixels</div>
                   <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{totalPixels.toLocaleString()}</div>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginTop: '0.4rem' }}>
                <div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Physical Size</div>
                   <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{(state.screenCols * state.panelWidthMm / 304.8).toFixed(2)}ft × {(state.screenRows * state.panelHeightMm / 304.8).toFixed(2)}ft</div>
                </div>
            </div>
          </>))}
        </div>

        <div className={styles.contentArea}>
          <div className={styles.visualizerCol}>
            <Visualizer maxPanelsPerCircuit={saferMaxPanelsPerCircuit} />
          </div>

          {/* --- Right Details / Actions Column --- */}
          <div className={`${styles.detailsCol} ${state.visualizerMode === 'power' ? '' : state.visualizerMode === 'data' ? '' : (state.visualizerMode === 'staging' && state.visualConfig?.showGraphicsSwitcher !== false) ? '' : styles.detailsColHidden}`}>
            {state.visualizerMode === 'staging' && state.visualConfig?.showGraphicsSwitcher !== false && <GraphicsSwitcher />}

            {/* ─── POWER MODE ─── */}
            {state.visualizerMode === 'power' && (
              <>
                <PowerChart
                  currentBrightness={state.brightness}
                  currentWatts={wattsPerPanel}
                  maxWatts={state.panelMaxWatts}
                  customCurve={state.customCurve}
                />
                <div className={styles.circuitList} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <h3 className={styles.subtitle} style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                      <Zap size={15} /> Circuit Breakdown
                    </h3>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                          onClick={() => {
                            // If no circuits yet, seeds recommended count first
                            if (!state.powerConfig || state.powerConfig.circuits.length === 0) {
                              const seeds = Array.from({ length: circuitsNeeded }, (_, i) => ({ id: `circuit-seed-${i}-${Date.now()}`, color: CIRCUIT_COLORS[i % CIRCUIT_COLORS.length], panelIds: [] }));
                              dispatch({ type: 'INIT_POWER_CIRCUITS', payload: seeds });
                            } else {
                              dispatch({ type: 'ADD_POWER_CIRCUIT', payload: { id: `circuit-${Date.now()}`, color: CIRCUIT_COLORS[(state.powerConfig.circuits.length) % CIRCUIT_COLORS.length], panelIds: [] } });
                            }
                          }}
                          style={{ padding: '2px 8px', fontSize: '0.65rem', fontWeight: 600, background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', border: '1px dashed var(--glass-border)', borderRadius: '4px', cursor: 'pointer' }}
                        >+ Circuit</button>
                        <button
                          onClick={() => {
                            dispatch({ type: 'INIT_POWER_CIRCUITS', payload: [] });
                          }}
                          style={{ padding: '2px 8px', fontSize: '0.85rem', fontWeight: 600, background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', border: '1px dashed var(--glass-border)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Revert to dynamic auto-calculated paths"
                        ><Wand2 size={14} strokeWidth={2.5} /></button>
                        <button
                          onClick={() => {
                            const newCircuits = Array.from({ length: circuitsNeeded }, (_, i) => ({ id: `circuit-reset-${i}-${Date.now()}`, color: CIRCUIT_COLORS[i % CIRCUIT_COLORS.length], panelIds: [] }));
                            dispatch({ type: 'INIT_POWER_CIRCUITS', payload: newCircuits });
                          }}
                          style={{ padding: '2px 8px', fontSize: '0.85rem', fontWeight: 600, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px dashed var(--glass-border)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Re-initialize to recommended circuit count"
                        ><RotateCcw size={14} strokeWidth={2.5} /></button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto' }}>
                      {(!state.powerConfig || state.powerConfig.circuits.length === 0) ? (
                          // Fallback auto-calculated breakdown
                          Array.from({ length: circuitsNeeded }).map((_, i) => {
                            const panelsInCircuit = i < circuitsNeeded - 1 ? saferMaxPanelsPerCircuit : totalPanels - (i * saferMaxPanelsPerCircuit);
                            const circuitWatts = panelsInCircuit * wattsPerPanel;
                            const circuitAmps = circuitWatts / state.voltage;
                            return (
                                <div key={`auto-${i}`} style={{ padding: '0.5rem 0.6rem', background: 'var(--glass-highlight)', border: '1px solid var(--glass-border)', borderRadius: '7px', transition: 'all 0.15s' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
                                        <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.78rem' }}>Circuit {i + 1} (Auto)</span>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>{panelsInCircuit} Panels</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.7rem' }}>
                                        <span style={{ color: 'var(--accent-yellow)' }}>{(circuitWatts / 1000).toFixed(2)} kW</span>
                                        <span style={{ color: 'var(--accent-blue)' }}>{circuitAmps.toFixed(1)} A</span>
                                    </div>
                                </div>
                            );
                          })
                      ) : (
                          // Custom Routed circuits
                          state.powerConfig.circuits.map((circuit, i) => {
                            const panelsInCircuit = circuit.panelIds.length;
                            const circuitWatts = panelsInCircuit * wattsPerPanel;
                            const circuitAmps = circuitWatts / state.voltage;
                            
                            const maxAmps = state.circuitBreakerAmps * 0.8;
                            const capacityPct = Math.min(100, (circuitAmps / maxAmps) * 100);
                            const isOver = capacityPct >= 100;
                            const isActive = state.powerConfig?.drawingCircuitId === circuit.id;
                            const capColor = isOver ? '#ef4444' : capacityPct > 75 ? '#f97316' : circuit.color;
                            
                            return (
                                <div key={circuit.id} style={{ padding: '0.5rem 0.6rem', background: isActive ? `${circuit.color}18` : 'var(--glass-highlight)', border: isActive ? `1px solid ${circuit.color}88` : '1px solid var(--glass-border)', borderRadius: '7px', transition: 'all 0.15s' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: circuit.color, boxShadow: `0 0 5px ${circuit.color}` }} />
                                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>Circuit {i + 1}</span>
                                            <span style={{ fontSize: '0.62rem', color: isOver ? '#ef4444' : 'var(--text-secondary)' }}>
                                                {panelsInCircuit > 0 ? `${panelsInCircuit} Pnls (${circuitAmps.toFixed(1)}A)` : 'empty'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <button
                                                onClick={() => dispatch({ type: 'CLEAR_CIRCUIT_PANELS', payload: circuit.id })}
                                                title="Clear all panel assignments"
                                                style={{ padding: '1px 5px', fontSize: '9px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)', borderRadius: '3px', cursor: 'pointer', opacity: panelsInCircuit > 0 ? 1 : 0.3 }}
                                            >✕</button>
                                            <button
                                                onClick={() => dispatch({ type: 'SET_DRAWING_CIRCUIT', payload: isActive ? null : circuit.id })}
                                                style={{ padding: '2px 9px', fontSize: '0.68rem', fontWeight: 700, background: isActive ? circuit.color : 'transparent', color: isActive ? 'black' : circuit.color, border: `1.5px solid ${circuit.color}`, borderRadius: '4px', cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '0.03em' }}
                                            >
                                                {isActive ? '✓ Done' : 'Route'}
                                            </button>
                                            <button onClick={() => dispatch({ type: 'REMOVE_POWER_CIRCUIT', payload: circuit.id })} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '10px', cursor: 'pointer', opacity: 0.6 }}>del</button>
                                        </div>
                                    </div>
                                    <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${capacityPct}%`, background: capColor, transition: 'width 0.2s ease-out', borderRadius: '2px' }} />
                                    </div>
                                </div>
                            );
                          })
                      )}
                  </div>

                  {/* ── Power Distro Planner ── */}
                  <div style={{ borderTop: '1px solid var(--glass-border)', marginTop: '0.5rem', paddingTop: '0.75rem' }}>
                    {(() => {
                      const currentType = state.distroConfig?.type ?? 'lex-lunchbox';
                      const dSpec = getDistroSpec(currentType);
                      const cpd = state.distroConfig?.circuitsPerDistro ?? dSpec.circuitsPerDistro;
                      const totalCircuits = (state.powerConfig?.circuits?.length ?? 0) > 0
                        ? state.powerConfig!.circuits.length : circuitsNeeded;
                      const distroCount = Math.ceil(totalCircuits / cpd);
                      const hasCustomMapped = (state.powerConfig?.circuits?.length ?? 0) > 0;

                      return (
                        <>
                          {/* Header */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                            <Zap size={13} color="#f59e0b" />
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>Power Distro</span>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', padding: '1px 6px' }}>
                              {distroCount} unit{distroCount !== 1 ? 's' : ''}
                            </span>
                            <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                              {dSpec.shortLabel} · {cpd}ct
                            </span>
                          </div>

                          {/* Per-unit breakdown */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            {Array.from({ length: distroCount }, (_, d) => {
                              const slotStart = d * cpd;
                              const slotEnd = Math.min(slotStart + cpd, totalCircuits);
                              const circuitSlots = Array.from({ length: slotEnd - slotStart }, (_, i) => {
                                const idx = slotStart + i;
                                const cust = state.powerConfig?.circuits?.[idx];
                                const color = cust?.color ?? '#6b7280';
                                
                                let panelCount = 0;
                                if (hasCustomMapped && cust?.panelIds) {
                                  panelCount = cust.panelIds.length;
                                } else if (!hasCustomMapped) {
                                  const panelsAccountedFor = idx * saferMaxPanelsPerCircuit;
                                  const panelsRemaining = (state.screenCols * state.screenRows) - panelsAccountedFor;
                                  panelCount = Math.max(0, Math.min(saferMaxPanelsPerCircuit, panelsRemaining));
                                }

                                const amps = (panelCount * wattsPerPanel) / state.voltage;
                                return { idx, color, panelCount, amps };
                              });
                              const totalAmpsD = circuitSlots.reduce((s, c) => s + c.amps, 0);
                              
                              // Standard rating for the circuit's output port. Defaults to minimum of 20A or whatever the main breaker is set to.
                              const perCircuitMaxAmps = Math.max(15, Math.min(state.circuitBreakerAmps, 30)) * 0.8;
                              // Check distro overall capacity against full input breaker rating
                              const overCapacity = totalAmpsD > state.circuitBreakerAmps * 0.8;
                              
                              return (
                                <div key={d} style={{ background: 'var(--glass-highlight)', border: `1px solid ${overCapacity ? 'rgba(239,68,68,0.4)' : 'var(--glass-border)'}`, borderRadius: '7px', overflow: 'hidden' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.28rem 0.5rem', borderBottom: '1px solid var(--glass-border)', background: overCapacity ? 'rgba(239,68,68,0.08)' : 'transparent' }}>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Distro {d + 1}</span>
                                    <span style={{ fontSize: '0.58rem', color: overCapacity ? '#ef4444' : 'var(--text-secondary)' }}>{totalAmpsD.toFixed(1)}A</span>
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', padding: '0.35rem 0.5rem' }}>
                                    {circuitSlots.map(slot => {
                                      const fillPercent = Math.min(100, Math.max(0, (slot.amps / perCircuitMaxAmps) * 100));
                                      const isFilledEnough = fillPercent > 45;
                                      return (
                                        <div key={slot.idx} style={{
                                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                                          minWidth: '34px', padding: '3px 4px',
                                          background: `linear-gradient(to top, #eab308 ${fillPercent}%, ${slot.color}1a ${fillPercent}%)`,
                                          border: `1.5px solid ${slot.color}`,
                                          borderRadius: '5px', boxShadow: `0 0 5px ${slot.color}33`,
                                          position: 'relative'
                                        }}>
                                          <span style={{ fontSize: '0.6rem', fontWeight: 800, color: isFilledEnough ? '#000000' : 'var(--text-primary)', lineHeight: 1 }}>C{slot.idx + 1}</span>
                                          <span style={{ fontSize: '0.48rem', fontWeight: 700, lineHeight: 1.3,
                                            color: isFilledEnough ? 'rgba(0,0,0,0.85)' : (slot.amps / perCircuitMaxAmps >= 1 ? '#ef4444'
                                                 : slot.amps / perCircuitMaxAmps >= 0.75 ? '#f59e0b' : '#22c55e')
                                          }}>{slot.amps.toFixed(1)}A</span>
                                        </div>
                                      );
                                    })}
                                    {Array.from({ length: cpd - circuitSlots.length }, (_, i) => (
                                      <div key={`e-${i}`} style={{ minWidth: '34px', height: '34px', border: '1px dashed var(--glass-border)', borderRadius: '5px', opacity: 0.25 }} />
                                    ))}
                                  </div>
                                  <div style={{ padding: '0.18rem 0.5rem', borderTop: '1px solid var(--glass-border)', fontSize: '0.5rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>IN: {dSpec.inConnector}</span>
                                    <span>OUT: {dSpec.outConnector}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                </div>
              </>
            )}

            {/* ─── DATA MODE ─── */}
            {state.visualizerMode === 'data' && (
            <div className={styles.circuitList} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* ══ Section 1: Processor Feeds ══ */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <h3 className={styles.subtitle} style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                    <Cpu size={15} /> Processor Feeds
                  </h3>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>drag to position</span>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem' }}>
                  <button
                    onClick={() => dispatch({ type: 'ADD_DATA_FEED', payload: { id: `feed-${Date.now()}`, resolution: '4k', offsetX: 0, offsetY: 0, fitMode: '1:1' } })}
                    style={{ flex: 1, padding: '7px 4px', background: 'var(--accent-purple)', color: 'white', fontWeight: 700, fontSize: '0.7rem', borderRadius: '6px', border: 'none', cursor: 'pointer', letterSpacing: '0.03em' }}
                  >+ 4K Feed</button>
                  <button
                    onClick={() => dispatch({ type: 'ADD_DATA_FEED', payload: { id: `feed-${Date.now()}`, resolution: 'hd', offsetX: 0, offsetY: 0, fitMode: '1:1' } })}
                    style={{ flex: 1, padding: '7px 4px', background: 'var(--accent-blue)', color: 'white', fontWeight: 700, fontSize: '0.7rem', borderRadius: '6px', border: 'none', cursor: 'pointer', letterSpacing: '0.03em' }}
                  >+ HD Feed</button>
                  <button
                    onClick={() => dispatch({ type: 'ADD_DATA_FEED', payload: { id: `feed-${Date.now()}`, resolution: 'custom', customWidth: 1000, customHeight: 1000, offsetX: 0, offsetY: 0, fitMode: '1:1' } })}
                    style={{ flex: 1, padding: '7px 4px', background: 'var(--accent-green)', color: 'white', fontWeight: 700, fontSize: '0.7rem', borderRadius: '6px', border: 'none', cursor: 'pointer', letterSpacing: '0.03em' }}
                  >+ Custom</button>
                </div>
                {state.dataConfig?.feeds.length === 0 && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '0.5rem', opacity: 0.6 }}>No feeds added — add one above to define active signal areas on the wall.</div>
                )}
                {state.dataConfig?.feeds.map((feed, fi) => {
                  const color = feed.resolution === '4k' ? 'var(--accent-purple)' : feed.resolution === 'custom' ? 'var(--accent-green)' : 'var(--accent-blue)';
                  const baseW = feed.resolution === '4k' ? 3840 : feed.resolution === 'custom' ? (feed.customWidth || 1000) : 1920;
                  const baseH = feed.resolution === '4k' ? 2160 : feed.resolution === 'custom' ? (feed.customHeight || 1000) : 1080;
                  const scaleMult = feed.fitMode === 'scaled' ? ((feed.scalePercent || 100) / 100) : 1;
                  const feedW = Math.round(baseW * scaleMult);
                  const feedH = Math.round(baseH * scaleMult);
                  
                  return (
                    <div key={feed.id} style={{ padding: '0.6rem 0.75rem', background: 'var(--glass-highlight)', border: `1px solid ${color}44`, borderRadius: '8px', marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color, flexShrink: 0 }} />
                          <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>Feed {fi + 1} — {feed.resolution.toUpperCase()}</span>
                          <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                            {feedW}×{feedH}
                            {(feed.fitMode === 'scaled' || feed.fitMode === '1:1') && ` @ loc ${Math.round(feed.offsetX)}, ${Math.round(feed.offsetY)}`}
                          </span>
                        </div>
                        <button onClick={() => dispatch({ type: 'REMOVE_DATA_FEED', payload: feed.id })} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '10px', cursor: 'pointer', opacity: 0.7 }}>✕</button>
                      </div>

                      {feed.resolution === 'custom' && (
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Base Size:</span>
                              <input 
                                  type="number" 
                                  value={baseW} 
                                  onChange={e => dispatch({ type: 'UPDATE_DATA_FEED', payload: { id: feed.id, feed: { customWidth: parseInt(e.target.value) || 0 } } })}
                                  style={{ width: '50px', padding: '2px 4px', fontSize: '0.65rem', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '4px' }}
                              />
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>×</span>
                              <input 
                                  type="number" 
                                  value={baseH} 
                                  onChange={e => dispatch({ type: 'UPDATE_DATA_FEED', payload: { id: feed.id, feed: { customHeight: parseInt(e.target.value) || 0 } } })}
                                  style={{ width: '50px', padding: '2px 4px', fontSize: '0.65rem', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '4px' }}
                              />
                              <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>px</span>
                          </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Mode:</span>
                        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '4px', gap: '2px' }}>
                          {(['1:1', 'fit', 'fill', 'scaled'] as const).map(m => (
                              <button
                                key={m}
                                onClick={() => dispatch({ type: 'UPDATE_DATA_FEED', payload: { id: feed.id, feed: { fitMode: m, scalePercent: feed.scalePercent || 150 } } })}
                                style={{
                                    padding: '2px 8px', fontSize: '0.65rem', fontWeight: 600, borderRadius: '3px', border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                                    background: feed.fitMode === m ? color : 'transparent',
                                    color: feed.fitMode === m ? 'white' : 'var(--text-secondary)'
                                }}
                              >{m.toUpperCase()}</button>
                          ))}
                        </div>
                        {feed.fitMode === 'scaled' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginLeft: 'auto' }}>
                                <input 
                                    type="number" 
                                    value={feed.scalePercent || 100} 
                                    onChange={e => dispatch({ type: 'UPDATE_DATA_FEED', payload: { id: feed.id, feed: { scalePercent: parseInt(e.target.value) || 100 } } })}
                                    style={{ width: '45px', padding: '2px 4px', fontSize: '0.65rem', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '4px' }}
                                />
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>%</span>
                            </div>
                        )}
                      </div>
                      <div style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', opacity: 0.7, marginTop: '4px' }}>
                        {feed.fitMode === '1:1' ? 'Actual pixels (draggable)' : feed.fitMode === 'fit' ? 'Stretched to fit canvas entirely (letterboxed)' : feed.fitMode === 'fill' ? 'Stretched to fill canvas entirely (cropped)' : 'Custom scaled format (draggable)'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid var(--glass-border)' }} />

              {/* ══ Section 2: Data Cable Ports ══ */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <h3 className={styles.subtitle} style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                    <Network size={15} /> Data Cable Ports
                  </h3>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{state.dataConfig?.ports.length ?? 0} / {requiredPorts} req.</span>
                    <button
                      onClick={() => {
                        const portColors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#f97316','#ec4899','#84cc16','#a78bfa'];
                        dispatch({ type: 'ADD_DATA_PORT', payload: { id: `port-${Date.now()}`, color: portColors[(state.dataConfig?.ports.length ?? 0) % portColors.length], panelIds: [] } });
                      }}
                      style={{ padding: '2px 8px', fontSize: '0.65rem', fontWeight: 600, background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', border: '1px dashed var(--glass-border)', borderRadius: '4px', cursor: 'pointer' }}
                    >+ Port</button>
                    <button
                          onClick={() => {
                            dispatch({ type: 'INIT_DATA_PORTS', payload: [] });
                          }}
                      style={{ padding: '2px 8px', fontSize: '0.65rem', fontWeight: 600, background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', border: '1px dashed var(--glass-border)', borderRadius: '4px', cursor: 'pointer' }}
                      title="Revert to dynamic auto-calculated paths"
                    ><Wand2 size={14} strokeWidth={2.5} /></button>
                    <button
                      onClick={() => {
                        const portColors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#f97316','#ec4899','#84cc16','#a78bfa'];
                        const newPorts = Array.from({ length: requiredPorts }, (_, i) => ({ id: `port-reset-${i}-${Date.now()}`, color: portColors[i % portColors.length], panelIds: [] }));
                        dispatch({ type: 'INIT_DATA_PORTS', payload: newPorts });
                      }}
                      style={{ padding: '2px 8px', fontSize: '0.85rem', fontWeight: 600, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px dashed var(--glass-border)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Reset to recommended port count"
                    ><RotateCcw size={14} strokeWidth={2.5} /></button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto' }}>
                  {state.dataConfig?.ports.map((port, i) => {
                    const pixelCount = port.panelIds.length * state.panelPixelsW * state.panelPixelsH;
                    const capacityPct = Math.min(100, (pixelCount / 650000) * 100);
                    const isOver = capacityPct >= 100;
                    const isActive = state.dataConfig.drawingPortId === port.id;
                    const capColor = isOver ? '#ef4444' : capacityPct > 75 ? '#f97316' : port.color;
                    return (
                      <div key={port.id} style={{ padding: '0.5rem 0.6rem', background: isActive ? `${port.color}18` : 'var(--glass-highlight)', border: isActive ? `1px solid ${port.color}88` : '1px solid var(--glass-border)', borderRadius: '7px', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: port.color, boxShadow: `0 0 5px ${port.color}` }} />
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>Port {i + 1}</span>
                            <span style={{ fontSize: '0.62rem', color: isOver ? '#ef4444' : 'var(--text-secondary)' }}>
                              {pixelCount > 0 ? `${(pixelCount / 1000).toFixed(0)}k px` : 'empty'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <button
                              onClick={() => dispatch({ type: 'CLEAR_PORT_PANELS', payload: port.id })}
                              title="Clear all panel assignments"
                              style={{ padding: '1px 5px', fontSize: '9px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)', borderRadius: '3px', cursor: 'pointer', opacity: port.panelIds.length > 0 ? 1 : 0.3 }}
                            >✕</button>
                            <button
                              onClick={() => dispatch({ type: 'SET_DRAWING_PORT', payload: isActive ? null : port.id })}
                              style={{ padding: '2px 9px', fontSize: '0.68rem', fontWeight: 700, background: isActive ? port.color : 'transparent', color: isActive ? 'black' : port.color, border: `1.5px solid ${port.color}`, borderRadius: '4px', cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '0.03em' }}
                            >
                              {isActive ? '✓ Done' : 'Route'}
                            </button>
                            <button onClick={() => dispatch({ type: 'REMOVE_DATA_PORT', payload: port.id })} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '10px', cursor: 'pointer', opacity: 0.6 }}>del</button>
                          </div>
                        </div>
                        <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${capacityPct}%`, background: capColor, transition: 'width 0.2s ease-out', borderRadius: '2px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <DashboardContent />
    </AppProvider>
  );
};

export default App;
