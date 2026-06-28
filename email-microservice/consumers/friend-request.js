import emailService from "../services/email.service.js";
export async function friendRequestConsumer(message) {
  const {
    to,
    recipientName,
    senderName,
    senderAvatar,
    acceptLink,
    declineLink,
    mutualFriendsCount,
    viewAllRequestsLink
  } = message;
  
  console.log(`[Friend Request] From ${senderName} to ${recipientName}`);
  
  await emailService.sendFriendRequestEmail({
    to,
    recipientName,
    senderName,
    senderAvatar,
    acceptLink,
    declineLink,
    mutualFriendsCount: mutualFriendsCount || 0,
    viewAllRequestsLink: viewAllRequestsLink || `${process.env.APP_URL}/friend-requests`
  });
  
  console.log(`[Friend Request] Notification sent to ${to}`);
}