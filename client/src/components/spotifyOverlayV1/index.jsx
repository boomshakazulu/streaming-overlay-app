import { useState, useEffect } from "react";
import "./style.css";

const SpotifyOverlayV1 = () => {
  const [songInfo, setSongInfo] = useState(null);
  const [albumArtStyle, setAlbumArtStyle] = useState({ left: "-100px" });
  const [discStyle, setDiscStyle] = useState({ left: "-100px", opacity: 0 });
  const [overlayStyle, setOverlayStyle] = useState({
    left: "-100px",
    opacity: 0,
  });
  const [songOpacity, setSongOpacity] = useState(0);
  const [accessToken, setAccessToken] = useState(null);

  const fetchToken = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/token");
      const data = await response.json();
      setAccessToken(data.token);
      console.log("Token from Electron:", data);
    } catch (error) {
      console.error("Error fetching token:", error);
    }
  };

  useEffect(() => {
    fetchToken(); // Initial fetch when the component mounts
  }, []);

  useEffect(() => {
    if (!accessToken) return; // Wait until the access token is available

    const fetchCurrentlyPlaying = async () => {
      let retryCount = 0; // Track the number of retries
      const maxRetries = 5; // Set a maximum retry limit
      const retryDelay = 1000; // Initial delay before retrying in milliseconds

      try {
        const response = await fetch(
          "https://api.spotify.com/v1/me/player/currently-playing",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (response.status === 204) {
          setSongInfo(null); // No song playing
          return;
        }

        if (response.status === 401) {
          // Token expired or invalid
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`401 error: Retrying (${retryCount}/${maxRetries})...`);
            await new Promise((resolve) => setTimeout(resolve, retryDelay)); // Delay before retry
            await fetchToken(); // Fetch new token and retry
            return fetchCurrentlyPlaying(); // Retry with new token
          } else {
            console.error("Max retry attempts reached for 401 error.");
            // Optionally handle max retries exceeded (e.g., show an error message)
            return;
          }
        }

        const data = await response.json();
        if (!data || !data.item) return;

        // Only start the song if there's no current song
        if (!songInfo) {
          setSongInfo(data.item);
          startSong(data.item);
        } else {
          // If the song is different, move to the next song
          if (songInfo.id !== data.item.id) {
            nextSong(data.item);
          }
        }
      } catch (error) {
        console.error("Error fetching currently playing song:", error);
      }
    };

    fetchCurrentlyPlaying();
    const interval = setInterval(fetchCurrentlyPlaying, 5000);

    return () => clearInterval(interval);
  }, [accessToken, songInfo]); // Add songInfo to the dependency array

  //   const reset = () => {
  //     setSongOpacity(0);
  //     setAlbumArtStyle({ left: "-100px", filter: "none" });
  //     setDiscStyle({ left: "-100px", opacity: 0 });
  //     setOverlayStyle({ left: "-100px", opacity: 0 });
  //   };

  const startSong = (song) => {
    const imgurl = `url('${song?.album?.images[0]?.url}')`;

    // Start the song animations after initial state setup
    setAlbumArtStyle({ backgroundImage: imgurl, left: "-100px" });
    setDiscStyle({ left: "-100px", opacity: 0 });
    setOverlayStyle({ left: "-100px", opacity: 0 });

    // Trigger animations with delays
    setTimeout(() => {
      setAlbumArtStyle((prevStyle) => ({ ...prevStyle, left: "18px" }));
      setOverlayStyle({ left: "18px", opacity: 80 });
    }, 100);

    setTimeout(() => {
      setSongOpacity(100);
    }, 1500);

    setTimeout(() => {
      setDiscStyle({
        left: "50px",
        opacity: 1,
        transition:
          "left 1s cubic-bezier(0,0.9,0.3,1), opacity 1s, transform 1s",
      });
    }, 2000);
  };

  const endSong = () => {
    setAlbumArtStyle({ left: "-100px", filter: "none" });
    setDiscStyle({ left: "-100px", opacity: 0 });
    setOverlayStyle({ left: "-100px", opacity: 0 });
    setSongOpacity(0);

    setTimeout(() => {
      setSongInfo(null);
    }, 2500);
  };

  const nextSong = (song) => {
    endSong(); // End the current song's animation
    // setTimeout(() => {
    //   reset(); // Reset the state
    // }, 1000);
    // Increase timeout to allow animation to complete before starting the next song
    setTimeout(() => {
      startSong(song); // Start the new song's animation after a delay
    }, 2500); // Ensure this is long enough for the "endSong" animations to complete
  };

  console.log(songInfo);

  return (
    <div id="spotifyV1-main-container">
      <div id="container"></div>
      <div id="music">
        <div
          id="album-overlay"
          style={{
            ...overlayStyle,
            transition: "left 2s cubic-bezier(0,0.9,0.3,1), opacity 2s",
          }}
        />
        <div
          id="album-art"
          style={{
            ...albumArtStyle,
            transition: "left 1s cubic-bezier(0,0.9,0.3,1), filter 2s",
          }}
        />
        <div
          id="disc"
          style={{
            ...discStyle,
            transition:
              "left 1s cubic-bezier(0,0.9,0.3,1), opacity 1s, transform 1s",
          }}
        />
        <div
          id="song-info"
          style={{
            opacity: songOpacity,
            transition: "opacity 1s cubic-bezier(0,0.9,0.3,1)",
          }}
        >
          {songInfo && (
            <div id="song-info-container">
              <p>{songInfo.name}</p>
              <p>{songInfo.artists.map((artist) => artist.name).join(", ")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpotifyOverlayV1;
