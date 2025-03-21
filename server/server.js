// const path = require("path");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const querystring = require("querystring");

const app = express();
const PORT = 5000;
let frontURL = "http://localhost:5173";

app.use(
  cors({
    origin: frontURL, // Allow requests from the frontend
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.static("public"));

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:5000/callback";

// Redirect User to Spotify Auth
app.get("/login", (req, res) => {
  const scope = "user-read-private user-read-email user-read-playback-state"; // Add necessary scopes
  const authURL = `https://accounts.spotify.com/authorize?${querystring.stringify(
    {
      response_type: "code",
      client_id: CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI,
    }
  )}`;
  res.json({ authURL }); // Send back the URL to Electron
});

// Handle Spotify Callback and Exchange Code for Token
app.get("/callback", async (req, res) => {
  const code = req.query.code || null;
  if (!code) {
    return res.status(400).json({ error: "No code provided" });
  }

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      querystring.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { access_token, refresh_token } = response.data;

    // Redirect user back to frontend with tokens as query params
    res.redirect(
      `http://localhost:5000/auth?access_token=${access_token}&refresh_token=${refresh_token}`
    );
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(400).json({ error: "Failed to authenticate" });
  }
});

app.get("/api/token", async (req, res) => {
  try {
    // Fetching token from the Electron backend (assuming it's on port 5001)
    const response = await axios.get("http://localhost:5001/api/token");
    const token = response.data.token;

    // Sending token to the React frontend
    res.json({ token });
  } catch (error) {
    // Log error for debugging
    console.error("Error fetching token:", error);

    // Sending a proper error response to the frontend
    res.status(500).json({ error: "Failed to fetch token from Electron." });
  }
});

app.get("/auth", async (req, res) => {
  const { access_token, refresh_token } = req.query;

  if (!access_token || !refresh_token) {
    return res.status(400).json({ error: "Tokens are missing" });
  }
  try {
    // Send the tokens to Electron through IPC
    await axios.post("http://localhost:5001/store-token", {
      access_token,
      refresh_token,
    });
    // You can then redirect the user to the frontend or send back a success message
    console.log("tokens saved");
  } catch (err) {
    console.error("Error exchanging code for token:", err);
  }
});

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`Express server running at http://localhost:${PORT}`);
  });
};

module.exports = { start: startServer }; // Export the start function
