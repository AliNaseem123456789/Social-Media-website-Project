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
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});
export default apiClient;
