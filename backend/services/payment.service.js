// // main-backend/services/payment.service.js
// import rabbitMQManager from '../config/rabbitmq.js';

// class PaymentService {
//   constructor() {
//     this.rabbitMQ = rabbitMQManager;
//   }

//   // Create checkout session (request-response)
//   async createCheckoutSession(userId, planId, billingCycle = 'monthly') {
//     try {
//       const response = await this.rabbitMQ.requestCheckout(userId, planId, billingCycle);
      
//       if (response.success) {
//         return {
//           success: true,
//           sessionId: response.sessionId,
//           checkoutUrl: response.checkoutUrl
//         };
//       } else {
//         throw new Error(response.error || 'Failed to create checkout session');
//       }
//     } catch (error) {
//       console.error('Payment service error:', error);
//       throw error;
//     }
//   }

//   // Get premium status (direct database query or via event)
//   async getPremiumStatus(userId) {
//     // Option 1: Query main database directly
//     const subscriptionService = await import('../services/subscription.service.js');
//     return subscriptionService.getUserPremiumStatus(userId);
    
//     // Option 2: Request from payment service (if needed)
//     // return this.rabbitMQ.requestPremiumStatus(userId);
//   }

//   // Cancel subscription
//   async cancelSubscription(userId, subscriptionId) {
//     await this.rabbitMQ.publish(this.rabbitMQ.queues.PAYMENT_REQUESTS, {
//       type: 'CANCEL_SUBSCRIPTION',
//       data: { userId, subscriptionId }
//     });
//   }
// }

// export default new PaymentService();