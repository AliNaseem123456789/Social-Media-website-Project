import apiClient from "../../../api/apiClient";

export const postService = {
  getFeed: async (userId) => {
    const query = `
      query GetFeed($userId: ID!) {
        getFeed(userId: $userId) {
          post_id
          user_id
          content
          image_url
          total_likes
          username
          created_at  # <--- CRITICAL: Request this field
          comments {
            comment_id
            comment_text
            users {
              username
            }
          }
        }
      }
    `;

    const response = await apiClient.post("/graphql", {
      // Ensure path matches server
      query,
      variables: { userId },
    });

    return response.data.data.getFeed;
  },
  likePost: async (userId, postId) => {
    const response = await apiClient.post("/posts/like", {
      user_id: userId,
      post_id: postId,
    });
    return response.data;
  },
  // getFeed: async () => {
  //   const response = await apiClient.get("/posts");
  //   const postsData = response.data;

  //   const postsWithComments = await Promise.all(
  //     postsData.map(async (post) => {
  //       try {
  //         const fullPostRes = await apiClient.get(`/posts/fullpost/${post.id}`);
  //         return { ...post, comments: fullPostRes.data.comments || [] };
  //       } catch {
  //         return { ...post, comments: [] };
  //       }
  //     }),
  //   );
  //   return postsWithComments;
  // },
  // likePost: async (userId, postId) => {
  //   const response = await apiClient.post("/posts/like", {
  //     user_id: userId,
  //     post_id: postId,
  //   });
  //   return response.data;
  // },
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
