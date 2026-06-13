import DataLoader from 'dataloader';
import supabase from '../supabaseClient.js';
export const createCommentLoader = () => {
  return new DataLoader(async (postIds) => {
    console.log(`Batching ${postIds.length} post IDs for comments`);    
    const { data: comments, error } = await supabase
      .from("comments")
      .select("*, users(username)")
      .in("post_id", postIds)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error('Error loading comments:', error);
      return postIds.map(() => []);
    }
    
    // Group comments by post_id
    const commentsByPostId = {};
    comments.forEach(comment => {
      if (!commentsByPostId[comment.post_id]) {
        commentsByPostId[comment.post_id] = [];
      }
      commentsByPostId[comment.post_id].push(comment);
    });
    
    // Return in same order as requested
    return postIds.map(id => commentsByPostId[id] || []);
  });
};

// DataLoader for users (batches by user_id)
export const createUserLoader = () => {
  return new DataLoader(async (userIds) => {
    console.log(`📦 Batching ${userIds.length} user IDs`);
    
    const { data: users, error } = await supabase
      .from("users")
      .select("user_id, username, email, user_profiles(profile_image)")
      .in("user_id", userIds);
    
    if (error) {
      console.error('Error loading users:', error);
      return userIds.map(() => null);
    }
    
    // Create map for O(1) lookup
    const userMap = {};
    users.forEach(user => {
      userMap[user.user_id] = user;
    });
    
    return userIds.map(id => userMap[id] || null);
  });
};

// DataLoader for like status (does current user like each post?)
export const createLikeStatusLoader = (currentUserId) => {
  return new DataLoader(async (postIds) => {
    console.log(`📦 Batching ${postIds.length} post IDs for like status`);
    
    const { data: likes, error } = await supabase
      .from("likes")
      .select("post_id")
      .in("post_id", postIds)
      .eq("user_id", currentUserId);
    
    if (error) {
      console.error('Error loading likes:', error);
      return postIds.map(() => false);
    }
    
    const likedPostIds = new Set(likes.map(like => like.post_id));
    
    return postIds.map(id => likedPostIds.has(id));
  });
};

// DataLoader for comment count
export const createCommentCountLoader = () => {
  return new DataLoader(async (postIds) => {
    console.log(`📦 Batching ${postIds.length} post IDs for comment counts`);
    
    const { data: counts, error } = await supabase
      .from("comments")
      .select("post_id", { count: 'exact', head: true })
      .in("post_id", postIds);
    
    if (error) {
      console.error('Error loading comment counts:', error);
      return postIds.map(() => 0);
    }
    
    // This is simplified - you might need a proper count query
    // Supabase doesn't support count in select directly
    const countMap = {};
    for (const postId of postIds) {
      const { count } = await supabase
        .from("comments")
        .select("*", { count: 'exact', head: true })
        .eq("post_id", postId);
      countMap[postId] = count;
    }
    
    return postIds.map(id => countMap[id] || 0);
  });
};