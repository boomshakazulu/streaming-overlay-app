import { useState } from "react";
import PropTypes from "prop-types";

function CopyButton({ text }) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return <button onClick={handleCopy}>{isCopied ? "Copied!" : "Copy"}</button>;
}

CopyButton.propTypes = {
  text: PropTypes.string.isRequired,
};

export default CopyButton;
