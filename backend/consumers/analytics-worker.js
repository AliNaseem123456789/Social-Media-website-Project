import dotenv from 'dotenv';
dotenv.config();
import AWS from 'aws-sdk';
import supabase from '../supabaseClient.js';
import redisClient from '../config/redis.config.js';

const awsConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
};

const sqs = new AWS.SQS(awsConfig);
const QUEUES = {
    ANALYTICS: process.env.SQS_ANALYTICS_URL
};

console.log('AWS SQS configured');
console.log('Analytics Queue:', QUEUES.ANALYTICS);

class AnalyticsWorker {
    constructor() {
        this.queueUrl = QUEUES.ANALYTICS;
        
        if (!this.queueUrl) {
            console.error('SQS_ANALYTICS_URL is missing!');
            console.error('Please check your .env file');
            process.exit(1);
        }
        
        console.log(`Analytics Queue URL: ${this.queueUrl}`);
        this.running = true;
        this.batchSize = 10;
        this.waitTime = 20;
    }

    async start() {
        console.log('Analytics Worker started...');
        console.log(`Listening to: ${this.queueUrl}`);
        console.log(`Started at: ${new Date().toISOString()}`);        
        await redisClient.connect();
        console.log('Redis connected');
        
        while (this.running) {
            try {
                const params = {
                    QueueUrl: this.queueUrl,
                    MaxNumberOfMessages: this.batchSize,
                    WaitTimeSeconds: this.waitTime,
                    VisibilityTimeout: 30,
                };

                console.log('Fetching messages from SQS...');
                const response = await sqs.receiveMessage(params).promise();
                const messages = response.Messages || [];

                if (messages.length > 0) {
                    console.log(`Received ${messages.length} analytics messages`);
                    
                    for (const message of messages) {
                        await this.processMessage(message);
                        await this.deleteMessage(message.ReceiptHandle);
                    }
                }

            } catch (error) {
                console.error('Analytics Worker error:', error);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    async processMessage(message) {
        try {
            const data = JSON.parse(message.Body);
            console.log('Processing:', data.event);

            const { event, userId, data: eventData } = data;

            // 1. Store raw event
            await this.storeEvent(event, userId, eventData);

            // 2. Update daily metrics
            await this.updateDailyMetrics(event, userId, eventData);

            // 3. Update user daily stats
            if (userId) {
                await this.updateUserDailyStats(userId, event, eventData);
            }

            // 4. Update Redis cache
            await this.updateRedisCache(userId);

            return { success: true };

        } catch (error) {
            console.error('Processing failed:', error);
            throw error;
        }
    }

    async storeEvent(event, userId, eventData) {
        try {
            const { error } = await supabase
                .from('analytics_events')
                .insert([{
                    user_id: userId,
                    event_type: event,
                    event_data: eventData || {},
                    created_at: new Date()
                }]);

            if (error) {
                console.error('Failed to store event:', error.message);
            }
        } catch (error) {
            console.error('Failed to store event:', error.message);
        }
    }

    async updateDailyMetrics(event, userId, eventData) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const metricType = this.getMetricType(event);

            if (!metricType) return;

            const { data: existing } = await supabase
                .from('daily_metrics')
                .select('metric_value')
                .eq('date', today)
                .eq('metric_type', metricType)
                .maybeSingle();

            const newValue = (existing?.metric_value || 0) + 1;

            await supabase
                .from('daily_metrics')
                .upsert({
                    date: today,
                    metric_type: metricType,
                    metric_value: newValue,
                    updated_at: new Date()
                }, {
                    onConflict: 'date, metric_type'
                });

        } catch (error) {
            console.error('Error updating daily metrics:', error.message);
        }
    }

    getMetricType(event) {
        const map = {
            'POST_LIKED': 'likes',
            'POST_CREATED': 'posts',
            'USER_SIGNED_UP': 'new_users',
            'COMMENT_CREATED': 'comments',
            'USER_FOLLOWED': 'follows',
            'POST_SHARED': 'shares'
        };
        return map[event];
    }

    async updateUserDailyStats(userId, event, eventData) {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data: existing } = await supabase
                .from('user_daily_stats')
                .select('*')
                .eq('user_id', userId)
                .eq('date', today)
                .maybeSingle();

            const update = {
                user_id: userId,
                date: today,
                posts_created: existing?.posts_created || 0,
                likes_received: existing?.likes_received || 0,
                comments_received: existing?.comments_received || 0,
                followers_gained: existing?.followers_gained || 0,
                updated_at: new Date()
            };

            switch(event) {
                case 'POST_CREATED':
                    update.posts_created += 1;
                    break;
                case 'POST_LIKED':
                    if (eventData?.postOwnerId === userId) {
                        update.likes_received += 1;
                    }
                    break;
                case 'COMMENT_CREATED':
                    if (eventData?.postOwnerId === userId) {
                        update.comments_received += 1;
                    }
                    break;
                case 'USER_FOLLOWED':
                    if (eventData?.followingId === userId) {
                        update.followers_gained += 1;
                    }
                    break;
            }

            await supabase
                .from('user_daily_stats')
                .upsert(update, {
                    onConflict: 'user_id, date'
                });

        } catch (error) {
            console.error('Error updating user stats:', error.message);
        }
    }

    async updateRedisCache(userId) {
        try {
            const { data: stats } = await supabase
                .from('user_daily_stats')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false })
                .limit(7);

            if (stats && stats.length > 0) {
                const total = {
                    posts: 0,
                    likes: 0,
                    comments: 0,
                    followers: 0
                };
                for (const day of stats) {
                    total.posts += day.posts_created || 0;
                    total.likes += day.likes_received || 0;
                    total.comments += day.comments_received || 0;
                    total.followers += day.followers_gained || 0;
                }

                await redisClient.set(
                    `user_stats:${userId}`,
                    JSON.stringify({
                        weekly: total,
                        daily: stats
                    }),
                    'EX',
                    3600
                );
            }
        } catch (error) {
            console.error('Failed to update Redis cache:', error.message);
        }
    }

    async deleteMessage(receiptHandle) {
        try {
            const params = {
                QueueUrl: this.queueUrl,
                ReceiptHandle: receiptHandle
            };
            await sqs.deleteMessage(params).promise();
        } catch (error) {
            console.error('Failed to delete message:', error.message);
        }
    }

    stop() {
        this.running = false;
        console.log('Analytics Worker stopping...');
    }
}

const worker = new AnalyticsWorker();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Analytics Worker shutting down...');
    worker.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Analytics Worker shutting down...');
    worker.stop();
    process.exit(0);
});

worker.start().catch(console.error);