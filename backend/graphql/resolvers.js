export const resolvers = {
  Query: {
    getFeed: async (_, { first = 10, after }, { supabase, redis, loaders, currentUser }) => {
      const userId = currentUser?.user_id;
      const validLimit = Math.min(first, 50);
      
      console.log('getFeed called:', { userId, first, after });      
      if (!userId) {
        console.log('No userId found');
        return { edges: [], pageInfo: { hasNextPage: false, endCursor: null } };
      }      
      const precomputedKey = `feed:precomputed:${userId}`;
      try {
        const precomputedData = await redis.get(precomputedKey);        
        if (!precomputedData) {
          console.log(`No precomputed feed found for user ${userId}, triggering rebuild...`);
          setTimeout(() => {
            triggerFeedRebuild(userId).catch(err => {
              console.error('Background rebuild failed:', err);
            });
          }, 100);          
          return { edges: [], pageInfo: { hasNextPage: false, endCursor: null } };
        }
        
        const feedData = JSON.parse(precomputedData);
        console.log(`Using precomputed feed for user ${userId}, ${feedData.edges?.length || 0} posts`);
        console.log(`Ranked by: ${feedData.rankedBy || 'chronological'}`);        
        if (!feedData.edges || feedData.edges.length === 0) {
          return { edges: [], pageInfo: { hasNextPage: false, endCursor: null } };
        }        
        let edges = feedData.edges || [];
        let startIndex = 0;
        
        if (after) {
          const decodedCursor = Buffer.from(after, 'base64').toString();
          const index = edges.findIndex(e => e.created_at === decodedCursor);
          if (index !== -1) {
            startIndex = index + 1;
          }
        }
        
        const paginatedEdges = edges.slice(startIndex, startIndex + validLimit);
        const hasNextPage = edges.length > startIndex + validLimit;
        const endCursor = paginatedEdges.length > 0 
          ? Buffer.from(paginatedEdges[paginatedEdges.length - 1].created_at).toString('base64')
          : null;        
        const postIds = paginatedEdges.map(e => e.post_id);
        let likedSet = new Set();
        if (postIds.length > 0) {
          const { data: userLikes } = await supabase
            .from("likes")
            .select("post_id")
            .eq("user_id", userId)
            .in("post_id", postIds);
          likedSet = new Set((userLikes || []).map(l => l.post_id));
        }        
        const edgesWithLikes = paginatedEdges.map(edge => ({
          node: {
            post_id: edge.post_id,
            user_id: edge.user_id,
            content: edge.content || "",
            image_url: edge.image_url || null,
            total_likes: edge.total_likes || 0,
            created_at: edge.created_at,
            username: edge.username || "Unknown User",
            avatar_url: edge.avatar_url || null,
            liked: likedSet.has(edge.post_id),
            score: edge.score
          },
          cursor: Buffer.from(edge.created_at).toString('base64')
        }));
        
        return {
          edges: edgesWithLikes,
          pageInfo: { hasNextPage, endCursor }
        };
        
      } catch (error) {
        console.error(`Error fetching precomputed feed for user ${userId}:`, error);
        return { edges: [], pageInfo: { hasNextPage: false, endCursor: null } };
      }
    },
  
   getChronologicalFeed: async (_, { first = 10, after }, { supabase, redis, loaders, currentUser }) => {
            const userId = currentUser?.user_id;
            const validLimit = Math.min(first, 50);
            
            console.log('getChronologicalFeed called:', { userId, first, after });
            
            if (!userId) {
                console.log('No userId found');
                return { edges: [], pageInfo: { hasNextPage: false, endCursor: null } };
            }
            
            const cacheKey = `feed:chronological:${userId}:limit:${validLimit}:cursor:${after || 'start'}`;            
            try {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed.edges?.length > 0) {
                        console.log('Chronological feed cache hit');                        
                        const postIds = parsed.edges.map(e => e.node.post_id);
                        const { data: userLikes } = await supabase
                            .from("likes")
                            .select("post_id")
                            .eq("user_id", userId)
                            .in("post_id", postIds);
                        
                        const likedSet = new Set((userLikes || []).map(l => l.post_id));
                        
                        parsed.edges = parsed.edges.map(edge => ({
                            ...edge,
                            node: { ...edge.node, liked: likedSet.has(edge.node.post_id) }
                        }));
                        
                        return parsed;
                    } else {
                        await redis.del(cacheKey);
                    }
                }
            } catch (err) {
                console.log('Redis cache error:', err.message);
            }
            
            const { data: friends, error: friendsError } = await supabase
                .from('friends')
                .select('requester_id, recipient_id')
                .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
                .eq('status', 'accepted');

            if (friendsError) {
                console.error('Friends error:', friendsError);
                return { edges: [], pageInfo: { hasNextPage: false, endCursor: null } };
            }
            const friendIds = friends.map(f => 
                f.requester_id === userId ? f.recipient_id : f.requester_id
            );

            console.log(`User ${userId} has ${friendIds.length} friends`);

            if (friendIds.length === 0) {
                return { edges: [], pageInfo: { hasNextPage: false, endCursor: null } };
            }
            let query = supabase
                .from("posts")
                .select(`
                    *,
                    users:user_id (
                        username,
                        user_profiles ( profile_image )
                    )
                `)
                .in("user_id", friendIds)
                .order("created_at", { ascending: false })
                .limit(validLimit + 1);
            
            if (after) {
                const decodedCursor = Buffer.from(after, 'base64').toString();
                query = query.lt("created_at", decodedCursor);
            }
            
            const { data: posts, error } = await query;

            if (error) {
                console.error('Supabase error:', error);
                return { edges: [], pageInfo: { hasNextPage: false, endCursor: null } };
            }
            
            if (!posts || posts.length === 0) {
                return { edges: [], pageInfo: { hasNextPage: false, endCursor: null } };
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
            const postIds = resultPosts.map(p => p.post_id);
            let likedSet = new Set();

            if (postIds.length > 0) {
                const { data: userLikes, error: likesError } = await supabase
                    .from("likes")
                    .select("post_id")
                    .eq("user_id", userId)
                    .in("post_id", postIds);

                if (likesError) console.error("Likes fetch error:", likesError);
                likedSet = new Set((userLikes || []).map(l => l.post_id));
            }
            
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
                    liked: likedSet.has(p.post_id),
                };
            });
            
            const edges = transformedPosts.map(post => ({
                node: post,
                cursor: Buffer.from(post.created_at).toString('base64')
            }));
            
            const response = {
                edges,
                pageInfo: { hasNextPage, endCursor }
            };            
            if (edges.length > 0 && edges[0].node.username !== "Unknown User") {
                try {
                    const cacheResponse = {
                        ...response,
                        edges: edges.map(e => ({
                            ...e,
                            node: { ...e.node, liked: undefined }
                        }))
                    };
                    await redis.setex(cacheKey, 300, JSON.stringify(cacheResponse));
                } catch (err) {
                    console.log('Redis cache error:', err.message);
                }
            }
            
            return response;
        },
 
getGlobalFeed: async (_, { first = 10, after }, { supabase, redis, loaders, currentUser }) => {
    const userId = currentUser?.user_id;
    const validLimit = Math.min(first, 50);
    
    console.log('getGlobalFeed called:', { userId, first, after });
    
    if (!userId) {
        console.log('No userId found');
        return { edges: [], pageInfo: { hasNextPage: false, endCursor: null } };
    }
    
    const cacheKey = `feed:global:${userId}:limit:${validLimit}:cursor:${after || 'start'}`;    
    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.edges?.length > 0) {
                console.log('Global feed cache hit');                
                const postIds = parsed.edges.map(e => e.node.post_id);
                const { data: userLikes } = await supabase
                    .from("likes")
                    .select("post_id")
                    .eq("user_id", userId)
                    .in("post_id", postIds);
                
                const likedSet = new Set((userLikes || []).map(l => l.post_id));
                
                parsed.edges = parsed.edges.map(edge => ({
                    ...edge,
                    node: { ...edge.node, liked: likedSet.has(edge.node.post_id) }
                }));
                
                return parsed;
            } else {
                await redis.del(cacheKey);
            }
        }
    } catch (err) {
        console.log('Redis cache error:', err.message);
    }
    let query = supabase
        .from("posts")
        .select(`
            *,
            users:user_id (
                username,
                user_profiles ( profile_image )
            )
        `)
        .order("created_at", { ascending: false })
        .limit(validLimit + 1);
    
    if (after) {
        const decodedCursor = Buffer.from(after, 'base64').toString();
        query = query.lt("created_at", decodedCursor);
    }
    
    const { data: posts, error } = await query;

    if (error) {
        console.error('Supabase error:', error);
        return { edges: [], pageInfo: { hasNextPage: false, endCursor: null } };
    }
    
    if (!posts || posts.length === 0) {
        return { edges: [], pageInfo: { hasNextPage: false, endCursor: null } };
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
    const postIds = resultPosts.map(p => p.post_id);
    let likedSet = new Set();

    if (postIds.length > 0) {
        const { data: userLikes, error: likesError } = await supabase
            .from("likes")
            .select("post_id")
            .eq("user_id", userId)
            .in("post_id", postIds);

        if (likesError) console.error("Likes fetch error:", likesError);
        likedSet = new Set((userLikes || []).map(l => l.post_id));
    }
    
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
            liked: likedSet.has(p.post_id),
        };
    });
    
    const edges = transformedPosts.map(post => ({
        node: post,
        cursor: Buffer.from(post.created_at).toString('base64')
    }));
    
    const response = {
        edges,
        pageInfo: { hasNextPage, endCursor }
    };    
    if (edges.length > 0) {
        try {
            const cacheResponse = {
                ...response,
                edges: edges.map(e => ({
                    ...e,
                    node: { ...e.node, liked: undefined }
                }))
            };
            await redis.setex(cacheKey, 300, JSON.stringify(cacheResponse));
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

async function triggerFeedRebuild(userId) {
  try {
    console.log(`Triggering feed rebuild for user ${userId}...`);
    const { default: feedWorker } = await import('../consumers/feed-worker.js');
    
    await feedWorker.updateFeedForUser(userId);
    
    console.log(`Feed rebuild triggered for user ${userId}`);
  } catch (error) {
    console.error(`Failed to trigger feed rebuild:`, error);
  }
}