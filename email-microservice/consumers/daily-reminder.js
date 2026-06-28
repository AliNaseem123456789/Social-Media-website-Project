import emailService from "../services/email.service.js";

export async function dailyReminderConsumer(message) {
  const {
    to,
    name,
    notificationsCount,
    messagesCount,
    likesCount,
    friendRequestsCount,
    notificationsLink,
    messagesLink,
    activityLink,
    friendRequestsLink,
    feedLink,
    trendingPosts
  } = message;
  
  console.log(`[Daily Reminder] For ${to}`);
  
  await emailService.sendDailyReminderEmail({
    to,
    name,
    notificationsCount: notificationsCount || 0,
    messagesCount: messagesCount || 0,
    likesCount: likesCount || 0,
    friendRequestsCount: friendRequestsCount || 0,
    notificationsLink: notificationsLink || `${process.env.APP_URL}/notifications`,
    messagesLink: messagesLink || `${process.env.APP_URL}/messages`,
    activityLink: activityLink || `${process.env.APP_URL}/activity`,
    friendRequestsLink: friendRequestsLink || `${process.env.APP_URL}/friend-requests`,
    feedLink: feedLink || `${process.env.APP_URL}/feed`,
    trendingPosts: trendingPosts || []
  });
  
  console.log(`[Daily Reminder] Sent to ${to}`);
}