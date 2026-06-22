// services/publishers/SQSPublisher.js
import { sqs, QUEUES } from '../../config/aws.config.js';

class SQSPublisher {
    async sendMessage(queueUrl, message, delaySeconds = 0) {
        try {
            const params = {
                QueueUrl: queueUrl,
                MessageBody: JSON.stringify(message),
                DelaySeconds: delaySeconds
            };

            // For FIFO queues
            if (queueUrl && queueUrl.includes('.fifo')) {
                params.MessageDeduplicationId = `${message.id || Date.now()}-${Date.now()}`;
                params.MessageGroupId = message.groupId || 'default';
            }

            const result = await sqs.sendMessage(params).promise();
            console.log(`📬 SQS Message sent: ${result.MessageId}`);
            return { success: true, messageId: result.MessageId };
        } catch (error) {
            console.error('❌ SQS Send Error:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ Image Processing ============
    async sendToImageQueue(data) {
        return this.sendMessage(
            QUEUES.IMAGE,
            {
                action: 'PROCESS_IMAGES',
                postId: data.postId,
                imageUrls: data.imageUrls,
                userId: data.userId,
                timestamp: Date.now()
            },
            data.delay || 5
        );
    }

    // ============ Search Indexing ============
    async sendToSearchQueue(data) {
        return this.sendMessage(
            QUEUES.SEARCH,
            {
                action: 'INDEX_POST',
                postId: data.postId,
                content: data.content,
                userId: data.userId,
                hashtags: data.hashtags || [],
                timestamp: Date.now()
            },
            data.delay || 0
        );
    }

    // ============ Analytics ============
    async sendToAnalyticsQueue(data) {
        return this.sendMessage(
            QUEUES.ANALYTICS,
            {
                event: data.event,
                userId: data.userId,
                data: data.data,
                timestamp: Date.now()
            },
            data.delay || 5
        );
    }

    // ============ Notifications ============
    async sendToNotificationQueue(data) {
        return this.sendMessage(
            QUEUES.NOTIFICATION,
            {
                type: data.type, // LIKE, COMMENT, FOLLOW
                recipientId: data.recipientId,
                actorId: data.actorId,
                actorName: data.actorName,
                postId: data.postId,
                timestamp: Date.now()
            },
            data.delay || 0
        );
    }
    
    // ============ Recommendations ============
    async sendToRecommendationQueue(data) {
        return this.sendMessage(
            QUEUES.RECOMMENDATION,
            {
                action: 'GENERATE_RECOMMENDATIONS',
                userId: data.userId,
                interests: data.interests || [],
                timestamp: Date.now()
            },
            data.delay || 10
        );
    }

    // ============ Feed Generation ============
   // services/publishers/SQSPublisher.js

async sendToFeedQueue(data) {
    return this.sendMessage(
        QUEUES.FEED,
        {
            action: data.action, // 'NEW_POST', 'UPDATE_FEED', 'REFRESH_USER', 'FRIEND_ACCEPTED'
            userId: data.userId,
            friendId: data.friendId,  // For friend acceptance
            postId: data.postId,
            timestamp: Date.now()
        },
        data.delay || 0
    );
}

    // ============ Cleanup ============
    async sendToCleanupQueue(data) {
        return this.sendMessage(
            QUEUES.CLEANUP,
            {
                action: 'DELETE_USER_DATA',
                userId: data.userId,
                tasks: data.tasks || [],
                timestamp: Date.now()
            },
            data.delay || 60
        );
    }

    // ============ Moderation ============
    async sendToModerationQueue(data) {
        return this.sendMessage(
            QUEUES.MODERATION,
            {
                action: 'REVIEW_CONTENT',
                postId: data.postId,
                reason: data.reason,
                reportedBy: data.reportedBy,
                timestamp: Date.now()
            },
            data.delay || 0
        );
    }
}

export default new SQSPublisher();