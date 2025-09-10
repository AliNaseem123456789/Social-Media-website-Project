import React, { useState } from "react";
import axios from "axios";

function SendFriendRequestButton({ currentUserId, otherUserId, onRequestSent }) {
  const [loading, setLoading] = useState(false);

  const handleSendRequest = async () => {
    if (!currentUserId || !otherUserId) return;
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/friends/request", {
        requester_id: currentUserId,
        recipient_id: otherUserId,
      });
      alert(res.data.message);
      // callback to parent to update state
      if (onRequestSent) onRequestSent(res.data.request);
    } catch (err) {
      alert(err.response?.data?.message || "Error sending request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleSendRequest} disabled={loading}>
      {loading ? "Sending..." : "Send Friend Request"}
    </button>
  );
}

export default SendFriendRequestButton;
