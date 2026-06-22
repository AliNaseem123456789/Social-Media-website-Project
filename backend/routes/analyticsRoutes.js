// routes/analyticsRoutes.js
import express from 'express';
import supabase from '../supabaseClient.js';
import redisClient from '../config/redis.config.js';

const router = express.Router();

// ✅ GET /api/analytics/me - Get current user's analytics
router.get('/analytics/me', async (req, res) => {
    try {
        const userId = req.session?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        console.log('📊 Fetching analytics for user:', userId);

        // Try Redis cache first
        try {
            const cached = await redisClient.get(`user_stats:${userId}`);
            if (cached) {
                const stats = JSON.parse(cached);
                console.log('✅ Cache hit for user:', userId);
                return res.json({ 
                    success: true, 
                    stats: {
                        totalPosts: stats.total_posts || 0,
                        totalLikesReceived: stats.total_likes_received || 0,
                        totalCommentsReceived: stats.total_comments_received || 0,
                        totalFriends: stats.total_friends || 0
                    }
                });
            }
        } catch (redisError) {
            console.log('⚠️ Redis cache miss or error:', redisError.message);
        }

        // Get from database
        const { data: stats, error } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('❌ Failed to get user stats:', error);
            return res.status(500).json({ error: 'Failed to get analytics' });
        }

        // If no stats exist, calculate them
        if (!stats) {
            console.log('📊 Calculating stats for user:', userId);
            const statsData = await calculateUserStats(userId);
            
            // Save to database
            await saveUserStats(userId, statsData);
            
            return res.json({ 
                success: true, 
                stats: statsData
            });
        }

        // Cache for next time
        try {
            await redisClient.set(`user_stats:${userId}`, JSON.stringify(stats), 'EX', 3600);
        } catch (redisError) {
            console.log('⚠️ Failed to cache stats:', redisError.message);
        }

        res.json({
            success: true,
            stats: {
                totalPosts: stats.total_posts || 0,
                totalLikesReceived: stats.total_likes_received || 0,
                totalCommentsReceived: stats.total_comments_received || 0,
                totalFriends: stats.total_friends || 0
            }
        });

    } catch (error) {
        console.error('❌ Failed to get user analytics:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// ✅ GET /api/analytics/user/:userId - Get any user's analytics
router.get('/analytics/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.session?.userId;

        if (!currentUserId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        console.log('📊 Fetching analytics for user:', userId, 'by user:', currentUserId);

        // Try Redis cache first
        try {
            const cached = await redisClient.get(`user_stats:${userId}`);
            if (cached) {
                const stats = JSON.parse(cached);
                return res.json({ 
                    success: true, 
                    stats: {
                        totalPosts: stats.total_posts || 0,
                        totalLikesReceived: stats.total_likes_received || 0,
                        totalCommentsReceived: stats.total_comments_received || 0,
                        totalFriends: stats.total_friends || 0
                    }
                });
            }
        } catch (redisError) {
            // Silently fall through
        }

        // Get from database
        const { data: stats, error } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('❌ Failed to get user stats:', error);
            return res.status(500).json({ error: 'Failed to get analytics' });
        }

        // If no stats, calculate on the fly
        if (!stats) {
            const statsData = await calculateUserStats(userId);
            return res.json({ success: true, stats: statsData });
        }

        res.json({
            success: true,
            stats: {
                totalPosts: stats.total_posts || 0,
                totalLikesReceived: stats.total_likes_received || 0,
                totalCommentsReceived: stats.total_comments_received || 0,
                totalFriends: stats.total_friends || 0
            }
        });

    } catch (error) {
        console.error('❌ Failed to get user analytics:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// ✅ Helper: Calculate user stats
async function calculateUserStats(userId) {
    try {
        // Count posts
        const { count: posts, error: postsError } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (postsError) {
            console.error('❌ Posts count error:', postsError);
        }

        // Count likes on user's posts
        const { data: userPosts, error: likesError } = await supabase
            .from('posts')
            .select('total_likes')
            .eq('user_id', userId);
        
        if (likesError) {
            console.error('❌ Likes error:', likesError);
        }
        
        const totalLikes = userPosts?.reduce((sum, p) => sum + (p.total_likes || 0), 0) || 0;

        // Count comments on user's posts
        const totalComments = userPosts?.reduce((sum, p) => sum + (p.total_comments || 0), 0) || 0;

        // Count friends (accepted)
        const { count: friends, error: friendsError } = await supabase
            .from('friends')
            .select('*', { count: 'exact', head: true })
            .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
            .eq('status', 'accepted');

        if (friendsError) {
            console.error('❌ Friends error:', friendsError);
        }

        return {
            total_posts: posts || 0,
            total_likes_received: totalLikes,
            total_comments_received: totalComments,
            total_friends: friends || 0
        };
    } catch (error) {
        console.error('❌ Error calculating user stats:', error);
        return {
            total_posts: 0,
            total_likes_received: 0,
            total_comments_received: 0,
            total_friends: 0
        };
    }
}

// ✅ Helper: Save user stats
async function saveUserStats(userId, statsData) {
    try {
        const { error } = await supabase
            .from('user_stats')
            .upsert({
                user_id: userId,
                total_posts: statsData.total_posts || 0,
                total_likes_received: statsData.total_likes_received || 0,
                total_comments_received: statsData.total_comments_received || 0,
                total_friends: statsData.total_friends || 0,
                updated_at: new Date()
            }, {
                onConflict: 'user_id'
            });

        if (error) {
            console.error('❌ Failed to save user stats:', error);
        } else {
            console.log('✅ Saved stats for user:', userId);
        }
    } catch (error) {
        console.error('❌ Error saving user stats:', error);
    }
}

// ✅ POST /api/analytics/refresh - Force refresh user analytics
router.post('/analytics/refresh', async (req, res) => {
    try {
        const userId = req.session?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        console.log('🔄 Refreshing analytics for user:', userId);

        // Recalculate stats
        const statsData = await calculateUserStats(userId);

        // Save to database
        await saveUserStats(userId, statsData);

        // Update Redis cache
        try {
            await redisClient.set(
                `user_stats:${userId}`,
                JSON.stringify(statsData),
                'EX',
                3600
            );
        } catch (redisError) {
            console.log('⚠️ Failed to cache stats:', redisError.message);
        }

        res.json({
            success: true,
            stats: statsData,
            message: 'Analytics refreshed successfully'
        });

    } catch (error) {
        console.error('❌ Failed to refresh analytics:', error);
        res.status(500).json({ error: 'Failed to refresh analytics' });
    }
});

export default router;