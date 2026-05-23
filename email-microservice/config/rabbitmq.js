import amqp from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

class RabbitMQManager {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.queues = new Set();
  }

  async connect() {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL;
      
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      
      // Handle connection closure
      this.connection.on('close', () => {
        console.error('RabbitMQ connection closed');
        this.isConnected = false;
        this.reconnect();
      });
      
      // Handle errors
      this.connection.on('error', (error) => {
        console.error('❌ RabbitMQ connection error:', error.message);
      });
      
      this.isConnected = true;
      console.log('✅ Connected to RabbitMQ');
      
      // Setup dead letter exchange for failed messages
      await this.setupDeadLetterExchange();
      
      return this.channel;
    } catch (error) {
      console.error('❌ Failed to connect to RabbitMQ:', error.message);
      throw error;
    }
  }

  async setupDeadLetterExchange() {
    // Declare dead letter exchange
    await this.channel.assertExchange('email.dead-letter', 'direct', { durable: true });
    
    // Declare dead letter queue
    await this.channel.assertQueue('email.failed', { durable: true });
    
    // Bind dead letter queue to exchange
    await this.channel.bindQueue('email.failed', 'email.dead-letter', 'failed');
    
    console.log('✅ Dead letter exchange configured');
  }

  async reconnect() {
    console.log('🔄 Attempting to reconnect to RabbitMQ in 5 seconds...');
    setTimeout(async () => {
      try {
        await this.connect();
        await this.rebindConsumers();
      } catch (error) {
        console.error('❌ Reconnection failed:', error.message);
        this.reconnect();
      }
    }, 5000);
  }

  async rebindConsumers() {
    // This will be called by the main app to re-register consumers
    if (this.rebindCallback) {
      await this.rebindCallback();
    }
  }

  setRebindCallback(callback) {
    this.rebindCallback = callback;
  }

  async assertQueue(queueName, options = {}) {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    
    const defaultOptions = {
      durable: true,           // Survive broker restarts
      arguments: {
        'x-dead-letter-exchange': 'email.dead-letter',
        'x-dead-letter-routing-key': 'failed',
        'x-max-retries': 3,
        'x-retry-delay': 5000
      }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    await this.channel.assertQueue(queueName, finalOptions);
    this.queues.add(queueName);
    
    console.log(`📋 Queue asserted: ${queueName}`);
    return queueName;
  }

  async consume(queueName, consumerCallback, options = {}) {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    
    await this.assertQueue(queueName);
    
    const defaultOptions = {
      noAck: false,  // Manual acknowledgment (so we can retry on failure)
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    await this.channel.consume(queueName, async (message) => {
      if (!message) return;
      
      try {
        const content = JSON.parse(message.content.toString());
        console.log(`📨 Received message from ${queueName}:`, content);
        
        // Call the consumer with retry logic
        await this.handleWithRetry(queueName, consumerCallback, content, message);
        
      } catch (error) {
        console.error(`❌ Error processing message from ${queueName}:`, error.message);
        await this.handleFailedMessage(queueName, message, error);
      }
    }, finalOptions);
    
    console.log(`👂 Listening on queue: ${queueName}`);
  }

  async handleWithRetry(queueName, consumerCallback, content, message) {
    const retryCount = this.getRetryCount(message);
    
    try {
      await consumerCallback(content);
      
      // Success - acknowledge the message
      this.channel.ack(message);
      console.log(`✅ Message processed successfully from ${queueName}`);
      
    } catch (error) {
      if (retryCount < 3) {
        // Retry - reject and requeue with delay
        console.log(`🔄 Retry ${retryCount + 1}/3 for ${queueName}`);
        this.channel.nack(message, false, false); // Don't requeue immediately
        
        // Send to retry queue with delay
        await this.sendToRetryQueue(queueName, content, retryCount + 1, error.message);
      } else {
        // Failed after all retries - send to dead letter
        console.error(`💀 Max retries reached for ${queueName}, sending to dead letter`);
        this.channel.nack(message, false, false);
        await this.sendToDeadLetter(queueName, content, error.message);
      }
    }
  }

  getRetryCount(message) {
    const properties = message.properties;
    if (properties && properties.headers && properties.headers['x-retry-count']) {
      return properties.headers['x-retry-count'];
    }
    return 0;
  }

  async sendToRetryQueue(originalQueue, content, retryCount, errorMessage) {
    const retryQueue = `${originalQueue}.retry`;
    
    await this.assertQueue(retryQueue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': originalQueue,
        'x-message-ttl': 5000 * retryCount, // Delay increases with each retry
      }
    });
    
    this.channel.sendToQueue(retryQueue, Buffer.from(JSON.stringify({
      ...content,
      _retry: {
        count: retryCount,
        lastError: errorMessage,
        lastAttempt: new Date().toISOString()
      }
    })), {
      headers: { 'x-retry-count': retryCount }
    });
  }

  async sendToDeadLetter(originalQueue, content, errorMessage) {
    const deadLetterQueue = 'email.failed';
    
    await this.channel.sendToQueue(deadLetterQueue, Buffer.from(JSON.stringify({
      ...content,
      _failure: {
        originalQueue,
        error: errorMessage,
        timestamp: new Date().toISOString()
      }
    })));
    
    console.log(`💀 Message sent to dead letter queue from ${originalQueue}`);
  }

  async publish(queueName, message) {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    
    await this.assertQueue(queueName);
    
    const buffer = Buffer.from(JSON.stringify({
      ...message,
      _meta: {
        publishedAt: new Date().toISOString(),
        queue: queueName
      }
    }));
    
    const result = this.channel.sendToQueue(queueName, buffer, {
      persistent: true,  // Save to disk
      contentType: 'application/json'
    });
    
    console.log(`📤 Published message to ${queueName}`);
    return result;
  }

  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    this.isConnected = false;
    console.log('🔌 RabbitMQ connection closed');
  }
}

export default new RabbitMQManager();