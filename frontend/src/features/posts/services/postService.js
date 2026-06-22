import apiClient from "../../../api/apiClient";
export const postService = {
getFeed: async (first = 10, after = null) => {
  const query = `
    query GetFeed($first: Int, $after: String) {
      getFeed(first: $first, after: $after) {
        edges {
          node {
            post_id
            user_id
            content
            image_url
            total_likes
            liked
            username
            avatar_url 
            created_at
            comments {
              comment_id
              comment_text
              users {
                username
              }
            }
          }
          cursor
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;
  
  const variables = { first, after };
  const response = await apiClient.post("/graphql", { query, variables });
  return response.data.data.getFeed;
},
getChronologicalFeed: async (first = 10, after = null) => {
    const query = `
        query GetChronologicalFeed($first: Int, $after: String) {
            getChronologicalFeed(first: $first, after: $after) {
                edges {
                    node {
                        post_id
                        user_id
                        content
                        image_url
                        total_likes
                        liked
                        username
                        avatar_url 
                        created_at
                        comments {
                            comment_id
                            comment_text
                            users {
                                username
                            }
                        }
                    }
                    cursor
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
    `;
    
    const variables = { first, after };
    const response = await apiClient.post("/graphql", { query, variables });
    return response.data.data.getChronologicalFeed;
},
getForYouFeed: async (first = 10, after = null) => {
    const query = `
        query GetGlobalFeed($first: Int, $after: String) {
            getGlobalFeed(first: $first, after: $after) {
                edges {
                    node {
                        post_id
                        user_id
                        content
                        image_url
                        total_likes
                        liked
                        username
                        avatar_url 
                        created_at
                        comments {
                            comment_id
                            comment_text
                            users {
                                username
                            }
                        }
                    }
                    cursor
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
    `;
    
    const variables = { first, after };
    const response = await apiClient.post("/graphql", { query, variables });
    return response.data.data.getGlobalFeed;
},


    likePost: async (postId) => {
    const response = await apiClient.post("/posts/like", {
      post_id: postId,
    });
    return response.data;
  },
  getForYouFeed: async (first = 10, after = null) => {
    const query = `
        query GetGlobalFeed($first: Int, $after: String) {
            getGlobalFeed(first: $first, after: $after) {
                edges {
                    node {
                        post_id
                        user_id
                        content
                        image_url
                        total_likes
                        liked
                        username
                        avatar_url 
                        created_at
                        comments {
                            comment_id
                            comment_text
                            users {
                                username
                            }
                        }
                    }
                    cursor
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
    `;
    
    const variables = { first, after };
    const response = await apiClient.post("/graphql", { query, variables });
    return response.data.data.getGlobalFeed;
},

 getUserPosts: async (cursor = null, limit = 10, sort = 'recent', time = 'all', contentType = 'all', minLikes = 0) => {
    let url = `/posts/myposts?limit=${limit}&sort=${sort}&time=${time}&content_type=${contentType}&min_likes=${minLikes}`;
    if (cursor) {
      url += `&cursor=${encodeURIComponent(cursor)}`;
    }
    const response = await apiClient.get(url);
    if (response.data && response.data.data) {
      return response.data;
    }
    return response.data;
  },
    getFullPost: async (postId) => {
    const response = await apiClient.get(`/posts/fullpost/${postId}`);
    return response.data;
  },
  addComment: async (postId, commentText) => {
    const response = await apiClient.post(`/posts/comment`, {
      post_id: postId,
      comment_text: commentText,
    });
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