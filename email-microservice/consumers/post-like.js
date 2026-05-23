import emailService from "../services/email.service.js";
export async function postLikeConsumer(message) {
  const {
    to,
    recipientName,
    likerName,
    postPreview,
    postLink,
    profileLink,
    totalLikes,
    isFirstLike
  } = message;
  
  console.log(`❤️ [Post Like] ${likerName} liked ${recipientName}'s post`);
  
  await emailService.sendPostLikeEmail({
    to,
    recipientName,
    likerName,
    postPreview,
    postLink,
    profileLink,
    totalLikes: totalLikes || 1,
    isFirstLike: isFirstLike || false
  });
  
  console.log(`✅ [Post Like] Notification sent to ${to}`);
}