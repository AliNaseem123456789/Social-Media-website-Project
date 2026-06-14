// services/chatService.js - MAKE SURE NO PARAMETERS

import apiClient from "../../../api/apiClient";
import { io } from "socket.io-client";

// export const socket = io("https://social-media-website-project.onrender.com", {
//   withCredentials: true,
// });
// export const socket = io("http://localhost:5000", { withCredentials: true });
export const socket = io("http://54.221.66.183:5000", { withCredentials: true });

export const chatService = {
  getRecipientInfo: async (userId) => {
    const res = await apiClient.get(`/users/${userId}`);
    return res.data;
  },
  
  // NO parameter - server gets userId from session
  getRecentChats: async () => {
    const response = await apiClient.get(`/recentchat`);
    return response.data;
  },
  
  // Only need other user's ID
  getChatHistory: async (otherUserId) => {
    const res = await apiClient.get(`/chat/${otherUserId}`);
    return res.data;
  },

  // NO parameter - server gets userId from session
  registerUser: () => {
    socket.emit("register");
  },
};