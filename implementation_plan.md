# 4Show Power Planner - Implementation Plan for "Features 2.0"

## 1. Introduction
This plan outlines a roadmap to elevate the 4Show Power Planner into a professional-grade, data-rich, and visually stunning tool for event production professionals. The focus is on modernization (UI/UX), data depth (Engineering), and utility (Workflow).

## 2. Phase 1: Visual Excellence & Interactivity (Modern & Designed)
**Goal:** Make the app feel alive and "pro" with direct manipulation and beautiful data visualization.

### 2.1 Interactive Visualizer Canvas (High Priority)
- **Direct Manipulation:** Instead of just sliders, allow users to **drag handles** on the screen to resize it, and **drag the stage obstruction** box directly on the visualizer.
- **Pan & Zoom:** Implement an infinite canvas (using `react-zoom-pan-pinch` or similar) to support massive detailed screens without cramping the UI.
- **Contextual Hover:** Hovering over a specific panel should show its coordinate (X,Y), port assignment, and power draw.

### 2.2 "Heads-Up" Dashboard
- **Live Gauges:** Replace static number lists with animated circular gauges for **Total Power vs Available Power** and **Pixel Count vs Processor Limit**.
- **Heatmaps:** Toggle views on the visualizer to show a "Heatmap" of:
  - **Power Draw:** Redder areas draw more power.
  - **Weight Distribution:** Heavier areas (if variable) or simply visual weight load.
  - **Data Load:** Which ports are near capacity.

## 3. Phase 2: Engineering Depth (Data Rich & Useful)
**Goal:** Provide the critical engineering data that technical directors need, going beyond just basic watts.

### 3.1 Signal Flow & Data Cabling (The "Killer Feature")
- **Processor Planning:** Select a processor type (e.g., generic, Brompton SX40, Novastar MCTRL4K) and calculate how many represent the screen pixels (taking capacity and bandwidth into account).
- **Port Mapping:** Visualize data paths. Show how many panels can fit on one ethernet cable (data port) based on resolution and bit depth.
- **System Diagram:** Auto-generate a block diagram showing: `Console -> Processor -> Sending Cards -> Screen`.

### 3.2 Rigging & Weight Analysis
- **Point Load Calculator:** If the user defines rigging points (motors), calculate the distributed load on each point based on screen weight.
- **Center of Gravity:** Visual indicator of the CoG, updated in real-time as the screen shape changes or blanks are added.

### 3.3 Advanced Power Analysis
- **3-Phase Power Balancing:** Calculate amps per leg (L1, L2, L3) for 3-phase power distributions (Socapex/L21-30). This is critical for large shows.
- **Voltage Drop Estimator:** Estimate voltage drop based on cable run length (if length is inputted).

## 4. Phase 3: Workflow & Ecosystem
**Goal:** Make the app a daily driver for projectfiles.

### 4.1 Global Panel Database
- **Searchable Library:** Expand the internal library to include 50+ real-world industry standard panels (ROE Carbon, Vanish, Ruby; Absen PL/Polaris; Unilumin Upad; Infiled).
- **User Presets:** Allow users to "Save as New Panel" to a local persistent library.

### 4.2 Professional Reporting
- **Enhanced PDF Export:** The Spec Sheet should include:
  - The System Diagram (Block flow).
  - A visual "Patch Map" (Panel addressing).
  - A "Pull List" for the warehouse (Count of panels, cables, processors).
- **Export to CAD:** Generate a simple `.dxf` or `.csv` point cloud for import into Vectorworks or AutoCAD.

---

## 5. Recommended Next Steps (Immediate Actions)

1.  **Refine Dashboard Aesthetics:** Move the key metrics (Power, Weight, Dims) from the Sidebar into a "Heads-Up Display" (HUD) overlay on the Visualizer, freeing up sidebar space for deeper configuration.
2.  **Implement Pan/Zoom:** Essential for usability as screens get larger.
3.  **Add Signal Flow Data:** Begin the data structure for "Processors" and "Ports" to start the "Data Rich" journey.
