import { createClient } from '@supabase/supabase-js';
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

// Supabase Credentials
let rawSupabaseUrl = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).trim();

if (rawSupabaseUrl) {
  rawSupabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
}

const supabaseKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

export const isSupabaseConfigured = Boolean(rawSupabaseUrl && supabaseKey && rawSupabaseUrl.startsWith('http'));

export const supabase = isSupabaseConfigured ? createClient(rawSupabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: {
    transport: typeof window !== 'undefined' && window.WebSocket ? window.WebSocket : class DummyWebSocket {}
  }
}) : null;

export const getSupabaseClient = () => {
  if (isGoogleSheetsConfigured) {
    return null;
  }
  if (!supabase) {
    throw new Error('ยังไม่ได้เชื่อมต่อฐานข้อมูล: กรุณากรอก GOOGLE_SHEETS_WEBAPP_URL หรือ SUPABASE_URL ใน Vercel Environment Variables ให้ถูกต้อง');
  }
  return supabase;
};

// Database Abstraction Layer Router
export const dbRun = async (sql, params = []) => {
  if (isGoogleSheetsConfigured) {
    return await executeGoogleSheetsRun(sql, params);
  }
  return await executeSupabaseRun(sql, params);
};

export const dbGet = async (sql, params = []) => {
  const rows = isGoogleSheetsConfigured
    ? await executeGoogleSheetsSelect(sql, params)
    : await executeSupabaseSelect(sql, params);
  return rows.length > 0 ? rows[0] : null;
};

export const dbAll = async (sql, params = []) => {
  if (isGoogleSheetsConfigured) {
    return await executeGoogleSheetsSelect(sql, params);
  }
  return await executeSupabaseSelect(sql, params);
};

export const dbExec = async () => {
  if (isGoogleSheetsConfigured) {
    await fetchFromGoogleSheets({ action: 'init' });
  }
};

// Google Sheets API Web App Client
async function fetchFromGoogleSheets(payload) {
  if (!googleSheetsWebAppUrl) {
    throw new Error('ยังไม่ได้กรอก GOOGLE_SHEETS_WEBAPP_URL ใน Environment Variables');
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
    if (sql.includes('WHERE username =') && params[0]) {
      rows = rows.filter(u => String(u.username).trim() === String(params[0]).trim());
    } else if (sql.includes('WHERE id =') && params[0]) {
      rows = rows.filter(u => Number(u.id) === Number(params[0]));
    }
  }

  if (table === 'debtors') {
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
  }

  if (table === 'jobs') {
    const allDebtors = state.debtors || [];
    const debtorMap = allDebtors.reduce((acc, d) => {
      acc[Number(d.id)] = d;
      return acc;
    }, {});

    rows = rows.map(j => ({
      ...j,
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
          (j.description && String(j.description).toLowerCase().includes(term))
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
    return { lastID: Number(res.lastID), changes: 1 };
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

// Helper for human-readable Supabase database errors
function formatSupabaseError(error) {
  if (!error) return 'เกิดข้อผิดพลาดในการเชื่อมต่อ Supabase';
  if (error.code === '22P02') {
    return 'รูปแบบข้อมูล ID ไม่ถูกต้อง (Invalid ID parameter)';
  }
  if (error.code === '23503') {
    return 'ไม่สามารถลบข้อมูลได้ เนื่องจากมีข้อมูลที่เกี่ยวข้องอยู่';
  }
  if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
    return 'ไม่พบตารางใน Supabase: กรุณานำไฟล์ supabase/schema.sql ไปกด RUN ใน Supabase SQL Editor';
  }
  if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('apikey')) {
    return 'Supabase Key ไม่ถูกต้อง: กรุณาตรวจสอบ SUPABASE_KEY ใน Vercel Environment Variables';
  }
  return `Supabase DB Error (${error.code || 'DB'}): ${error.message}`;
}

// Supabase Real-Time Cloud Select Handler
async function executeSupabaseSelect(sql, params = []) {
  const client = getSupabaseClient();
  const upper = sql.toUpperCase();

  // 1. USERS
  if (upper.includes('FROM USERS')) {
    if (upper.includes('COUNT(')) {
      const { count, error } = await client.from('users').select('*', { count: 'exact', head: true });
      if (error) throw new Error(formatSupabaseError(error));
      return [{ count: count || 0 }];
    }
    let query = client.from('users').select('*');
    if (params.length > 0) {
      if (sql.includes('WHERE username =')) {
        if (!params[0]) return [];
        query = query.eq('username', params[0]);
      } else if (sql.includes('WHERE id =')) {
        const targetId = Number(params[0]);
        if (isNaN(targetId) || targetId <= 0) return [];
        query = query.eq('id', targetId);
      }
    }
    const { data, error } = await query;
    if (error) throw new Error(formatSupabaseError(error));
    return (data || []).map(u => ({ ...u, id: Number(u.id) }));
  }

  // 2. DEBTORS
  if (upper.includes('FROM DEBTORS')) {
    if (upper.includes('COUNT(')) {
      let countQuery = client.from('debtors').select('*', { count: 'exact', head: true });
      if (sql.includes('WHERE d.status =') || sql.includes('WHERE status =')) {
        if (params.length > 0 && params[0]) countQuery = countQuery.eq('status', params[0]);
      }
      const { count, error } = await countQuery;
      if (error) {
        console.error('Supabase count error:', error);
        return [{ count: 0, total: 0, maxId: 1 }];
      }
      return [{ count: count || 0, total: count || 0, maxId: 1 }];
    }

    let query = client.from('debtors').select('*');

    // Single debtor lookup by ID or Code
    if (sql.includes('WHERE d.id =') || sql.includes('WHERE id =')) {
      const targetId = Number(params[0]);
      if (isNaN(targetId) || targetId <= 0) return [];
      query = query.eq('id', targetId);
    } else if (sql.includes('WHERE code =') || sql.includes('WHERE d.code =')) {
      if (!params[0]) return [];
      query = query.eq('code', params[0]);
    } else if (sql.includes('WHERE status =') || sql.includes('WHERE d.status =')) {
      if (!params[0]) return [];
      query = query.eq('status', params[0]);
    }

    // Search term filtering
    if (sql.includes('LIKE ?') && params.length > 0 && typeof params[0] === 'string') {
      const searchTerm = String(params[0]).replace(/%/g, '').trim();
      if (searchTerm) {
        query = query.or(`code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error('Supabase debtors query error:', error);
      throw new Error(formatSupabaseError(error));
    }

    const debtors = (data || []).map(d => ({
      ...d,
      id: Number(d.id),
      initial_debt: Number(d.initial_debt) || 0
    }));

    // Calculate paid_amount and remaining_debt safely in bulk
    try {
      const { data: allJobs } = await client.from('jobs').select('debtor_id, debt_deduction');
      const paidMap = (allJobs || []).reduce((acc, job) => {
        const dId = Number(job.debtor_id);
        acc[dId] = (acc[dId] || 0) + (Number(job.debt_deduction) || 0);
        return acc;
      }, {});

      for (const d of debtors) {
        const paid = paidMap[d.id] || 0;
        d.paid_amount = paid;
        d.remaining_debt = Math.max(0, d.initial_debt - paid);
      }
    } catch (e) {
      for (const d of debtors) {
        d.paid_amount = 0;
        d.remaining_debt = d.initial_debt;
      }
    }

    return debtors;
  }

  // 3. JOBS
  if (upper.includes('FROM JOBS')) {
    if (upper.includes('COUNT(')) {
      const { count, error } = await client.from('jobs').select('*', { count: 'exact', head: true });
      if (error) throw new Error(formatSupabaseError(error));
      return [{ count: count || 0, total: count || 0 }];
    }

    let query = client.from('jobs').select('*, debtors(code, name)');
    if (params.length > 0) {
      if (sql.includes('WHERE j.id =') || sql.includes('WHERE id =')) {
        const jobId = Number(params[0]);
        if (isNaN(jobId) || jobId <= 0) return [];
        query = query.eq('id', jobId);
      } else if (sql.includes('WHERE j.debtor_id =') || sql.includes('WHERE debtor_id =')) {
        const debtorId = Number(params[0]);
        if (isNaN(debtorId) || debtorId <= 0) return [];
        query = query.eq('debtor_id', debtorId);
      }
    }

    if (sql.includes('LIKE ?') && params.length > 0 && typeof params[0] === 'string') {
      const term = String(params[0]).replace(/%/g, '').trim();
      if (term) {
        query = query.or(`location.ilike.%${term}%,description.ilike.%${term}%`);
      }
    }

    query = query.order('job_date', { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(formatSupabaseError(error));

    return (data || []).map(j => ({
      ...j,
      id: Number(j.id),
      debtor_id: Number(j.debtor_id),
      wage: Number(j.wage) || 0,
      advance_withdraw: Number(j.advance_withdraw) || 0,
      debt_deduction: Number(j.debt_deduction) || 0,
      net_wage: Number(j.net_wage) || 0,
      debtor_code: j.debtors?.code || '',
      debtor_name: j.debtors?.name || ''
    }));
  }

  // 4. DEBT TRANSACTIONS
  if (upper.includes('FROM DEBT_TRANSACTIONS')) {
    let query = client.from('debt_transactions').select('*, debtors(code, name), jobs(location)');
    if (params.length > 0) {
      if (sql.includes('WHERE t.debtor_id =') || sql.includes('WHERE debtor_id =')) {
        const debtorId = Number(params[0]);
        if (isNaN(debtorId) || debtorId <= 0) return [];
        query = query.eq('debtor_id', debtorId);
      } else if (sql.includes('WHERE t.job_id =') || sql.includes('WHERE job_id =')) {
        const jobId = Number(params[0]);
        if (isNaN(jobId) || jobId <= 0) return [];
        query = query.eq('job_id', jobId);
      }
    }
    query = query.order('transaction_date', { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(formatSupabaseError(error));

    return (data || []).map(t => ({
      ...t,
      id: Number(t.id),
      debtor_id: Number(t.debtor_id),
      job_id: Number(t.job_id),
      deducted_amount: Number(t.deducted_amount) || 0,
      debt_before: Number(t.debt_before) || 0,
      debt_after: Number(t.debt_after) || 0,
      debtor_code: t.debtors?.code || '',
      debtor_name: t.debtors?.name || '',
      job_location: t.jobs?.location || ''
    }));
  }

  // 5. AUDIT LOGS
  if (upper.includes('FROM AUDIT_LOGS')) {
    const { data, error } = await client.from('audit_logs').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(a => ({ ...a, id: Number(a.id) }));
  }

  return [];
}

// Supabase Real-Time Cloud Run Handler
async function executeSupabaseRun(sql, params = []) {
  const client = getSupabaseClient();
  const upper = sql.toUpperCase();

  if (upper.startsWith('INSERT INTO USERS')) {
    const { data, error } = await client.from('users').insert({
      username: params[0],
      password: params[1],
      name: params[2],
      role: params[3] || 'staff'
    }).select();
    if (error) throw new Error(formatSupabaseError(error));
    return { lastID: Number(data[0]?.id), changes: 1 };
  }

  if (upper.startsWith('INSERT INTO DEBTORS')) {
    const payload = {
      code: params[0],
      name: params[1],
      phone: params[2] || '',
      initial_debt: Number(params[3]) || 0,
      start_date: params[4],
      note: params[5] || '',
      status: params[6] || 'active'
    };

    const { data, error } = await client.from('debtors').insert(payload).select();
    if (error) {
      console.error('Supabase INSERT DEBTORS error:', error);
      throw new Error(formatSupabaseError(error));
    }
    if (!data || data.length === 0) {
      throw new Error('ไม่สามารถเพิ่มข้อมูลลูกหนี้ลงใน Supabase ได้ (No rows returned)');
    }
    return { lastID: Number(data[0].id), changes: 1 };
  }

  if (upper.startsWith('UPDATE DEBTORS')) {
    const targetId = Number(params[params.length - 1]);
    if (isNaN(targetId) || targetId <= 0) {
      throw new Error('รหัสไอดีลูกหนี้ไม่ถูกต้อง');
    }

    if (sql.includes('status =') && params.length === 2) {
      const status = params[0];
      const { error } = await client.from('debtors').update({
        status,
        updated_at: new Date().toISOString()
      }).eq('id', targetId);
      if (error) throw new Error(formatSupabaseError(error));
      return { changes: 1 };
    }

    const payload = {
      code: params[0],
      name: params[1],
      phone: params[2] || '',
      initial_debt: Number(params[3]) || 0,
      start_date: params[4],
      note: params[5] || '',
      updated_at: new Date().toISOString()
    };

    const { error } = await client.from('debtors').update(payload).eq('id', targetId);
    if (error) throw new Error(formatSupabaseError(error));
    return { changes: 1 };
  }

  if (upper.startsWith('INSERT INTO JOBS')) {
    const { data, error } = await client.from('jobs').insert({
      debtor_id: Number(params[0]),
      job_date: params[1],
      location: params[2],
      description: params[3],
      wage: Number(params[4]),
      advance_withdraw: Number(params[5]),
      note: params[6],
      created_by: params[7] ? Number(params[7]) : null
    }).select();
    if (error) throw new Error(formatSupabaseError(error));
    return { lastID: Number(data[0]?.id), changes: 1 };
  }

  if (upper.startsWith('UPDATE JOBS')) {
    const jobId = Number(params[params.length - 1]);
    if (isNaN(jobId) || jobId <= 0) {
      throw new Error('รหัสรายการงานไม่ถูกต้อง');
    }

    const updatePayload = {
      updated_at: new Date().toISOString()
    };

    if (sql.includes('debt_deduction =')) {
      updatePayload.advance_withdraw = Number(params[0]) || 0;
      updatePayload.debt_deduction = Number(params[1]) || 0;
      updatePayload.net_wage = Number(params[2]) || 0;
    } else if (params.length >= 8) {
      updatePayload.debtor_id = Number(params[0]);
      updatePayload.job_date = params[1];
      updatePayload.location = params[2];
      updatePayload.description = params[3] || '';
      updatePayload.wage = Number(params[4]) || 0;
      updatePayload.advance_withdraw = Number(params[5]) || 0;
      updatePayload.note = params[6] || '';
    } else if (sql.includes('wage =')) {
      updatePayload.wage = Number(params[0]) || 0;
      if (params.length > 2) {
        updatePayload.advance_withdraw = Number(params[1]) || 0;
      }
    }

    const { error } = await client.from('jobs').update(updatePayload).eq('id', jobId);
    if (error) throw new Error(formatSupabaseError(error));
    return { changes: 1 };
  }

  if (upper.startsWith('INSERT INTO DEBT_TRANSACTIONS')) {
    const { data, error } = await client.from('debt_transactions').insert({
      debtor_id: Number(params[0]),
      job_id: Number(params[1]),
      transaction_date: params[2],
      deducted_amount: Number(params[3]),
      debt_before: Number(params[4]),
      debt_after: Number(params[5]),
      created_by: params[6] ? Number(params[6]) : null
    }).select();
    if (error) throw new Error(formatSupabaseError(error));
    return { lastID: Number(data[0]?.id), changes: 1 };
  }

  if (upper.startsWith('INSERT INTO AUDIT_LOGS')) {
    const { data, error } = await client.from('audit_logs').insert({
      user_id: params[0] ? Number(params[0]) : null,
      username: params[1] || 'System',
      action: params[2],
      details: typeof params[3] === 'string' ? params[3] : JSON.stringify(params[3])
    }).select();
    if (error) console.error('Supabase audit log error:', error);
    return { lastID: data && data[0] ? Number(data[0].id) : null, changes: 1 };
  }

  if (upper.startsWith('DELETE FROM DEBT_TRANSACTIONS')) {
    const targetId = Number(params[0]);
    if (isNaN(targetId) || targetId <= 0) {
      return { changes: 0 };
    }
    let query = client.from('debt_transactions').delete();
    if (sql.includes('job_id =')) {
      query = query.eq('job_id', targetId);
    } else if (sql.includes('debtor_id =')) {
      query = query.eq('debtor_id', targetId);
    } else {
      query = query.eq('id', targetId);
    }
    const { error } = await query;
    if (error) throw new Error(formatSupabaseError(error));
    return { changes: 1 };
  }

  if (upper.startsWith('DELETE FROM JOBS')) {
    const targetId = Number(params[0]);
    if (isNaN(targetId) || targetId <= 0) {
      throw new Error('รหัสรายการงานไม่ถูกต้อง');
    }
    let query = client.from('jobs').delete();
    if (sql.includes('debtor_id =')) {
      query = query.eq('debtor_id', targetId);
    } else {
      query = query.eq('id', targetId);
    }
    const { error } = await query;
    if (error) throw new Error(formatSupabaseError(error));
    return { changes: 1 };
  }

  if (upper.startsWith('DELETE FROM DEBTORS')) {
    const debtorId = Number(params[0]);
    if (isNaN(debtorId) || debtorId <= 0) {
      throw new Error('รหัสไอดีลูกหนี้ไม่ถูกต้อง');
    }
    await client.from('debt_transactions').delete().eq('debtor_id', debtorId);
    await client.from('jobs').delete().eq('debtor_id', debtorId);

    const { error } = await client.from('debtors').delete().eq('id', debtorId);
    if (error) throw new Error(formatSupabaseError(error));
    return { changes: 1 };
  }

  return { lastID: null, changes: 0 };
}

export const initDb = async () => {
  if (isGoogleSheetsConfigured) {
    console.log('Connected to Google Sheets 100% Real-Time Database Engine successfully:', googleSheetsWebAppUrl);
  } else if (supabase) {
    console.log('Connected to Supabase PostgreSQL real-time cloud database successfully:', rawSupabaseUrl);
  }
};

export default { dbRun, dbGet, dbAll, dbExec, initDb };
