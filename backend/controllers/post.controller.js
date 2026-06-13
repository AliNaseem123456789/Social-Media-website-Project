import supabase from "../supabaseClient.js";
import redisClient from '../config/redis.config.js';
import Redis from "ioredis";
import EmailPublisher from "../services/EmailPublisher.js";

const redis = new Redis("rediss://default:gQAAAAAAAffMAAIgcDJlNzNmNzUxZDVhNDk0MGJlYjdkNDVhNjQ1MDU5Y2U4ZQ@humorous-troll-128972.upstash.io:6379");
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
    await redis.del(`user:posts:${userId}`).catch(console.error);
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
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("user_id, total_likes")
      .eq("post_id", post_id)
      .single();
    
    if (postError) throw postError;    
    const { data: existingLike } = await supabase
      .from("likes")
      .select("*")
      .eq("user_id", userId)
      .eq("post_id", post_id)
      .maybeSingle();
    
    if (existingLike) {
      await supabase.from("likes").delete().eq("id", existingLike.id);
      
      const { data: updatedPost } = await supabase
        .from("posts")
        .update({ total_likes: Math.max((post.total_likes || 1) - 1, 0) })
        .eq("post_id", post_id)
        .select()
        .single();
      
      // Clear cache for this post
      await redis.del(`post:full:${post_id}`).catch(console.error);
      
      return res.json({
        success: true,
        total_likes: updatedPost.total_likes,
        liked: false,
      });
      
    } else {
      await supabase.from("likes").insert([{ user_id: userId, post_id }]);      
      const { data: updatedPost } = await supabase
        .from("posts")
        .update({ total_likes: (post.total_likes || 0) + 1 })
        .eq("post_id", post_id)
        .select()
        .single();
      
      // Clear cache for this post
      await redis.del(`post:full:${post_id}`).catch(console.error);
      
      // Send email notification (only if not liking own post)
      if (post.user_id !== userId) {
        const { data: postOwner } = await supabase
          .from("users")
          .select("email, username")
          .eq("id", post.user_id)
          .single();
        
        const { data: liker } = await supabase
          .from("users")
          .select("username")
          .eq("id", userId)
          .single();
        
        if (postOwner && liker) {
          EmailPublisher.sendPostLikeEmail({
            to: postOwner.email,
            recipientName: postOwner.username,
            likerName: liker.username,
            postLink: `${process.env.APP_URL || 'http://localhost:3000'}/posts/${post_id}`
          }).catch(err => console.error('Failed to queue like email:', err.message));
        }
      }
      
      return res.json({
        success: true,
        total_likes: updatedPost.total_likes,
        liked: true,
      });
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
        `post_id, content, created_at, total_likes, users(username), comments(comment_id, comment_text, created_at, users(username))`,
      )
      .eq("post_id", Number(id))
      .single();
      
    if (error) throw error;
    
    const post = {
      id: data.post_id,
      content: data.content,
      created_at: data.created_at,
      total_likes: data.total_likes || 0,
      username: data.users?.username || "Unknown",
      comments: data.comments || [],
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
    
    // Send email notification (if not commenting on own post)
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
    
    // Clear cache for this post
    await redis.del(`post:full:${post_id}`).catch(console.error);
    
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
  
  // SORTING PARAMETERS
  const sortBy = req.query.sort || 'recent';  
  
  //FILTERING PARAMETERS 
  const timeFilter = req.query.time || 'all'; 
  const contentType = req.query.content_type || 'all';  
  const minLikes = parseInt(req.query.min_likes) || 0;
  
  // Cache key includes all parameters
  const cacheKey = `user:posts:${userId}:sort:${sortBy}:time:${timeFilter}:type:${contentType}:minLikes:${minLikes}:cursor:${cursor || 'start'}:limit:${validLimit}`;
  
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`CACHE HIT - User ${userId} - ${sortBy} sort`);
      return res.json(JSON.parse(cached));
    }
    
    console.log(`CACHE MISS - User ${userId} - Fetching from DB`);
    
    // Build base query
    let query = supabase
      .from("posts")
      .select(
        `post_id, content, image_url, created_at, total_likes, users(username), 
         comments(comment_id, comment_text, created_at, users(username))`
      )
      .eq("user_id", Number(userId))
      .limit(validLimit + 1);
    
    // APPLY FILTERS
    
    // Time filter
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
    
    // Content type filter
    if (contentType === 'image') {
      query = query.not('image_url', 'is', null);
    } else if (contentType === 'text') {
      query = query.is('image_url', null);
    }
    
    // Minimum likes filter
    if (minLikes > 0) {
      query = query.gte('total_likes', minLikes);
    }
    
    // APPLY SORTING 
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
    
    // APPLY CURSOR
    if (cursor) {
      const decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString());
      
      if (sortBy === 'recent') {
        query = query.lt('created_at', decodedCursor.created_at);
      } 
      else if (sortBy === 'oldest') {
        query = query.gt('created_at', decodedCursor.created_at);
      }
      else if (sortBy === 'likes') {
        query = query.or(
          `total_likes.lt.${decodedCursor.total_likes},` +
          `and(total_likes.eq.${decodedCursor.total_likes},created_at.lt.${decodedCursor.created_at})`
        );
      }
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // PROCESS RESULTS 
    let hasMore = false;
    let posts = data || [];
    let nextCursor = null;
    
    if (posts.length > validLimit) {
      hasMore = true;
      posts = posts.slice(0, validLimit);
      const lastPost = posts[posts.length - 1];
      
      // Create composite cursor
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
    
    // Format posts
    const formattedPosts = posts.map((p) => ({
      id: p.post_id,
      content: p.content,
      image_url: p.image_url,
      created_at: p.created_at,
      total_likes: p.total_likes || 0,
      username: p.users?.username || "Unknown",
      comment_count: p.comments?.length || 0,
      comments: p.comments?.map(comment => ({
        comment_id: comment.comment_id,
        comment_text: comment.comment_text,
        created_at: comment.created_at,
        username: comment.users?.username || "Unknown"
      })) || [],
    }));
    
    // RESPONSE
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
    
    // Cache for 3 minutes
    await redis.setex(cacheKey, 180, JSON.stringify(response));
    
    const totalTime = Date.now() - start;
    console.log(`My Posts API - User ${userId} - ${formattedPosts.length} posts - ${totalTime}ms`);
    
    res.json(response);
    
  } catch (err) {
    console.error('Get my posts error:', err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};