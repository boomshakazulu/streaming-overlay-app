import { useEffect, useState } from "react";

function SpotifyStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [electronReady, setElectronReady] = useState(false);
  console.log(isConnected);
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
      {isConnected ? (
        <p>You are connected to Spotify!</p>
      ) : (
        <p>No connection to Spotify.</p>
      )}
    </div>
  );
}

export default SpotifyStatus;
