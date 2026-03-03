import React, { useMemo, useState, useEffect } from 'react';
import { AppProvider, useAppState } from './context/StateContext';
import SettingsPanel from './components/SettingsPanel';
import Visualizer from './components/Visualizer';
import PowerChart from './components/PowerChart';
import PanelLibraryModal from './components/PanelLibraryModal';
import { initialPanels, type PanelSpec } from './data/panelSpecs';
import { getWattsPerPanel } from './utils/powerLogic';
import { Download, Zap, Grid, Sun, Moon, Info, Thermometer, Scale, Package, Cpu, Save, Upload, Settings as SettingsIcon, MonitorSmartphone } from 'lucide-react';
import { generateSpecSheet } from './utils/generateSpecSheet';
import styles from './styles/App.module.css';
import pkg from '../package.json';

const DashboardContent: React.FC = () => {
  const { state, dispatch } = useAppState();

  // Library State
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

  useEffect(() => {
    // -------------------------------------------------------------
    // AUTOMATIC UPDATE CHECKER
    // 1. We check the raw version.json file directly from your GitHub repository's main branch.
    // 2. When you want to trigger an update notification, just adjust the version inside 
    //    your local `version.json`, along with the new OneDrive/Box link, and push it to GitHub!
    // -------------------------------------------------------------
    const UPDATE_CHECK_URL = 'https://raw.githubusercontent.com/kenny330-coder/LEDWallPlanner/main/version.json';

    fetch(UPDATE_CHECK_URL, { cache: 'no-store' }) // prevent returning cached old versions
      .then(res => res.json())
      .then(data => {
        if (data && data.version && data.version !== pkg.version) {
          // Compare versions safely (e.g. 1.0.8 > 1.0.7)
          const isNewer = data.version.localeCompare(pkg.version, undefined, { numeric: true, sensitivity: 'base' }) > 0;
          if (isNewer && data.link) {
            setUpdateUrl(data.link);
          }
        }
      })
      .catch((e) => {
        // Silently fail if offline or url not configured
        console.log('Update check failed or skipped:', e);
      });
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
  const totalAmps = totalWatts / state.voltage;
  const circuitCapacityAmps = state.circuitBreakerAmps * 0.8;
  const maxPanelsPerCircuit = Math.floor((circuitCapacityAmps * state.voltage) / wattsPerPanel);
  const saferMaxPanelsPerCircuit = Math.max(1, maxPanelsPerCircuit);

  const circuitsNeeded = Math.ceil(totalPanels / saferMaxPanelsPerCircuit);


  // Physical & Heat
  const totalHeatBTU = totalWatts * 3.41214;
  const totalWeightKg = totalPanels * (state.panelWeightKg || 12);
  const totalWeightLbs = totalWeightKg * 2.20462;

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
      <SettingsPanel availablePanels={availablePanels} onSelectPanel={handleSelectPanel} />

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

            {/* Project file actions — grouped in a pill container */}
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', padding: '0.2rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '999px', backdropFilter: 'blur(12px)' }}>
              <button onClick={handleSaveConfig} className={styles.exportBtn} title="Save project as JSON file" style={{ borderRadius: '999px', padding: '0.4rem 0.85rem', gap: '0.4rem', fontSize: '0.8rem' }}>
                <Save size={14} /> Save Project
              </button>
              <label className={styles.exportBtn} style={{ cursor: 'pointer', borderRadius: '999px', padding: '0.4rem 0.85rem', gap: '0.4rem', fontSize: '0.8rem' }} title="Open a saved project JSON file">
                <Upload size={14} /> Open Project
                <input type="file" accept=".json" onChange={handleLoadConfig} style={{ display: 'none' }} />
              </label>
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
          <div className={`${styles.statCard} ${styles.statCardPower}`}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Total Power</span>
              <Zap size={16} color="var(--accent-yellow)" />
            </div>
            <div className={styles.statValueContainer}>
              <span className={styles.statValue}>{(totalWatts / 1000).toFixed(2)}</span>
              <span className={styles.statUnit}>kW</span>
            </div>
            <div className={styles.statFooter}>{totalAmps.toFixed(1)} Amps @ {state.voltage}V</div>
          </div>

          <div className={`${styles.statCard} ${styles.statCardCircuit}`}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Circuits Needed</span>
              <Grid size={16} color="var(--accent-blue)" />
            </div>
            <div className={styles.statValueContainer}>
              <span className={styles.statValue}>{circuitsNeeded}</span>
              <span className={styles.statUnit}>x {state.circuitBreakerAmps}A</span>
            </div>
            <div className={styles.statFooter}>Max {saferMaxPanelsPerCircuit} panels/circuit</div>
          </div>

          <div className={`${styles.statCard} ${styles.statCardWeight}`}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Total Weight</span>
              <Scale size={16} color="var(--text-secondary)" />
            </div>
            <div className={styles.statValueContainer}>
              <span className={styles.statValue}>{totalWeightLbs.toFixed(0)}</span>
              <span className={styles.statUnit}>lbs</span>
            </div>
            <div className={styles.statFooter}>{totalWeightKg.toFixed(0)} kg Total</div>
          </div>

          <div className={`${styles.statCard} ${styles.statCardLogist}`}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Logistics</span>
              <Package size={16} color="var(--accent-purple)" />
            </div>
            <div className={styles.statValueContainer}>
              <span className={styles.statValue}>{Math.ceil(totalPanels / state.panelsPerCase) + Math.ceil(((state.blanksCount || 0) * state.screenCols) / state.blanksPerCase) + state.supportCasesCount}</span>
              <span className={styles.statUnit}>Cases</span>
            </div>
            <div className={styles.statFooter}>
              {Math.ceil(totalPanels / state.panelsPerCase)} Active + {Math.ceil(((state.blanksCount || 0) * state.screenCols) / state.blanksPerCase)} Blank + {state.supportCasesCount} Supp
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statCardCircuit}`}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Data Processing</span>
              <Cpu size={16} color="var(--accent-blue)" />
            </div>
            <div className={styles.statValueContainer}>
              <span className={styles.statValue}>{Math.ceil((state.screenCols * state.screenRows * state.panelPixelsW * state.panelPixelsH) / 650000)}</span>
              <span className={styles.statUnit}>Ports</span>
            </div>
            <div className={styles.statFooter}>@ 650k px/port load</div>
          </div>

          <div className={`${styles.statCard} ${styles.statCardHeat}`}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Heat Output</span>
              <Thermometer size={16} color="var(--accent-red)" />
            </div>
            <div className={styles.statValueContainer}>
              <span className={styles.statValue}>{(totalHeatBTU / 1000).toFixed(1)}k</span>
              <span className={styles.statUnit}>BTU/hr</span>
            </div>
            <div className={styles.statFooter}>~{(totalHeatBTU / 12000).toFixed(1)} Tons Cooling</div>
          </div>

          <div className={`${styles.statCard} ${styles.statCardBrightness}`}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Brightness Target</span>
              <Sun size={16} color="var(--accent-orange)" />
            </div>
            <div className={styles.statValueContainer}>
              <span className={styles.statValue}>{targetNits.toFixed(0)}</span>
              <span className={styles.statUnit}>nits</span>
            </div>
            <div className={styles.statFooter}>{brightnessPercent.toFixed(1)}% of Panel Max</div>
          </div>

          <div className={`${styles.statCard} ${styles.statCardIndigo}`}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Per Panel Load</span>
              <Info size={16} color="var(--accent-indigo)" />
            </div>
            <div className={styles.statValueContainer}>
              <span className={styles.statValue}>{wattsPerPanel.toFixed(1)}</span>
              <span className={styles.statUnit}>Watts</span>
            </div>
            <div className={styles.statFooter}>DVS 1.6mm Profile</div>
          </div>
        </div>

        <div className={styles.contentArea}>
          <div className={styles.visualizerCol}>
            <Visualizer maxPanelsPerCircuit={saferMaxPanelsPerCircuit} />
          </div>

          <div className={styles.detailsCol}>
            <PowerChart
              currentBrightness={state.brightness}
              currentWatts={wattsPerPanel}
              maxWatts={state.panelMaxWatts}
              customCurve={state.customCurve}
            />

            <div className={styles.circuitList}>
              <h3 className={styles.subtitle} style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Circuit Breakdown</h3>
              {Array.from({ length: circuitsNeeded }).map((_, i) => {
                const panelsInCircuit = i < circuitsNeeded - 1 ? saferMaxPanelsPerCircuit : totalPanels - (i * saferMaxPanelsPerCircuit);
                const circuitWatts = panelsInCircuit * wattsPerPanel;
                const circuitAmps = circuitWatts / state.voltage;

                return (
                  <div key={i} className={styles.circuitItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Circuit {i + 1}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{panelsInCircuit} Panels</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.7rem' }}>
                      <span style={{ color: 'var(--accent-yellow)' }}>{(circuitWatts / 1000).toFixed(2)} kW</span>
                      <span style={{ color: 'var(--accent-blue)' }}>{circuitAmps.toFixed(1)} A</span>
                    </div>
                  </div>
                );
              })}
            </div>
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
