import React, { useState } from "react";
import { Button } from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { friendService } from "../services/friendsService";

function SendFriendRequestButton({
  currentUserId,
  otherUserId,
  onRequestSent,
}) {
  const [loading, setLoading] = useState(false);

  const handleSendRequest = async () => {
    if (!currentUserId || !otherUserId) return;

    setLoading(true);
    try {
      const data = await friendService.sendRequest(currentUserId, otherUserId);

      // Using a console log or custom snackbar is usually better than alert
      alert(data.message);

      if (onRequestSent) {
        onRequestSent(data.request);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Error sending request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="contained"
      color="primary"
      startIcon={<PersonAddIcon />}
      onClick={handleSendRequest}
      disabled={loading || currentUserId === otherUserId}
      sx={{ borderRadius: "20px", textTransform: "none", fontWeight: 600 }}
    >
      {loading ? "Sending..." : "Add Friend"}
    </Button>
  );
}

export default SendFriendRequestButton;
