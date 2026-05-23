import emailService from "../services/email.service.js";
export async function newMessageConsumer(message) {
  const {
    to,
    recipientName,
    senderName,
    senderAvatar,
    messagePreview,
    messageTime,
    conversationLink,
    isFirstMessage
  } = message;
  
  console.log(`[New Message] From ${senderName} to ${to}`);
  
  if (!to || !recipientName || !senderName || !messagePreview) {
    throw new Error('Missing required fields for new message email');
  }
  
  await emailService.sendNewMessageEmail({
    to,
    recipientName,
    senderName,
    senderAvatar,
    messagePreview,
    messageTime: messageTime || new Date().toISOString(),
    conversationLink: conversationLink || `${process.env.APP_URL}/messages/${senderName}`,
    isFirstMessage: isFirstMessage || false
  });
  
  console.log(`✅ [New Message] Notification sent to ${to}`);
}