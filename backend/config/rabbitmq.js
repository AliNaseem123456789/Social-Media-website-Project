import amqp from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

class RabbitMQManager {
  constructor() {
    this.channel = null;
    this.connection = null;
  }

  async connect() {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      console.log('Backend: Connected to RabbitMQ');
      return this.channel;
    } catch (error) {
      console.error('Backend: RabbitMQ connection failed:', error.message);
      return null;
    }
  }

  async publish(queueName, message) {
    if (!this.channel) {
      await this.connect();
    }
    
    if (!this.channel) {
      console.error('Backend: Cannot publish - no channel');
      return false;
    }
    
    // IMPORTANT: DO NOT assert queue here - just publish
    // The queue should already exist from email microservice
    this.channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
      persistent: true
    });
    
    console.log(`Backend: Published to ${queueName}`);
    return true;
  }
}

export default new RabbitMQManager();