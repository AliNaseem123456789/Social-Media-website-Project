import supabase from "../supabaseClient.js";
import redisClient from '../config/redis.config.js';
import Redis from "ioredis"
import EmailPublisher from "../services/EmailPublisher.js";
const redis = new Redis("rediss://default:gQAAAAAAAffMAAIgcDJlNzNmNzUxZDVhNDk0MGJlYjdkNDVhNjQ1MDU5Y2U4ZQ@humorous-troll-128972.upstash.io:6379");
// const redis = new Redis("redis://localhost:6379");
// await client.set('foo', 'bar');

export const createPost = async (req, res) => {
  const { user_id, content, image_url } = req.body;
  
  if (!content && !image_url) {
    return res.status(400).json({ 
      success: false, 

      message: "Post must have content or an image" 
    });
  }
  
  try {
    const { data, error } = await supabase
      .from("posts")
      .insert([{ user_id, content, image_url: image_url || null }])
      .select("post_id, content, created_at, image_url")
      .single();
      
    if (error) throw error;
    
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
    res.status(500).json({ success: false, message: "Database error" });
  }
};

export const likePost = async (req, res) => {
  const { user_id, post_id } = req.body;
  
  if (!user_id || !post_id) {
    return res.status(400).json({ 
      success: false, 
      message: "Required fields missing" 
    });
  }
  
  try {
    // First, get the post to find the owner
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("user_id, total_likes")
      .eq("post_id", post_id)
      .single();
    
    if (postError) throw postError;
    
    // Check if user already liked this post
    const { data: existingLike } = await supabase
      .from("likes")
      .select("*")
      .eq("user_id", user_id)
      .eq("post_id", post_id)
      .maybeSingle();
    
    if (existingLike) {
      // UNLIKE: Remove the like
      await supabase.from("likes").delete().eq("id", existingLike.id);
      
      const { data: updatedPost } = await supabase
        .from("posts")
        .update({ total_likes: Math.max((post.total_likes || 1) - 1, 0) })
        .eq("post_id", post_id)
        .select()
        .single();
      
      return res.json({
        success: true,
        total_likes: updatedPost.total_likes,
        liked: false,
      });
      
    } else {
      // LIKE: Add the like
      await supabase.from("likes").insert([{ user_id, post_id }]);
      
      const { data: updatedPost } = await supabase
        .from("posts")
        .update({ total_likes: (post.total_likes || 0) + 1 })
        .eq("post_id", post_id)
        .select()
        .single();
      if (post.user_id !== user_id) {
        // Get the post owner's details
        const { data: postOwner } = await supabase
          .from("users")
          .select("email, username")
          .eq("id", post.user_id)
          .single();
        
        // Get the liker's name
        const { data: liker } = await supabase
          .from("users")
          .select("username")
          .eq("id", user_id)
          .single();
        
        // Send email notification
        await EmailPublisher.sendPostLikeEmail({
          to: postOwner.email,
          recipientName: postOwner.username,
          likerName: liker.username,
          postLink: `${process.env.APP_URL || 'http://localhost:3000'}/posts/${post_id}`
        }).catch(err => console.error('Failed to queue like email:', err.message));
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
        const duration = Date.now() - start;
        if (cached) {
            const duration = Date.now() - start;
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
        
        // Format response
        const post = {
            id: data.post_id,
            content: data.content,
            created_at: data.created_at,
            total_likes: data.total_likes || 0,
            username: data.users?.username || "Unknown",
            comments: data.comments || [],
        };
        
        // Store in Redis with 5 minute expiry
        await redis.setex(cacheKey, 300, JSON.stringify(post));
        
        const totalTime = Date.now() - start;
        console.log(`💾 CACHED - Total: ${totalTime}ms`);
        
        res.json(post);
        
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, message: "Database error" });
    }
};
export const addComment = async (req, res) => {
  try {
    const { post_id, comment_text, user_id } = req.body;
    
    // ✅ STEP 1: Get post owner info BEFORE inserting comment
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("user_id")
      .eq("post_id", post_id)
      .single();
    
    if (postError) {
      console.error('Error fetching post:', postError);
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    const { data: comment, error: commentError } = await supabase
      .from("comments")
      .insert([{ post_id, comment_text, user_id }])
      .select("comment_id, comment_text, created_at, users(username)")
      .single();
    if (commentError) throw commentError;    
    if (post.user_id !== user_id) {
      // Get post owner details
      const { data: postOwner, error: ownerError } = await supabase
        .from("users")
        .select("email, username")
        .eq("id", post.user_id)
        .single();
      
      // Get commenter details (sender)
      const { data: commenter, error: commenterError } = await supabase
        .from("users")
        .select("username")
        .eq("id", user_id)
        .single();
      
      if (!ownerError && postOwner && !commenterError && commenter) {
        // Get a preview of the post content (optional)
        const { data: postContent } = await supabase
          .from("posts")
          .select("content")
          .eq("post_id", post_id)
          .single();
        
        const postPreview = postContent?.content 
          ? (postContent.content.substring(0, 100) + (postContent.content.length > 100 ? '...' : ''))
          : 'a post';
        
        // Send email notification (fire and forget - don't await)
        EmailPublisher.sendCommentNotification({
          to: postOwner.email,
          recipientName: postOwner.username,
          commenterName: commenter.username,
          commentText: comment_text,
          postLink: `${process.env.APP_URL || 'http://localhost:3000'}/posts/${post_id}`,
          postPreview: postPreview
        }).catch(err => console.error('Failed to queue comment email:', err.message));
        
        console.log(`📧 Comment notification queued for post owner: ${postOwner.email}`);
      }
    }
    
    // ✅ STEP 4: Clear cache for this post (so the comment appears immediately)
    const cacheKey = `post:full:${post_id}`;
    await redis.del(cacheKey).catch(err => console.error('Failed to clear cache:', err.message));
    
    res.json({ success: true, comment: comment });
    
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};
export const getMyPosts = async (req, res) => {
    const start = Date.now();
    const { id } = req.params;
    const cacheKey = `user:posts:${id}`;
    
    try {
        // Try to get from Redis cache
        const cached = await redis.get(cacheKey);
        const duration = Date.now() - start;
        
        if (cached) {
            console.log(`⚡ USER POSTS CACHE HIT - ${duration}ms - User ${id}`);
            return res.json(JSON.parse(cached));
        }
        
        console.log(`🐌 USER POSTS CACHE MISS - User ${id} - Querying database...`);
        
        // Get from Supabase
        const { data, error } = await supabase
            .from("posts")
            .select(
                `post_id, content, created_at, total_likes, users(username), comments(comment_id, comment_text, created_at, users(username))`,
            )
            .eq("user_id", Number(id))
            .order("created_at", { ascending: false });
            
        if (error) throw error;
        
        // Format response (keep it clean)
        const userPosts = data.map((p) => ({
            id: p.post_id,
            content: p.content,
            created_at: p.created_at,
            total_likes: p.total_likes || 0,
            username: p.users?.username || "Unknown",
            comments: p.comments?.map(comment => ({
                comment_id: comment.comment_id,
                comment_text: comment.comment_text,
                created_at: comment.created_at,
                username: comment.users?.username || "Unknown"
            })) || [],
        }));
        
        // Store in Redis with 3 minute expiry (shorter than single post because feeds change more often)
        await redis.setex(cacheKey, 180, JSON.stringify(userPosts));
        
        const totalTime = Date.now() - start;
        console.log(`💾 USER POSTS CACHED - User ${id} - Total: ${totalTime}ms (${userPosts.length} posts)`);
        
        res.json(userPosts);
        
    } catch (err) {
        console.error('Get my posts error:', err);
        res.status(500).json({ success: false, message: "Database error" });
    }
};