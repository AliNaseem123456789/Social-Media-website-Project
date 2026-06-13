// Update your resolvers
export const resolvers = {
  Query: {
    getFeed: async (_, { first = 10, after }, { supabase, redis, loaders, currentUser }) => {
      const userId = currentUser?.user_id;
      const validLimit = Math.min(first, 50);
      
      if (!userId) {
        console.log('No authenticated user for feed');
        return {
          edges: [],
          pageInfo: { hasNextPage: false, endCursor: null }
        };
      }
      
      // Cache key now includes pagination
      const cacheKey = `feed:user:${userId}:limit:${validLimit}:cursor:${after || 'start'}`;
      console.log(`Getting feed for user ${userId} with cursor: ${after || 'start'}`);
      
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.edges && parsed.edges.length > 0) {
            console.log('REDIS CACHE HIT!');
            return parsed;
          } else {
            await redis.del(cacheKey);
          }
        }
      } catch (err) {
        console.log('Redis error:', err.message);
      }
      
      console.log('Fetching feed from database...');
      
      let query = supabase
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
        .order("created_at", { ascending: false })
        .limit(validLimit + 1);
      
      if (after) {
        const decodedCursor = Buffer.from(after, 'base64').toString();
        query = query.lt("created_at", decodedCursor);
      }
      
      const { data: posts, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        return {
          edges: [],
          pageInfo: { hasNextPage: false, endCursor: null }
        };
      }
      
      if (!posts || posts.length === 0) {
        console.log('No posts found');
        return {
          edges: [],
          pageInfo: { hasNextPage: false, endCursor: null }
        };
      }
      
      let hasNextPage = false;
      let resultPosts = posts;
      let endCursor = null;
      
      if (posts.length > validLimit) {
        hasNextPage = true;
        resultPosts = posts.slice(0, validLimit);
        const lastPost = resultPosts[resultPosts.length - 1];
        endCursor = Buffer.from(lastPost.created_at).toString('base64');
      }
      
      console.log(`Found ${resultPosts.length} posts from database, hasNextPage: ${hasNextPage}`);
      
      const transformedPosts = resultPosts.map((p) => {
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
      
      const edges = transformedPosts.map(post => ({
        node: post,
        cursor: Buffer.from(post.created_at).toString('base64')
      }));
      
      const response = {
        edges: edges,
        pageInfo: {
          hasNextPage: hasNextPage,
          endCursor: endCursor
        }
      };
      
      if (edges.length > 0 && edges[0].node.username !== "Unknown User") {
        try {
          await redis.setex(cacheKey, 300, JSON.stringify(response));
          console.log(`Cached ${edges.length} posts for user ${userId}`);
        } catch (err) {
          console.log('Redis cache error:', err.message);
        }
      }
      
      return response;
    },
  },
  
  Post: {
    comments: async (parent, _, { loaders }) => {
      if (!loaders?.comment) return [];
      return loaders.comment.load(parent.post_id);
    },
  },
};