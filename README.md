# streaming-overlay-app

This Electron application allows users to log in to Spotify and provides a browser URL for an OBS overlay.

![spot-overlay](https://github.com/user-attachments/assets/9a9dd222-80a4-4654-97fd-cd110089b5d2)


## Features
- Spotify authentication via OAuth
- Persistent API key storage for future use
- Generates a URL for OBS to display the overlay
- React-based frontend
- Electron and express.js backend

## Requirements
- Node.js (v16+ recommended)
- npm or yarn
- A registered Spotify Developer application

## Installation
```sh
# Clone the repository
git clone https://github.com/boomshakazulu/streaming-overlay-app.git
cd streaming-overlay-app

# Install dependencies
npm install  # or yarn install
```

## Configuration
1. Create a `.env` file in the root directory with the following content:
   ```env
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   ````
2. Replace `your_client_id` and `your_client_secret` with your Spotify Developer credentials.
3. Ensure the redirect URI is added to your Spotify Developer Dashboard (http://localhost:5000/callback).

## Running the App
```sh
npm run develop  # or yarn run develop
```

## Usage
1. Launch the application.
2. Click the **Login** button.
3. Authenticate with your Spotify account.
4. Copy the provided browser URL and add it as a browser source in OBS.

## OBS Integration
- In OBS, add a **Browser Source**.
- Paste the generated URL into the **URL** field.
- Set the width and height according to your needs (recommendations in the app).

## License
MIT License
