import axios from "axios";

// const apiClient = axios.create({
//   //   baseURL: "https://social-media-website-project.onrender.com/api",
//   baseURL: "http://localhost:5000/api",
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// export default apiClient;
const apiClient = axios.create({
  // baseURL: "http://localhost:5000/api",
  baseURL: "https://social-media-website-project.onrender.com/api",
  withCredentials: true, // Add this if you want to support cookies/sessions
  headers: {
    "Content-Type": "application/json",
  },
});
export default apiClient;
