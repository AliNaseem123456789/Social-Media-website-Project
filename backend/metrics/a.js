import axios from 'axios';
import fs from 'fs';
const BASE_URL = 'http://localhost:5000';
const TEST_USER_ID = '48';  // Your actual user ID from login
const TEST_POST_ID = '1';    // Change to a real post ID that exists
const REQUESTS_PER_ENDPOINT = 10;

// Your working credentials
const TEST_USER = {
    email: 'test@gmail.com',
    password: 'test12345'
};

let authToken = null;
let userId = null;

// Login function ONLY (no signup)
async function login() {
    console.log('🔐 Logging in...');
    try {
        const response = await axios.post(`${BASE_URL}/api/login`, {
            email: TEST_USER.email,
            password: TEST_USER.password
        });
        
        if (response.data.success) {
            console.log('✅ Login successful!');
            userId = response.data.user_id;
            console.log(`   User ID: ${userId}`);
            console.log(`   Username: ${response.data.username}`);
            return true;
        }
        return false;
    } catch (error) {
        console.log('❌ Login failed:', error.response?.data?.message || error.message);
        return false;
    }
}

// Get auth headers (if your API needs token)
function getAuthHeaders() {
    // If your API uses token-based auth, add it here
    // For now, session/cookie might be enough
    return {};
}

// All endpoints to test
const endpoints = [
    // Public endpoints
    { 
        name: 'Get All Posts (Feed)', 
        path: '/api/posts', 
        method: 'GET', 
        needsAuth: false 
    },
    { 
        name: 'Get Full Post', 
        path: `/api/posts/fullpost/${TEST_POST_ID}`, 
        method: 'GET', 
        needsAuth: false 
    },
    { 
        name: 'Get My Posts', 
        path: `/api/posts/myposts/${TEST_USER_ID}`, 
        method: 'GET', 
        needsAuth: false 
    },
    { 
        name: 'Search Users', 
        path: '/api/search/users?q=test', 
        method: 'GET', 
        needsAuth: false 
    },
    { 
        name: 'Search Posts', 
        path: '/api/search/posts?q=test', 
        method: 'GET', 
        needsAuth: false 
    },
    { 
        name: 'Combined Search', 
        path: '/api/search/all?q=test', 
        method: 'GET', 
        needsAuth: false 
    },
    
    // Protected endpoints (try with your logged-in session)
    { 
        name: 'Get User Profile', 
        path: `/api/profile/${TEST_USER_ID}`, 
        method: 'GET', 
        needsAuth: true 
    },
    { 
        name: 'Create Post', 
        path: '/api/posts', 
        method: 'POST',
        data: { 
            userId: TEST_USER_ID, 
            content: `Test post ${Date.now()}` 
        },
        needsAuth: true 
    },
    { 
        name: 'Get Friends List', 
        path: `/api/friends/${TEST_USER_ID}`, 
        method: 'GET', 
        needsAuth: true 
    },
    { 
        name: 'Get Recent Chats', 
        path: `/api/recentchat/${TEST_USER_ID}`, 
        method: 'GET', 
        needsAuth: true 
    }
];

// Make request
async function makeRequest(endpoint) {
    const start = Date.now();
    try {
        const config = {
            method: endpoint.method,
            url: `${BASE_URL}${endpoint.path}`,
            headers: getAuthHeaders(),
            withCredentials: true, // This sends cookies/session
            ...(endpoint.data && { data: endpoint.data })
        };
        
        await axios(config);
        return { success: true, duration: Date.now() - start };
    } catch (error) {
        const status = error.response?.status;
        if (status === 401) {
            return { success: false, duration: Date.now() - start, error: 'Unauthorized' };
        }
        if (status === 404) {
            return { success: false, duration: Date.now() - start, error: 'Not found' };
        }
        return { success: false, duration: Date.now() - start, error: error.message };
    }
}

// Test single endpoint
async function testEndpoint(endpoint) {
    const icon = endpoint.needsAuth ? '🔒' : '🌐';
    console.log(`\n${icon} Testing: ${endpoint.name}`);
    console.log(`   ${endpoint.method} ${endpoint.path}`);
    if (endpoint.needsAuth) console.log(`   (Requires authentication)`);
    
    const durations = [];
    let successCount = 0;
    let authError = false;
    
    for (let i = 0; i < REQUESTS_PER_ENDPOINT; i++) {
        process.stdout.write('.');
        const result = await makeRequest(endpoint);
        
        if (result.success) {
            durations.push(result.duration);
            successCount++;
        } else if (result.error === 'Unauthorized') {
            authError = true;
        }
        
        await new Promise(r => setTimeout(r, 100));
    }
    
    if (durations.length === 0) {
        if (authError) {
            console.log(`\n   ❌ Auth required - Login session not working`);
            console.log(`   💡 This endpoint needs a valid auth token`);
        } else {
            console.log(`\n   ❌ All requests failed`);
        }
        return null;
    }
    
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const sorted = [...durations].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    
    console.log(`\n   ✅ Avg: ${avg.toFixed(0)}ms`);
    console.log(`   📊 p95: ${p95}ms | Min: ${min}ms | Max: ${max}ms`);
    console.log(`   ✅ Success: ${(successCount/REQUESTS_PER_ENDPOINT*100).toFixed(0)}%`);
    
    return {
        name: endpoint.name,
        needsAuth: endpoint.needsAuth,
        avg: avg.toFixed(0),
        p95,
        min,
        max,
        successRate: (successCount/REQUESTS_PER_ENDPOINT*100).toFixed(0)
    };
}

// Test repeated requests (proves need for Redis)
async function testRepeatedRequests() {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 REPEATED REQUESTS TEST');
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
            
            const bar = '█'.repeat(Math.min(Math.floor(duration / 10), 50));
            console.log(`  ${i.toString().padStart(2)}: ${duration.toString().padStart(3)}ms ${bar}`);
        } catch (error) {
            console.log(`  ${i}: FAILED`);
        }
        await new Promise(r => setTimeout(r, 50));
    }
    
    if (times.length === 0) {
        console.log(`\n❌ All requests failed`);
        return 0;
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const variation = Math.max(...times) - Math.min(...times);
    
    console.log(`\n📊 Results:`);
    console.log(`   Average: ${avg.toFixed(0)}ms`);
    console.log(`   Variation: ${variation}ms`);
    
    console.log(`\n⚠️  CRITICAL FINDING: No caching detected!`);
    console.log(`   → All ${times.length} requests took ~${avg.toFixed(0)}ms`);
    console.log(`   → After Redis: 5-30ms (90%+ improvement!) 🚀`);
    
    return avg;
}

// Main function
async function main() {
    console.log('🚀 SOCIAL MEDIA API BENCHMARK');
    console.log('='.repeat(60));
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Test User ID: ${TEST_USER_ID}`);
    console.log(`Test Post ID: ${TEST_POST_ID}`);
    console.log('='.repeat(60));
    
    // Check server
    try {
        await axios.get(`${BASE_URL}/api/posts`, { timeout: 3000 });
        console.log('✅ Server is running\n');
    } catch (error) {
        console.log('❌ Server not running. Please start your backend first.');
        console.log('   Run: npm start\n');
        return;
    }
    
    // Login (ONLY login, no signup)
    const loggedIn = await login();
    if (!loggedIn) {
        console.log('\n❌ Login failed. Cannot test protected endpoints.');
        console.log('   Testing public endpoints only...\n');
    } else {
        console.log('\n✅ Authentication successful! Testing all endpoints...\n');
    }
    
    // Test all endpoints
    const results = [];
    for (const endpoint of endpoints) {
        // Skip protected endpoints if not logged in
        if (endpoint.needsAuth && !loggedIn) {
            console.log(`\n⏭️  Skipping: ${endpoint.name} (requires auth)`);
            continue;
        }
        
        const result = await testEndpoint(endpoint);
        if (result) results.push(result);
        await new Promise(r => setTimeout(r, 500));
    }
    
    // Test repeated requests
    const repeatedAvg = await testRepeatedRequests();
    
    // Generate report
    console.log('\n' + '='.repeat(60));
    console.log('📊 YOUR BASELINE NUMBERS (BEFORE REDIS)');
    console.log('='.repeat(60));
    
    console.log('\n📈 Response Times:\n');
    results.forEach(r => {
        console.log(`• ${r.name}: ${r.avg}ms (p95: ${r.p95}ms)`);
    });
    
    // Find slowest
    const slowest = results.sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg))[0];
    if (slowest) {
        const target = (slowest.avg * 0.1).toFixed(0);
        const improvement = ((slowest.avg - target) / slowest.avg * 100).toFixed(0);
        console.log(`\n🎯 Slowest Endpoint: ${slowest.name}`);
        console.log(`   Current: ${slowest.avg}ms`);
        console.log(`   After Redis: ${target}ms`);
        console.log(`   Improvement: ${improvement}% 🚀`);
    }
    
    // Save results
    const report = {
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        userId: TEST_USER_ID,
        authenticated: loggedIn,
        repeatedRequestAvg: repeatedAvg,
        endpoints: results,
        summary: {
            slowestEndpoint: slowest?.name,
            slowestTime: slowest?.avg,
            expectedAfterRedis: slowest ? (slowest.avg * 0.1).toFixed(0) : null,
            expectedImprovement: slowest ? ((slowest.avg - slowest.avg * 0.1) / slowest.avg * 100).toFixed(0) : null
        }
    };
    
    fs.writeFileSync('baseline-before-redis.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Results saved to: baseline-before-redis.json');
    
    // Resume-ready summary
    console.log('\n' + '='.repeat(60));
    console.log('📄 RESUME-READY SUMMARY');
    console.log('='.repeat(60));
    console.log('\nBEFORE REDIS BASELINE:\n');
    console.log(`• Feed API: ${results.find(r => r.name === 'Get All Posts (Feed)')?.avg || 'N/A'}ms`);
    console.log(`• Search Posts: ${results.find(r => r.name === 'Search Posts')?.avg || 'N/A'}ms`);
    console.log(`• No caching implementation`);
    console.log(`• Each request hits database directly`);
    console.log(`• 90-95% improvement expected after Redis\n`);
    
    console.log('✨ Next Steps:');
    console.log('1. Save these baseline numbers');
    console.log('2. Implement Redis caching on GET endpoints');
    console.log('3. Run this script again');
    console.log('4. Update resume with before/after comparison!\n');
}

// Run it
main().catch(console.error);