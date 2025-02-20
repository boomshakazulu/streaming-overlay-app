require("dotenv").config();
const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("path");
const net = require("net");
const axios = require("axios");
let Store;

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// app.whenReady().then(() => {
//   // Clear the cache
//   session.defaultSession.clearCache().then(() => {
//     console.log("Cache cleared!");
//   });

//   // Clear all local storage data
//   session.defaultSession
//     .clearStorageData({
//       origin: "*", // Clear everything (you can limit to specific origin)
//       storages: [
//         "localstorage",
//         "cookies",
//         "indexeddb",
//         "filesystem",
//         "websql",
//       ],
//     })
//     .then(() => {
//       console.log("Local storage cleared!");
//     });
// });

(async () => {
  Store = (await import("electron-store")).default;
  const store = new Store();

  console.log(store.path);

  // Handle storing both Spotify tokens
  ipcMain.on("store-token", (event, { accessToken, refreshToken }) => {
    console.log("Received tokens to store:", accessToken, refreshToken);
    store.set("spotify_access_token", accessToken);
    store.set("spotify_refresh_token", refreshToken);
    console.log("Tokens stored");

    // Emit connection status to indicate the user is now connected
    // ipcMain.emit("spotify-connection-status", true); // Emit the connection status
  });

  ipcMain.on("check-spotify-connection", async (event) => {
    const accessToken = store.get("spotify_access_token");
    console.log("firing");
    if (accessToken) {
      try {
        const response = await axios.get("https://api.spotify.com/v1/me", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.status === 200) {
          mainWindow.webContents.send("spotify-connection-status", true); // Emit connected
          console.log("emitting true");
        } else {
          mainWindow.webContents.send("spotify-connection-status", false); // Emit disconnected
          console.log("emitting false");
        }
      } catch (error) {
        console.log("Error checking connection:", error);
        if (error.response && error.response.status === 401) {
          console.log("Token expired, need to refresh.");
          mainWindow.webContents.send("spotify-connection-status", false); // Emit disconnected
        } else {
          mainWindow.webContents.send("spotify-connection-status", false); // Emit disconnected for other errors
        }
      }
    } else {
      mainWindow.webContents.send("spotify-connection-status", false); // No token, emit disconnected
    }
  });

  // Handle getting the stored Spotify access token
  ipcMain.handle("get-token", () => {
    const accessToken = store.get("spotify_access_token");
    return accessToken;
  });

  // Handle refreshing the access token
  ipcMain.handle("refresh-token", async () => {
    const refreshToken = store.get("spotify_refresh_token");

    if (!refreshToken) {
      console.log("No refresh token available");
      ipcMain.emit("spotify-connection-status", false); // Send failure status
      return null;
    }

    try {
      const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
        {
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const newAccessToken = response.data.access_token;
      if (newAccessToken) {
        store.set("spotify_access_token", newAccessToken); // Store new access token
        console.log("Access token refreshed:", newAccessToken);
        ipcMain.emit("spotify-connection-status", true); // Send success status
        return newAccessToken;
      } else {
        console.log("Error refreshing access token");
        ipcMain.emit("spotify-connection-status", false); // Send failure status
        return null;
      }
    } catch (error) {
      console.error("Error refreshing access token:", error);
      ipcMain.emit("spotify-connection-status", false); // Send failure status
      return null;
    }
  });

  // Set up a periodic check to refresh the token if needed
  setInterval(async () => {
    const accessToken = store.get("spotify_access_token");

    if (accessToken) {
      // Instead of calling refreshAccessToken directly, call the refresh-token handler
      const refreshedToken = await ipcMain.handle("refresh-token");
      if (refreshedToken) {
        console.log("Token refreshed successfully");
      } else {
        console.log("Failed to refresh token");
      }
    }
  }, 60 * 60 * 1000); // Refresh every hour
})();

let mainWindow;

const waitForVite = (port = 5173) => {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const client = new net.Socket();
      client.connect(port, "localhost", () => {
        clearInterval(interval);
        client.end();
        resolve();
      });
      client.on("error", () => {
        client.destroy();
      });
    }, 500);
  });
};

ipcMain.on("open-spotify-login", () => {
  // Create a new window or load the Spotify login page
  let loginWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  loginWindow.loadURL(
    `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=http://localhost:5000/callback&response_type=code&scope=user-read-private user-read-email`
  );
});

app.whenReady().then(async () => {
  await waitForVite();
  console.log(__dirname);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadURL("http://localhost:5173");

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
});
