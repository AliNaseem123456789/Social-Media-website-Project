import axios from "axios";

const apiClient = axios.create({
// baseURL: "http://54.221.66.183:5000/api",
// baseURL: "http://54.221.66.183/api",
baseURL: "https://my-social-app.duckdns.org/api",
  // baseURL: "http://localhost:5000/api",
  // baseURL: "https://social-media-website-project-c6la.onrender.com/api",
  // baseURL: "https://social-media-website-project.onrender.com/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});
export default apiClient;
