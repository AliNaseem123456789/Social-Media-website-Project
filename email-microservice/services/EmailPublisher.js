import amqp from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

class EmailPublisher {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.channel && this.isConnected) return this.channel;
    
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      
      // Assert all queues (ensure they exist)
      const queues = [
        'email.welcome',
        'email.new-message',
        'email.post-like',
        'email.friend-request',
        'email.password-reset',
        'email.daily-reminder'
      ];
      
      for (const queue of queues) {
        await this.channel.assertQueue(queue, { durable: true });
      }
      
      this.isConnected = true;
      console.log('✅ Email publisher connected to RabbitMQ');
      
      // Handle connection loss
      this.connection.on('close', () => {
        console.log('⚠️ RabbitMQ connection lost, reconnecting...');
        this.isConnected = false;
        setTimeout(() => this.connect(), 5000);
      });
      
      return this.channel;
    } catch (error) {
      console.error('❌ Failed to connect to RabbitMQ:', error.message);
      throw error;
    }
  }

  async publish(queue, message) {
    try {
      await this.connect();
      
      this.channel.sendToQueue(queue, Buffer.from(JSON.stringify({
        ...message,
        _meta: {
          publishedAt: new Date().toISOString(),
          queue
        }
      })), {
        persistent: true,
        contentType: 'application/json'
      });
      
      console.log(`📤 Published to ${queue}:`, message.to || message.email);
      return true;
    } catch (error) {
      console.error(`❌ Failed to publish to ${queue}:`, error.message);
      return false;
    }
  }

  // Convenience methods for each email type
  async sendWelcomeEmail(email, name, verificationToken) {
    return this.publish('email.welcome', {
      to: email,
      name: name,
      profileSetupLink: `${process.env.APP_URL}/setup-profile?token=${verificationToken}`
    });
  }

  async sendNewMessageEmail(to, recipientName, senderName, messagePreview, conversationId) {
    return this.publish('email.new-message', {
      to,
      recipientName,
      senderName,
      messagePreview,
      conversationLink: `${process.env.APP_URL}/messages/${conversationId}`
    });
  }

  async sendPostLikeEmail(to, recipientName, likerName, postId) {
    return this.publish('email.post-like', {
      to,
      recipientName,
      likerName,
      postLink: `${process.env.APP_URL}/posts/${postId}`
    });
  }

  async sendFriendRequestEmail(to, recipientName, senderName, requestId) {
    return this.publish('email.friend-request', {
      to,
      recipientName,
      senderName,
      acceptLink: `${process.env.APP_URL}/friends/requests/${requestId}`
    });
  }

  async sendPasswordResetEmail(email, name, resetToken) {
    return this.publish('email.password-reset', {
      to: email,
      name: name,
      resetLink: `${process.env.APP_URL}/reset-password?token=${resetToken}`
    });
  }
}

export default new EmailPublisher();