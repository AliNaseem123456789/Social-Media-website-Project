import apiClient from "../../../api/apiClient";

export const postService = {
  getFeed: async () => {
    const response = await apiClient.get("/posts");
    const postsData = response.data;

    const postsWithComments = await Promise.all(
      postsData.map(async (post) => {
        try {
          const fullPostRes = await apiClient.get(`/posts/fullpost/${post.id}`);
          return { ...post, comments: fullPostRes.data.comments || [] };
        } catch {
          return { ...post, comments: [] };
        }
      }),
    );
    return postsWithComments;
  },
  likePost: async (userId, postId) => {
    const response = await apiClient.post("/posts/like", {
      user_id: userId,
      post_id: postId,
    });
    return response.data;
  },
  getUserPosts: async (userId) => {
    const response = await apiClient.get(`/posts/myposts/${userId}`);
    return response.data;
  },
  getFullPost: async (postId) => {
    const response = await apiClient.get(`/posts/fullpost/${postId}`);
    return response.data;
  },

  addComment: async (commentData) => {
    const response = await apiClient.post(`/posts/comment`, commentData);
    return response.data;
  },

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    const response = await apiClient.post("/posts/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.url;
  },
  createPost: async (postData) => {
    const response = await apiClient.post("/posts", postData);
    return response.data;
  },
};
