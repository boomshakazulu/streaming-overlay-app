import { useEffect, useState } from "react";
import SpotifyStatus from "../../components/spotifyStatus.jsx";

const Home = () => {
  const [token, setToken] = useState(null); // State to store the token

  useEffect(() => {
    const fetchToken = async () => {
      const storedToken = await window.electronAPI.getToken();
      console.log("Stored Token:", storedToken);
      setToken(storedToken); // Update state with the retrieved token
    };

    if (window.electronAPI) {
      fetchToken();
    } else {
      console.warn(
        "Electron API not available. Are you running inside Electron?"
      );
    }
  }, [window.location.search]); // Refetch when the page changes or re-renders

  const handleLogin = () => {
    window.electronAPI.openSpotifyLogin(); // Ask Electron to open the login window
  };

  return (
    <div>
      <h1>Spotify Authentication</h1>
      <SpotifyStatus /> {/* No need to pass isConnected */}
      {/* Only show the login button if the token is not available */}
      {!token && <button onClick={handleLogin}>Login with Spotify</button>}
      {token && <p>Token: {token}</p>} {/* Display the token if available */}
    </div>
  );
};

export default Home;
