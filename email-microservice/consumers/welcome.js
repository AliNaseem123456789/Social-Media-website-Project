import emailService from '../services/email.service.js';
export async function welcomeEmailConsumer(message) {
  const { to, name, profileSetupLink, _meta } = message;
  console.log(`[Welcome] Processing for: ${to}`);  
  if (!to || !name) {
    throw new Error(`Missing required fields: to=${to}, name=${name}`);
  }
  
  await emailService.sendWelcomeEmail({
    to,
    name,
    profileSetupLink: profileSetupLink || `${process.env.APP_URL}/setup-profile`
  });
  
  console.log(`[Welcome] Email sent to ${to}`);
}