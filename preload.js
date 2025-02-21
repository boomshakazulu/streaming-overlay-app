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
  refreshHomePage: () => ipcRenderer.send("refresh-home-page"),
  on: (channel, callback) =>
    ipcRenderer.on(channel, (event, ...args) => callback(...args)), // Allow listening to events
  removeListener: (channel, callback) =>
    ipcRenderer.removeListener(channel, callback), // Allow removing listeners
  onSpotifyTokenUpdated: (callback) => {
    ipcRenderer.on("spotify-token-updated", (event, newToken) => {
      callback(newToken); // Call the provided callback with the updated token
    });
  },
});
