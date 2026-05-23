import express from 'express';
import dotenv from 'dotenv';
import rabbitmq from './config/rabbitmq.js';
import { setupAllConsumers } from './consumers/index.js';
import emailService from './services/email.service.js';

dotenv.config();

const app = express();
const PORT = process.env.EMAIL_PORT || 5001;

async function startService() {
  try {
    // Initialize email service (load templates, setup transporter)
    await emailService.init();
    console.log('📧 Email service ready');
    
    // Connect to RabbitMQ
    await rabbitmq.connect();
    
    // Setup all consumers
    await setupAllConsumers();
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'email-microservice',
        version: '1.0.0',
        rabbitmq: rabbitmq.isConnected,
        consumers: [
          'email.welcome',
          'email.password-reset',
          'email.new-message',
          'email.post-like',
          'email.friend-request',
          'email.daily-reminder',
          'email.weekly-digest',
          'email.account-verification',
          'email.login-alert'
        ],
        timestamp: new Date().toISOString()
      });
    });
    
    // Stats endpoint
    app.get('/stats', (req, res) => {
      res.json({
        service: 'email-microservice',
        uptime: process.uptime(),
        queues: Array.from(rabbitmq.queues),
        rabbitmq: {
          connected: rabbitmq.isConnected
        }
      });
    });
    
    // Dead letter queue inspection (admin only)
    app.get('/admin/failed-emails', async (req, res) => {
      // This would require additional setup to read from dead letter queue
      res.json({ message: 'Use RabbitMQ management UI to view failed emails' });
    });
    
    app.listen(PORT, () => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📧 Email Microservice Running`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`❤️  Health: http://localhost:${PORT}/health`);
      console.log(`📊 Stats: http://localhost:${PORT}/stats`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    });
    
    // Graceful shutdown
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    
  } catch (error) {
    console.error('❌ Failed to start email microservice:', error.message);
    process.exit(1);
  }
}

async function gracefulShutdown() {
  console.log('\n🛑 Shutting down gracefully...');
  
  try {
    await rabbitmq.close();
    console.log('✅ RabbitMQ connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
}

startService();