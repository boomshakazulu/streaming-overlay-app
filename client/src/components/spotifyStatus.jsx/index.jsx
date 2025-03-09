import PropTypes from "prop-types";

function SpotifyStatus({ isConnected }) {
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

SpotifyStatus.propTypes = {
  isConnected: PropTypes.boolean,
};
export default SpotifyStatus;
