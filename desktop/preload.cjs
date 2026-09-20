const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("carveDesktop", {
  minimize: () => ipcRenderer.send("window-min"),
  maximize: () => ipcRenderer.send("window-max"),
  close: () => ipcRenderer.send("window-close"),
  platform: process.platform,
  readDb: () => ipcRenderer.invoke("shop-db-read"),
  writeDb: (bytes) => ipcRenderer.invoke("shop-db-write", bytes),
});
