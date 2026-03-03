import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import type { AppState } from '../context/StateContext';
import { getWattsPerPanel } from './powerLogic';

// Consolidated single PDF generation
// --- Helpers ---
const formatNum = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });
const mmToFt = (mm: number) => (mm / 304.8).toFixed(2);

export const generateSpecSheet = (state: AppState) => {
    const projectName = state.projectName?.trim() || 'LED Project';
    const slug = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // We will generate a SINGLE document with multiple pages
    // Electrical Section (Portrait)
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm' });

    // --- Page 1: Electrical & Engineering ---
    generateElectricalSection(doc, state, projectName);

    // --- Page 3: Visual Spec (Landscape) ---
    doc.addPage('a4', 'landscape');
    generateVisualSection(doc, state, projectName);

    doc.save(`${slug}-spec-${new Date().toISOString().split('T')[0]}.pdf`);
};

// Refactored helpers to accept 'doc' instance
const generateElectricalSection = (doc: jsPDF, state: AppState, projectName = 'LED Project') => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeightPt = doc.internal.pageSize.getHeight();
    doc.setPage(1); // Ensure we are on page 1

    const margin = 14;
    let cursorY = 20;

    // --- Header ---
    doc.setFontSize(20);
    doc.setTextColor(33, 150, 243);
    doc.text("ENGINEERING & ELECTRICAL SPEC", margin, cursorY);
    cursorY += 8;

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`${projectName}  |  Generated: ${new Date().toLocaleDateString()}`, margin, cursorY);
    cursorY += 12;

    // --- Core Calculations ---
    // Use state.brightness as source of truth to match Dashboard
    const wattsPerPanel = getWattsPerPanel(state.brightness, state.panelMaxWatts, state.customCurve);
    const totalPanels = state.screenCols * state.screenRows;
    const totalWatts = totalPanels * wattsPerPanel;
    const totalAmps = totalWatts / state.voltage;
    const totalBTU = totalWatts * 3.41214;
    const totalWeightKg = totalPanels * (state.panelWeightKg || 12);
    const totalWeightLbs = totalWeightKg * 2.20462;
    // const totalPixels = totalPanels * (state.panelPixelsW * state.panelPixelsH); // unused

    // Circuit Logic
    // We assume a standard vertical strip cabling for the visual patching map
    // Max panels per circuit (Safety factor 80%)
    const safeCircuitAmps = state.circuitBreakerAmps * 0.8;
    const circuitWattCapacity = safeCircuitAmps * state.voltage;
    const maxPanelsPerCircuit = Math.floor(circuitWattCapacity / wattsPerPanel);
    const saferMaxPanelsPerCircuit = Math.max(1, maxPanelsPerCircuit);
    const circuitsNeeded = Math.ceil(totalPanels / saferMaxPanelsPerCircuit);

    // --- Summary Section ---
    doc.setDrawColor(200);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 10;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("SYSTEM OVERVIEW", margin, cursorY);
    cursorY += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const screenHeightMm = (state.screenRows + (state.blanksCount || 0)) * state.panelHeightMm;  // includes blanks (matches Visualizer)
    const groundSupportMm = (state.riggingConfig?.mode === 'ground-stack' && state.groundStackHeightMm > 0)
        ? state.groundStackHeightMm : 0;
    const totalHeightWithSupportMm = screenHeightMm + groundSupportMm;
    const supportTypeLabel = state.riggingConfig?.groundSupportType === 'baseplate' ? 'Baseplate' : 'Towers';

    // Left Col
    const overviewData: string[][] = [
        ["Configuration", `${state.screenCols} x ${state.screenRows} Panels`],
        ["Screen Dimensions", `${mmToFt(state.screenCols * state.panelWidthMm)}' W × ${mmToFt(screenHeightMm)}' H`],
        ...(groundSupportMm > 0 ? [
            [`${supportTypeLabel} Height`, `${mmToFt(groundSupportMm)}' (${(groundSupportMm / 25.4).toFixed(1)} in)`],
            ["Total Height (incl. support)", `${mmToFt(totalHeightWithSupportMm)}' (${(totalHeightWithSupportMm / 25.4).toFixed(0)} in)`],
        ] : []),
        ["Total Panels", `${totalPanels} Units`],
        ["Panel Type", `Outdoor/Indoor ${state.panelWidthMm}x${state.panelHeightMm}mm`],
    ];

    // Right Col
    const weightData = [
        ["Total Weight", `${formatNum(totalWeightLbs)} lbs (${formatNum(totalWeightKg)} kg)`],
        ["Avg Point Load", `${formatNum(totalWeightLbs / state.screenCols)} lbs (per column top)`], // Rough estimate
        ["Total Heat", `${formatNum(totalBTU)} BTU/hr`],
        ["Cooling Req", `${formatNum(totalBTU / 12000)} Tons`],
    ];


    autoTable(doc, {
        startY: cursorY,
        theme: 'plain',
        body: overviewData,
        columns: [{ header: 'Item', dataKey: 0 }, { header: 'Value', dataKey: 1 }],
        margin: { left: margin, right: pageWidth / 2 + 5 },
        styles: { fontSize: 10, cellPadding: 1, overflow: 'linebreak' },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 } }
    });

    const finalY1 = (doc as any).lastAutoTable.finalY;

    autoTable(doc, {
        startY: cursorY,
        theme: 'plain',
        body: weightData,
        margin: { left: pageWidth / 2 },
        styles: { fontSize: 10, cellPadding: 1 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 } }
    });

    cursorY = Math.max(finalY1, (doc as any).lastAutoTable.finalY) + 12;

    // --- Power Section ---
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("POWER REQUIREMENTS", margin, cursorY);
    cursorY += 6;

    const powerSpecs = [
        ["Brightness Target", `${state.brightness}%`], // Added as requested
        ["Total Operating Power", `${formatNum(totalWatts / 1000)} kW`],
        ["Total Operating Amps", `${formatNum(totalAmps)} A`],
        ["Voltage", `${state.voltage}V AC`],
        ["Breaker Size", `${state.circuitBreakerAmps}A`],
        ["Est. Circuits", `${circuitsNeeded} Circuits`],
        ["Power/Circuit", `${formatNum(saferMaxPanelsPerCircuit * wattsPerPanel)} W (Operating)`]
    ];

    autoTable(doc, {
        startY: cursorY,
        head: [['Specification', 'Value']],
        body: powerSpecs,
        theme: 'striped',
        headStyles: { fillColor: [66, 66, 66] },
        styles: { fontSize: 10 },
        margin: { right: pageWidth - 100 }, // Width constraint
        // Highlight Brightness Row
        didParseCell: (data) => {
            if (data.row.index === 0 && data.section === 'body') {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = [33, 150, 243];
            }
        }
    });

    const powerTableY = (doc as any).lastAutoTable.finalY;

    // Note below table
    // Note below table - REMOVED per user request
    // doc.text(`* Calculations use 100%...`, margin, powerTableY + 5);

    // --- Circuit Schedule ---
    cursorY = powerTableY + 12;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("CIRCUIT SCHEDULE", margin, cursorY);
    cursorY += 6;

    const circuitRows = [];
    let panelsAcc = 0;
    for (let i = 1; i <= circuitsNeeded; i++) {
        const remaining = totalPanels - panelsAcc;
        const count = Math.min(saferMaxPanelsPerCircuit, remaining);
        const circuitWatts = count * wattsPerPanel;
        const circuitAmps = circuitWatts / state.voltage;

        circuitRows.push([
            `Circuit ${i}`,
            `${count} Panels`,
            `${formatNum(circuitWatts)} W`,
            `${formatNum(circuitAmps)} A`,
            `${(circuitAmps / state.circuitBreakerAmps * 100).toFixed(1)}%`
        ]);
        panelsAcc += count;
    }

    autoTable(doc, {
        startY: cursorY,
        head: [['ID', 'Panel Count', 'Load (W)', 'Current (A)', 'Breaker Load']],
        body: circuitRows,
        theme: 'grid',
        headStyles: { fillColor: [33, 150, 243] },
        styles: { fontSize: 9, halign: 'center' },
        columnStyles: { 0: { halign: 'left' } } // ID left aligned
    });

    // --- Visual Circuit Map (Miniature) ---
    // Draw a small representation of the wall on the right of the power table, or below if no space
    // Let's put it on a new page if needed, or keeping one page is better. 
    // We have space on the right of the first power table? Maybe. Let's put it at the bottom.

    cursorY = (doc as any).lastAutoTable.finalY + 12;

    // Page break: map needs ~80px (60 draw + legend + label)
    if (cursorY + 80 > pageHeightPt - 15) {
        doc.addPage();
        cursorY = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text("CIRCUIT PATCHING MAP (Horizontal Snake Estimate)", margin, cursorY);
    cursorY += 8;
    doc.setFont('helvetica', 'normal');

    const mapW = Math.min(180, pageWidth - margin * 2);
    const mapH = 55;
    const scaleX = mapW / (state.screenCols * state.panelWidthMm);
    const scaleY = mapH / (state.screenRows * state.panelHeightMm);
    const scale = Math.min(scaleX, scaleY); // Uniform scale

    const drawW = (state.screenCols * state.panelWidthMm) * scale;
    const drawH = (state.screenRows * state.panelHeightMm) * scale;
    const startX = margin;
    const startY = cursorY;

    // Draw boundary
    doc.setDrawColor(0);
    doc.rect(startX, startY, drawW, drawH);

    // Render Circuits
    const colors = [[33, 150, 243], [76, 175, 80], [255, 152, 0], [156, 39, 176], [233, 30, 99], [96, 125, 139]]; // Blue, Green, Orange, Purple, Pink, Grey

    const pw = state.panelWidthMm * scale;
    const ph = state.panelHeightMm * scale;

    // 1. Simulate Flow to assign Circuits
    // Horizontal Snake: Row 0 L->R, Row 1 R->L, etc.
    const panelCircuitMap = new Map<string, number>();
    let simPanelCount = 0;

    for (let r = 0; r < state.screenRows; r++) {
        const isLeftToRight = (r % 2 === 0);

        // Loop cols in correct direction
        const cols = [];
        if (isLeftToRight) {
            for (let c = 0; c < state.screenCols; c++) cols.push(c);
        } else {
            for (let c = state.screenCols - 1; c >= 0; c--) cols.push(c);
        }

        for (const c of cols) {
            const circuitIdx = Math.floor(simPanelCount / saferMaxPanelsPerCircuit);
            panelCircuitMap.set(`${r},${c}`, circuitIdx);
            simPanelCount++;
        }
    }

    // 2. Draw Grid based on Assignments
    for (let r = 0; r < state.screenRows; r++) {
        for (let c = 0; c < state.screenCols; c++) {
            const px = startX + (c * pw);
            const py = startY + (r * ph);

            const cIdx = panelCircuitMap.get(`${r},${c}`);
            if (cIdx !== undefined) {
                const color = colors[cIdx % colors.length];
                const rgb = color as [number, number, number];

                doc.setFillColor(rgb[0], rgb[1], rgb[2]);
                doc.setDrawColor(255);
                doc.setLineWidth(0.2);
                doc.rect(px, py, pw, ph, 'FD');
            }
        }
    }

    // Legend
    doc.setFontSize(8);
    doc.setTextColor(0);
    const legendY = startY + drawH + 5;
    let legendX = startX;

    for (let i = 0; i < circuitsNeeded; i++) {
        const colIdx = i % colors.length;
        const c = colors[colIdx];
        doc.setFillColor(c[0], c[1], c[2]);
        doc.rect(legendX, legendY, 4, 4, 'F');
        doc.text(`C${i + 1}`, legendX + 5, legendY + 3);
        legendX += 13; // compacted spacing
    }

    // --- DATA PATH MAP (always new page for clean layout) ---
    doc.addPage();
    cursorY = 20;
    doc.setFontSize(14);
    doc.setTextColor(33, 150, 243);
    doc.text("DATA SIGNAL PATH & PROCESSING", margin, cursorY);
    cursorY += 10;

    // Instructions / Logic Note
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text("Estimated Signal Flow based on 650,000 pixels per port capacity (Brompton/Novastar).", margin, cursorY);
    cursorY += 6;
    doc.text("Pattern: Hybrid (Raster default, Snakes when maintaining signal chain).", margin, cursorY);
    cursorY += 12;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("DATA PORT MAPPING", margin, cursorY);
    cursorY += 8;

    // Draw Map 2
    const startY2 = cursorY;

    // Draw boundary
    doc.setDrawColor(0);
    doc.rect(startX, startY2, drawW, drawH);

    // Data Logic
    const pixelsPerPanel = state.panelPixelsW * state.panelPixelsH;
    const maxPanelsPerPort = Math.floor(650000 / pixelsPerPanel);
    const dataColors = [[0, 150, 136], [76, 175, 80], [139, 195, 74], [205, 220, 57], [0, 188, 212], [33, 150, 243]]; // Teals/Greens

    const panelPortMap = new Map<string, number>();

    let nextPortIdx = 0;
    const numFullSegments = Math.floor(state.screenCols / maxPanelsPerPort);
    const fullCols = numFullSegments * maxPanelsPerPort;

    // 1. Process "Full Chains" - Left side of the screen
    for (let r = 0; r < state.screenRows; r++) {
        for (let s = 0; s < numFullSegments; s++) {
            const startCol = s * maxPanelsPerPort;
            for (let i = 0; i < maxPanelsPerPort; i++) {
                panelPortMap.set(`${r},${startCol + i}`, nextPortIdx);
            }
            nextPortIdx++;
        }
    }

    // 2. Process "Remainder" - Right side of the screen using a snake pattern
    const remWidth = state.screenCols - fullCols;
    if (remWidth > 0) {
        const remainderCells: { r: number, c: number }[] = [];
        for (let r = 0; r < state.screenRows; r++) {
            const isRowSnakeRight = (r % 2 === 0);
            if (isRowSnakeRight) {
                // Left to Right within the remainder columns
                for (let c = fullCols; c < state.screenCols; c++) {
                    remainderCells.push({ r, c });
                }
            } else {
                // Right to Left within the remainder columns
                for (let c = state.screenCols - 1; c >= fullCols; c--) {
                    remainderCells.push({ r, c });
                }
            }
        }

        // Assign remainder cells to ports
        let panelsInCurrentRemPort = 0;
        for (const cell of remainderCells) {
            panelPortMap.set(`${cell.r},${cell.c}`, nextPortIdx);
            panelsInCurrentRemPort++;
            if (panelsInCurrentRemPort >= maxPanelsPerPort) {
                nextPortIdx++;
                panelsInCurrentRemPort = 0;
            }
        }
        // If we finished with a partially filled port, increment for the next (if any)
        if (panelsInCurrentRemPort > 0) {
            nextPortIdx++;
        }
    }

    const totalPorts = nextPortIdx;

    // Render Grid
    for (let r = 0; r < state.screenRows; r++) {
        for (let c = 0; c < state.screenCols; c++) {
            const px = startX + (c * pw);
            const py = startY2 + (r * ph);

            const pIdx = panelPortMap.get(`${r},${c}`);
            if (pIdx !== undefined) {
                const color = dataColors[pIdx % dataColors.length];
                const rgb = color as [number, number, number];

                doc.setFillColor(rgb[0], rgb[1], rgb[2]);
                doc.setDrawColor(255);
                doc.setLineWidth(0.2);
                doc.rect(px, py, pw, ph, 'FD');
            }
        }
    }

    // Legend
    const legendY2 = startY2 + drawH + 5;
    let legendX2 = startX;

    for (let i = 0; i < totalPorts; i++) {
        const colIdx = i % dataColors.length;
        const c = dataColors[colIdx];
        doc.setFillColor(c[0], c[1], c[2]);
        doc.rect(legendX2, legendY2, 4, 4, 'F');
        doc.text(`Port ${i + 1}`, legendX2 + 5, legendY2 + 3);
        legendX2 += 20;
    }

    // --- Rigging Specifications ---
    cursorY = legendY2 + 15;

    if (state.riggingConfig) {
        const rc = state.riggingConfig;

        // Rigging calculations (mirror SettingsPanel logic)
        const trussSpanMm = rc.trussSpanMm > 0 ? rc.trussSpanMm : (state.screenCols * state.panelWidthMm + 610);
        const trussWeightKg = (trussSpanMm / 1000) * rc.trussWeightKg;
        const totalSuspendedKg = totalWeightKg + trussWeightKg;
        const totalSuspendedLbs = totalSuspendedKg * 2.20462;
        const bridleFactor = rc.useSpreaderBeam || rc.bridleAngleDeg === 0
            ? 1.0
            : Math.cos((rc.bridleAngleDeg / 2) * (Math.PI / 180));
        const loadPerMotorKg = (totalSuspendedKg / rc.motorCount) / bridleFactor;
        const loadPerMotorLbs = loadPerMotorKg * 2.20462;
        const motorWLLKg = rc.motorCapacity * 907.185;
        const achievedSF = motorWLLKg / loadPerMotorKg;
        const isSafe = achievedSF >= rc.safetyFactor;
        const chainDropMm = rc.hookHeightMm - rc.trimHeightMm;

        // Check if page break needed (rigging table ~80-120mm depending on mode)
        const riggingTableH = rc.mode === 'flown' ? 120 : 60;
        if (cursorY + riggingTableH > pageHeightPt - 15) { doc.addPage(); cursorY = 20; }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(33, 150, 243);
        doc.text('RIGGING SPECIFICATIONS', margin, cursorY);
        cursorY += 8;

        const modeLabel = rc.mode === 'flown' ? 'Flown (Motor-Hoisted)' : 'Ground Stack';

        const riggingRows: string[][] = [
            ['Rigging Mode', modeLabel],
        ];

        if (rc.mode === 'flown') {
            riggingRows.push(
                ['Truss Type', `${rc.trussType} (${rc.trussWeightKg} kg/m · Span: ${(trussSpanMm / 304.8).toFixed(1)} ft)`],
                ['Trim Height', `${(rc.trimHeightMm / 304.8).toFixed(1)} ft (${(rc.trimHeightMm / 25.4).toFixed(0)} in) above stage`],
                ['Grid / Hook Height', `${(rc.hookHeightMm / 304.8).toFixed(1)} ft (${(rc.hookHeightMm / 25.4).toFixed(0)} in)`],
                ['Chain Drop', `${(chainDropMm / 304.8).toFixed(1)} ft (${(chainDropMm / 25.4).toFixed(0)} in)`],
                ['Motor Count', `${rc.motorCount} Hoists`],
                ['Motor Capacity', `${rc.motorCapacity} Ton WLL (CM Lodestar or equiv.) — ${(motorWLLKg * 2.20462).toFixed(0)} lbs`],
                ['Bridle Config', rc.useSpreaderBeam ? 'Spreader Beam (no derating)' : `Bridle — ${rc.bridleAngleDeg}° angle (derating factor: ${bridleFactor.toFixed(3)})`],
                ['Total Suspended Load', `${formatNum(totalSuspendedLbs)} lbs (${formatNum(totalSuspendedKg)} kg) incl. truss`],
                ['Load Per Motor', `${formatNum(loadPerMotorLbs)} lbs (${formatNum(loadPerMotorKg)} kg)`],
                ['Safety Factor', `${achievedSF.toFixed(2)}:1 achieved vs. ${rc.safetyFactor}:1 required — ${isSafe ? 'PASS' : 'FAIL'}`],
            );
        }

        if (rc.mode === 'ground-stack') {
            const supportLabel = rc.groundSupportType === 'towers' ? 'Ground Support Towers' : 'Baseplate System';
            const supportHeightMm = state.groundStackHeightMm || 0;
            riggingRows.push(
                ['Ground Support', supportLabel],
                ['Support Height', `${(supportHeightMm / 304.8).toFixed(2)}' (${(supportHeightMm / 25.4).toFixed(1)} in · ${supportHeightMm} mm)`],
                ['Screen Height (panel only)', `${mmToFt(state.screenRows * state.panelHeightMm)}'`],
                ['Total Height (incl. support)', `${mmToFt(state.screenRows * state.panelHeightMm + supportHeightMm)}'`],
            );
        }

        autoTable(doc, {
            startY: cursorY,
            head: [['Specification', 'Value']],
            body: riggingRows,
            theme: 'grid',
            headStyles: { fillColor: (isSafe || rc.mode !== 'flown') ? [46, 125, 50] : [198, 40, 40] },
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
            didParseCell: (data) => {
                // Highlight safety factor row
                const raw = data.row.raw;
                if (data.section === 'body' && Array.isArray(raw) && raw[0] === 'Safety Factor') {
                    data.cell.styles.textColor = isSafe ? [22, 163, 74] : [220, 38, 38];
                    data.cell.styles.fontStyle = 'bold';
                }
            },

            margin: { left: margin, right: margin }
        });

        cursorY = (doc as any).lastAutoTable.finalY + 12;

        if (!isSafe && rc.mode === 'flown') {
            doc.setFontSize(9);
            doc.setTextColor(220, 38, 38);
            doc.setFont('helvetica', 'bold');
            doc.text(`⚠ WARNING: Achieved safety factor ${achievedSF.toFixed(2)}:1 is below the required ${rc.safetyFactor}:1. Increase motor count or capacity.`, margin, cursorY);
            cursorY += 8;
        }

        doc.setTextColor(0);
        doc.setFont('helvetica', 'normal');
    }

    // --- Production Notes ---
    // Guard: needs ~60mm for table
    if (cursorY + 60 > pageHeightPt - 15) {
        doc.addPage();
        cursorY = 20;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text("PRODUCTION LOGISTICS ESTIMATES", margin, cursorY);
    cursorY += 6;
    doc.setFont('helvetica', 'normal');


    // Calcs
    const crewSize = 6;
    const totalMinutes = (totalPanels * 1) + (state.screenCols * 1);
    const buildTimeHours = totalMinutes / 60;
    const spares = Math.ceil(totalPanels * 0.05); // 5% spares

    // Dynamic Power Drops
    const maxCircuitVA = circuitsNeeded * state.circuitBreakerAmps * state.voltage;
    // Assume 3-phase wye 208Y/120V distro for 110/120/208V, split-phase for 240V
    const phaseDivisor = state.voltage === 240 ? 240 : 360;
    const ampsPerLeg = Math.ceil(maxCircuitVA / phaseDivisor);

    let dropString = "";
    if (ampsPerLeg <= 60) {
        dropString = "1x 60A (or 100A) 3-Phase Drop";
    } else if (ampsPerLeg <= 100) {
        dropString = "1x 100A 3-Phase Camlok Drop";
    } else if (ampsPerLeg <= 200) {
        dropString = "1x 200A 3-Phase Camlok Drop";
    } else if (ampsPerLeg <= 400) {
        dropString = "1x 400A (or 2x 200A) 3-Phase Camlok Drops";
    } else {
        const num200 = Math.ceil(ampsPerLeg / 200);
        dropString = `${num200}x 200A 3-Phase Camlok Drops (Distribute evenly)`;
    }

    const logisticsData = [
        ["Est. Crew Size", `${crewSize} Technicians`],
        ["Est. Build Time", `${buildTimeHours.toFixed(1)} Hours (excludes rigging and transport)`],
        ["Road Cases", `${Math.ceil(totalPanels / (state.panelsPerCase || 6))} Active + ${Math.ceil(((state.blanksCount || 0) * state.screenCols) / (state.blanksPerCase || 8))} Blank + ${state.supportCasesCount || 1} Supp. Cases`],
        ["Rec. Spares", `${spares} Panels + 1 Processor + Cables`],
        ["Power Drops", dropString]
    ];

    autoTable(doc, {
        startY: cursorY,
        head: [['Item', 'Estimate']],
        body: logisticsData,
        theme: 'striped',
        headStyles: { fillColor: [50, 50, 50] },
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
        margin: { left: margin, right: pageWidth / 2 } // Half width
    });

    // doc.save("Project_Electrical_Spec.pdf"); // Saved by parent
};

const generateVisualSection = (doc: jsPDF, state: AppState, projectName = 'LED Project') => {
    // const doc = new jsPDF({ orientation: 'landscape', unit: 'mm' }); // Received from parent
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    // --- Header ---
    doc.setFontSize(18);
    doc.setTextColor(33, 150, 243);
    doc.text("VISUAL & CONTENT SPEC", margin, 15);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`${projectName}  |  Generated: ${new Date().toLocaleDateString()} | ${state.screenCols}x${state.screenRows} LED Wall`, margin, 20);

    // --- Calcs for Content Zones ---
    // Width: no blanks in x-direction
    const totalW_px = state.screenCols * state.panelPixelsW;
    // Height (pixels): blanks have NO active pixels — only screenRows count
    const activeScreenH_px = state.screenRows * state.panelPixelsH;
    // totalH_px kept only for visual grid scaling (physical proportion includes blank rows)
    const totalH_px_visual = (state.screenRows + (state.blanksCount || 0)) * state.panelPixelsH;

    // Physical Reference — blanks DO add physical height
    const totalW_mm = state.screenCols * state.panelWidthMm;
    const totalH_mm = (state.screenRows + (state.blanksCount || 0)) * state.panelHeightMm;
    const activeH_mm = state.screenRows * state.panelHeightMm;
    const totalW_ft = totalW_mm / 304.8;
    const totalH_ft = totalH_mm / 304.8;
    const activeH_ft = activeH_mm / 304.8;

    // Safe / Obstruction logic
    // Active pixels are the only real canvas — zone sizes use activeScreenH_px
    let topSafeH_px = activeScreenH_px;
    let obsPxH = 0;
    let bufferPxH = 0;
    let obsPxW = 0;

    const zones = [];

    // 1. Full Canvas (active pixels only — blanks are structural, not content)
    zones.push({
        name: "Full Canvas",
        res: `${totalW_px} × ${activeScreenH_px} px`,
        phys: `${totalW_ft.toFixed(2)}' × ${(totalH_mm / 304.8).toFixed(2)}'`,
        aspect: `${(totalW_px / activeScreenH_px).toFixed(2)}:1`
    });

    if (state.stageConfig?.enabled) {
        // Obstruction Metrics
        const blanksHeightMm = (state.blanksCount || 0) * state.panelHeightMm;
        const obsMmH = Math.max(0, state.stageConfig.heightMm - (state.groundStackHeightMm || 0));
        const obsMmW = state.stageConfig.widthMm;

        // Blanks absorb physical obstruction before it hits active pixels
        const activeObstructionMm = Math.max(0, obsMmH - blanksHeightMm);
        obsPxH = (activeObstructionMm / activeH_mm) * activeScreenH_px;
        obsPxW = (obsMmW / totalW_mm) * totalW_px;

        const bufferMm = state.stageConfig.safeBufferMm ?? 152;
        // Buffer applies on top of the physical obstruction
        // If obstruction is fully below active area, we still need to check if buffer reaches active area
        const totalBlockedMm = obsMmH + bufferMm;
        const activeBlockedMm = Math.max(0, totalBlockedMm - blanksHeightMm);

        // Use activeBlockedMm to calculate the total amount of blocked pixels including buffer
        const totalBlockedPxH = (activeBlockedMm / activeH_mm) * activeScreenH_px;
        bufferPxH = Math.max(0, totalBlockedPxH - obsPxH); // Delta is the buffer width in pixels
        const bufferPxW = (bufferMm / totalW_mm) * totalW_px;

        // Top Safe Zone — capped at the active screen height (never exceeds real pixel content area)
        topSafeH_px = Math.max(0, Math.min(
            activeScreenH_px,
            Math.round(activeScreenH_px - obsPxH - bufferPxH)
        ));
        const topSafeH_ft = (topSafeH_px / activeScreenH_px) * activeH_ft;

        zones.push({
            name: "Safe Main Area (Top)",
            res: `${totalW_px} × ${topSafeH_px} px`,
            phys: `${totalW_ft.toFixed(2)}' × ${topSafeH_ft.toFixed(2)}'`,
            aspect: `${(totalW_px / topSafeH_px).toFixed(2)}:1`
        });

        // Left/Right Wings
        const centerX_px = totalW_px / 2 + ((state.stageConfig.offsetXMm / totalW_mm) * totalW_px);
        const obsLeftX_px = centerX_px - (obsPxW / 2) - bufferPxW;
        const obsRightX_px = centerX_px + (obsPxW / 2) + bufferPxW;

        // Left Wing — height is the full physical column height but only active pixels count
        if (obsLeftX_px > 0) {
            const leftW_px = Math.floor(obsLeftX_px);
            const leftW_ft = (leftW_px / totalW_px) * totalW_ft;
            zones.push({
                name: "Left Safe Column",
                res: `${leftW_px} × ${activeScreenH_px} px`,
                phys: `${leftW_ft.toFixed(2)}' × ${totalH_ft.toFixed(2)}'`,
                aspect: `${(leftW_px / activeScreenH_px).toFixed(2)}:1`
            });
        }

        // Right Wing
        if (obsRightX_px < totalW_px) {
            const rightW_px = Math.floor(totalW_px - obsRightX_px);
            const rightW_ft = (rightW_px / totalW_px) * totalW_ft;
            zones.push({
                name: "Right Safe Column",
                res: `${rightW_px} × ${activeScreenH_px} px`,
                phys: `${rightW_ft.toFixed(2)}' × ${totalH_ft.toFixed(2)}'`,
                aspect: `${(rightW_px / activeScreenH_px).toFixed(2)}:1`
            });
        }
    } else {
        zones.push({
            name: "Safe Area",
            res: "Full Screen",
            phys: "Full Screen",
            aspect: "Same"
        });
    }

    // --- Left Column Stats ---
    const leftColW = 85;

    // 1. Zone Table
    autoTable(doc, {
        startY: 25,
        head: [['Zone', 'Resolution', 'Size (ft)', 'Aspect']],
        body: zones.map(z => [z.name, z.res, z.phys, z.aspect]),
        theme: 'grid',
        headStyles: { fillColor: [50, 50, 50], fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        margin: { left: margin },
        tableWidth: leftColW
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;

    // 2. Data Estimations — use ACTIVE pixels only (blanks have no pixel data)
    const totalPixels = totalW_px * activeScreenH_px;

    // Est Ports (650k px per port conservative, Brompton/Novastar standard)
    const estPorts = Math.ceil(totalPixels / 650000);

    const dataSpecs = [
        ["Total Pixels", `${formatNum(totalPixels)} (active)`],
        ["Data Load", `${(totalPixels / 8294400 * 100).toFixed(1)}% of 4K UHD`],
        ["Est. 1G Ports", `${estPorts} Main + ${estPorts} Backup`],
        ["Processor Req", totalPixels > 8000000 ? "4K Processor (SX80/Tessera)" : "HD Processor (S8/MCTRL4K)"]
    ];

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text("Data Processing & Signal", margin, finalY);

    autoTable(doc, {
        startY: finalY + 2,
        body: dataSpecs,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 }, 1: { cellWidth: 50 } },
        margin: { left: margin },
        tableWidth: leftColW
    });

    finalY = (doc as any).lastAutoTable.finalY + 8;

    // 3. Content Delivery Specs
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text("Recommended Content Specs", margin, finalY);

    const pitchMm = state.panelWidthMm / state.panelPixelsW;
    const viewDistFt = pitchMm * 8;

    const contentSpecs = [
        ["Container", ".MOV (QuickTime) or .MP4"],
        ["Codecs", "Apple ProRes 4444 (Alpha) or H.265 (HEVC) 10-bit"],
        ["Frame Rate", "59.94 fps or 29.97 fps (Constant Frame Rate)"],
        ["Color Space", "Rec.709 Gamma 2.2 or sRGB (Computer Standard)"],
        ["Bit Depth", "10-bit (preferred) to avoid banding"],
        ["Audio", "Embedded Stereo (Ch 1/2) if required"],
        ["Pixel Pitch", `${pitchMm.toFixed(1)} mm`],
        ["Min View Dist", `${viewDistFt.toFixed(1)} ft (${(viewDistFt * 0.3048).toFixed(1)} m)`],
    ];

    autoTable(doc, {
        startY: finalY + 2,
        body: contentSpecs,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 }, 1: { cellWidth: 50 } },
        margin: { left: margin },
        tableWidth: leftColW
    });

    // --- Main Visualizer ---
    const visX = margin + leftColW + 10;
    const visY = 25;
    const visMaxW = pageWidth - visX - margin;
    const visMaxH = pageHeight - margin - 20;

    const wallW_mm = state.screenCols * state.panelWidthMm;
    const wallH_mm = (state.screenRows + (state.blanksCount || 0)) * state.panelHeightMm; // physical including blanks

    const scale = Math.min(visMaxW / wallW_mm, visMaxH / wallH_mm);
    const drawW = wallW_mm * scale;
    const drawH = wallH_mm * scale;

    const startX = visX + (visMaxW - drawW) / 2;
    const startY = visY + 10; // Extra top margin for dim lines

    // Helper: Draw Dimension Line
    const drawDimLine = (x1: number, y1: number, x2: number, y2: number, text: string, offset = 5, isVert = false) => {
        doc.setDrawColor(100);
        doc.setLineWidth(0.2);
        doc.setTextColor(80);
        doc.setFontSize(7);

        if (!isVert) {
            // Horizontal Line
            const y = y1 - offset;
            doc.line(x1, y1 - 1, x1, y - 2); // Tick 1
            doc.line(x2, y2 - 1, x2, y - 2); // Tick 2
            doc.line(x1, y, x2, y); // Main Line

            // Text center
            const cx = (x1 + x2) / 2;
            doc.setFillColor(255, 255, 255);
            const w = doc.getTextWidth(text) + 2;
            doc.rect(cx - w / 2, y - 1.5, w, 3, 'F'); // Text background
            doc.text(text, cx, y + 1, { align: 'center' });
        } else {
            // Vertical Line
            const x = x1 - offset;
            doc.line(x1 - 1, y1, x - 2, y1); // Tick 1
            doc.line(x2 - 1, y2, x - 2, y2); // Tick 2
            doc.line(x, y1, x, y2); // Main Line

            // Text center (Rotated 90)
            const cy = (y1 + y2) / 2;
            doc.setFillColor(255, 255, 255);
            doc.text(text, x - 1, cy, { align: 'center', angle: 90 });
        }
    };

    // Draw Background Grid
    doc.setDrawColor(230);
    // Fill active area light grey
    const activePxH = state.screenRows * state.panelPixelsH;
    const activeRatio = activePxH / totalH_px_visual;  // visual proportion: active rows vs total physical rows
    doc.setFillColor(245, 245, 245);
    doc.rect(startX, startY, drawW, drawH * activeRatio, 'F'); // Active Background

    // Draw Panels Outline
    doc.setLineWidth(0.1);
    const activeRows = state.screenRows;

    // Fix: Use totalRows loop
    const drawTotalRows = state.screenRows + (state.blanksCount || 0);

    for (let r = 0; r < drawTotalRows; r++) {
        for (let c = 0; c < state.screenCols; c++) {
            const px = startX + c * state.panelWidthMm * scale;
            const py = startY + r * state.panelHeightMm * scale;
            if (r >= activeRows) {
                doc.setDrawColor(240); // Blanks
                doc.rect(px, py, state.panelWidthMm * scale, state.panelHeightMm * scale);
            } else {
                doc.setDrawColor(210);
                doc.rect(px, py, state.panelWidthMm * scale, state.panelHeightMm * scale);
            }
        }
    }

    // Outline Wall
    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(startX, startY, drawW, drawH);

    // Obstruction & Safe Zones Visuals
    if (state.stageConfig?.enabled) {
        // Obs Geometry
        const obsMmH = Math.max(0, state.stageConfig.heightMm - (state.groundStackHeightMm || 0));
        const obsMmW = state.stageConfig.widthMm;
        const obsMmMargX = state.stageConfig.offsetXMm;

        const obsH = obsMmH * scale;
        const obsW = obsMmW * scale;
        const obsCenterX = startX + (drawW / 2) + (obsMmMargX * scale);
        const obsX = obsCenterX - (obsW / 2);
        const obsY = startY + drawH - obsH;

        // Draw Obstruction (Red Hatch or Fill)
        doc.setFillColor(255, 220, 220); // Light Red
        doc.setDrawColor(200, 50, 50);
        doc.rect(obsX, obsY, obsW, obsH, 'FD');
        doc.setTextColor(150, 0, 0);
        doc.setFontSize(8);

        // Add pixel dimensions to label
        const obsLabel = `BLOCKED (${Math.round(obsPxW)}x${Math.round(obsPxH)}px)`;
        doc.text(obsLabel, obsX + obsW / 2, obsY + obsH / 2, { align: 'center', baseline: 'middle' });

        // Buffer Geometry
        const buffer = (state.stageConfig.safeBufferMm ?? 152) * scale;
        const safeY = obsY - buffer; // Y pos of safe line

        // Draw Top Safe Area (Green Tint)
        if (safeY > startY) {
            doc.saveGraphicsState();
            doc.setGState(new (doc as any).GState({ opacity: 0.3 })); // Fixed: Safe cast
            doc.setFillColor(220, 255, 220); // Light Green
            doc.rect(startX, startY, drawW, safeY - startY, 'F');
            doc.restoreGraphicsState();
        }

        // Safe Line
        doc.setDrawColor(0, 150, 0); // Green
        doc.setLineWidth(0.5);
        doc.setLineDashPattern([3, 1], 0);
        doc.line(startX, safeY, startX + drawW, safeY);
        doc.setLineDashPattern([], 0);

        // -- Dimensions --

        // 1. Total Width
        drawDimLine(startX, startY, startX + drawW, startY, `${totalW_px}px (${totalW_ft.toFixed(1)}')`, 5);

        // 2. Safe Height (Main)
        // Draw on the Right Side
        const safePxH = Math.round(topSafeH_px);
        drawDimLine(startX + drawW, startY, startX + drawW, safeY, `Safe: ${safePxH}px`, -5, true);

        // 3. Side Columns Dimensions
        const safeLeftX = obsX - buffer;
        const safeRightX = obsX + obsW + buffer;

        // Draw Left Wing Dim
        if (safeLeftX > startX + 10) {
            const wRatio = (safeLeftX - startX) / drawW;
            const wPxExact = Math.round(wRatio * totalW_px);
            const wFtExact = (wRatio * totalW_ft);

            drawDimLine(startX, startY + drawH, safeLeftX, startY + drawH, `${wPxExact}px (${wFtExact.toFixed(1)}')`, -5);

            // Tint Blue
            doc.saveGraphicsState();
            doc.setGState(new (doc as any).GState({ opacity: 0.2 }));
            doc.setFillColor(200, 200, 255);
            doc.rect(startX, safeY, safeLeftX - startX, startY + drawH - safeY, 'F');
            doc.restoreGraphicsState();
        }

        // Draw Right Wing Dim
        if (safeRightX < startX + drawW - 10) {
            const wRatio = (startX + drawW - safeRightX) / drawW;
            const wPxExact = Math.round(wRatio * totalW_px);
            const wFtExact = (wRatio * totalW_ft);

            drawDimLine(safeRightX, startY + drawH, startX + drawW, startY + drawH, `${wPxExact}px (${wFtExact.toFixed(1)}')`, -5);

            // Tint Blue
            doc.saveGraphicsState();
            doc.setGState(new (doc as any).GState({ opacity: 0.2 }));
            doc.setFillColor(200, 200, 255);
            doc.rect(safeRightX, safeY, startX + drawW - safeRightX, startY + drawH - safeY, 'F');
            doc.restoreGraphicsState();
        }

        // Obstruction Width Dimension
        drawDimLine(obsX, obsY, obsX + obsW, obsY, `${Math.round(obsPxW)}px (${(obsMmW / 304.8).toFixed(1)}')`, 5);

    } else {
        // No Obstruction - Simple Dims
        drawDimLine(startX, startY, startX + drawW, startY, `${totalW_px}px (${totalW_ft.toFixed(1)}')`, 5);
        drawDimLine(startX + drawW, startY, startX + drawW, startY + drawH, `${activeScreenH_px}px active (${totalH_ft.toFixed(2)}' total)`, -5, true);
    }

    // doc.save("Project_Visual_Spec.pdf"); // Saved by parent
};
