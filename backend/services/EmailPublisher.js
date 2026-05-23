import rabbitmq from '../config/rabbitmq.js';

const EmailPublisher = {
  async sendWelcomeEmail({ to, name, profileSetupLink }) {
    return rabbitmq.publish('email.welcome', {
      to,
      name,
      profileSetupLink
    });
  },

  async sendNewMessageEmail({ to, recipientName, senderName, messagePreview, conversationLink }) {
    return rabbitmq.publish('email.new-message', {
      to,
      recipientName,
      senderName,
      messagePreview,
      conversationLink
    });
  },

  async sendPostLikeEmail({ to, recipientName, likerName, postLink }) {
    return rabbitmq.publish('email.post-like', {
      to,
      recipientName,
      likerName,
      postLink
    });
  },
async sendCommentNotification({ to, recipientName, commenterName, commentText, postLink, postPreview }) {
  return rabbitmq.publish('email.comment', {  // ← Use rabbitmq, not this
    to,
    recipientName,
    commenterName,
    commentText,
    postLink,
    postPreview,
    commentTime: new Date().toISOString()
  });
},
  async sendFriendRequestEmail({ to, recipientName, senderName, acceptLink }) {
    return rabbitmq.publish('email.friend-request', {
      to,
      recipientName,
      senderName,
      acceptLink
    });
  }
};

export default EmailPublisher;