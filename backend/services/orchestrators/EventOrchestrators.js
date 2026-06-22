// services/orchestrators/EventOrchestrators.js
import SNSPublisher from '../publishers/SNSPublisher.js';
import SQSPublisher from '../publishers/SQSPublisher.js';
import EmailPublisher from '../EmailPublisher.js';

class EventOrchestrator {
    constructor() {
        this.sns = SNSPublisher;
        this.sqs = SQSPublisher;
        this.email = EmailPublisher;
        
        // Check if AWS is configured
        this.isAWSConfigured = this.checkAWSConfig();
    }

    checkAWSConfig() {
        const requiredEnvVars = [
            'SNS_POSTS_TOPIC_ARN',
            'SQS_IMAGE_URL',
            'SQS_SEARCH_URL',
            'SQS_ANALYTICS_URL',
            'SQS_NOTIFICATION_URL'
        ];
        
        const missing = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missing.length > 0) {
            console.warn('⚠️ AWS SQS/SNS not fully configured. Missing:', missing.join(', '));
            console.warn('⚠️ Only RabbitMQ emails will work for now.');
            return false;
        }
        
        console.log('✅ AWS SQS/SNS configured');
        return true;
    }

    async onPostLiked(postId, postOwnerId, likerId, likerName, postOwnerEmail, postOwnerName) {
        console.log('🔔 onPostLiked called with:', {
            postId,
            postOwnerId,
            likerId,
            likerName,
            postOwnerEmail,
            postOwnerName
        });

        const results = {
            sns: null,
            sqs: null,
            email: null
        };

        // 1️⃣ SNS: Broadcast (only if configured)
        if (this.isAWSConfigured) {
            try {
                // ✅ FIX: Pass as object, not individual parameters
                results.sns = await this.sns.publishPostLiked({
                    postId: postId,
                    userId: postOwnerId,
                    likerId: likerId,
                    likerName: likerName
                });
                console.log('✅ SNS event published');
            } catch (error) {
                console.error('❌ SNS failed:', error.message);
                results.sns = { success: false, error: error.message };
            }
            try {
            results.feed = await this.sqs.sendToFeedQueue({
                action: 'NEW_POST',
                postId: postData.id,
                userId: postData.userId,
                timestamp: Date.now()
            });
            console.log('✅ Feed update queued');
        } catch (error) {
            console.error('❌ Feed queue failed:', error.message);
            results.feed = { success: false, error: error.message };
        }

            // 2️⃣ SQS: Notification queue (only if configured)
            try {
                results.sqs = await this.sqs.sendToNotificationQueue({
                    type: 'LIKE',
                    recipientId: postOwnerId,
                    actorId: likerId,
                    actorName: likerName,
                    postId: postId
                });
                console.log('✅ SQS notification queued');
            } catch (error) {
                console.error('❌ SQS failed:', error.message);
                results.sqs = { success: false, error: error.message };
            }

            // 3️⃣ SQS: Analytics (only if configured)
            try {
                results.sqsAnalytics = await this.sqs.sendToAnalyticsQueue({
                    event: 'POST_LIKED',
                    userId: likerId,
                    data: {
                        postId: postId,
                        postOwnerId: postOwnerId
                    }
                });
                console.log('✅ SQS analytics queued');
            } catch (error) {
                console.error('❌ SQS analytics failed:', error.message);
                results.sqsAnalytics = { success: false, error: error.message };
            }
        } else {
            console.log('ℹ️ AWS SQS/SNS skipped (not configured)');
            results.sns = { success: false, skipped: true, reason: 'AWS not configured' };
            results.sqs = { success: false, skipped: true, reason: 'AWS not configured' };
        }

        // 4️⃣ RabbitMQ: Email notification (ALWAYS works)
        if (postOwnerEmail && postOwnerName) {
            try {
                results.email = await this.email.sendPostLikeEmail({
                    to: postOwnerEmail,
                    recipientName: postOwnerName,
                    likerName: likerName,
                    postLink: `${process.env.APP_URL || 'http://localhost:3000'}/posts/${postId}`
                });
                console.log('✅ RabbitMQ email queued');
            } catch (error) {
                console.error('❌ RabbitMQ email failed:', error.message);
                results.email = { success: false, error: error.message };
            }
        }

        return {
            success: true,
            results
        };
    }

    // ============ Comment Events ============
    async onCommentAdded(commentData) {
        console.log('🔔 onCommentAdded called with:', commentData);

        const results = {
            sns: null,
            sqs: null,
            email: null
        };

        // 1️⃣ SNS: Broadcast comment
        if (this.isAWSConfigured) {
            try {
                results.sns = await this.sns.publishCommentAdded({
                    id: commentData.id,
                    postId: commentData.postId,
                    userId: commentData.userId,
                    content: commentData.content,
                    username: commentData.username
                });
                console.log('✅ SNS comment event published');
            } catch (error) {
                console.error('❌ SNS failed:', error.message);
                results.sns = { success: false, error: error.message };
            }

            // 2️⃣ SQS: Notification
            try {
                results.sqs = await this.sqs.sendToNotificationQueue({
                    type: 'COMMENT',
                    recipientId: commentData.postOwnerId,
                    actorId: commentData.userId,
                    actorName: commentData.username,
                    postId: commentData.postId
                });
                console.log('✅ SQS notification queued');
            } catch (error) {
                console.error('❌ SQS failed:', error.message);
                results.sqs = { success: false, error: error.message };
            }
        }

        // 3️⃣ RabbitMQ: Email notification
        if (commentData.postOwnerEmail && commentData.postOwnerName) {
            try {
                results.email = await this.email.sendCommentNotification({
                    to: commentData.postOwnerEmail,
                    recipientName: commentData.postOwnerName,
                    commenterName: commentData.username,
                    commentText: commentData.content,
                    postLink: `${process.env.APP_URL || 'http://localhost:3000'}/posts/${commentData.postId}`,
                    postPreview: commentData.postPreview || ''
                });
                console.log('✅ RabbitMQ email queued');
            } catch (error) {
                console.error('❌ RabbitMQ email failed:', error.message);
                results.email = { success: false, error: error.message };
            }
        }

        return {
            success: true,
            results
        };
    }

    // ============ User Signup ============
    async onUserSignup(userData) {
        console.log('🔔 onUserSignup called with:', userData);

        const results = {
            sns: null,
            sqs: null,
            email: null
        };

        if (this.isAWSConfigured) {
            try {
                results.sns = await this.sns.publishUserSignup({
                    id: userData.id,
                    email: userData.email,
                    username: userData.username
                });
                console.log('✅ SNS user signup published');
            } catch (error) {
                console.error('❌ SNS failed:', error.message);
                results.sns = { success: false, error: error.message };
            }

            try {
                results.sqs = await this.sqs.sendToRecommendationQueue({
                    userId: userData.id,
                    interests: userData.interests || []
                });
                console.log('✅ SQS recommendation queued');
            } catch (error) {
                console.error('❌ SQS failed:', error.message);
                results.sqs = { success: false, error: error.message };
            }
        }

        try {
            results.email = await this.email.sendWelcomeEmail({
                to: userData.email,
                name: userData.username,
                profileSetupLink: userData.verificationLink
            });
            console.log('✅ RabbitMQ welcome email queued');
        } catch (error) {
            console.error('❌ RabbitMQ email failed:', error.message);
            results.email = { success: false, error: error.message };
        }

        return {
            success: true,
            results
        };
    }

    //friend 
    async onFriendAccepted(userId1, userId2) {
    console.log('🤝 onFriendAccepted called with:', { userId1, userId2 });

    const results = {
        feed: null
    };

    if (this.isAWSConfigured) {
        try {
            // Update feed for both users
            results.feed = await this.sqs.sendToFeedQueue({
                action: 'FRIEND_ACCEPTED',
                userId: userId1,
                friendId: userId2,
                timestamp: Date.now()
            });
            console.log('✅ Feed update queued for friend acceptance');
        } catch (error) {
            console.error('❌ Feed queue failed:', error.message);
            results.feed = { success: false, error: error.message };
        }
    }

    return { success: true, results };
}
    // ============ Follow Events ============
    async onUserFollowed(followerId, followingId, followerName) {
        console.log('🔔 onUserFollowed called with:', {
            followerId,
            followingId,
            followerName
        });

        const results = {
            sns: null,
            sqs: null
        };

        if (this.isAWSConfigured) {
            try {
                results.sns = await this.sns.publishUserFollowed({
                    followerId: followerId,
                    followingId: followingId,
                    followerName: followerName
                });
                console.log('✅ SNS follow event published');
            } catch (error) {
                console.error('❌ SNS failed:', error.message);
                results.sns = { success: false, error: error.message };
            }

            try {
                results.sqs = await this.sqs.sendToFeedQueue({
                    userId: followingId,
                    followerId: followerId
                });
                console.log('✅ SQS feed queued');
            } catch (error) {
                console.error('❌ SQS failed:', error.message);
                results.sqs = { success: false, error: error.message };
            }
        }

        return {
            success: true,
            results
        };
    }
}

export default new EventOrchestrator();