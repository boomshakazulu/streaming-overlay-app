require("dotenv").config();
const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("path");
const net = require("net");
const axios = require("axios");
const express = require("express");
const server = require("./server/server");
const http = require("http");

const appEx = express();
let mainWindow;
let loginWindow;

// Load environment variables
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const TOKEN_URL = "https://accounts.spotify.com/api/token";

let Store, store;

// Initialize Electron Store
(async () => {
  try {
    Store = (await import("electron-store")).default;
    store = new Store();
  } catch (error) {
    console.error("Error initializing store:", error);
  }
})();

const elecServer = http.createServer((req, res) => {
  // Route for storing Spotify tokens (called by Express server)
  if (req.method === "POST" && req.url === "/store-token") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      const { access_token, refresh_token } = JSON.parse(body);

      // Store tokens in electron-store
      ipcMain.emit("store-token", null, {
        accessToken: access_token,
        refreshToken: refresh_token,
      });

      // Send response to Express server
      res.statusCode = 200;
      res.end("Tokens stored");
    });
  }
  // Route to get the stored Spotify access token
  else if (req.method === "GET" && req.url === "/api/token") {
    const token = store.get("spotify_access_token");
    if (token) {
      res.statusCode = 200;
      res.end(JSON.stringify({ token }));
    } else {
      res.statusCode = 404;
      res.json({ error: "Token not found" });
    }
  }
  // 404 for all other routes
  else {
    res.statusCode = 404;
    res.end("Not Found");
  }
});

// Start the HTTP server on port 5001
elecServer.listen(5001, () => {
  console.log("Electron HTTP server running on http://localhost:5001");
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

      if (newRefreshToken) {
        store.set("spotify_refresh_token", newRefreshToken);
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

ipcMain.on("clear-cache", () => {
  // Clear browser cache
  session.defaultSession.clearCache().then(() => {
    console.log("Browser cache cleared");
  });

  // Clear electron-store data (like Spotify token)
  store.clear(); // This will remove all keys in the store
  console.log("Electron store cleared");
  mainWindow.webContents.send("spotify-connection-status", false);
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
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
  const refreshToken = store?.get("spotify_refresh_token");

  if (!refreshToken) {
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
setInterval(() => {
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
  loginWindow = new BrowserWindow({
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
  ipcMain.on("store-token", (event, { accessToken, refreshToken }) => {
    store.set("spotify_access_token", accessToken);
    store.set("spotify_refresh_token", refreshToken);
    console.log("token saved for real");

    if (loginWindow) {
      loginWindow.close(); // Close the login window
      console.log("Login window closed after storing tokens.");
    }
  });

  loginWindow.on("closed", () => {
    if (mainWindow) {
      mainWindow.webContents.send("refresh-home-page");
    }
  });
});

let serverFront; // Ensure we have a reference to the server

async function startServer() {
  return new Promise((resolve, reject) => {
    const appServer = express();

    appServer.use(express.static(path.join(__dirname, "client/dist/")));

    appServer.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "client/dist/", "index.html"));
    });

    serverFront = http.createServer(appServer);

    serverFront.listen(5173, "0.0.0.0", () => {
      console.log("React app is being served on http://localhost:5173");
      resolve();
    });

    serverFront.on("error", (err) => {
      console.error("Failed to start Express server:", err);
      reject(err);
    });
  });
}

app.on("before-quit", () => {
  if (serverFront) {
    serverFront.close(() => {
      console.log("Closing Express server...");
    });
  }
});

// Initialize Electron App
app.whenReady().then(async () => {
  await startServer();
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
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
