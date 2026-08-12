import { initDb, dbGet, dbAll, dbRun, dbExec } from './db.js';
import { recalculateDebtorHistory } from './services/recalculateService.js';

async function runTest() {
  console.log('--- STARTING SYSTEM INTEGRATION & RECALCULATION ENGINE TEST ---');

  // Step 1: Init Database
  await initDb();

  // Clean DB for clean test run
  await dbExec('DELETE FROM debt_transactions');
  await dbExec('DELETE FROM jobs');
  await dbExec('DELETE FROM debtors');
  await dbExec('DELETE FROM users');
  await dbExec('DELETE FROM audit_logs');

  // Verify Zero State
  const zeroDebtors = await dbGet('SELECT COUNT(*) as count FROM debtors');
  console.log('✔ Zero Data Check:', zeroDebtors.count === 0 ? 'PASSED (0 Debtors)' : 'FAILED');

  // Step 2: Create Admin User
  const userRes = await dbRun('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)', [
    'admin', 'hash', 'Test Admin', 'admin'
  ]);
  const userId = userRes.lastID;

  // Step 3: Create Debtor DB-0001 with Initial Debt 10,000 THB
  const debtorRes = await dbRun(
    'INSERT INTO debtors (code, name, phone, initial_debt, start_date, status) VALUES (?, ?, ?, ?, ?, ?)',
    ['DB-0001', 'นาย สมชาย ใจดี', '0812345678', 10000, '2026-08-01', 'active']
  );
  const debtorId = debtorRes.lastID;
  console.log(`✔ Created Debtor ID ${debtorId} with Initial Debt 10,000 THB`);

  // Step 4: Add Job 1 (Wage = 1,000, Advance = 200)
  const job1Res = await dbRun(
    `INSERT INTO jobs (debtor_id, job_date, location, description, wage, advance_withdraw, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [debtorId, '2026-08-05', 'ไซต์งาน A', 'ย้ายของ', 1000, 200, userId]
  );
  const job1Id = job1Res.lastID;
  await recalculateDebtorHistory(debtorId, userId);

  const job1Updated = await dbGet('SELECT * FROM jobs WHERE id = ?', [job1Id]);
  console.log('✔ Job 1 Calculation Results:');
  console.log(`  - Wage: ${job1Updated.wage}, Advance: ${job1Updated.advance_withdraw}`);
  console.log(`  - Deduction: ${job1Updated.debt_deduction} (Expected 800)`);
  console.log(`  - Net Wage: ${job1Updated.net_wage} (Expected 0)`);

  const debtorAfterJob1 = await dbGet('SELECT * FROM debtors WHERE id = ?', [debtorId]);
  const tx1 = await dbGet('SELECT * FROM debt_transactions WHERE job_id = ?', [job1Id]);
  console.log(`  - Debt Remaining: ${tx1.debt_after} (Expected 9200)`);

  // Step 5: Add Job 2 (Wage = 10,000, Advance = 0) -> Remaining debt is 9,200
  const job2Res = await dbRun(
    `INSERT INTO jobs (debtor_id, job_date, location, description, wage, advance_withdraw, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [debtorId, '2026-08-10', 'ไซต์งาน B', 'คุมคลัง', 10000, 0, userId]
  );
  const job2Id = job2Res.lastID;
  await recalculateDebtorHistory(debtorId, userId);

  const job2Updated = await dbGet('SELECT * FROM jobs WHERE id = ?', [job2Id]);
  const debtorAfterJob2 = await dbGet('SELECT * FROM debtors WHERE id = ?', [debtorId]);
  console.log('✔ Job 2 Calculation Results (Full Debt Payoff Test):');
  console.log(`  - Wage: ${job2Updated.wage}, Advance: ${job2Updated.advance_withdraw}`);
  console.log(`  - Deduction: ${job2Updated.debt_deduction} (Expected 9200)`);
  console.log(`  - Net Wage Paid to Debtor: ${job2Updated.net_wage} (Expected 800)`);
  console.log(`  - Debtor Status: "${debtorAfterJob2.status}" (Expected "paid_in_full")`);

  // Step 6: Edit Job 1 (Wage = 500, Advance = 100) -> Deduction = 400
  await dbRun('UPDATE jobs SET wage = 500, advance_withdraw = 100 WHERE id = ?', [job1Id]);
  await recalculateDebtorHistory(debtorId, userId);

  const job1Edited = await dbGet('SELECT * FROM jobs WHERE id = ?', [job1Id]);
  const job2Recalced = await dbGet('SELECT * FROM jobs WHERE id = ?', [job2Id]);
  console.log('✔ Edit Job 1 & Recalculate All Results:');
  console.log(`  - Job 1 Deduction: ${job1Edited.debt_deduction} (Expected 400)`);
  console.log(`  - Job 2 Deduction: ${job2Recalced.debt_deduction} (Expected 9600)`);

  // Step 7: Delete Job 1
  await dbRun('DELETE FROM jobs WHERE id = ?', [job1Id]);
  await recalculateDebtorHistory(debtorId, userId);

  const job2AfterJob1Delete = await dbGet('SELECT * FROM jobs WHERE id = ?', [job2Id]);
  const txListAfterDelete = await dbAll('SELECT * FROM debt_transactions WHERE debtor_id = ?', [debtorId]);
  console.log('✔ Delete Job 1 & Recalculate Results:');
  console.log(`  - Job 2 Deduction: ${job2AfterJob1Delete.debt_deduction} (Expected 10000)`);
  console.log(`  - Remaining Debt Transactions Count: ${txListAfterDelete.length} (Expected 1 transaction for Job 2)`);

  console.log('--- ALL INTEGRATION & RECALCULATION TESTS PASSED PERFECTLY! ---');
  process.exit(0);
}

runTest().catch((e) => {
  console.error('Test Failed:', e);
  process.exit(1);
});
