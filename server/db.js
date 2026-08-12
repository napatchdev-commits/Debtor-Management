import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Sanitize Supabase URL (strip trailing slashes or /rest/v1 suffix)
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
  if (!supabase) {
    throw new Error('ยังไม่ได้เชื่อมต่อ Supabase: กรุณากรอก SUPABASE_URL และ SUPABASE_KEY ใน Vercel Environment Variables ให้ถูกต้อง');
  }
  return supabase;
};

// Pure Supabase Database Abstraction Layer

export const dbRun = async (sql, params = []) => {
  return await executeSupabaseRun(sql, params);
};

export const dbGet = async (sql, params = []) => {
  const rows = await executeSupabaseSelect(sql, params);
  return rows.length > 0 ? rows[0] : null;
};

export const dbAll = async (sql, params = []) => {
  return await executeSupabaseSelect(sql, params);
};

export const dbExec = async () => {
  // Managed via Supabase SQL Editor
};

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
    if (params.length > 0 && params[0] !== undefined && params[0] !== null) {
      if (sql.includes('WHERE username =')) query = query.eq('username', params[0]);
      else if (sql.includes('WHERE id =')) query = query.eq('id', Number(params[0]));
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
      if (error) throw new Error(formatSupabaseError(error));
      return [{ count: count || 0, total: count || 0, maxId: 1 }];
    }

    let query = client.from('debtors').select('*');

    // Single debtor lookup by ID or Code
    if (sql.includes('WHERE d.id =') || sql.includes('WHERE id =')) {
      const targetId = Number(params[0]);
      if (isNaN(targetId) || targetId <= 0) {
        return [];
      }
      query = query.eq('id', targetId);
    } else if (sql.includes('WHERE code =') || sql.includes('WHERE d.code =')) {
      if (params[0]) query = query.eq('code', params[0]);
    } else if (sql.includes('WHERE status =') || sql.includes('WHERE d.status =')) {
      if (params[0]) query = query.eq('status', params[0]);
    }

    // Search term filtering
    if (sql.includes('LIKE ?') && params.length > 0) {
      const searchTerm = String(params[0]).replace(/%/g, '').trim();
      if (searchTerm) {
        query = query.or(`code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(formatSupabaseError(error));

    const debtors = (data || []).map(d => ({
      ...d,
      id: Number(d.id),
      initial_debt: Number(d.initial_debt) || 0
    }));

    for (const d of debtors) {
      const { data: jobs } = await client.from('jobs').select('debt_deduction').eq('debtor_id', d.id);
      const paid = (jobs || []).reduce((acc, curr) => acc + (Number(curr.debt_deduction) || 0), 0);
      d.paid_amount = paid;
      d.remaining_debt = Math.max(0, d.initial_debt - paid);
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
    if (params.length > 0 && params[0] !== undefined && params[0] !== null) {
      if (sql.includes('WHERE j.id =') || sql.includes('WHERE id =')) {
        const jobId = Number(params[0]);
        if (!isNaN(jobId) && jobId > 0) query = query.eq('id', jobId);
      } else if (sql.includes('WHERE j.debtor_id =') || sql.includes('WHERE debtor_id =')) {
        const debtorId = Number(params[0]);
        if (!isNaN(debtorId) && debtorId > 0) query = query.eq('debtor_id', debtorId);
      }
    }

    if (sql.includes('LIKE ?') && params.length > 0) {
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
    if (params.length > 0 && params[0] !== undefined && params[0] !== null) {
      if (sql.includes('WHERE t.debtor_id =') || sql.includes('WHERE debtor_id =')) {
        const debtorId = Number(params[0]);
        if (!isNaN(debtorId) && debtorId > 0) query = query.eq('debtor_id', debtorId);
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
    const { data, error } = await client.from('debtors').insert({
      code: params[0],
      name: params[1],
      phone: params[2],
      initial_debt: Number(params[3]),
      start_date: params[4],
      note: params[5],
      status: params[6] || 'active'
    }).select();
    if (error) throw new Error(formatSupabaseError(error));
    return { lastID: Number(data[0]?.id), changes: 1 };
  }

  if (upper.startsWith('UPDATE DEBTORS')) {
    const targetId = Number(params[6]);
    if (isNaN(targetId) || targetId <= 0) {
      throw new Error('รหัสไอดีลูกหนี้ไม่ถูกต้อง');
    }
    const { error } = await client.from('debtors').update({
      code: params[0],
      name: params[1],
      phone: params[2],
      initial_debt: Number(params[3]),
      start_date: params[4],
      note: params[5],
      updated_at: new Date().toISOString()
    }).eq('id', targetId);
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
    const jobId = Number(params[3]);
    if (isNaN(jobId) || jobId <= 0) {
      throw new Error('รหัสรายการงานไม่ถูกต้อง');
    }
    const { error } = await client.from('jobs').update({
      advance_withdraw: Number(params[0]),
      debt_deduction: Number(params[1]),
      net_wage: Number(params[2]),
      updated_at: new Date().toISOString()
    }).eq('id', jobId);
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
    const debtorId = Number(params[0]);
    if (isNaN(debtorId) || debtorId <= 0) {
      return { changes: 0 };
    }
    const { error } = await client.from('debt_transactions').delete().eq('debtor_id', debtorId);
    if (error) throw new Error(formatSupabaseError(error));
    return { changes: 1 };
  }

  if (upper.startsWith('DELETE FROM JOBS')) {
    const jobId = Number(params[0]);
    if (isNaN(jobId) || jobId <= 0) {
      throw new Error('รหัสรายการงานไม่ถูกต้อง');
    }
    const { error } = await client.from('jobs').delete().eq('id', jobId);
    if (error) throw new Error(formatSupabaseError(error));
    return { changes: 1 };
  }

  if (upper.startsWith('DELETE FROM DEBTORS')) {
    const debtorId = Number(params[0]);
    if (isNaN(debtorId) || debtorId <= 0) {
      throw new Error('รหัสไอดีลูกหนี้ไม่ถูกต้อง');
    }
    // Delete associated debt_transactions and jobs first to ensure clean cascade delete
    await client.from('debt_transactions').delete().eq('debtor_id', debtorId);
    await client.from('jobs').delete().eq('debtor_id', debtorId);

    const { error } = await client.from('debtors').delete().eq('id', debtorId);
    if (error) throw new Error(formatSupabaseError(error));
    return { changes: 1 };
  }

  return { lastID: null, changes: 0 };
}

export const initDb = async () => {
  if (supabase) {
    console.log('Connected to Supabase PostgreSQL real-time cloud database successfully:', rawSupabaseUrl);
  }
};

export default { dbRun, dbGet, dbAll, dbExec, initDb };
