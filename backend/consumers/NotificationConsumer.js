import { sqs, QUEUES } from '../config/aws.config.js';
import supabase from '../supabaseClient.js';

class NotificationConsumer {
    constructor() {
        this.queueUrl = QUEUES.NOTIFICATION;
        this.running = true;
        this.batchSize = 10;
        this.waitTime = 20;
        this.io = null;
    }

    setIO(io) {
        this.io = io;
        console.log('Socket.IO instance set for Notification Consumer');
    }

    async start() {
        console.log('Notification Consumer started...');
        console.log(`Listening to: ${this.queueUrl}`);
        
        while (this.running) {
            try {
                const params = {
                    QueueUrl: this.queueUrl,
                    MaxNumberOfMessages: this.batchSize,
                    WaitTimeSeconds: this.waitTime,
                    VisibilityTimeout: 30,
                };

                const response = await sqs.receiveMessage(params).promise();
                const messages = response.Messages || [];

                if (messages.length > 0) {
                    console.log(`Received ${messages.length} notification messages`);
                    
                    for (const message of messages) {
                        await this.processMessage(message);
                        await this.deleteMessage(message.ReceiptHandle);
                    }
                }

            } catch (error) {
                console.error('Notification Consumer error:', error);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    async processMessage(message) {
        try {
            const data = JSON.parse(message.Body);
            console.log('Processing notification:', data);

            const { type, recipientId, actorId, actorName, postId } = data;
            const notification = await this.saveNotification({
                userId: recipientId,
                type: type.toLowerCase(),
                actorId: actorId,
                actorName: actorName,
                postId: postId,
                content: this.generateNotificationContent(type, actorName, postId)
            });

            if (this.io) {
                const room = `user_${recipientId}`;
                this.io.to(room).emit('new_notification', {
                    ...notification,
                    createdAt: new Date().toISOString()
                });
                console.log(`Emitted notification to room: ${room}`);
            }

            await this.updateUnreadCount(recipientId);

            return { success: true, notification };

        } catch (error) {
            console.error('Notification processing failed:', error);
            throw error;
        }
    }

    async saveNotification(data) {
        const { userId, type, actorId, actorName, postId, content } = data;

        const { data: notification, error } = await supabase
            .from('notifications')
            .insert([{
                user_id: userId,
                type: type,
                actor_id: actorId,
                actor_name: actorName || 'Someone',
                target_id: postId || null,
                content: content || this.generateNotificationContent(type, actorName, postId),
                read: false,
                created_at: new Date()
            }])
            .select('id, type, actor_id, actor_name, target_id, content, read, created_at')
            .single();

        if (error) {
            console.error('Failed to save notification:', error);
            throw error;
        }

        return notification;
    }

    generateNotificationContent(type, actorName, postId) {
        const actions = {
            'like': `${actorName || 'Someone'} liked your post`,
            'comment': `${actorName || 'Someone'} commented on your post`,
            'follow': `${actorName || 'Someone'} started following you`,
            'friend_request': `${actorName || 'Someone'} sent you a friend request`,
            'friend_accept': `${actorName || 'Someone'} accepted your friend request`,
            'mention': `${actorName || 'Someone'} mentioned you in a post`
        };
        return actions[type.toLowerCase()] || `${actorName || 'Someone'} interacted with your content`;
    }

    async updateUnreadCount(userId) {
        try {
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('read', false);

            if (error) throw error;

            const redis = await import('../config/redis.config.js');
            await redis.default.set(`unread_count:${userId}`, count || 0);
            
            if (this.io) {
                this.io.to(`user_${userId}`).emit('unread_count_update', { count: count || 0 });
            }
            
            return count || 0;
        } catch (error) {
            console.error('Failed to update unread count:', error);
            return 0;
        }
    }

    async deleteMessage(receiptHandle) {
        try {
            const params = {
                QueueUrl: this.queueUrl,
                ReceiptHandle: receiptHandle
            };
            await sqs.deleteMessage(params).promise();
            console.log('Message deleted from queue');
        } catch (error) {
            console.error('Failed to delete message:', error);
        }
    }

    stop() {
        this.running = false;
        console.log('Notification Consumer stopping...');
    }
}

const notificationConsumer = new NotificationConsumer();
export default notificationConsumer;