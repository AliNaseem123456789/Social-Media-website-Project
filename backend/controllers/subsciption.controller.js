// main-backend/controllers/subscription.controller.js
import EventOrchestrator from '../services/orchestrators/EventOrchestrators.js';

class SubscriptionController {
    async subscribe(req, res) {
        try {
            const userId = req.user.id;
            const { planId, billingCycle } = req.body;

            // Call EventOrchestrator which handles RabbitMQ communication
            const result = await EventOrchestrator.onSubscribeRequest(
                userId,
                planId,
                billingCycle || 'monthly'
            );

            if (result.success) {
                return res.json({
                    success: true,
                    data: {
                        checkoutUrl: result.data.checkoutUrl,
                        sessionId: result.data.sessionId
                    }
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: result.error
                });
            }
        } catch (error) {
            console.error('Subscription error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create subscription'
            });
        }
    }

    async getPremiumStatus(req, res) {
        try {
            const userId = req.user.id;
            
            // ✅ Use EventOrchestrator
            const status = await EventOrchestrator.getPremiumStatus(userId);
            
            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            console.error('Error checking premium status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to check premium status'
            });
        }
    }
}

export default new SubscriptionController();