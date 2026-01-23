import apiClient from "../../../api/apiClient";
import { io } from "socket.io-client";

export const socket = io("https://social-media-website-project.onrender.com");

export const chatService = {
  getRecipientInfo: async (userId) => {
    const res = await apiClient.get(`/users/${userId}`);
    return res.data;
  },
  getRecentChats: async (userId) => {
    const response = await apiClient.get(`/recentchat/${userId}`);
    return response.data;
  },
  getChatHistory: async (user1, user2) => {
    const res = await apiClient.get(`/chat/${user1}/${user2}`);
    return res.data;
  },

  registerUser: (userId) => {
    socket.emit("register", userId);
  },
};
