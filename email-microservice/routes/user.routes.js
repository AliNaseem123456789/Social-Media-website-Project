import express from 'express';
import EmailPublisher from '../services/EmailPublisher.js';

const router = express.Router();

// User signup
router.post('/signup', async (req, res) => {
  const { email, name } = req.body;
  
  try {
    // 1. Save user to database
    const user = await User.create({ email, name });
    
    // 2. Publish welcome email (async - doesn't wait)
    await EmailPublisher.sendWelcomeEmail({
      to: email,
      name: name,
      profileSetupLink: `https://socialapp.com/setup-profile?userId=${user.id}`
    });
    
    // 3. Publish verification email
    await EmailPublisher.sendAccountVerification({
      to: email,
      name: name,
      verificationLink: `https://socialapp.com/verify?token=${user.verificationToken}`,
      expiresIn: '24 hours'
    });
    
    // 4. Return response immediately (emails are async)
    res.json({ 
      success: true, 
      message: 'User created successfully! Check your email for verification.',
      userId: user.id
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Friend request
router.post('/friend-request', async (req, res) => {
  const { toUserId } = req.body;
  const sender = req.user;
  
  try {
    const recipient = await User.findById(toUserId);
    
    // Save to database
    await FriendRequest.create({
      from: sender.id,
      to: toUserId,
      status: 'pending'
    });
    
    // Publish email notification
    await EmailPublisher.sendFriendRequestNotification({
      to: recipient.email,
      recipientName: recipient.name,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      acceptLink: `https://socialapp.com/api/friend-requests/accept/${sender.id}`,
      declineLink: `https://socialapp.com/api/friend-requests/decline/${sender.id}`,
      mutualFriendsCount: await getMutualFriendsCount(sender.id, recipient.id),
      viewAllRequestsLink: 'https://socialapp.com/friend-requests'
    });
    
    res.json({ success: true, message: 'Friend request sent!' });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message
router.post('/messages', async (req, res) => {
  const { to, content } = req.body;
  const sender = req.user;
  
  try {
    const recipient = await User.findById(to);
    
    // Save message to database
    const message = await Message.create({
      from: sender.id,
      to: to,
      content: content
    });
    
    // Check if first message between them
    const messageCount = await Message.count({
      where: {
        [Op.or]: [
          { from: sender.id, to: to },
          { from: to, to: sender.id }
        ]
      }
    });
    
    // Publish email notification
    await EmailPublisher.sendNewMessageNotification({
      to: recipient.email,
      recipientName: recipient.name,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      messagePreview: content,
      messageTime: new Date().toISOString(),
      conversationLink: `https://socialapp.com/messages/${sender.id}`,
      isFirstMessage: messageCount === 1
    });
    
    res.json({ success: true, message: 'Message sent!' });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like post
router.post('/posts/:postId/like', async (req, res) => {
  const { postId } = req.params;
  const liker = req.user;
  
  try {
    const post = await Post.findById(postId);
    const postOwner = await User.findById(post.userId);
    
    // Save like to database
    await Like.create({
      userId: liker.id,
      postId: postId
    });
    
    // Don't notify if liking own post
    if (postOwner.id !== liker.id) {
      const likeCount = await Like.count({ where: { postId } });
      
      await EmailPublisher.sendPostLikeNotification({
        to: postOwner.email,
        recipientName: postOwner.name,
        likerName: liker.name,
        postPreview: post.content,
        postLink: `https://socialapp.com/posts/${postId}`,
        profileLink: `https://socialapp.com/profile/${liker.id}`,
        totalLikes: likeCount,
        isFirstLike: likeCount === 1
      });
    }
    
    res.json({ success: true, message: 'Post liked!' });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;