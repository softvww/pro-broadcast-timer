const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openBroadcastWindow: () => ipcRenderer.invoke('open-broadcast-window'),
    getMachineId: () => ipcRenderer.invoke('get-machine-id'),
    verifyLicense: (key) => ipcRenderer.invoke('verify-license', key)
});

