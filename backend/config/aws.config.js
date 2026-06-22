import AWS from 'aws-sdk';

// const isLocal = process.env.USE_LOCALSTACK === 'true';
const isLocal=false;
const awsConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: isLocal ? 'http://localhost:4566' : undefined,
    credentials: isLocal ? {
        accessKeyId: 'test',
        secretAccessKey: 'test'
    } : {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
};

export const sns = new AWS.SNS(awsConfig);
export const sqs = new AWS.SQS(awsConfig);
export const QUEUES = {
    IMAGE: process.env.SQS_IMAGE_URL,
    SEARCH: process.env.SQS_SEARCH_URL,
    ANALYTICS: process.env.SQS_ANALYTICS_URL,
    NOTIFICATION: process.env.SQS_NOTIFICATION_URL,
    RECOMMENDATION: process.env.SQS_RECOMMENDATION_URL,
    FEED: process.env.SQS_FEED_URL,
    CLEANUP: process.env.SQS_CLEANUP_URL,
    MODERATION: process.env.SQS_MODERATION_URL
};
export const TOPICS = {
    POSTS: process.env.SNS_POSTS_TOPIC_ARN,
    COMMENTS: process.env.SNS_COMMENTS_TOPIC_ARN,
    USERS: process.env.SNS_USERS_TOPIC_ARN,
    FOLLOWS: process.env.SNS_FOLLOWS_TOPIC_ARN
};

console.log(`AWS Config: ${isLocal ? 'LOCALSTACK' : 'PRODUCTION'}`);