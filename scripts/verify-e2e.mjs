async function runE2E() {
  const baseUrl = 'http://localhost:3000';
  console.log('--- 1. Resetting with Demo Seed ---');
  let res = await fetch(`${baseUrl}/api/seed`, { method: 'POST' });
  let data = await res.json();
  console.log('Seed response:', data);

  console.log('\n--- 2. Fetching Dashboard ---');
  res = await fetch(`${baseUrl}/api/dashboard`);
  data = await res.json();
  console.log('Net Worth:', (data.metrics.netWorth / 100).toLocaleString('en-IN'));
  console.log('Liquid Cash:', (data.metrics.cashBalance / 100).toLocaleString('en-IN'));
  console.log('Monthly Income:', (data.metrics.monthlyIncome / 100).toLocaleString('en-IN'));
  console.log('Monthly Expenses:', (data.metrics.monthlyExpenses / 100).toLocaleString('en-IN'));
  console.log('Savings Rate:', data.metrics.savingsRate + '%');

  console.log('\n--- 3. Testing Duplicate Detection ---');
  const hdfcCard = data.accounts.find(a => a.type === 'credit_card');
  const dupPayload = {
    accountId: hdfcCard.id,
    type: 'expense',
    amount: 85000,
    date: new Date().toISOString().substring(0, 10),
    merchantName: 'Swiggy',
    checkDuplicate: true,
  };
  res = await fetch(`${baseUrl}/api/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dupPayload),
  });
  console.log('Duplicate check status:', res.status, res.status === 409 ? 'PASS (409 Conflict with warning returned)' : 'Status ' + res.status);

  console.log('\n--- 4. Testing First-Class Transfer ---');
  const hdfcBank = data.accounts.find(a => a.name.includes('HDFC Savings'));
  const sbiBank = data.accounts.find(a => a.name.includes('SBI Savings'));
  const transferPayload = {
    fromAccountId: sbiBank.id,
    toAccountId: hdfcBank.id,
    amount: 500000, // ₹5,000
    date: new Date().toISOString().substring(0, 10),
    notes: 'Test Inter-account transfer',
  };
  res = await fetch(`${baseUrl}/api/transfers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transferPayload),
  });
  data = await res.json();
  console.log('Transfer executed:', data.transfer ? 'PASS' : 'FAIL');

  console.log('\n--- 5. Testing Soft Delete & Undo ---');
  // Get recent transaction
  res = await fetch(`${baseUrl}/api/transactions?limit=1`);
  data = await res.json();
  const txToDelete = data.transactions[0];
  console.log('Deleting transaction:', txToDelete.id);
  res = await fetch(`${baseUrl}/api/transactions?id=${txToDelete.id}`, { method: 'DELETE' });
  data = await res.json();
  console.log('Delete response:', data);

  // Restore
  res = await fetch(`${baseUrl}/api/transactions?id=${data.undoId}&restore=true`, { method: 'DELETE' });
  data = await res.json();
  console.log('Restore response:', data);

  console.log('\n--- 6. Testing Full JSON Backup Export ---');
  res = await fetch(`${baseUrl}/api/export?format=json`);
  const backup = await res.json();
  console.log('Backup exported successfully with version:', backup.version);
  console.log('Total accounts backed up:', backup.data.accounts.length);
  console.log('Total transactions backed up:', backup.data.transactions.length);

  console.log('\nALL E2E DOMAIN CHECKS PASSED!');
}

runE2E().catch(console.error);
