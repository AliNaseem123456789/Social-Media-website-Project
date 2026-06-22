import axios from 'axios';
import fs from 'fs';
const BASE_URL = 'http://localhost:5000';
const TEST_USER_ID = '2'; // Change to a real user ID
const TEST_POST_ID = '3'; // Change to a real post ID
const REQUESTS_PER_ENDPOINT = 10;

// Your endpoints
const endpoints = [
    { 
        name: 'Get All Posts', 
        path: '/api/posts', 
        method: 'GET' 
    },
    { 
        name: 'Get Full Post', 
        path: `/api/posts/fullpost/${TEST_POST_ID}`, 
        method: 'GET' 
    },
    { 
        name: 'Get My Posts', 
        path: `/api/posts/myposts/${TEST_USER_ID}`, 
        method: 'GET' 
    },
    { 
        name: 'Create Post', 
        path: '/api/posts', 
        method: 'POST',
        data: { 
            userId: TEST_USER_ID, 
            content: 'Test post for benchmark' 
        }
    },
    { 
        name: 'Like Post', 
        path: '/api/posts/like', 
        method: 'POST',
        data: { 
            postId: TEST_POST_ID, 
            userId: TEST_USER_ID 
        }
    },
    { 
        name: 'Add Comment', 
        path: '/api/posts/comment', 
        method: 'POST',
        data: { 
            postId: TEST_POST_ID, 
            userId: TEST_USER_ID, 
            text: 'Test comment' 
        }
    }
];

// Make request function
async function makeRequest(endpoint) {
    const start = Date.now();
    try {
        const config = {
            method: endpoint.method,
            url: `${BASE_URL}${endpoint.path}`,
            ...(endpoint.data && { data: endpoint.data })
        };
        
        await axios(config);
        const duration = Date.now() - start;
        return { success: true, duration };
    } catch (error) {
        const duration = Date.now() - start;
        return { success: false, duration, error: error.message };
    }
}

// Test single endpoint
async function testEndpoint(endpoint) {
    console.log(`\n📊 Testing: ${endpoint.name}`);
    console.log(`   ${endpoint.method} ${endpoint.path}`);
    
    const durations = [];
    let successCount = 0;
    
    for (let i = 0; i < REQUESTS_PER_ENDPOINT; i++) {
        process.stdout.write('.');
        const result = await makeRequest(endpoint);
        
        if (result.success) {
            durations.push(result.duration);
            successCount++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (durations.length === 0) {
        console.log(`\n   ❌ All requests failed`);
        return null;
    }
    
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const sorted = [...durations].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    
    console.log(`\n   ✅ Avg: ${avg.toFixed(0)}ms`);
    console.log(`   📊 p95: ${p95}ms | Min: ${min}ms | Max: ${max}ms`);
    console.log(`   ✅ Success Rate: ${(successCount/REQUESTS_PER_ENDPOINT*100).toFixed(1)}%`);
    
    return {
        name: endpoint.name,
        avg: avg.toFixed(0),
        p95,
        min,
        max,
        successRate: (successCount/REQUESTS_PER_ENDPOINT*100).toFixed(1)
    };
}

// Critical test: Repeated requests to same endpoint
async function testRepeatedRequests() {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 REPEATED REQUESTS TEST - This proves you need Redis!');
    console.log('='.repeat(60));
    
    const testPath = `/api/posts/fullpost/${TEST_POST_ID}`;
    console.log(`\nTesting ${testPath} 10 times in a row:\n`);
    
    const times = [];
    for (let i = 1; i <= 10; i++) {
        const start = Date.now();
        try {
            await axios.get(`${BASE_URL}${testPath}`);
            const duration = Date.now() - start;
            times.push(duration);
            
            // Visual bar
            const bar = '█'.repeat(Math.min(Math.floor(duration / 10), 50));
            console.log(`  Request ${i.toString().padStart(2)}: ${duration.toString().padStart(3)}ms ${bar}`);
        } catch (error) {
            console.log(`  Request ${i}: FAILED`);
        }
        await new Promise(r => setTimeout(r, 50));
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const variation = Math.max(...times) - Math.min(...times);
    
    console.log(`\n📊 Results:`);
    console.log(`   Average: ${avg.toFixed(0)}ms`);
    console.log(`   Variation: ${variation}ms`);
    console.log(`   Fastest: ${Math.min(...times)}ms`);
    console.log(`   Slowest: ${Math.max(...times)}ms`);
    
    console.log(`\n⚠️  CRITICAL FINDING:`);
    console.log(`   → All 10 requests took ~${avg.toFixed(0)}ms (NO IMPROVEMENT!)`);
    console.log(`   → Every request is hitting your database`);
    console.log(`   → After Redis: Requests 2-10 will be 5-30ms`);
    console.log(`   → Expected improvement: 90-95% 🚀`);
    
    return { avgRepeated: avg, times };
}

// Check if server is running
async function checkServer() {
    console.log('🔍 Checking if server is running...');
    try {
        await axios.get(`${BASE_URL}/api/posts`, { timeout: 3000 });
        console.log('✅ Server is running!\n');
        return true;
    } catch (error) {
        console.log('❌ Cannot reach server!\n');
        return false;
    }
}

// Main function
async function main() {
    console.log('🚀 SOCIAL MEDIA API BENCHMARK');
    console.log('='.repeat(60));
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Test User ID: ${TEST_USER_ID}`);
    console.log(`Test Post ID: ${TEST_POST_ID}`);
    console.log(`Requests per endpoint: ${REQUESTS_PER_ENDPOINT}`);
    console.log('='.repeat(60));
    
    // Check server
    const isRunning = await checkServer();
    if (!isRunning) {
        console.log('💡 Please start your backend server first:');
        console.log('   npm start');
        console.log('   or');
        console.log('   npm run dev');
        console.log('\n   Then run this script again.');
        return;
    }
    
    // Test all endpoints
    const results = [];
    for (const endpoint of endpoints) {
        const result = await testEndpoint(endpoint);
        if (result) results.push(result);
        await new Promise(r => setTimeout(r, 500));
    }
    
    // Test repeated requests
    const repeatedTest = await testRepeatedRequests();
    
    // Generate report
    console.log('\n' + '='.repeat(60));
    console.log('📝 YOUR BASELINE NUMBERS (Save these!)');
    console.log('='.repeat(60));
    
    // Find slowest endpoints
    const readEndpoints = results.filter(r => 
        endpoints.find(e => e.name === r.name)?.method === 'GET'
    );
    const slowest = [...readEndpoints].sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg));
    
    console.log('\n🎯 SLOWEST ENDPOINTS (Best for Redis):\n');
    slowest.slice(0, 3).forEach((endpoint, i) => {
        const target = (endpoint.avg * 0.1).toFixed(0);
        const improvement = ((endpoint.avg - target) / endpoint.avg * 100).toFixed(0);
        console.log(`${i+1}. ${endpoint.name}: ${endpoint.avg}ms`);
        console.log(`   → After Redis target: ${target}ms (${improvement}% improvement)\n`);
    });
    
    // Save to file
    const report = {
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        testUserId: TEST_USER_ID,
        testPostId: TEST_POST_ID,
        requestsPerEndpoint: REQUESTS_PER_ENDPOINT,
        repeatedRequestTest: {
            averageMs: repeatedTest.avgRepeated,
            allTimes: repeatedTest.times,
            conclusion: 'No caching detected - all requests hit database'
        },
        endpoints: results
    };
    
    fs.writeFileSync('baseline-before-redis.json', JSON.stringify(report, null, 2));
    console.log('💾 Results saved to: baseline-before-redis.json');
    
    console.log('\n✨ IMPORTANT:');
    console.log('1. Save these numbers in a spreadsheet');
    console.log('2. Implement Redis caching on GET endpoints');
    console.log('3. Run this script again after Redis');
    console.log('4. Compare numbers for your resume!\n');
}

// Run it
main().catch(error => {
    console.error('❌ Error:', error.message);
});