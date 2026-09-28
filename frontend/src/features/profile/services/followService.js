import { apiClient, unwrap } from "../../../lib/apiClient";

export const followService = {
  follow: (userId) => unwrap(apiClient.put(`/users/${userId}/follow`)),
  unfollow: (userId) => unwrap(apiClient.delete(`/users/${userId}/follow`)),
  followers: (userId, params) => unwrap(apiClient.get(`/users/${userId}/followers`, { params })),
  following: (userId, params) => unwrap(apiClient.get(`/users/${userId}/following`, { params })),
};

export default followService;
