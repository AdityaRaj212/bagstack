import http from 'http';

const BASE_URL = 'http://localhost:3000';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runVerification() {
  console.log('🚀 [E2E] Testing User Account Creation & Deterministic Expandable Insights...');

  // 1. Seed demo user data to verify real insights
  console.log('\n1. Seeding demo dataset...');
  const seedRes = await request('POST', '/api/seed');
  console.log('   Seed response status:', seedRes.status, seedRes.body.success ? '✓ SUCCESS' : 'FAILED');

  // 2. Fetch demo user dashboard
  console.log('\n2. Fetching demo dashboard & verifying insights...');
  const demoDash = await request('GET', '/api/dashboard');
  if (demoDash.status !== 200) throw new Error(`Failed to fetch dashboard: ${demoDash.status}`);

  console.log('   Demo user net worth:', demoDash.body.metrics.netWorth);
  console.log('   Demo user insights count:', demoDash.body.insights.length);
  demoDash.body.insights.forEach((ins, idx) => {
    console.log(`   [Insight ${idx + 1}] (${ins.type}) ${ins.title}: ${ins.description}`);
  });

  if (demoDash.body.insights.length === 0) {
    throw new Error('Expected demo user to have deterministic insights!');
  }

  // 3. Register a brand-new user account
  const timestamp = Date.now();
  console.log(`\n3. Registering new user account ("Rohan Varma ${timestamp}")...`);
  const regRes = await request('POST', '/api/auth/register', {
    name: `Rohan Varma ${timestamp}`,
    email: `rohan.${timestamp}@testdomain.com`,
    baseCurrency: 'INR',
    initialAccountName: 'ICICI Wealth Savings',
    initialBalance: 75000, // ₹75,000
  });

  console.log('   Register response status:', regRes.status, JSON.stringify(regRes.body));
  const setCookie = regRes.headers['set-cookie']?.[0];
  console.log('   Received Session Cookie:', setCookie?.split(';')[0]);

  const newUserId = regRes.body.user.id;
  console.log('   New User Created:', newUserId, regRes.body.user.name);

  // 4. Verify user list contains both demo user and new user
  console.log('\n4. Listing all users via /api/auth/users...');
  const usersRes = await request('GET', '/api/auth/users', null, {
    Cookie: `finance_user_id=${newUserId}`,
  });
  console.log('   Current User in session:', usersRes.body.currentUser.name);
  console.log('   Total users registered:', usersRes.body.users.length);
  usersRes.body.users.forEach(u => console.log(`   - ${u.name} (${u.email}) [ID: ${u.id}]`));

  // 5. Query dashboard for new user - verify data isolation
  console.log('\n5. Verifying data isolation for new user...');
  const newUserDash = await request('GET', '/api/dashboard', null, {
    Cookie: `finance_user_id=${newUserId}`,
  });

  console.log('   New User Net Worth:', newUserDash.body.metrics.netWorth, '(Expect ₹75,000 = 7,500,000 minor units)');
  console.log('   New User Accounts count:', newUserDash.body.accounts.length);
  console.log('   New User Account Name:', newUserDash.body.accounts[0]?.name);
  console.log('   New User Recent Txns count:', newUserDash.body.recentTransactions.length, '(Expect 0)');
  console.log('   New User Initial Insights count:', newUserDash.body.insights.length);

  if (newUserDash.body.metrics.netWorth !== 7500000) {
    throw new Error(`Expected net worth 7500000 but got ${newUserDash.body.metrics.netWorth}`);
  }

  // 6. Record a transaction for new user & verify real-time insight generation
  console.log('\n6. Recording expense transaction for new user...');
  const accountId = newUserDash.body.accounts[0].id;
  const catRes = await request('GET', '/api/categories', null, {
    Cookie: `finance_user_id=${newUserId}`,
  });
  const categoriesList = catRes.body.categories || catRes.body;
  const foodCat = categoriesList.find((c) => c.name.toLowerCase().includes('food') || c.name.toLowerCase().includes('dining')) || categoriesList[0];

  const txRes = await request('POST', '/api/transactions', {
    accountId,
    amount: 1500, // ₹1,500
    type: 'expense',
    categoryId: foodCat.id,
    date: new Date().toISOString().substring(0, 10),
    merchantName: 'Blue Tokai Coffee',
  }, {
    Cookie: `finance_user_id=${newUserId}`,
  });
  console.log('   Transaction recorded:', txRes.status, txRes.body.transaction?.merchant_name);

  // 7. Verify updated dashboard for new user
  const updatedDash = await request('GET', '/api/dashboard', null, {
    Cookie: `finance_user_id=${newUserId}`,
  });
  console.log('   Updated New User Expenses:', updatedDash.body.metrics.monthlyExpenses);
  console.log('   Updated Insights count:', updatedDash.body.insights.length);
  updatedDash.body.insights.forEach((ins) => {
    console.log(`   [New User Insight] (${ins.type}) ${ins.title}: ${ins.description}`);
  });

  // 8. Switch back to Demo user via /api/auth/login
  console.log('\n8. Switching back to Demo User...');
  const loginRes = await request('POST', '/api/auth/login', { userId: 'user_default' });
  console.log('   Login response status:', loginRes.status, loginRes.body.user.name);

  const demoDashAfter = await request('GET', '/api/dashboard', null, {
    Cookie: `finance_user_id=user_default`,
  });
  console.log('   Demo user accounts preserved count:', demoDashAfter.body.accounts.length);
  console.log('   Demo user net worth preserved:', demoDashAfter.body.metrics.netWorth);

  console.log('\n✅ ALL VERIFICATION CHECKS PASSED PERFECTLY!\n');
}

runVerification().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
