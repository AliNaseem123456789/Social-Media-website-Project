// graphql/resolvers.js
export const resolvers = {
  Query: {
    getFeed: async (_, { userId }, { supabase, redis, loaders }) => {
      const cacheKey = `feed:user:${userId}`;
      
      console.log(`\n🔍 Getting feed for user ${userId}`);
      
      // 🟢 STEP 1: Try Redis cache (using ioredis)
      try {
        const cached = await redis.get(cacheKey);
        
        if (cached) {
          const parsed = JSON.parse(cached);
          
          // Validate cached data has username
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].username) {
            console.log('⚡⚡⚡ REDIS CACHE HIT!');
            return parsed;
          } else {
            console.log('⚠️ Cache corrupted, deleting...');
            await redis.del(cacheKey);
          }
        }
      } catch (err) {
        console.log('Redis error:', err.message);
      }
      
      // 🔴 STEP 2: Cache miss - query database
      console.log('📡 Fetching feed from database...');
      
      const { data: posts, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          users:user_id (
            username,
            user_profiles ( profile_image )
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        return [];
      }
      
      if (!posts || posts.length === 0) {
        console.log('No posts found');
        return [];
      }
      
      console.log(`✅ Found ${posts.length} posts from database`);
      
      // Transform posts
      const transformedPosts = posts.map((p) => {
        const profileImage = p.users?.user_profiles?.profile_image;
        let avatarUrl = null;
        if (profileImage) {
          avatarUrl = profileImage.startsWith("http") 
            ? profileImage 
            : `https://cdxeqrhdascyezirccrm.supabase.co/storage/v1/object/public/avatars/${profileImage}`;
        }
        
        let fullImageUrl = null;
        if (p.image_url) {
          fullImageUrl = p.image_url.startsWith("http") 
            ? p.image_url 
            : `https://cdxeqrhdascyezirccrm.supabase.co/storage/v1/object/public/post-images/${p.image_url}`;
        }

        return {
          post_id: p.post_id,
          user_id: p.user_id,
          content: p.content,
          image_url: fullImageUrl,
          total_likes: p.total_likes || 0,
          created_at: p.created_at,
          username: p.users?.username || "Unknown User",
          avatar_url: avatarUrl,
        };
      });
      
      // Debug: Log first post's username
      if (transformedPosts.length > 0) {
        console.log(`📝 First post username: ${transformedPosts[0].username}`);
      }
      
      // 🟢 STEP 3: Store in Redis (using ioredis)
      if (transformedPosts.length > 0) {
        const hasValidData = transformedPosts[0].username && transformedPosts[0].username !== "Unknown User";
        
        if (hasValidData) {
          try {
            await redis.setex(cacheKey, 300, JSON.stringify(transformedPosts));
            console.log(`💾 Cached ${transformedPosts.length} posts for user ${userId}`);
          } catch (err) {
            console.log('Redis cache error:', err.message);
          }
        } else {
          console.log('⚠️ Not caching - username missing in data');
        }
      }
      
      return transformedPosts;
    },
  },
  
  Post: {
    comments: async (parent, _, { loaders }) => {
      if (!loaders?.comment) return [];
      return loaders.comment.load(parent.post_id);
    },
  },
};