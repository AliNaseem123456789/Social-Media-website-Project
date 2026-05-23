import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
  constructor() {
    this.transporter = null;
  }

  async init() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    console.log('📧 Email service initialized');
  }

  async sendWelcomeEmail({ to, name, profileSetupLink }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h1 style="color: #4267B2;">Welcome ${name}! 🎉</h1>
        <p>Thanks for joining SocialApp!</p>
        <a href="${profileSetupLink}" style="background-color: #4267B2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
          Complete Your Profile
        </a>
      </div>
    `;
    
    const info = await this.transporter.sendMail({
      from: `"SocialApp" <${process.env.SMTP_USER}>`,
      to: to,
      subject: 'Welcome to SocialApp! 🎉',
      html: html,
      text: `Welcome ${name}! Thanks for joining SocialApp.`
    });
    
    console.log(`✅ Welcome email sent to ${to}`);
    return info;
  }

  async sendNewMessageEmail({ to, recipientName, senderName, messagePreview, conversationLink }) {
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>New Message from ${senderName} 💬</h2>
        <div style="background-color: #f0f2f5; padding: 15px; border-radius: 8px;">
          <p>"${messagePreview}"</p>
        </div>
        <a href="${conversationLink}" style="background-color: #4267B2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
          Reply to ${senderName}
        </a>
      </div>
    `;
    
    const info = await this.transporter.sendMail({
      from: `"SocialApp" <${process.env.SMTP_USER}>`,
      to: to,
      subject: `New message from ${senderName}`,
      html: html,
      text: `New message from ${senderName}: "${messagePreview}"`
    });
    
    console.log(`✅ Message notification sent to ${to}`);
    return info;
  }

  async sendPostLikeEmail({ to, recipientName, likerName, postLink }) {
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>❤️ ${likerName} liked your post!</h2>
        <a href="${postLink}" style="background-color: #4267B2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
          View Post
        </a>
      </div>
    `;
    
    const info = await this.transporter.sendMail({
      from: `"SocialApp" <${process.env.SMTP_USER}>`,
      to: to,
      subject: `${likerName} liked your post`,
      html: html,
      text: `${likerName} liked your post. View it here: ${postLink}`
    });
    
    console.log(`✅ Like notification sent to ${to}`);
    return info;
  }

  async sendFriendRequestEmail({ to, recipientName, senderName, acceptLink }) {
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>👋 ${senderName} sent you a friend request!</h2>
        <a href="${acceptLink}" style="background-color: #42b72a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
          Accept Request
        </a>
      </div>
    `;
    
    const info = await this.transporter.sendMail({
      from: `"SocialApp" <${process.env.SMTP_USER}>`,
      to: to,
      subject: `${senderName} sent you a friend request`,
      html: html,
      text: `${senderName} sent you a friend request. Accept here: ${acceptLink}`
    });
    
    console.log(`✅ Friend request notification sent to ${to}`);
    return info;
  }
  async sendCommentNotification({ to, recipientName, commenterName, commentText, postLink, postPreview, commentTime }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #4267B2 0%, #365899 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">New Comment 💬</h1>
      </div>
      
      <div style="padding: 30px; background: white; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px;">Hello <strong>${recipientName}</strong>,</p>
        
        <p><strong>${commenterName}</strong> commented on your post:</p>
        
        <div style="background: #f0f2f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-style: italic; color: #333;">
            "${commentText}"
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${postLink}" style="display: inline-block; background-color: #4267B2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Comment →
          </a>
        </div>
        
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        
        <div style="font-size: 12px; color: #666; text-align: center;">
          <p>You're receiving this because someone commented on your post.</p>
          <p><a href="${process.env.APP_URL}/settings/notifications" style="color: #4267B2;">Manage notification settings</a></p>
        </div>
      </div>
    </div>
  `;
  
  const text = `
New Comment from ${commenterName}

Hello ${recipientName},

${commenterName} commented on your post:
"${commentText}"

View and reply here: ${postLink}

---
Manage your notification settings: ${process.env.APP_URL}/settings/notifications
  `;
  
  const info = await this.transporter.sendMail({
    from: `"SocialApp" <${process.env.SMTP_USER}>`,
    to: to,
    subject: `${commenterName} commented on your post`,
    html: html,
    text: text
  });
  
  console.log(`✅ Comment notification sent to ${to}`);
  return info;
}
  async sendDailyReminderEmail({ to, name, notificationsCount, messagesCount, likesCount, friendRequestsCount }) {
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>Your Daily Snapshot 📊</h2>
        <p>Hello ${name}, here's what you missed:</p>
        <ul>
          <li>🔔 ${notificationsCount} notifications</li>
          <li>💬 ${messagesCount} messages</li>
          <li>❤️ ${likesCount} likes</li>
          <li>👥 ${friendRequestsCount} friend requests</li>
        </ul>
      </div>
    `;
    
    const info = await this.transporter.sendMail({
      from: `"SocialApp" <${process.env.SMTP_USER}>`,
      to: to,
      subject: 'Your daily SocialApp update 📊',
      html: html,
      text: `Hello ${name}! You have ${notificationsCount} notifications, ${messagesCount} messages, ${likesCount} likes, and ${friendRequestsCount} friend requests.`
    });
    
    console.log(`✅ Daily reminder sent to ${to}`);
    return info;
  }
}

export default new EmailService();