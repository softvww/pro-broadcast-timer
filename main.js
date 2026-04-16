const { app, BrowserWindow, ipcMain, screen } = require('electron');
if (require('electron-squirrel-startup')) app.quit();
const path = require('path');
const fs = require('fs');


let mainWindow;
let broadcastWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
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
    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
