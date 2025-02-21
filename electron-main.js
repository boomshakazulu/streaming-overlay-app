require("dotenv").config();
const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("path");
const net = require("net");
const axios = require("axios");
const express = require("express");
const server = require("./server/server");

const appEx = express();

// Load environment variables
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const TOKEN_URL = "https://accounts.spotify.com/api/token";

let Store, store;
let mainWindow;

// Initialize Electron Store
(async () => {
  try {
    Store = (await import("electron-store")).default;
    store = new Store();
    console.log("Store initialized at:", store.path);
  } catch (error) {
    console.error("Error initializing store:", error);
  }
})();

appEx.get("/api/token", (req, res) => {
  const token = store.get("spotify_access_token");
  if (token) {
    res.json({ token });
  } else {
    res.status(404).json({ error: "Token not found" });
  }
});

appEx.listen(5001, () => {
  console.log("Electron API server listening on port 5001");
});

// Function to refresh the Spotify token
async function refreshSpotifyToken() {
  const refreshToken = store?.get("spotify_refresh_token");

  if (!refreshToken) {
    console.log("No refresh token found.");
    return false;
  }

  try {
    const response = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    if (response.status === 200) {
      const { access_token, refresh_token: newRefreshToken } = response.data;
      store.set("spotify_access_token", access_token);
      console.log("New access token stored.");

      if (newRefreshToken) {
        store.set("spotify_refresh_token", newRefreshToken);
        console.log("New refresh token stored.");
      }

      return access_token;
    }
  } catch (error) {
    console.error(
      "Error refreshing Spotify token:",
      error.response?.data || error.message
    );
  }

  return false;
}

// IPC Handlers
ipcMain.on("store-token", (event, { accessToken, refreshToken }) => {
  store.set("spotify_access_token", accessToken);
  store.set("spotify_refresh_token", refreshToken);
  console.log("Tokens stored.");
});

ipcMain.on("check-spotify-connection", async (event) => {
  let accessToken = store?.get("spotify_access_token");

  if (accessToken) {
    try {
      const response = await axios.get("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 200) {
        mainWindow.webContents.send("spotify-connection-status", true);
        return;
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log("Token expired, attempting refresh...");
        const newAccessToken = await refreshSpotifyToken();
        if (newAccessToken) {
          accessToken = newAccessToken;
          try {
            const retryResponse = await axios.get(
              "https://api.spotify.com/v1/me",
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (retryResponse.status === 200) {
              mainWindow.webContents.send("spotify-connection-status", true);
              return;
            }
          } catch (retryError) {
            console.error("Failed even after refreshing token:", retryError);
          }
        }
      }
    }
  }
  mainWindow.webContents.send("spotify-connection-status", false);
});

ipcMain.handle("get-token", () => store?.get("spotify_access_token"));

// IPC Handler for 'refresh-token'
ipcMain.handle("refresh-token", async () => {
  const refreshToken = store?.get("spotify_refresh_token");

  if (!refreshToken) {
    console.log("No refresh token available.");
    mainWindow?.webContents.send("spotify-connection-status", false);
    return null;
  }

  try {
    const response = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${CLIENT_ID}:${CLIENT_SECRET}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const newAccessToken = response.data.access_token;
    if (newAccessToken) {
      store.set("spotify_access_token", newAccessToken);
      console.log("Access token refreshed.");
      mainWindow?.webContents.send("spotify-token-updated", newAccessToken);
      mainWindow?.webContents.send("spotify-connection-status", true);
      return newAccessToken;
    }
  } catch (error) {
    console.error("Error refreshing access token:", error);
    mainWindow?.webContents.send("spotify-connection-status", false);
  }

  return null;
});

// Function to run token refresh every hour
const runTokenRefresh = async () => {
  console.log("Running token refresh...");
  const refreshToken = store?.get("spotify_refresh_token");

  if (!refreshToken) {
    console.log("No refresh token available.");
    mainWindow?.webContents.send("spotify-connection-status", false);
    return null;
  }

  try {
    const response = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${CLIENT_ID}:${CLIENT_SECRET}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const newAccessToken = response.data.access_token;
    if (newAccessToken) {
      store.set("spotify_access_token", newAccessToken);
      console.log("Access token refreshed.");
      mainWindow?.webContents.send("spotify-token-updated", newAccessToken);
      mainWindow?.webContents.send("spotify-connection-status", true);
      return newAccessToken;
    }
  } catch (error) {
    console.error("Error refreshing access token:", error);
    mainWindow?.webContents.send("spotify-connection-status", false);
  }

  return null;
};

// Auto-refresh token every hour
console.log("Setting up interval");
setInterval(() => {
  console.log("Refreshing token...");
  runTokenRefresh();
}, 60 * 60 * 1000);

// Initialize first token refresh on app startup
app.whenReady().then(() => {
  server.start();
  runTokenRefresh();
});

// Wait for Vite dev server
const waitForVite = (port = 5173) => {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const client = new net.Socket();
      client.connect(port, "localhost", () => {
        clearInterval(interval);
        client.end();
        resolve();
      });
      client.on("error", () => client.destroy());
    }, 500);
  });
};

// Open Spotify Login Window
ipcMain.on("open-spotify-login", () => {
  const loginWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  loginWindow.loadURL(
    `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=http://localhost:5000/callback&response_type=code&scope=user-read-private user-read-email user-read-playback-state`
  );

  loginWindow.on("closed", () => {
    if (mainWindow) {
      mainWindow.webContents.send("refresh-home-page");
    }
  });
});

// Initialize Electron App
app.whenReady().then(async () => {
  await waitForVite();

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
    if (process.platform !== "darwin") app.quit();
  });
});
