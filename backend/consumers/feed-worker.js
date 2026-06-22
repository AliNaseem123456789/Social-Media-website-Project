// workers/feed-worker.js
import dotenv from 'dotenv';
dotenv.config();

import AWS from 'aws-sdk';
import Redis from 'ioredis';
import supabase from '../supabaseClient.js';

const redis = new Redis("rediss://default:gQAAAAAAAffMAAIgcDJlNzNmNzUxZDVhNDk0MGJlYjdkNDVhNjQ1MDU5Y2U4ZQ@humorous-troll-128972.upstash.io:6379");

const awsConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
};

const sqs = new AWS.SQS(awsConfig);
const QUEUES = { FEED: process.env.SQS_FEED_URL };

class FeedWorker {
    constructor() {
        this.queueUrl = QUEUES.FEED;
        this.running = true;
        this.batchSize = 10;
        this.waitTime = 20;
        this.processedCount = 0;
        this.errorCount = 0;
    }

    async start() {
        console.log('Feed Worker started...');
        console.log(`Listening to: ${this.queueUrl}`);
        console.log(`Started at: ${new Date().toISOString()}`);
        
        while (this.running) {
            try {
                const response = await sqs.receiveMessage({
                    QueueUrl: this.queueUrl,
                    MaxNumberOfMessages: this.batchSize,
                    WaitTimeSeconds: this.waitTime,
                    VisibilityTimeout: 30,
                }).promise();

                const messages = response.Messages || [];

                if (messages.length > 0) {
                    console.log(`Received ${messages.length} feed messages`);
                    for (const message of messages) {
                        await this.processMessage(message);
                        await this.deleteMessage(message.ReceiptHandle);
                        this.processedCount++;
                    }
                    console.log(`Total processed: ${this.processedCount}`);
                }
            } catch (error) {
                this.errorCount++;
                console.error(`Feed Worker error (${this.errorCount}):`, error);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    async processMessage(message) {
        try {
            const data = JSON.parse(message.Body);
            console.log('Processing feed event:', data);

            const { action, userId, friendId, postId } = data;

            switch(action) {
                case 'UPDATE_FEED':
                    await this.updateFeedForUser(userId);
                    break;
                case 'NEW_POST':
                    await this.updateFeedForNewPost(postId, userId);
                    break;
                case 'REFRESH_USER':
                    await this.updateFeedForUser(userId);
                    break;
                case 'FRIEND_ACCEPTED':
                    await this.updateFeedForUser(userId);
                    await this.updateFeedForUser(friendId);
                    break;
                default:
                    console.log('Unknown action:', action);
            }

            return { success: true };
        } catch (error) {
            console.error('Feed processing failed:', error);
            throw error;
        }
    }

    async getUserFriends(userId) {
        const { data: friends, error } = await supabase
            .from('friends')
            .select('requester_id, recipient_id')
            .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
            .eq('status', 'accepted');

        if (error) {
            console.error('Error fetching friends:', error);
            return [];
        }

        return friends.map(f => f.requester_id === userId ? f.recipient_id : f.requester_id);
    }
    async updateFeedForUser(userId) {
        console.log(`Updating feed for user: ${userId}`);
        try {
            const friendIds = await this.getUserFriends(userId);

            if (!friendIds || friendIds.length === 0) {
                await this.setEmptyFeed(userId);
                return;
            }

            console.log(`User ${userId} has ${friendIds.length} friends`);
            const { data: posts, error } = await supabase
                .from('posts')
                .select(`
                    *,
                    users:user_id (
                        username,
                        user_profiles ( profile_image )
                    )
                `)
                .in('user_id', friendIds)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error || !posts || posts.length === 0) {
                await this.setEmptyFeed(userId);
                return;
            }

            console.log(`Found ${posts.length} posts from friends`);
            const now = Date.now();
            const scoredPosts = posts.map(post => {
                // Get engagement metrics
                const likes = post.total_likes || 0;
                const comments = post.total_comments || 0;
                const shares = post.shares || 0;
                
                // Time factor: newer posts get a boost
                const postTime = new Date(post.created_at).getTime();
                const hoursSincePost = (now - postTime) / (1000 * 60 * 60);
                
                // Exponential time decay (24 hour half-life)
                const timeDecay = Math.pow(0.5, hoursSincePost / 24);
                
                // Engagement score with weights
                const engagementScore = 
                    (likes * 1) +      // 1 point per like
                    (comments * 2) +   // 2 points per comment
                    (shares * 3);      // 3 points per share
                
                // Final score with time decay
                const finalScore = engagementScore * timeDecay;
                
                return {
                    ...post,
                    score: finalScore,
                    likes: likes,
                    comments: comments,
                    shares: shares,
                    timeDecay: timeDecay,
                    engagementScore: engagementScore
                };
            });
            // STEP 2: Sort by score (highest first)
            scoredPosts.sort((a, b) => b.score - a.score);
            // STEP 3: Apply diversity boost (prevent one person dominating)
            const diversifiedPosts = this.applyDiversityBoost(scoredPosts);
            // STEP 4: Take top 50
            const topPosts = diversifiedPosts.slice(0, 50);
            console.log(`Top 5 posts by score:`);
            topPosts.slice(0, 5).forEach((p, i) => {
                console.log(`  ${i+1}. Post ${p.post_id} by ${p.users?.username || 'Unknown'}: score=${p.score.toFixed(2)} (likes: ${p.likes}, comments: ${p.comments}, decay: ${p.timeDecay.toFixed(2)})`);
            });
            // STEP 5: Transform and store in Redis
            const feedPosts = await this.transformPosts(topPosts, userId);            
            // Add score to each post for debugging
            const feedPostsWithScore = feedPosts.map((post, index) => ({
                ...post,
                score: topPosts[index]?.score || 0
            }));

            const cacheKey = `feed:precomputed:${userId}`;
            
            // Store with metadata
            await redis.setex(cacheKey, 3600, JSON.stringify({
                edges: feedPostsWithScore,
                updatedAt: new Date().toISOString(),
                count: feedPostsWithScore.length,
                friendCount: friendIds.length,
                rankedBy: 'engagement_score',
                algorithm: 'engagement_v2'
            }));

            // STEP 6: Store sorted set by score for pagination
            const sortedKey = `feed:sorted:${userId}`;
            const pipeline = redis.pipeline();
            pipeline.del(sortedKey);
            
            for (const post of feedPostsWithScore) {
                // Use score as the ranking value (higher = better)
                const score = post.score || 0;
                pipeline.zadd(sortedKey, score, post.post_id);
            }
            pipeline.expire(sortedKey, 3600);
            await pipeline.exec();

            console.log(`Feed updated for user ${userId} with ${feedPosts.length} posts ranked by engagement`);

        } catch (error) {
            console.error(`Failed to update feed for user ${userId}:`, error);
        }
    }

    // DIVERSITY BOOST: Prevent one person dominating
    applyDiversityBoost(posts) {
        const userPostCounts = {};
        const result = [];

        for (const post of posts) {
            const userId = post.user_id;
            userPostCounts[userId] = (userPostCounts[userId] || 0) + 1;
            
            // Apply diversity penalty: if a user has many posts, reduce their score
            const diversityPenalty = Math.max(1, 1 - (userPostCounts[userId] - 1) * 0.1);
            post.score = post.score * diversityPenalty;
        }

        // Re-sort after diversity penalty
        posts.sort((a, b) => b.score - a.score);
        return posts;
    }

    // ============================================
    // UPDATE FEED FOR NEW POST (with scoring)
    // ============================================
    async updateFeedForNewPost(postId, userId) {
        console.log(`📰 New post ${postId} by user ${userId}`);
        try {
            const { data: post, error: postError } = await supabase
                .from('posts')
                .select(`
                    *,
                    users:user_id (
                        username,
                        user_profiles ( profile_image )
                    )
                `)
                .eq('post_id', postId)
                .single();

            if (postError || !post) {
                console.error('❌ Error fetching post:', postError);
                return;
            }

            const friendIds = await this.getUserFriends(userId);
            if (!friendIds || friendIds.length === 0) {
                console.log(`⚠️ User ${userId} has no friends to notify`);
                return;
            }

            // Calculate score for the new post
            const now = Date.now();
            const postTime = new Date(post.created_at).getTime();
            const hoursSincePost = (now - postTime) / (1000 * 60 * 60);
            const timeDecay = Math.pow(0.5, hoursSincePost / 24);
            const engagementScore = (post.total_likes || 0) * 1 + (post.total_comments || 0) * 2 + (post.shares || 0) * 3;
            const score = engagementScore * timeDecay;

            const transformedPost = await this.transformPost(post, null);
            const postWithScore = { ...transformedPost, score: score };

            let updatedCount = 0;

            for (const friendId of friendIds) {
                try {
                    const cacheKey = `feed:precomputed:${friendId}`;
                    const cached = await redis.get(cacheKey);
                    let feedData = { edges: [], updatedAt: new Date().toISOString() };
                    if (cached) feedData = JSON.parse(cached);

                    // Check if post already exists
                    const exists = feedData.edges.some(e => e.post_id === postId);
                    if (!exists) {
                        // Add new post and re-sort by score
                        feedData.edges.push(postWithScore);
                        feedData.edges.sort((a, b) => (b.score || 0) - (a.score || 0));
                    }

                    // Keep only top 50
                    if (feedData.edges.length > 50) {
                        feedData.edges = feedData.edges.slice(0, 50);
                    }

                    feedData.updatedAt = new Date().toISOString();
                    feedData.count = feedData.edges.length;

                    await redis.setex(cacheKey, 3600, JSON.stringify(feedData));

                    // Update sorted set
                    const sortedKey = `feed:sorted:${friendId}`;
                    await redis.zadd(sortedKey, score, postId);
                    await redis.expire(sortedKey, 3600);
                    
                    updatedCount++;
                } catch (err) {
                    console.error(`❌ Error updating feed for friend ${friendId}:`, err);
                }
            }

            console.log(`Updated feed for ${updatedCount} friends with new post (score: ${score.toFixed(2)})`);

        } catch (error) {
            console.error(`Failed to update feeds for new post:`, error);
        }
    }

    // ============================================
    // SET EMPTY FEED
    // ============================================
    async setEmptyFeed(userId) {
        await redis.setex(`feed:precomputed:${userId}`, 3600, JSON.stringify({
            edges: [],
            updatedAt: new Date().toISOString(),
            count: 0,
            friendCount: 0,
            rankedBy: 'none'
        }));
        console.log(`Empty feed set for user ${userId}`);
    }

    // TRANSFORM POSTS (with score support)
    async transformPost(post, userId) {
        const profileImage = post.users?.user_profiles?.profile_image;
        const avatarUrl = profileImage
            ? (profileImage.startsWith("http") ? profileImage : `https://cdxeqrhdascyezirccrm.supabase.co/storage/v1/object/public/avatars/${profileImage}`)
            : null;

        const fullImageUrl = post.image_url
            ? (post.image_url.startsWith("http") ? post.image_url : `https://cdxeqrhdascyezirccrm.supabase.co/storage/v1/object/public/post-images/${post.image_url}`)
            : null;

        let liked = false;
        if (userId) {
            const { data: likeData } = await supabase
                .from('likes')
                .select('post_id')
                .eq('post_id', post.post_id)
                .eq('user_id', userId)
                .maybeSingle();
            liked = !!likeData;
        }

        return {
            post_id: post.post_id,
            user_id: post.user_id,
            content: post.content,
            image_url: fullImageUrl,
            total_likes: post.total_likes || 0,
            total_comments: post.total_comments || 0,
            created_at: post.created_at,
            username: post.users?.username || "Unknown User",
            avatar_url: avatarUrl,
            liked,
            cursor: Buffer.from(post.created_at).toString('base64')
        };
    }

    async transformPosts(posts, userId) {
        let likedSet = new Set();
        if (userId && posts.length > 0) {
            const { data: likes } = await supabase
                .from('likes')
                .select('post_id')
                .eq('user_id', userId)
                .in('post_id', posts.map(p => p.post_id));
            likedSet = new Set((likes || []).map(l => l.post_id));
        }

        return posts.map(post => {
            const profileImage = post.users?.user_profiles?.profile_image;
            const avatarUrl = profileImage
                ? (profileImage.startsWith("http") ? profileImage : `https://cdxeqrhdascyezirccrm.supabase.co/storage/v1/object/public/avatars/${profileImage}`)
                : null;

            const fullImageUrl = post.image_url
                ? (post.image_url.startsWith("http") ? post.image_url : `https://cdxeqrhdascyezirccrm.supabase.co/storage/v1/object/public/post-images/${post.image_url}`)
                : null;

            return {
                post_id: post.post_id,
                user_id: post.user_id,
                content: post.content,
                image_url: fullImageUrl,
                total_likes: post.total_likes || 0,
                total_comments: post.total_comments || 0,
                created_at: post.created_at,
                username: post.users?.username || "Unknown User",
                avatar_url: avatarUrl,
                liked: likedSet.has(post.post_id),
                cursor: Buffer.from(post.created_at).toString('base64')
            };
        });
    }

    // DELETE MESSAGE
    async deleteMessage(receiptHandle) {
        try {
            await sqs.deleteMessage({
                QueueUrl: this.queueUrl,
                ReceiptHandle: receiptHandle
            }).promise();
            console.log('Feed message deleted from queue');
        } catch (error) {
            console.error('Failed to delete message:', error.message);
        }
    }

    stop() {
        this.running = false;
        console.log(`Feed Worker stopping — Processed: ${this.processedCount}, Errors: ${this.errorCount}`);
    }
}

const worker = new FeedWorker();
export default worker;
export { FeedWorker };
process.on('SIGINT', () => { worker.stop(); process.exit(0); });
process.on('SIGTERM', () => { worker.stop(); process.exit(0); });

worker.start().catch(console.error);

console.log('Feed Worker running in separate process');