import { sns, TOPICS } from '../../config/aws.config.js';
class SNSPublisher {
    async publish(topicArn, eventType, data) {
        try {
            const message = {
                eventType,
                data,
                timestamp: Date.now(),
                source: 'backend-api'
            };

            const result = await sns.publish({
                TopicArn: topicArn,
                Message: JSON.stringify(message),
                MessageAttributes: {
                    'event_type': {
                        DataType: 'String',
                        StringValue: eventType
                    }
                }
            }).promise();

            console.log(`SNS Published: ${eventType} (${result.MessageId})`);
            return { success: true, messageId: result.MessageId };
        } catch (error) {
            console.error('SNS Publish Error:', error);
            return { success: false, error: error.message };
        }
    }
    async publishPostCreated(postData) {
        return this.publish(
            TOPICS.POSTS,
            'post.created',
            {
                postId: postData.id,
                userId: postData.userId,
                content: postData.content,
                images: postData.images || [],
                hashtags: postData.hashtags || []
            }
        );
    }

    async publishPostUpdated(postData) {
        return this.publish(
            TOPICS.POSTS,
            'post.updated',
            {
                postId: postData.id,
                userId: postData.userId,
                content: postData.content,
                hashtags: postData.hashtags || []
            }
        );
    }

    async publishPostDeleted(postData) {
        return this.publish(
            TOPICS.POSTS,
            'post.deleted',
            {
                postId: postData.id,
                userId: postData.userId
            }
        );
    }
    async publishPostLiked(likeData) {
    return this.publish('posts', {
      event: 'POST_LIKED',
      data: likeData,
      timestamp: new Date().toISOString()
    });
  }

  async publishPostUnliked(unlikeData) {
    return this.publish('posts', {
      event: 'POST_UNLIKED',
      data: unlikeData,
      timestamp: new Date().toISOString()
    });
  }
    async publishCommentAdded(commentData) {
        return this.publish(
            TOPICS.COMMENTS,
            'comment.added',
            {
                commentId: commentData.id,
                postId: commentData.postId,
                userId: commentData.userId,
                content: commentData.content,
                username: commentData.username
            }
        );
    }

    // ============ User Events ============
    async publishUserSignup(userData) {
        return this.publish(
            TOPICS.USERS,
            'user.signup',
            {
                userId: userData.id,
                email: userData.email,
                username: userData.username
            }
        );
    }

    // ============ Follow Events ============
    async publishUserFollowed(followData) {
        return this.publish(
            TOPICS.FOLLOWS,
            'user.followed',
            {
                followerId: followData.followerId,
                followingId: followData.followingId,
                followerName: followData.followerName
            }
        );
    }
}

export default new SNSPublisher();