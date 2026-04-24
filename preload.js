const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openBroadcastWindow: () => ipcRenderer.invoke('open-broadcast-window'),
    getMachineId:        () => ipcRenderer.invoke('get-machine-id'),
    verifyLicense:       (key) => ipcRenderer.invoke('verify-license', key),
    onOscCommand:        (cb) => ipcRenderer.on('osc-command',      (_e, v) => cb(v)),
    onNetworkIP:         (cb) => ipcRenderer.on('network-ip',       (_e, v) => cb(v)),
    onRequestState:      (cb) => ipcRenderer.on('request-state',    (_e, v) => cb(v)),
    sendTimerState:      (state) => ipcRenderer.send('timer-state-update', state),
});
