import emailService from '../services/email.service.js';

export async function helloEmailConsumer(data) {
  console.log(`📧 Processing hello email request`);
  console.log(`   To: ${data.to}`);
  console.log(`   Name: ${data.name || 'Not provided'}`);
  
  await emailService.sendHelloEmail({
    to: data.to,
    name: data.name,
    message: data.message
  });
  
  console.log(`✅ Hello email sent successfully`);
}