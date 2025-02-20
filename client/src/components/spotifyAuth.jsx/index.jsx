import { useEffect } from "react";

function SpotifyAuth() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    console.log("URL Params:", urlParams); // Log to check if tokens are being passed
    const accessToken = urlParams.get("access_token");
    const refreshToken = urlParams.get("refresh_token");

    if (accessToken && refreshToken) {
      window.electronAPI.storeToken({ accessToken, refreshToken });
      window.close();
    }
  }, []);

  return <div>Spotify Authentication in progress...</div>;
}

export default SpotifyAuth;
