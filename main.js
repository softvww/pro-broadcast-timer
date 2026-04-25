const { app, BrowserWindow, ipcMain, screen } = require('electron');
if (require('electron-squirrel-startup')) app.quit();
const path = require('path');
const fs = require('fs');
const { Server } = require('node-osc');
const http = require('http');
const { WebSocketServer } = require('ws');
const os = require('os');
const QRCode = require('qrcode');

// Get local WiFi IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        // Skip virtual interfaces like Docker, VirtualBox, vEthernet
        if (name.toLowerCase().includes('virtual') || name.toLowerCase().includes('docker') || name.toLowerCase().includes('vbox') || name.toLowerCase().includes('vethernet')) {
            continue;
        }
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }

    if (ips.length === 0) return '127.0.0.1';

    // Prioritize common local subnets
    const sorted = ips.sort((a, b) => {
        if (a.startsWith('192.168.')) return -1;
        if (b.startsWith('192.168.')) return 1;
        if (a.startsWith('10.')) return -1;
        if (b.startsWith('10.')) return 1;
        return 0;
    });

    return sorted[0];
}

const WEB_PORT = 3030;
let wss; // WebSocket server reference


let splashWindow;
let mainWindow;
let broadcastWindow;

function createSplashScreen() {
    splashWindow = new BrowserWindow({
        width: 500,
        height: 300,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    splashWindow.loadFile('splash.html');
    splashWindow.center();
}

function createActivationWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        icon: path.join(__dirname, 'icon.ico'),
        title: 'Videowaves Pro Timer - Activation',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadFile('activation.html');

    mainWindow.once('ready-to-show', () => {
        setTimeout(() => {
            if (splashWindow) splashWindow.close();
            mainWindow.show();
        }, 3000);
    });

    mainWindow.on('closed', () => {
        app.quit();
    });
}

function createMainWindow() {
    // If mainWindow exists (activation window), close it without quitting app
    if (mainWindow) {
        mainWindow.removeAllListeners('closed');
        mainWindow.close();
    }

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        show: true,
        icon: path.join(__dirname, 'icon.ico'),
        title: 'Videowaves Pro Timer - Control Panel',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadFile('index.html');

    mainWindow.on('closed', () => {
        app.quit();
    });

    // Re-attach network listeners if needed
    if (wss) {
        mainWindow.webContents.once('did-finish-load', () => {
            const ip = getLocalIP();
            const url = `http://${ip}:${WEB_PORT}`;
            QRCode.toDataURL(url, { margin: 1, color: { dark: '#00d4ff', light: '#00000000' } }, (err, qrUrl) => {
                mainWindow.webContents.send('network-ip', { ip, port: WEB_PORT, qr: qrUrl });
            });
        });
    }
}

// IPC Handlers for Activation
const { machineIdSync } = require('node-machine-id');

ipcMain.handle('get-machine-id', () => {
    try {
        return machineIdSync();
    } catch (e) {
        // Fallback if machine-id fails
        return 'VW-TIMER-GENERIC-ID';
    }
});

ipcMain.handle('activation-success', () => {
    createMainWindow();
});


// Logic for smart dual monitor placement
ipcMain.handle('open-broadcast-window', () => {
    if (broadcastWindow && !broadcastWindow.isDestroyed()) {
        broadcastWindow.focus();
        return;
    }

    const displays = screen.getAllDisplays();
    let externalDisplay = displays.find(display => display.bounds.x !== 0 || display.bounds.y !== 0);

    let windowOptions = {
        title: 'Videowaves Broadcast',
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true
    };

    if (externalDisplay) {
        // Position window precisely on the 2nd monitor
        windowOptions.x = externalDisplay.bounds.x;
        windowOptions.y = externalDisplay.bounds.y;
        // Make it full screen natively on that display
        windowOptions.fullscreen = true;
    } else {
        // Fallback: If no second monitor is detected, just open locally sized
        windowOptions.width = 1280;
        windowOptions.height = 720;
    }

    broadcastWindow = new BrowserWindow(windowOptions);
    broadcastWindow.setMenuBarVisibility(false);
    broadcastWindow.loadFile('broadcast.html');

    broadcastWindow.on('closed', () => {
        broadcastWindow = null;
    });
});


app.whenReady().then(() => {
    createSplashScreen();
    createActivationWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createActivationWindow();
        }
    });

    // ── OSC Server (Bitfocus Companion) port 1212 ──
    const oscServer = new Server(1212, '0.0.0.0', () => {
        console.log('OSC Server listening on port 1212');
    });
    oscServer.on('message', (msg) => {
        const [address, ...args] = msg;
        if (mainWindow) mainWindow.webContents.send('osc-command', { address, args });
    });

    // ── HTTP + WebSocket Network Control Server port 3030 ──
    const controlPanelHTML = fs.readFileSync(path.join(__dirname, 'control-panel.html'), 'utf8');

    const httpServer = http.createServer((req, res) => {
        if (req.url === '/' || req.url === '/index.html') {
            const ip   = getLocalIP();
            const html = controlPanelHTML.replace('__SERVER_IP__', ip).replace('__SERVER_PORT__', WEB_PORT);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
        } else {
            res.writeHead(404); res.end('Not found');
        }
    });

    wss = new WebSocketServer({ server: httpServer });

    wss.on('connection', (ws) => {
        console.log('Network client connected');
        // Send current timer state to newly connected client
        if (mainWindow) mainWindow.webContents.send('request-state', {});

        ws.on('message', (raw) => {
            try {
                const cmd = JSON.parse(raw);
                // Forward command to renderer (same as OSC)
                if (mainWindow) mainWindow.webContents.send('osc-command', { address: cmd.address, args: cmd.args || [] });
            } catch(e) { console.error('WS parse error', e); }
        });
        ws.on('close', () => console.log('Network client disconnected'));
    });

    // Broadcast timer state updates to all connected web clients
    ipcMain.on('timer-state-update', (event, state) => {
        if (!wss) return;
        const msg = JSON.stringify(state);
        wss.clients.forEach(client => {
            if (client.readyState === 1) client.send(msg);
        });
    });

    httpServer.listen(WEB_PORT, '0.0.0.0', () => {
        const ip = getLocalIP();
        const url = `http://${ip}:${WEB_PORT}`;
        console.log(`\n🌐 Network Control Panel: ${url}\n`);
        
        // Notify renderer with the IP and generate a QR Code
        mainWindow.webContents.once('did-finish-load', () => {
            QRCode.toDataURL(url, { margin: 1, color: { dark: '#00d4ff', light: '#00000000' } }, (err, qrUrl) => {
                mainWindow.webContents.send('network-ip', { ip, port: WEB_PORT, qr: qrUrl });
            });
        });
    });

    // ── Auto-Update Check ──
    checkForUpdates();
});

const { dialog, shell } = require('electron');
async function checkForUpdates() {
    const CURRENT_VERSION = app.getVersion();
    const VERSION_URL = 'https://softvww.github.io/videowaves-timer-store/version.json';

    try {
        const response = await fetch(VERSION_URL);
        const data = await response.json();

        if (data.version !== CURRENT_VERSION) {
            const choice = dialog.showMessageBoxSync({
                type: 'info',
                buttons: ['Download Now', 'Later'],
                title: 'Update Available',
                message: `A new version (${data.version}) is available!`,
                detail: data.changelog || 'Performance improvements and bug fixes.'
            });

            if (choice === 0) {
                shell.openExternal(data.download_url);
            }
        }
    } catch (e) {
        console.log('Update check failed (probably offline)');
    }
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
