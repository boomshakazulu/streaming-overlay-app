import { useState } from "react";

const ClearCache = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleClearCache = async () => {
    setLoading(true);
    setMessage("");
    try {
      await window.electronAPI.clearCache();
      setMessage("Cache and store cleared successfully.");
    } catch (error) {
      console.error("Failed to clear cache or store:", error);
      setMessage("Failed to clear cache or store.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleClearCache} disabled={loading}>
        {loading ? "Clearing..." : "Clear Cache & Store"}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default ClearCache;
