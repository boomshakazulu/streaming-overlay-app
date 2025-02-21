import { useEffect, useState } from "react";
import SpotifyStatus from "../../components/spotifyStatus.jsx";
import CopyButton from "../../components/copyToClipboard/index.jsx";

const Home = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [electronReady, setElectronReady] = useState(false);

  const handleLogin = () => {
    window.electronAPI.openSpotifyLogin(); // Ask Electron to open the login window
  };

  useEffect(() => {
    const handleRefresh = () => {
      console.log("Refreshing the homepage...");
      window.location.reload();
    };

    // Add event listener for refresh-home-page
    window.electronAPI.on("refresh-home-page", handleRefresh);

    // Cleanup event listener when component unmounts
    return () => {
      window.electronAPI.removeListener("refresh-home-page", handleRefresh);
    };
  }, []);

  useEffect(() => {
    // Check if the Electron API is available
    const checkElectronAPI = () => {
      if (window.electronAPI) {
        setElectronReady(true); // Electron API is ready
      }
    };

    // Initially check for Electron availability
    checkElectronAPI();

    // Watch for when Electron API becomes available
    const interval = setInterval(() => {
      checkElectronAPI();
    }, 100);

    // Cleanup interval once the API is available
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (electronReady && window.electronAPI) {
      const handleConnectionStatus = (event, status) => {
        console.log("Connection status:", status);
        setIsConnected(status); // Update connection status
      };

      // Listen for connection status updates from Electron
      window.electronAPI.onSpotifyConnectionStatus(handleConnectionStatus);

      // Request a connection status check when the component mounts
      window.electronAPI.checkSpotifyConnection(); // Send request to check connection status

      // Cleanup the event listener when the component is unmounted
      return () => {
        window.electronAPI.removeSpotifyConnectionListener(
          handleConnectionStatus
        );
      };
    }
  }, [electronReady]);

  return (
    <div>
      <h1>Spotify Authentication</h1>
      {/* Only show the login button if the token is not available */}
      <SpotifyStatus isConnected={isConnected} />
      {isConnected ? (
        <div>
          <p>Copy your browser overlay URL</p>
          <CopyButton text="http://localhost:5173/spotify-overlay" />
          <p>Add a new browser source in OBS and paste in the copied url</p>
          <p>Use width: 550, Height: 150</p>
        </div>
      ) : (
        <button onClick={handleLogin}>Login with Spotify</button>
      )}
    </div>
  );
};

export default Home;
