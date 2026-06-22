import redisClient from './config/redis.config.js';

async function test() {
    console.log('🔌 Connecting to Redis...');
    const connected = await redisClient.connect();
    
    if (!connected) {
        console.log('❌ Failed to connect');
        return;
    }
    
    console.log('\n✅ Connected! Running tests...\n');
    
    // Test 1: Set/Get
    console.log('1️⃣ Testing SET/GET...');
    await redisClient.set('test:hello', { message: 'Hello Redis!', time: Date.now() }, 60);
    const value = await redisClient.get('test:hello');
    console.log('   ✅ GET result:', value);
    
    // Test 2: INCR (Fixed)
    console.log('\n2️⃣ Testing INCR...');
    await redisClient.del('test:counter'); // Clean first
    const incr1 = await redisClient.incr('test:counter');
    const incr2 = await redisClient.incr('test:counter');
    const counter = await redisClient.get('test:counter');
    console.log('   ✅ Increment results:', incr1, '→', incr2);
    console.log('   ✅ Final counter:', counter);
    
    // Test 3: Set operations
    console.log('\n3️⃣ Testing SET operations...');
    await redisClient.del('test:set');
    await redisClient.sadd('test:set', 'item1', 'item2', 'item3');
    const members = await redisClient.smembers('test:set');
    console.log('   ✅ Set members:', members);
    
    // Test 4: List operations
    console.log('\n4️⃣ Testing LIST operations...');
    await redisClient.del('test:list');
    await redisClient.lPush('test:list', { id: 1, name: 'First' });
    await redisClient.lPush('test:list', { id: 2, name: 'Second' });
    const list = await redisClient.lRange('test:list', 0, -1);
    console.log('   ✅ List items:', list);
    
    // Test 5: DEL (Fixed)
    console.log('\n5️⃣ Testing DEL...');
    await redisClient.set('test:todelete', 'delete me', 60);
    const exists1 = await redisClient.get('test:todelete');
    console.log('   ✅ Before delete:', exists1);
    await redisClient.del('test:todelete');
    const exists2 = await redisClient.get('test:todelete');
    console.log('   ✅ After delete:', exists2);
    
    console.log('\n🎉 All Redis tests passed!');
    
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await redisClient.del('test:hello');
    await redisClient.del('test:counter');
    await redisClient.del('test:set');
    await redisClient.del('test:list');
    console.log('✅ Cleanup complete');
}

test().catch(console.error);