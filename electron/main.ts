import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import fs from 'fs';

function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    // Create the splash window first
    const splash = new BrowserWindow({
        width: 400,
        height: 350,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        center: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Load splash content
    let iconBase64 = '';
    try {
        const iconPath = path.join(__dirname, '../build/icon.png');
        if (fs.existsSync(iconPath)) {
            const iconBuffer = fs.readFileSync(iconPath);
            iconBase64 = iconBuffer.toString('base64');
        }
    } catch (e) {
        console.error('Failed to load icon for splash screen:', e);
    }

    const splashHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {
                margin: 0;
                padding: 0;
                background: transparent;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                -webkit-user-select: none;
                overflow: hidden;
            }
            .container {
                background: rgba(40, 40, 40, 0.95);
                backdrop-filter: blur(10px);
                width: 380px;
                height: 330px;
                border-radius: 16px;
                box-shadow: 0 15px 35px rgba(0,0,0,0.4);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                border: 1px solid rgba(255,255,255,0.1);
            }
            img { width: 128px; height: 128px; margin-bottom: 24px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); }
            h1 { margin: 0; font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; }
            p { margin: 8px 0 0; font-size: 14px; color: #bbbbbb; font-weight: 500; }
            .loader {
                margin-top: 24px;
                width: 24px;
                height: 24px;
                border: 3px solid #eee;
                border-top-color: #007AFF;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            @keyframes spin { tok { transform: rotate(360deg); } }
        </style>
    </head>
    <body>
        <div class="container">
            ${iconBase64 ? `<img src="data:image/png;base64,${iconBase64}" />` : ''}
            <h1>LED Power Planner</h1>
            <p>v${app.getVersion()}</p>
            <div class="loader"></div>
        </div>
    </body>
    </html>
    `;

    splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);

    // Create the main window (hidden initially)
    const win = new BrowserWindow({
        width: Math.min(1400, width),
        height: Math.min(900, height),
        show: false, // Hide initially
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // For simple demos, we can allow this. For prod, use preload.
        },
        title: 'LED Power Planner',
        backgroundColor: '#808080', // Middle grey to prevent white flash
        titleBarStyle: 'hiddenInset' // Mac-native look
    });

    // In development, load from Vite dev server
    const isDev = !app.isPackaged;

    if (isDev) {
        win.loadURL('http://localhost:5173');
        // win.webContents.openDevTools();
    } else {
        // In production, load the built index.html
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Wait for main window to be ready
    win.once('ready-to-show', () => {
        splash.destroy();
        win.show();
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
