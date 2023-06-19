const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
  'electron',
  {
    send: (channel, data) => ipcRenderer.send(channel, data)
  }
);
