import amqp from 'amqplib';

async function test() {
  const connection = await amqp.connect('amqp://guest:guest@localhost:5672');
  const channel = await connection.createChannel();
  
  const testEmail = {
    to: 'alinaseem21102002@gmail.com',
    name: 'John Doe',
    message: 'This is a test message from my email microservice!'
  };
  
  channel.publish('email.events', 'hello.email', Buffer.from(JSON.stringify(testEmail)), {
    persistent: true
  });
  
  console.log('📤 Test email event published');
  console.log('📧 Check the email microservice logs');
  
  setTimeout(() => {
    connection.close();
  }, 1000);
}

test();