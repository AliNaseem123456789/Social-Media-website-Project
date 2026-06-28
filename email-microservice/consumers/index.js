import rabbitmq from '../config/rabbitmq.js';
import { welcomeEmailConsumer } from './welcome.js';
// import { passwordResetConsumer } from './password-reset.js';
import { newMessageConsumer } from './new-message.js';
import { postLikeConsumer } from './post-like.js';
import { friendRequestConsumer } from './friend-request.js';
import { dailyReminderConsumer } from './daily-reminder.js';
// import { weeklyDigestConsumer } from './weekly-digest.consumer.js';
// import { accountVerificationConsumer } from './account-verification.consumer.js';
// import { loginAlertConsumer } from './login-alert.consumer.js';
import { commentConsumer } from './comment.consumer.js';

export async function setupAllConsumers() {
  const consumers = [
    { queue: 'email.welcome', handler: welcomeEmailConsumer },
    // { queue: 'email.password-reset', handler: passwordResetConsumer },
    { queue: 'email.new-message', handler: newMessageConsumer },
    { queue: 'email.post-like', handler: postLikeConsumer },
    { queue: 'email.friend-request', handler: friendRequestConsumer },
    { queue: 'email.daily-reminder', handler: dailyReminderConsumer },
      { queue: 'email.comment', handler: commentConsumer }
  ];
  
  for (const consumer of consumers) {
    await rabbitmq.consume(consumer.queue, consumer.handler);
  }
  
  console.log(`Registered ${consumers.length} email consumers`);
  
  // Set rebind callback for reconnection
  rabbitmq.setRebindCallback(async () => {
    console.log('Rebinding all consumers...');
    await setupAllConsumers();
  });
} // { queue: 'email.weekly-digest', handler: weeklyDigestConsumer },
    // { queue: 'email.account-verification', handler: accountVerificationConsumer },
    // { queue: 'email.login-alert', handler: loginAlertConsumer },