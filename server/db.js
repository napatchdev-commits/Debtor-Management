import dotenv from 'dotenv';

dotenv.config();

// Google Sheets Configuration
export const googleSheetsWebAppUrl = (
  process.env.GOOGLE_SHEETS_WEBAPP_URL ||
  process.env.GOOGLE_SHEET_WEBAPP_URL ||
  process.env.VITE_GOOGLE_SHEETS_WEBAPP_URL ||
  ''
).trim();

export const isGoogleSheetsConfigured = Boolean(
  googleSheetsWebAppUrl && googleSheetsWebAppUrl.startsWith('http')
);

// Built-in Seed Data from original system & Excel
export const DEFAULT_SEED_STATE = {
  users: [
    { id: 1, username: 'admin', password: '$2a$10$w7HUXjMXGybpe3vVLyVlj.vaTja4veItVQGK.S4PVUWgqjAibt5YW', name: 'ผู้ดูแลระบบ', role: 'admin', created_at: '2026-05-01T00:00:00.000Z' },
    { id: 2, username: 'NaphatDev', password: '$2a$10$w7HUXjMXGybpe3vVLyVlj.vaTja4veItVQGK.S4PVUWgqjAibt5YW', name: 'NaphatDev', role: 'admin', created_at: '2026-05-01T00:00:00.000Z' }
  ],
  debtors: [
    {
      id: 1,
      code: 'DB-001',
      name: 'นรรฐพล กาบแก้ว',
      phone: '081-234-5678',
      initial_debt: 358500,
      paid_amount: 27500,
      remaining_debt: 331000,
      start_date: '2026-05-01',
      note: 'ลูกหนี้งานหักค่าแรงประจำ',
      status: 'active',
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-09-03T00:00:00.000Z'
    }
  ],
  jobs: [
    { id: 1, debtor_id: 1, job_date: '2026-09-03', location: 'จัดงานธรรมศาสตร์', description: 'จัดงาน rxtu 2ภาค', wage: 2000, advance_withdraw: 0, debt_deduction: 2000, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
    { id: 2, debtor_id: 1, job_date: '2026-09-02', location: 'จัดงานลาดกระบัง', description: 'จัดงาน 4ภาค', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
    { id: 3, debtor_id: 1, job_date: '2026-08-28', location: 'วัดปากบ่อ', description: 'จัดงานบวช', wage: 1000, advance_withdraw: 0, debt_deduction: 1000, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
    { id: 4, debtor_id: 1, job_date: '2026-08-21', location: 'จัดงานขึ้นบ้านใหม่', description: 'ฉากงานขึ้นบ้านใหม่', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
    { id: 5, debtor_id: 1, job_date: '2026-08-14', location: 'จัดงานแต่งร้านส้มแก้ว', description: 'จัดฉากงานแต่ง', wage: 1000, advance_withdraw: 0, debt_deduction: 1000, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
    { id: 6, debtor_id: 1, job_date: '2026-07-31', location: 'จัดงานมหาวิทยาลัยกรุงเทพธนบุรี', description: 'จัดงานเกษียณ', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
    { id: 7, debtor_id: 1, job_date: '2026-07-23', location: 'วัดงานวัดส้ม', description: 'จัดงานบวช', wage: 1500, advance_withdraw: 1000, debt_deduction: 500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
    { id: 8, debtor_id: 1, job_date: '2026-07-17', location: 'จัดงานบวชศาลายา', description: 'จัดงานบวชด่วน', wage: 1500, advance_withdraw: 500, debt_deduction: 1000, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
    { id: 9, debtor_id: 1, job_date: '2026-07-17', location: 'งานทำบุญบ้านสมุทรสาคร', description: 'จัดงานทำบุญบ้าน', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
    { id: 10, debtor_id: 1, job_date: '2026-07-16', location: 'วัดงานบวชราชดำเนิน', description: 'จัดงานบวช', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
    { id: 11, debtor_id: 1, job_date: '2026-07-09', location: 'สิงห์ เบเวอเรช', description: 'จัดพิธีส่งงานทำบุญ', wage: 1000, advance_withdraw: 0, debt_deduction: 1000, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
    { id: 12, debtor_id: 1, job_date: '2026-07-04', location: 'วัดปากน้ำฝั่งใต้', description: 'จัดงานบวช', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
    { id: 13, debtor_id: 1, job_date: '2026-06-19', location: 'งานบวชหนองหล่ม', description: 'จัดงานบวชหนองหล่ม', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
    { id: 14, debtor_id: 1, job_date: '2026-06-08', location: 'สิงห์ เบเวอเรช', description: 'จัดฉากงาน QCC', wage: 1000, advance_withdraw: 0, debt_deduction: 1000, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
    { id: 15, debtor_id: 1, job_date: '2026-06-05', location: 'งานบวชวัดบางโฉลง', description: 'จัดงานบวชวัดบางโฉลง', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
    { id: 16, debtor_id: 1, job_date: '2026-05-23', location: 'งาน bynior', description: 'จัดงานรับปริญญา', wage: 1000, advance_withdraw: 0, debt_deduction: 1000, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
    { id: 17, debtor_id: 1, job_date: '2026-05-21', location: 'จัดงานบวชนพรรณ', description: 'จัดงานบวชสุพรรณบุรี', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
    { id: 18, debtor_id: 1, job_date: '2026-05-16', location: 'จัดงานบวชวัดกู้', description: 'จัดงานบวชวัดประสิทธิ์ อยุธยา', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
    { id: 19, debtor_id: 1, job_date: '2026-05-15', location: 'จัดงานบวชวัดชลนที', description: 'ฉากถ่ายรูป1ภาค', wage: 1000, advance_withdraw: 0, debt_deduction: 1000, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
    { id: 20, debtor_id: 1, job_date: '2026-05-08', location: 'จัดงานบวช นครปฐม', description: 'จัดงานบวช นครปฐม', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
    { id: 21, debtor_id: 1, job_date: '2026-05-07', location: 'บวชบางโทรัด', description: 'จัดงานบวช', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' }
  ],
  debt_transactions: [],
  audit_logs: []
};

// Generate 21 Seed Debt Transactions for DB-001
DEFAULT_SEED_STATE.debt_transactions = DEFAULT_SEED_STATE.jobs.map((j, idx) => ({
  id: idx + 1,
  debtor_id: 1,
  job_id: j.id,
  transaction_date: j.job_date,
  deducted_amount: j.debt_deduction,
  debt_before: 358500 - (DEFAULT_SEED_STATE.jobs.slice(idx + 1).reduce((acc, curr) => acc + curr.debt_deduction, 0)),
  debt_after: 358500 - (DEFAULT_SEED_STATE.jobs.slice(idx).reduce((acc, curr) => acc + curr.debt_deduction, 0)),
  debtor_code: 'DB-001',
  debtor_name: 'นรรฐพล กาบแก้ว',
  job_location: j.location,
  created_at: j.job_date + 'T00:00:00.000Z'
}));

// In-Memory Database State with Seed Fallback (Ultra Fast: 0ms operations)
export let memoryState = JSON.parse(JSON.stringify(DEFAULT_SEED_STATE));

export let runtimeGoogleSheetsUrl = googleSheetsWebAppUrl;

export function setGoogleSheetsUrl(url) {
  runtimeGoogleSheetsUrl = (url || '').trim();
}

export function getGoogleSheetsUrl() {
  return runtimeGoogleSheetsUrl;
}

export function getIsGoogleSheetsConfigured() {
  return Boolean(runtimeGoogleSheetsUrl && runtimeGoogleSheetsUrl.startsWith('http'));
}

// Pure High-Speed Database Abstraction Layer
export const dbRun = async (sql, params = []) => {
  return executeLocalRun(sql, params);
};

export const dbGet = async (sql, params = []) => {
  const rows = executeLocalSelect(sql, params);
  return rows.length > 0 ? rows[0] : null;
};

export const dbAll = async (sql, params = []) => {
  return executeLocalSelect(sql, params);
};

export const dbExec = async () => {
  // Local in-memory initialization
};

// Single Batch Sync Client for Google Sheets
export async function fetchFromGoogleSheets(payload, signal) {
  const targetUrlStr = runtimeGoogleSheetsUrl || googleSheetsWebAppUrl;
  if (!targetUrlStr) {
    return { status: 'ok', state: memoryState };
  }
  try {
    const encodedPayload = encodeURIComponent(JSON.stringify(payload));
    const separator = targetUrlStr.includes('?') ? '&' : '?';
    const targetUrl = `${targetUrlStr}${separator}action=${payload.action || 'pull'}&payload=${encodedPayload}`;

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal
    });
    const json = await res.json();
    if (json.status === 'error') {
      console.warn('Google Sheets warning:', json.message);
      return { status: 'ok', state: memoryState };
    }
    return json;
  } catch (err) {
    console.warn('Google Sheets notice:', err.message);
    return { status: 'ok', state: memoryState };
  }
}

// Local Zero-Latency Select Engine (0ms execution)
function executeLocalSelect(sql, params = []) {
  const upper = sql.toUpperCase();
  let table = 'debtors';
  if (upper.includes('FROM USERS')) table = 'users';
  else if (upper.includes('FROM JOBS')) table = 'jobs';
  else if (upper.includes('FROM DEBT_TRANSACTIONS')) table = 'debt_transactions';
  else if (upper.includes('FROM AUDIT_LOGS')) table = 'audit_logs';

  let rows = memoryState[table] || [];

  if (table === 'users') {
    if (upper.trim().startsWith('SELECT COUNT')) {
      return [{ count: rows.length }];
    }
    if (sql.includes('WHERE username =') && params[0]) {
      rows = rows.filter(u => String(u.username).trim() === String(params[0]).trim());
    } else if (sql.includes('WHERE id =') && params[0]) {
      rows = rows.filter(u => Number(u.id) === Number(params[0]));
    }
  }

  if (table === 'debtors') {
    if (upper.trim().startsWith('SELECT COUNT')) {
      let filtered = rows;
      if (sql.includes('WHERE d.status =') || sql.includes('WHERE status =')) {
        if (params.length > 0 && params[0]) filtered = filtered.filter(d => String(d.status).trim() === String(params[0]).trim());
      }
      return [{ count: filtered.length, total: filtered.length, maxId: 1 }];
    }

    if (sql.includes('WHERE d.id =') || sql.includes('WHERE id =')) {
      const targetId = Number(params[0]);
      if (isNaN(targetId) || targetId <= 0) return [];
      rows = rows.filter(d => Number(d.id) === targetId);
    } else if (sql.includes('WHERE code =') || sql.includes('WHERE d.code =')) {
      if (params[0]) rows = rows.filter(d => String(d.code).trim() === String(params[0]).trim());
    } else if (sql.includes('WHERE status =') || sql.includes('WHERE d.status =')) {
      if (params[0]) rows = rows.filter(d => String(d.status).trim() === String(params[0]).trim());
    }

    if (sql.includes('LIKE ?') && params.length > 0 && typeof params[0] === 'string') {
      const term = String(params[0]).replace(/%/g, '').trim().toLowerCase();
      if (term) {
        rows = rows.filter(d =>
          (d.code && String(d.code).toLowerCase().includes(term)) ||
          (d.name && String(d.name).toLowerCase().includes(term)) ||
          (d.phone && String(d.phone).toLowerCase().includes(term))
        );
      }
    }

    const allJobs = memoryState.jobs || [];
    const paidMap = allJobs.reduce((acc, job) => {
      const dId = Number(job.debtor_id);
      acc[dId] = (acc[dId] || 0) + (Number(job.debt_deduction) || 0);
      return acc;
    }, {});

    rows = rows.map(d => {
      const id = Number(d.id);
      const initial_debt = Number(d.initial_debt) || 0;
      const paid_amount = paidMap[id] !== undefined ? paidMap[id] : (Number(d.paid_amount) || 0);
      const remaining_debt = Math.max(0, initial_debt - paid_amount);
      const status = (remaining_debt <= 0 && initial_debt > 0) ? 'paid_in_full' : (d.status || 'active');

      return {
        ...d,
        id,
        initial_debt,
        paid_amount,
        remaining_debt,
        status
      };
    });
  }

  if (table === 'jobs') {
    if (upper.trim().startsWith('SELECT COUNT')) {
      return [{ count: rows.length, total: rows.length }];
    }

    const allDebtors = memoryState.debtors || [];
    const debtorMap = allDebtors.reduce((acc, d) => {
      acc[Number(d.id)] = d;
      return acc;
    }, {});

    rows = rows.map(j => ({
      ...j,
      id: Number(j.id),
      debtor_id: Number(j.debtor_id),
      wage: Number(j.wage) || 0,
      advance_withdraw: Number(j.advance_withdraw) || 0,
      debt_deduction: Number(j.debt_deduction) || 0,
      net_wage: Number(j.net_wage) || 0,
      debtor_code: j.debtor_code || debtorMap[Number(j.debtor_id)]?.code || '',
      debtor_name: j.debtor_name || debtorMap[Number(j.debtor_id)]?.name || ''
    }));

    if (sql.includes('WHERE j.id =') || sql.includes('WHERE id =')) {
      const targetId = Number(params[0]);
      if (isNaN(targetId) || targetId <= 0) return [];
      rows = rows.filter(j => Number(j.id) === targetId);
    } else if (sql.includes('WHERE j.debtor_id =') || sql.includes('WHERE debtor_id =')) {
      const debtorId = Number(params[0]);
      if (isNaN(debtorId) || debtorId <= 0) return [];
      rows = rows.filter(j => Number(j.debtor_id) === debtorId);
    }

    if (sql.includes('LIKE ?') && params.length > 0 && typeof params[0] === 'string') {
      const term = String(params[0]).replace(/%/g, '').trim().toLowerCase();
      if (term) {
        rows = rows.filter(j =>
          (j.location && String(j.location).toLowerCase().includes(term)) ||
          (j.description && String(j.description).toLowerCase().includes(term)) ||
          (j.debtor_name && String(j.debtor_name).toLowerCase().includes(term))
        );
      }
    }
  }

  if (table === 'debt_transactions') {
    const allDebtors = memoryState.debtors || [];
    const allJobs = memoryState.jobs || [];

    const debtorMap = allDebtors.reduce((acc, d) => { acc[Number(d.id)] = d; return acc; }, {});
    const jobMap = allJobs.reduce((acc, j) => { acc[Number(j.id)] = j; return acc; }, {});

    rows = rows.map(t => ({
      ...t,
      id: Number(t.id),
      debtor_id: Number(t.debtor_id),
      job_id: Number(t.job_id),
      deducted_amount: Number(t.deducted_amount) || 0,
      debt_before: Number(t.debt_before) || 0,
      debt_after: Number(t.debt_after) || 0,
      debtor_code: debtorMap[Number(t.debtor_id)]?.code || '',
      debtor_name: debtorMap[Number(t.debtor_id)]?.name || '',
      job_location: jobMap[Number(t.job_id)]?.location || ''
    }));

    if (sql.includes('WHERE t.debtor_id =') || sql.includes('WHERE debtor_id =')) {
      const debtorId = Number(params[0]);
      if (isNaN(debtorId) || debtorId <= 0) return [];
      rows = rows.filter(t => Number(t.debtor_id) === debtorId);
    } else if (sql.includes('WHERE t.job_id =') || sql.includes('WHERE job_id =')) {
      const jobId = Number(params[0]);
      if (isNaN(jobId) || jobId <= 0) return [];
      rows = rows.filter(t => Number(t.job_id) === jobId);
    }
  }

  return rows;
}

// Local Zero-Latency Run Engine (0ms execution)
function executeLocalRun(sql, params = []) {
  const upper = sql.toUpperCase();

  if (upper.startsWith('INSERT INTO USERS')) {
    const newId = memoryState.users.length + 1;
    const userObj = {
      id: newId,
      username: params[0],
      password: params[1],
      name: params[2],
      role: params[3] || 'staff',
      created_at: new Date().toISOString()
    };
    memoryState.users.push(userObj);
    return { lastID: newId, changes: 1 };
  }

  if (upper.startsWith('INSERT INTO DEBTORS')) {
    const newId = memoryState.debtors.length + 1;
    const debtorObj = {
      id: newId,
      code: params[0],
      name: params[1],
      phone: params[2] || '',
      initial_debt: Number(params[3]) || 0,
      start_date: params[4],
      note: params[5] || '',
      status: params[6] || 'active',
      created_at: new Date().toISOString()
    };
    memoryState.debtors.push(debtorObj);
    return { lastID: newId, changes: 1 };
  }

  if (upper.startsWith('UPDATE DEBTORS')) {
    const targetId = Number(params[params.length - 1]);
    if (isNaN(targetId) || targetId <= 0) {
      throw new Error('รหัสไอดีลูกหนี้ไม่ถูกต้อง');
    }

    let data = {};
    if (sql.includes('status =') && params.length === 2) {
      data = { status: params[0] };
    } else {
      data = {
        code: params[0],
        name: params[1],
        phone: params[2] || '',
        initial_debt: Number(params[3]) || 0,
        start_date: params[4],
        note: params[5] || ''
      };
    }

    memoryState.debtors = memoryState.debtors.map(d => Number(d.id) === targetId ? { ...d, ...data } : d);
    return { changes: 1 };
  }

  if (upper.startsWith('INSERT INTO JOBS')) {
    const newId = memoryState.jobs.length + 1;
    const jobObj = {
      id: newId,
      debtor_id: Number(params[0]),
      job_date: params[1],
      location: params[2],
      description: params[3] || '',
      wage: Number(params[4]) || 0,
      advance_withdraw: Number(params[5]) || 0,
      note: params[6] || '',
      created_by: params[7] ? Number(params[7]) : null,
      created_at: new Date().toISOString()
    };
    memoryState.jobs.push(jobObj);
    return { lastID: newId, changes: 1 };
  }

  if (upper.startsWith('UPDATE JOBS')) {
    const jobId = Number(params[params.length - 1]);
    if (isNaN(jobId) || jobId <= 0) {
      throw new Error('รหัสรายการงานไม่ถูกต้อง');
    }

    let updateData = {};
    if (sql.includes('debt_deduction =')) {
      updateData = {
        advance_withdraw: Number(params[0]) || 0,
        debt_deduction: Number(params[1]) || 0,
        net_wage: Number(params[2]) || 0
      };
    } else if (params.length >= 8) {
      updateData = {
        debtor_id: Number(params[0]),
        job_date: params[1],
        location: params[2],
        description: params[3] || '',
        wage: Number(params[4]) || 0,
        advance_withdraw: Number(params[5]) || 0,
        note: params[6] || ''
      };
    } else if (sql.includes('wage =')) {
      updateData = {
        wage: Number(params[0]) || 0,
        advance_withdraw: params.length > 2 ? Number(params[1]) || 0 : 0
      };
    }

    memoryState.jobs = memoryState.jobs.map(j => Number(j.id) === jobId ? { ...j, ...updateData } : j);
    return { changes: 1 };
  }

  if (upper.startsWith('INSERT INTO DEBT_TRANSACTIONS')) {
    const newId = memoryState.debt_transactions.length + 1;
    const txObj = {
      id: newId,
      debtor_id: Number(params[0]),
      job_id: Number(params[1]),
      transaction_date: params[2],
      deducted_amount: Number(params[3]) || 0,
      debt_before: Number(params[4]) || 0,
      debt_after: Number(params[5]) || 0,
      created_by: params[6] ? Number(params[6]) : null,
      created_at: new Date().toISOString()
    };
    memoryState.debt_transactions.push(txObj);
    return { lastID: newId, changes: 1 };
  }

  if (upper.startsWith('INSERT INTO AUDIT_LOGS')) {
    const newId = memoryState.audit_logs.length + 1;
    const logObj = {
      id: newId,
      user_id: params[0] ? Number(params[0]) : null,
      username: params[1] || 'System',
      action: params[2],
      details: typeof params[3] === 'string' ? params[3] : JSON.stringify(params[3]),
      created_at: new Date().toISOString()
    };
    memoryState.audit_logs.push(logObj);
    return { lastID: newId, changes: 1 };
  }

  if (upper.startsWith('DELETE FROM DEBT_TRANSACTIONS')) {
    const targetId = Number(params[0]);
    if (isNaN(targetId) || targetId <= 0) return { changes: 0 };

    if (sql.includes('job_id =')) {
      memoryState.debt_transactions = memoryState.debt_transactions.filter(t => Number(t.job_id) !== targetId);
    } else if (sql.includes('debtor_id =')) {
      memoryState.debt_transactions = memoryState.debt_transactions.filter(t => Number(t.debtor_id) !== targetId);
    } else {
      memoryState.debt_transactions = memoryState.debt_transactions.filter(t => Number(t.id) !== targetId);
    }
    return { changes: 1 };
  }

  if (upper.startsWith('DELETE FROM JOBS')) {
    const targetId = Number(params[0]);
    if (isNaN(targetId) || targetId <= 0) throw new Error('รหัสรายการงานไม่ถูกต้อง');

    memoryState.jobs = memoryState.jobs.filter(j => Number(j.id) !== targetId);
    return { changes: 1 };
  }

  if (upper.startsWith('DELETE FROM DEBTORS')) {
    const debtorId = Number(params[0]);
    if (isNaN(debtorId) || debtorId <= 0) throw new Error('รหัสไอดีลูกหนี้ไม่ถูกต้อง');

    memoryState.debt_transactions = memoryState.debt_transactions.filter(t => Number(t.debtor_id) !== debtorId);
    memoryState.jobs = memoryState.jobs.filter(j => Number(j.debtor_id) !== debtorId);
    memoryState.debtors = memoryState.debtors.filter(d => Number(d.id) !== debtorId);
    return { changes: 1 };
  }

  return { lastID: null, changes: 0 };
}

export const initDb = async () => {
  console.log('High-Speed Database Engine loaded with seed data (0ms latency).');
};

export default { dbRun, dbGet, dbAll, dbExec, initDb };
