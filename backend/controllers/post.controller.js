import supabase from "../supabaseClient.js";
import Redis from "ioredis";
import EmailPublisher from "../services/EmailPublisher.js";
import EventOrchestrator from "../services/orchestrators/EventOrchestrators.js";

// Create ioredis instance
const redis = new Redis("rediss://default:gQAAAAAAAffMAAIgcDJlNzNmNzUxZDVhNDk0MGJlYjdkNDVhNjQ1MDU5Y2U4ZQ@humorous-troll-128972.upstash.io:6379");

/**
 * Delete all keys matching a pattern using ioredis scanStream
 * Uses SCAN to avoid blocking Redis
 */
async function deleteKeysByPattern(prefix) {
  try {
    const pattern = `${prefix}*`;
    const keysToDelete = [];
    const batchSize = 1000;
    
    // ioredis scanStream
    const stream = redis.scanStream({ 
      match: pattern, 
      count: 100
    });
    
    for await (const keys of stream) {
      if (keys && keys.length) {
        keysToDelete.push(...keys);
        
        // Delete in batches
        if (keysToDelete.length >= batchSize) {
          await redis.del(...keysToDelete);
          console.log(`Invalidated ${keysToDelete.length} keys matching ${pattern} (batch)`);
          keysToDelete.length = 0;
        }
      }
    }
    
    // Delete remaining keys
    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
      console.log(`Invalidated ${keysToDelete.length} keys matching ${pattern}`);
    }
  } catch (error) {
    console.error(`Error invalidating keys with prefix ${prefix}:`, error);
  }
}

/**
 * Delete specific cache keys with error handling
 */
async function invalidateCacheKeys(...keys) {
  try {
    const validKeys = keys.filter(key => key);
    if (validKeys.length > 0) {
      await redis.del(...validKeys);
      console.log(`Invalidated ${validKeys.length} specific cache keys`);
    }
  } catch (error) {
    console.error('Error invalidating cache keys:', error);
  }
}

/**
 * Invalidate all caches related to a user's posts
 */
async function invalidateUserPostCaches(userId, postId = null) {
  const promises = [];
  
  promises.push(deleteKeysByPattern(`user:posts:${userId}`));
  
  if (postId) {
    promises.push(invalidateCacheKeys(`post:full:${postId}`));
  }
  
  promises.push(deleteKeysByPattern('global:feed:*'));
  promises.push(deleteKeysByPattern('recent:chats:*'));
  promises.push(deleteKeysByPattern(`user:feed:${userId}:*`));
  promises.push(deleteKeysByPattern(`user:likes:${userId}:*`));
  
  // Fire and forget
  Promise.allSettled(promises)
    .then(results => {
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        console.error(`${failed.length} cache invalidation operations failed`);
      }
    })
    .catch(console.error);
}

// ============= CONTROLLERS =============

export const createPost = async (req, res) => {
  const userId = req.session?.userId;
  const { content, image_url } = req.body;
  
  if (!userId) {
    return res.status(401).json({ 
      success: false, 
      message: "Not authenticated" 
    });
  }
  
  if (!content && !image_url) {
    return res.status(400).json({ 
      success: false, 
      message: "Post must have content or an image" 
    });
  }
  
  try {
    const { data, error } = await supabase
      .from("posts")
      .insert([{ user_id: userId, content, image_url: image_url || null }])
      .select("post_id, content, created_at, image_url")
      .single();
      
    if (error) throw error;
    
    // Invalidate ALL caches
    invalidateUserPostCaches(userId);
    
    res.json({ 
      success: true, 
      message: "Post created", 
      post: data 
    });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};

export const getPosts = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select(
        "post_id,user_id, content, created_at, total_likes, users(username)",
      )
      .order("created_at", { ascending: false });
      
    if (error) throw error;
    
    const posts = data.map((post) => ({
      id: post.post_id,
      user_id: post.user_id,
      content: post.content,
      created_at: post.created_at,
      total_likes: post.total_likes || 0,
      username: post.users?.username || "Unknown",
    }));
    
    res.json(posts);
  } catch (err) {
    console.error('Get posts error:', err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};

export const likePost = async (req, res) => {
  const userId = req.session?.userId;
  const { post_id } = req.body;
  
  if (!userId) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }
  
  if (!post_id) {
    return res.status(400).json({ success: false, message: "Post ID required" });
  }

  try {
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("user_id")
      .eq("post_id", post_id)
      .single();
    
    if (postError) throw postError;

    const { data: existingLike } = await supabase
      .from("likes")
      .select("like_id")
      .eq("user_id", userId)
      .eq("post_id", post_id)
      .maybeSingle();
    
    if (existingLike) {
      await supabase.from("likes").delete().eq("like_id", existingLike.like_id);

      const { count } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", post_id);

      const { data: updatedPost } = await supabase
        .from("posts")
        .update({ total_likes: count ?? 0 })
        .eq("post_id", post_id)
        .select("total_likes")
        .single();

      return res.json({ success: true, total_likes: updatedPost.total_likes, liked: false });

    } else {
      await supabase.from("likes").insert([{ user_id: userId, post_id }]);

      const { count } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", post_id);

      const { data: updatedPost } = await supabase
        .from("posts")
        .update({ total_likes: count ?? 0 })
        .eq("post_id", post_id)
        .select("total_likes")
        .single();

      if (post.user_id !== userId) {
        const { data: postOwner } = await supabase
          .from("users")
          .select("email, username")
          .eq("id", post.user_id)
          .single();

        if (postOwner) {
          await EventOrchestrator.onPostLiked(
            post_id,
            post.user_id,
            userId,
            req.session.username,
            postOwner.email,
            postOwner.username
          ).catch(console.error);
        }
      }

      return res.json({ success: true, total_likes: updatedPost.total_likes, liked: true });
    }

  } catch (err) {
    console.error('Like post error:', err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};

export const getFullPost = async (req, res) => {
  const start = Date.now();
  const { id } = req.params;
  const cacheKey = `post:full:${id}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const duration = Date.now() - start;
      console.log(`FULL POST CACHE HIT - ${duration}ms`);
      return res.json(JSON.parse(cached));
    }

    const { data, error } = await supabase
      .from("posts")
      .select(
        `post_id, content, image_url, created_at, total_likes, user_id, users(username),
         comments(comment_id, comment_text, created_at, user_id, users(username))`,
      )
      .eq("post_id", Number(id))
      .single();

    if (error) throw error;

    let authorAvatar = null;
    const { data: authorProfile } = await supabase
      .from("user_profiles")
      .select("profile_image")
      .eq("user_id", data.user_id)
      .maybeSingle();
    if (authorProfile?.profile_image) {
      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(authorProfile.profile_image);
      authorAvatar = publicUrlData.publicUrl;
    }

    const commentUserIds = [
      ...new Set((data.comments || []).map((c) => c.user_id).filter(Boolean)),
    ];
    let commentAvatarByUserId = {};
    if (commentUserIds.length > 0) {
      const { data: commentProfiles } = await supabase
        .from("user_profiles")
        .select("user_id, profile_image")
        .in("user_id", commentUserIds);

      (commentProfiles || []).forEach((p) => {
        if (p.profile_image) {
          const { data: publicUrlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(p.profile_image);
          commentAvatarByUserId[p.user_id] = publicUrlData.publicUrl;
        }
      });
    }

    const post = {
      id: data.post_id,
      content: data.content,
      image_url: data.image_url,
      created_at: data.created_at,
      total_likes: data.total_likes || 0,
      username: data.users?.username || "Unknown",
      avatar_url: authorAvatar,
      profile_image: authorAvatar,
      comments: (data.comments || []).map((c) => ({
        comment_id: c.comment_id,
        comment_text: c.comment_text,
        created_at: c.created_at,
        username: c.users?.username || "Unknown",
        profile_image: commentAvatarByUserId[c.user_id] || null,
      })),
    };

    await redis.setex(cacheKey, 300, JSON.stringify(post));

    const totalTime = Date.now() - start;
    console.log(`FULL POST CACHED - Total: ${totalTime}ms`);

    res.json(post);

  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};

export const addComment = async (req, res) => {
  const userId = req.session?.userId;
  const { post_id, comment_text } = req.body;
  
  if (!userId) {
    return res.status(401).json({ 
      success: false, 
      message: "Not authenticated" 
    });
  }
  
  if (!post_id || !comment_text) {
    return res.status(400).json({ 
      success: false, 
      message: "Post ID and comment text required" 
    });
  }
  
  try {
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("user_id")
      .eq("post_id", post_id)
      .single();
    
    if (postError) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    
    const { data: comment, error: commentError } = await supabase
      .from("comments")
      .insert([{ post_id, comment_text, user_id: userId }])
      .select("comment_id, comment_text, created_at, users(username)")
      .single();
      
    if (commentError) throw commentError;
    
    if (post.user_id !== userId) {
      const { data: postOwner } = await supabase
        .from("users")
        .select("email, username")
        .eq("id", post.user_id)
        .single();
      
      const { data: commenter } = await supabase
        .from("users")
        .select("username")
        .eq("id", userId)
        .single();
      
      if (postOwner && commenter) {
        const { data: postContent } = await supabase
          .from("posts")
          .select("content")
          .eq("post_id", post_id)
          .single();
        
        const postPreview = postContent?.content 
          ? (postContent.content.substring(0, 100) + (postContent.content.length > 100 ? '...' : ''))
          : 'a post';
        
        EmailPublisher.sendCommentNotification({
          to: postOwner.email,
          recipientName: postOwner.username,
          commenterName: commenter.username,
          commentText: comment_text,
          postLink: `${process.env.APP_URL || 'http://localhost:3000'}/posts/${post_id}`,
          postPreview: postPreview
        }).catch(err => console.error('Failed to queue comment email:', err.message));
      }
    }
    
    // Clear cache
    invalidateUserPostCaches(userId, post_id);
    
    res.json({ success: true, comment: comment });
    
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};

export const getMyPosts = async (req, res) => {
  const start = Date.now();
  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }
  
  const limit = parseInt(req.query.limit) || 20;
  const validLimit = Math.min(Math.max(limit, 1), 50);
  const cursor = req.query.cursor;

  const sortBy = req.query.sort || 'recent';
  const timeFilter = req.query.time || 'all';
  const contentType = req.query.content_type || 'all';
  const minLikes = parseInt(req.query.min_likes) || 0;

  const cacheKey = `user:posts:${userId}:sort:${sortBy}:time:${timeFilter}:type:${contentType}:minLikes:${minLikes}:cursor:${cursor || 'start'}:limit:${validLimit}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`CACHE HIT - User ${userId} - ${sortBy} sort`);
      return res.json(JSON.parse(cached));
    }

    console.log(`CACHE MISS - User ${userId} - Fetching from DB`);

    const { data: profileRow } = await supabase
      .from("user_profiles")
      .select("profile_image")
      .eq("user_id", Number(userId))
      .maybeSingle();

    let avatarUrl = null;
    if (profileRow?.profile_image) {
      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(profileRow.profile_image);
      avatarUrl = publicUrlData.publicUrl;
    }

    let query = supabase
      .from("posts")
      .select(
        `post_id, content, image_url, created_at, total_likes, users(username), 
         comments(comment_id, comment_text, created_at, users(username))`
      )
      .eq("user_id", Number(userId))
      .limit(validLimit + 1);

    if (timeFilter !== 'all') {
      const now = new Date();
      let fromDate;
      switch(timeFilter) {
        case 'week':
          fromDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          fromDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          fromDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }
      query = query.gte('created_at', fromDate.toISOString());
    }

    if (contentType === 'image') {
      query = query.not('image_url', 'is', null);
    } else if (contentType === 'text') {
      query = query.is('image_url', null);
    }

    if (minLikes > 0) {
      query = query.gte('total_likes', minLikes);
    }

    switch(sortBy) {
      case 'likes':
        query = query.order('total_likes', { ascending: false })
                     .order('created_at', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'recent':
      default:
        query = query.order('created_at', { ascending: false });
    }

    if (cursor) {
      const decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString());
      if (sortBy === 'recent') {
        query = query.lt('created_at', decodedCursor.created_at);
      } else if (sortBy === 'oldest') {
        query = query.gt('created_at', decodedCursor.created_at);
      } else if (sortBy === 'likes') {
        query = query.or(
          `total_likes.lt.${decodedCursor.total_likes},` +
          `and(total_likes.eq.${decodedCursor.total_likes},created_at.lt.${decodedCursor.created_at})`
        );
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    let hasMore = false;
    let posts = data || [];
    let nextCursor = null;

    if (posts.length > validLimit) {
      hasMore = true;
      posts = posts.slice(0, validLimit);
      const lastPost = posts[posts.length - 1];

      if (sortBy === 'likes') {
        nextCursor = Buffer.from(JSON.stringify({
          total_likes: lastPost.total_likes,
          created_at: lastPost.created_at
        })).toString('base64');
      } else {
        nextCursor = Buffer.from(JSON.stringify({
          created_at: lastPost.created_at
        })).toString('base64');
      }
    }

    const formattedPosts = posts.map((p) => ({
      id: p.post_id,
      content: p.content,
      image_url: p.image_url,
      created_at: p.created_at,
      total_likes: p.total_likes || 0,
      username: p.users?.username || "Unknown",
      avatar_url: avatarUrl,
      profile_image: avatarUrl,
      comment_count: p.comments?.length || 0,
      comments: p.comments?.map(comment => ({
        comment_id: comment.comment_id,
        comment_text: comment.comment_text,
        created_at: comment.created_at,
        username: comment.users?.username || "Unknown"
      })) || [],
    }));

    const response = {
      success: true,
      data: formattedPosts,
      pagination: {
        hasMore: hasMore,
        nextCursor: nextCursor,
        currentCount: formattedPosts.length,
        limit: validLimit
      },
      filters_applied: {
        sort: sortBy,
        time: timeFilter,
        content_type: contentType,
        min_likes: minLikes
      }
    };
    
    await redis.setex(cacheKey, 180, JSON.stringify(response));

    const totalTime = Date.now() - start;
    console.log(`My Posts API - User ${userId} - ${formattedPosts.length} posts - ${totalTime}ms`);

    res.json(response);

  } catch (err) {
    console.error('Get my posts error:', err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};

export const getLikedPosts = async (req, res) => {
  const start = Date.now();
  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  const limit = parseInt(req.query.limit) || 20;
  const validLimit = Math.min(Math.max(limit, 1), 50);
  const cursor = req.query.cursor;

  const sortBy = req.query.sort || 'recent';
  const timeFilter = req.query.time || 'all';
  const contentType = req.query.content_type || 'all';
  const minLikes = parseInt(req.query.min_likes) || 0;

  const cacheKey = `user:likes:${userId}:sort:${sortBy}:time:${timeFilter}:type:${contentType}:minLikes:${minLikes}:cursor:${cursor || 'start'}:limit:${validLimit}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`LIKED POSTS CACHE HIT - User ${userId}`);
      return res.json(JSON.parse(cached));
    }

    console.log(`LIKED POSTS CACHE MISS - User ${userId}`);

    let query = supabase
      .from("likes")
      .select(`
        post_id,
        posts:post_id (
          post_id,
          content,
          image_url,
          created_at,
          total_likes,
          user_id,
          users:user_id (username),
          comments (comment_id, comment_text, created_at, users (username))
        )
      `)
      .eq("user_id", Number(userId))
      .order("created_at", { ascending: false })
      .limit(validLimit + 1);

    if (timeFilter !== 'all') {
      const now = new Date();
      let fromDate;
      switch(timeFilter) {
        case 'week':
          fromDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          fromDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          fromDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }
      query = query.gte('created_at', fromDate.toISOString());
    }

    if (cursor) {
      const decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString());
      query = query.lt('created_at', decodedCursor.created_at);
    }

    const { data: likedData, error } = await query;

    if (error) throw error;

    let hasMore = false;
    let posts = [];
    let nextCursor = null;

    if (likedData.length > validLimit) {
      hasMore = true;
      likedData.pop();
    }

    const rawPosts = likedData
      .map(item => item.posts)
      .filter(post => post !== null);

    let filteredPosts = rawPosts;
    if (contentType === 'image') {
      filteredPosts = rawPosts.filter(p => p.image_url !== null);
    } else if (contentType === 'text') {
      filteredPosts = rawPosts.filter(p => p.image_url === null);
    }

    if (minLikes > 0) {
      filteredPosts = filteredPosts.filter(p => (p.total_likes || 0) >= minLikes);
    }

    switch(sortBy) {
      case 'likes':
        filteredPosts.sort((a, b) => (b.total_likes || 0) - (a.total_likes || 0));
        break;
      case 'oldest':
        filteredPosts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'recent':
      default:
        filteredPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    if (hasMore && filteredPosts.length > 0) {
      const lastPost = filteredPosts[filteredPosts.length - 1];
      nextCursor = Buffer.from(JSON.stringify({
        created_at: lastPost.created_at
      })).toString('base64');
    }

    const formattedPosts = filteredPosts.map((p) => ({
      id: p.post_id,
      content: p.content,
      image_url: p.image_url,
      created_at: p.created_at,
      total_likes: p.total_likes || 0,
      username: p.users?.username || "Unknown",
      liked: true,
      comment_count: p.comments?.length || 0,
      comments: p.comments?.map(comment => ({
        comment_id: comment.comment_id,
        comment_text: comment.comment_text,
        created_at: comment.created_at,
        username: comment.users?.username || "Unknown"
      })) || [],
    }));

    const response = {
      success: true,
      data: formattedPosts,
      pagination: {
        hasMore: hasMore,
        nextCursor: nextCursor,
        currentCount: formattedPosts.length,
        limit: validLimit
      },
      filters_applied: {
        sort: sortBy,
        time: timeFilter,
        content_type: contentType,
        min_likes: minLikes
      }
    };

    await redis.setex(cacheKey, 180, JSON.stringify(response));

    const totalTime = Date.now() - start;
    console.log(`Liked Posts API - User ${userId} - ${formattedPosts.length} posts - ${totalTime}ms`);

    res.json(response);

  } catch (err) {
    console.error('Get liked posts error:', err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};

export const editPost = async (req, res) => {
  const userId = req.session?.userId;
  const { post_id } = req.params;
  const { content, image_url } = req.body;

  if (!userId) {
    return res.status(401).json({ 
      success: false, 
      message: "Not authenticated" 
    });
  }

  if (!post_id) {
    return res.status(400).json({ 
      success: false, 
      message: "Post ID required" 
    });
  }

  if (!content && !image_url) {
    return res.status(400).json({ 
      success: false, 
      message: "Content or image required" 
    });
  }

  try {
    const { data: existingPost, error: checkError } = await supabase
      .from("posts")
      .select("post_id, user_id")
      .eq("post_id", post_id)
      .single();

    if (checkError || !existingPost) {
      return res.status(404).json({ 
        success: false, 
        message: "Post not found" 
      });
    }

    if (existingPost.user_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to edit this post" 
      });
    }

    const updateData = {
      content: content,
      updated_at: new Date().toISOString()
    };

    if (image_url !== undefined) {
      updateData.image_url = image_url;
    }

    const { data: updatedPost, error: updateError } = await supabase
      .from("posts")
      .update(updateData)
      .eq("post_id", post_id)
      .select(`
        post_id,
        content,
        image_url,
        created_at,
        updated_at,
        total_likes,
        user_id,
        users:user_id (username)
      `)
      .single();

    if (updateError) throw updateError;

    // Invalidate ALL caches
    invalidateUserPostCaches(userId, post_id);

    res.json({
      success: true,
      message: "Post updated successfully",
      post: {
        id: updatedPost.post_id,
        content: updatedPost.content,
        image_url: updatedPost.image_url,
        created_at: updatedPost.created_at,
        updated_at: updatedPost.updated_at,
        total_likes: updatedPost.total_likes || 0,
        username: updatedPost.users?.username || "Unknown"
      }
    });

  } catch (err) {
    console.error('Edit post error:', err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update post" 
    });
  }
};

export const deletePost = async (req, res) => {
  const userId = req.session?.userId;
  const { post_id } = req.params;

  if (!userId) {
    return res.status(401).json({ 
      success: false, 
      message: "Not authenticated" 
    });
  }

  if (!post_id) {
    return res.status(400).json({ 
      success: false, 
      message: "Post ID required" 
    });
  }

  try {
    const { data: existingPost, error: checkError } = await supabase
      .from("posts")
      .select("post_id, user_id, image_url")
      .eq("post_id", post_id)
      .single();

    if (checkError || !existingPost) {
      return res.status(404).json({ 
        success: false, 
        message: "Post not found" 
      });
    }

    if (existingPost.user_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to delete this post" 
      });
    }

    const { error: deleteError } = await supabase
      .from("posts")
      .delete()
      .eq("post_id", post_id);

    if (deleteError) throw deleteError;

    if (existingPost.image_url) {
      try {
        const fileName = existingPost.image_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('post-images')
            .remove([fileName]);
        }
      } catch (storageErr) {
        console.error('Error deleting image:', storageErr);
      }
    }

    // Invalidate ALL caches
    invalidateUserPostCaches(userId, post_id);

    res.json({
      success: true,
      message: "Post deleted successfully"
    });

  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete post" 
    });
  }
};

export const togglePinPost = async (req, res) => {
  const userId = req.session?.userId;
  const { post_id } = req.params;

  if (!userId) {
    return res.status(401).json({ 
      success: false, 
      message: "Not authenticated" 
    });
  }

  if (!post_id) {
    return res.status(400).json({ 
      success: false, 
      message: "Post ID required" 
    });
  }

  try {
    const { data: existingPost, error: checkError } = await supabase
      .from("posts")
      .select("post_id, user_id, is_pinned")
      .eq("post_id", post_id)
      .single();

    if (checkError || !existingPost) {
      return res.status(404).json({ 
        success: false, 
        message: "Post not found" 
      });
    }

    if (existingPost.user_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to pin this post" 
      });
    }

    const newPinStatus = !existingPost.is_pinned;

    if (newPinStatus) {
      await supabase
        .from("posts")
        .update({ is_pinned: false })
        .eq("user_id", userId);
    }

    const { data: updatedPost, error: updateError } = await supabase
      .from("posts")
      .update({ 
        is_pinned: newPinStatus,
        updated_at: new Date().toISOString()
      })
      .eq("post_id", post_id)
      .select(`
        post_id,
        is_pinned,
        users:user_id (username)
      `)
      .single();

    if (updateError) throw updateError;

    // Invalidate user's posts cache
    await deleteKeysByPattern(`user:posts:${userId}`);

    res.json({
      success: true,
      message: newPinStatus ? "Post pinned successfully" : "Post unpinned successfully",
      is_pinned: updatedPost.is_pinned
    });

  } catch (err) {
    console.error('Pin post error:', err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update pin status" 
    });
  }
};