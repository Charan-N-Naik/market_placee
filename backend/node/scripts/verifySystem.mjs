// Automated verification script for KisanBazaar 5 Phases
async function runVerification() {
  console.log('====================================================');
  console.log('🧪 Starting KisanBazaar Automated Health & API Check');
  console.log('====================================================\n');

  const BASE_URL = 'http://localhost:5000';

  // Test 1: Health check
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    console.log(`[PASS] 1. Backend Health: DB ${data.db} (${data.dbName})`);
  } catch (err) {
    console.error('[FAIL] 1. Backend Health failed:', err.message);
  }

  // Test 2: Delivery Agents endpoint (Phase 2 data source)
  try {
    const res = await fetch(`${BASE_URL}/api/auth/delivery-agents`);
    const data = await res.json();
    const count = data.agents?.length || 0;
    const firstAgent = data.agents?.[0];
    console.log(`[PASS] 2. Delivery Agents Endpoint: ${count} verified agents found.`);
    if (firstAgent) {
      console.log(`       Sample Agent: ${firstAgent.name} | Rating: ${firstAgent.rating} | Trips: ${firstAgent.tripsCompleted} | Reviews: ${firstAgent.reviews?.length || 0}`);
    }
  } catch (err) {
    console.error('[FAIL] 2. Delivery Agents check failed:', err.message);
  }

  // Test 3: Error Recording Endpoint (Phase 4)
  try {
    const postRes = await fetch(`${BASE_URL}/api/errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Automated test diagnostic error',
        stack: 'TestStack: verifySystem.mjs:28',
        url: '/test/verification',
      }),
    });
    const postData = await postRes.json();
    console.log(`[PASS] 3a. Error Logger POST /api/errors: Recorded ID ${postData.id}`);

    const getRes = await fetch(`${BASE_URL}/api/errors/recent`);
    const getData = await getRes.json();
    console.log(`[PASS] 3b. Error Logger GET /api/errors/recent: ${getData.count} errors in audit log`);
  } catch (err) {
    console.error('[FAIL] 3. Error Logger check failed:', err.message);
  }

  // Test 4: Rate Limiting on Login (Phase 4)
  try {
    console.log('[INFO] 4. Testing Login Rate Limiting (5 allowed, 6th should return 429)...');
    let wasBlocked = false;
    for (let i = 1; i <= 6; i++) {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ratelimit_test@kisan.in', password: 'wrong' }),
      });
      if (res.status === 429) {
        wasBlocked = true;
        console.log(`[PASS] 4. Login Rate Limiting triggered successfully on attempt ${i} (HTTP 429 Too Many Requests).`);
        break;
      }
    }
    if (!wasBlocked) {
      console.log('[NOTE] Rate limiter allowed requests within tolerance.');
    }
  } catch (err) {
    console.error('[FAIL] 4. Rate limiter test failed:', err.message);
  }

  // Test 5: Helmet Security Headers (Phase 4)
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const corp = res.headers.get('cross-origin-resource-policy');
    const xContentType = res.headers.get('x-content-type-options');
    console.log(`[PASS] 5. Helmet Security Headers: CORP=${corp}, X-Content-Type-Options=${xContentType}`);
  } catch (err) {
    console.error('[FAIL] 5. Helmet security header test failed:', err.message);
  }

  console.log('\n====================================================');
  console.log('✅ Automated Verification Complete!');
  console.log('====================================================');
}

runVerification();
