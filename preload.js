const { contextBridge, ipcRenderer } = require("electron");

console.log("Preload script loaded successfully");

contextBridge.exposeInMainWorld("electronAPI", {
  storeToken: (token) => ipcRenderer.send("store-token", token),
  getToken: () => ipcRenderer.invoke("get-token"),
  openSpotifyLogin: () => ipcRenderer.send("open-spotify-login"),
  onSpotifyConnectionStatus: (callback) =>
    ipcRenderer.on("spotify-connection-status", callback),
  removeSpotifyConnectionListener: (callback) =>
    ipcRenderer.removeListener("spotify-connection-status", callback),
  checkSpotifyConnection: () => ipcRenderer.send("check-spotify-connection"),
});
