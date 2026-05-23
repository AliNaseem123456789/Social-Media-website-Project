import emailService from './email.service.js';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  // Initialize email service
  await emailService.init();
  
  // Send email directly (bypasses RabbitMQ)
  await emailService.sendWelcomeEmail({
    to: 'alinaseem21102002@gmail.com',
    name: 'Ali',
    profileSetupLink: 'https://socialapp.com/setup'
  });
  
  console.log('✅ Email sent directly!');
  process.exit(0);
}

test();