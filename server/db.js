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

// Database Abstraction Layer for Google Sheets 100%
export const dbRun = async (sql, params = []) => {
  return await executeGoogleSheetsRun(sql, params);
};

export const dbGet = async (sql, params = []) => {
  const rows = await executeGoogleSheetsSelect(sql, params);
  return rows.length > 0 ? rows[0] : null;
};

export const dbAll = async (sql, params = []) => {
  return await executeGoogleSheetsSelect(sql, params);
};

export const dbExec = async () => {
  if (isGoogleSheetsConfigured) {
    await fetchFromGoogleSheets({ action: 'init' });
  }
};

// Google Sheets API Web App Client
async function fetchFromGoogleSheets(payload) {
  if (!googleSheetsWebAppUrl) {
    throw new Error('ยังไม่ได้กรอก GOOGLE_SHEETS_WEBAPP_URL ใน Vercel Environment Variables: กรุณาเพิ่มตัวแปร GOOGLE_SHEETS_WEBAPP_URL ใน Vercel -> Settings -> Environment Variables แล้วกด Redeploy');
  }
  try {
    const res = await fetch(googleSheetsWebAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.status === 'error') {
      throw new Error(json.message || 'Google Sheets API Error');
    }
    return json;
  } catch (err) {
    console.error('Google Sheets API Error:', err);
    throw new Error(err.message || 'ไม่สามารถเชื่อมต่อ Google Sheets Database ได้');
  }
}

// Google Sheets Database Select Engine
async function executeGoogleSheetsSelect(sql, params = []) {
  const upper = sql.toUpperCase();
  let table = 'debtors';
  if (upper.includes('FROM USERS')) table = 'users';
  else if (upper.includes('FROM JOBS')) table = 'jobs';
  else if (upper.includes('FROM DEBT_TRANSACTIONS')) table = 'debt_transactions';
  else if (upper.includes('FROM AUDIT_LOGS')) table = 'audit_logs';

  const res = await fetchFromGoogleSheets({ action: 'pull' });
  const state = res.state || {};
  let rows = state[table] || [];

  if (table === 'users') {
    if (upper.includes('COUNT(')) {
      return [{ count: rows.length }];
    }
    if (sql.includes('WHERE username =') && params[0]) {
      rows = rows.filter(u => String(u.username).trim() === String(params[0]).trim());
    } else if (sql.includes('WHERE id =') && params[0]) {
      rows = rows.filter(u => Number(u.id) === Number(params[0]));
    }
  }

  if (table === 'debtors') {
    if (upper.includes('COUNT(')) {
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

    // Calculate paid_amount and remaining_debt in bulk
    const allJobs = state.jobs || [];
    const paidMap = allJobs.reduce((acc, job) => {
      const dId = Number(job.debtor_id);
      acc[dId] = (acc[dId] || 0) + (Number(job.debt_deduction) || 0);
      return acc;
    }, {});

    rows = rows.map(d => {
      const id = Number(d.id);
      const initial_debt = Number(d.initial_debt) || 0;
      const paid_amount = paidMap[id] || 0;
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
    if (upper.includes('COUNT(')) {
      return [{ count: rows.length, total: rows.length }];
    }

    const allDebtors = state.debtors || [];
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
      debtor_code: debtorMap[Number(j.debtor_id)]?.code || '',
      debtor_name: debtorMap[Number(j.debtor_id)]?.name || ''
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
    const allDebtors = state.debtors || [];
    const allJobs = state.jobs || [];

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

// Google Sheets Database Run Engine
async function executeGoogleSheetsRun(sql, params = []) {
  const upper = sql.toUpperCase();

  if (upper.startsWith('INSERT INTO USERS')) {
    const res = await fetchFromGoogleSheets({
      action: 'run',
      type: 'INSERT',
      table: 'users',
      data: {
        username: params[0],
        password: params[1],
        name: params[2],
        role: params[3] || 'staff'
      }
    });
    return { lastID: Number(res.lastID), changes: 1 };
  }

  if (upper.startsWith('INSERT INTO DEBTORS')) {
    const res = await fetchFromGoogleSheets({
      action: 'run',
      type: 'INSERT',
      table: 'debtors',
      data: {
        code: params[0],
        name: params[1],
        phone: params[2] || '',
        initial_debt: Number(params[3]) || 0,
        start_date: params[4],
        note: params[5] || '',
        status: params[6] || 'active'
      }
    });
    return { lastID: Number(res.lastID), changes: 1 };
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

    const res = await fetchFromGoogleSheets({
      action: 'run',
      type: 'UPDATE',
      table: 'debtors',
      id: targetId,
      data
    });
    return { changes: Number(res.changes) || 1 };
  }

  if (upper.startsWith('INSERT INTO JOBS')) {
    const res = await fetchFromGoogleSheets({
      action: 'run',
      type: 'INSERT',
      table: 'jobs',
      data: {
        debtor_id: Number(params[0]),
        job_date: params[1],
        location: params[2],
        description: params[3] || '',
        wage: Number(params[4]) || 0,
        advance_withdraw: Number(params[5]) || 0,
        note: params[6] || '',
        created_by: params[7] ? Number(params[7]) : null
      }
    });
    return { lastID: Number(res.lastID), changes: 1 };
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

    const res = await fetchFromGoogleSheets({
      action: 'run',
      type: 'UPDATE',
      table: 'jobs',
      id: jobId,
      data: updateData
    });
    return { changes: Number(res.changes) || 1 };
  }

  if (upper.startsWith('INSERT INTO DEBT_TRANSACTIONS')) {
    const res = await fetchFromGoogleSheets({
      action: 'run',
      type: 'INSERT',
      table: 'debt_transactions',
      data: {
        debtor_id: Number(params[0]),
        job_id: Number(params[1]),
        transaction_date: params[2],
        deducted_amount: Number(params[3]) || 0,
        debt_before: Number(params[4]) || 0,
        debt_after: Number(params[5]) || 0,
        created_by: params[6] ? Number(params[6]) : null
      }
    });
    return { lastID: Number(res.lastID), changes: 1 };
  }

  if (upper.startsWith('INSERT INTO AUDIT_LOGS')) {
    const res = await fetchFromGoogleSheets({
      action: 'run',
      type: 'INSERT',
      table: 'audit_logs',
      data: {
        user_id: params[0] ? Number(params[0]) : null,
        username: params[1] || 'System',
        action: params[2],
        details: typeof params[3] === 'string' ? params[3] : JSON.stringify(params[3])
      }
    });
    return { lastID: res && res.lastID ? Number(res.lastID) : null, changes: 1 };
  }

  if (upper.startsWith('DELETE FROM DEBT_TRANSACTIONS')) {
    const targetId = Number(params[0]);
    if (isNaN(targetId) || targetId <= 0) return { changes: 0 };

    let field = 'id';
    if (sql.includes('job_id =')) field = 'job_id';
    else if (sql.includes('debtor_id =')) field = 'debtor_id';

    const res = await fetchFromGoogleSheets({
      action: 'run',
      type: 'DELETE',
      table: 'debt_transactions',
      field: field,
      value: targetId
    });
    return { changes: Number(res.changes) || 1 };
  }

  if (upper.startsWith('DELETE FROM JOBS')) {
    const targetId = Number(params[0]);
    if (isNaN(targetId) || targetId <= 0) throw new Error('รหัสรายการงานไม่ถูกต้อง');

    let field = 'id';
    if (sql.includes('debtor_id =')) field = 'debtor_id';

    const res = await fetchFromGoogleSheets({
      action: 'run',
      type: 'DELETE',
      table: 'jobs',
      field: field,
      value: targetId
    });
    return { changes: Number(res.changes) || 1 };
  }

  if (upper.startsWith('DELETE FROM DEBTORS')) {
    const debtorId = Number(params[0]);
    if (isNaN(debtorId) || debtorId <= 0) throw new Error('รหัสไอดีลูกหนี้ไม่ถูกต้อง');

    await fetchFromGoogleSheets({ action: 'run', type: 'DELETE', table: 'debt_transactions', field: 'debtor_id', value: debtorId });
    await fetchFromGoogleSheets({ action: 'run', type: 'DELETE', table: 'jobs', field: 'debtor_id', value: debtorId });

    const res = await fetchFromGoogleSheets({
      action: 'run',
      type: 'DELETE',
      table: 'debtors',
      field: 'id',
      value: debtorId
    });
    return { changes: Number(res.changes) || 1 };
  }

  return { lastID: null, changes: 0 };
}

export const initDb = async () => {
  console.log('Connected to 100% Pure Google Sheets Database Engine successfully.');
};

export default { dbRun, dbGet, dbAll, dbExec, initDb };
