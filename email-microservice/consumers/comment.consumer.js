import emailService from '../services/email.service.js';

export async function commentConsumer(message) {
  const {
    to,
    recipientName,
    commenterName,
    commentText,
    postLink,
    postPreview,
    commentTime
  } = message;
  
  console.log(`[Comment] ${commenterName} commented on ${recipientName}'s post`);
  
  if (!to || !recipientName || !commenterName || !commentText) {
    throw new Error('Missing required fields for comment email');
  }
  
  await emailService.sendCommentNotification({
    to,
    recipientName,
    commenterName,
    commentText,
    postLink,
    postPreview: postPreview || 'a post',
    commentTime: commentTime || new Date().toISOString()
  });
  
  console.log(`[Comment] Notification sent to ${to}`);
}