const { app, BrowserWindow, ipcMain, screen } = require('electron');
if (require('electron-squirrel-startup')) app.quit();
const path = require('path');
const fs = require('fs');
const { Server } = require('node-osc');


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

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        show: false, // Don't show immediately
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

    mainWindow.once('ready-to-show', () => {
        // Wait a bit more for the splash to be seen
        setTimeout(() => {
            if (splashWindow) splashWindow.close();
            mainWindow.show();
        }, 3000);
    });

    mainWindow.on('closed', () => {
        app.quit();
    });
}


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
    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });

    // Start OSC Server on port 1212
    const oscServer = new Server(1212, '0.0.0.0', () => {
        console.log('OSC Server is listening on port 1212');
    });

    oscServer.on('message', (msg) => {
        const [address, ...args] = msg;
        console.log(`OSC Message received: ${address}`, args);
        
        if (mainWindow) {
            // Forward OSC command to renderer
            mainWindow.webContents.send('osc-command', { address, args });
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
