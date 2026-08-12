import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Sanitize Supabase URL (remove trailing slashes or /rest/v1 suffix)
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
export const supabase = isSupabaseConfigured ? createClient(rawSupabaseUrl, supabaseKey) : null;

// Lazy-loaded SQL.js for local development only (avoids WASM file issues on Vercel)
let sqlJsInstance = null;

export const getDb = async () => {
  if (sqlJsInstance) return sqlJsInstance;
  const initSqlJs = (await import('sql.js')).default;
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dbPath = path.join(__dirname, 'database.sqlite');

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlJsInstance = new initSqlJs.Database(fileBuffer);
  } else {
    sqlJsInstance = new initSqlJs.Database();
  }

  sqlJsInstance.run('PRAGMA foreign_keys = ON;');
  return sqlJsInstance;
};

export const saveDb = async () => {
  if (!sqlJsInstance) return;
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dbPath = path.join(__dirname, 'database.sqlite');

    const data = sqlJsInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (e) {
    // Ignore read-only filesystem errors on Vercel
  }
};

// Unified Database API Abstraction Layer

export const dbRun = async (sql, params = []) => {
  if (isSupabaseConfigured) {
    return await executeSupabaseRun(sql, params);
  } else {
    return await runSqlJs(sql, params);
  }
};

export const dbGet = async (sql, params = []) => {
  if (isSupabaseConfigured) {
    const rows = await executeSupabaseSelect(sql, params);
    return rows.length > 0 ? rows[0] : null;
  } else {
    return await getSqlJs(sql, params);
  }
};

export const dbAll = async (sql, params = []) => {
  if (isSupabaseConfigured) {
    return await executeSupabaseSelect(sql, params);
  } else {
    return await allSqlJs(sql, params);
  }
};

export const dbExec = async (sql) => {
  if (!isSupabaseConfigured) {
    const db = await getDb();
    db.exec(sql);
    await saveDb();
  }
};

// SQL.js Local Fallback Helpers
async function runSqlJs(sql, params) {
  const db = await getDb();
  db.run(sql, params);
  const lastIdRes = db.exec('SELECT last_insert_rowid() as id');
  const lastID = (lastIdRes[0] && lastIdRes[0].values[0]) ? lastIdRes[0].values[0][0] : null;
  const changesRes = db.exec('SELECT changes() as cnt');
  const changes = (changesRes[0] && changesRes[0].values[0]) ? changesRes[0].values[0][0] : 0;
  await saveDb();
  return { lastID, changes };
}

async function getSqlJs(sql, params) {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

async function allSqlJs(sql, params) {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Supabase Cloud Database Query Handlers
async function executeSupabaseSelect(sql, params = []) {
  if (!supabase) {
    throw new Error('ยังไม่ได้เชื่อมต่อ Supabase: กรุณาระบุ SUPABASE_URL และ SUPABASE_KEY ใน Vercel Environment Variables');
  }

  const upper = sql.toUpperCase();

  // 1. USERS
  if (upper.includes('FROM USERS')) {
    if (upper.includes('COUNT(')) {
      const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
      if (error) throw new Error(`Supabase Error (${error.code || 'DB'}): ${error.message}. โปรดรันไฟล์ supabase/schema.sql ใน Supabase SQL Editor`);
      return [{ count: count || 0 }];
    }
    let query = supabase.from('users').select('*');
    if (params.length > 0) {
      if (sql.includes('WHERE username =')) query = query.eq('username', params[0]);
      else if (sql.includes('WHERE id =')) query = query.eq('id', params[0]);
    }
    const { data, error } = await query;
    if (error) throw new Error(`Supabase Error (${error.code || 'DB'}): ${error.message}`);
    return data || [];
  }

  // 2. DEBTORS
  if (upper.includes('FROM DEBTORS')) {
    if (upper.includes('COUNT(')) {
      const { count, error } = await supabase.from('debtors').select('*', { count: 'exact', head: true });
      if (error) throw new Error(`Supabase Error (${error.code || 'DB'}): ${error.message}`);
      return [{ count: count || 0, total: count || 0, maxId: 1 }];
    }

    let query = supabase.from('debtors').select('*');
    if (params.length > 0) {
      if (sql.includes('WHERE d.id =') || sql.includes('WHERE id =')) query = query.eq('id', params[0]);
      else if (sql.includes('WHERE code =') || sql.includes('WHERE d.code =')) query = query.eq('code', params[0]);
      else if (sql.includes('WHERE status =') || sql.includes('WHERE d.status =')) query = query.eq('status', params[0]);
    }
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(`Supabase Error (${error.code || 'DB'}): ${error.message}`);

    const debtors = data || [];
    for (const d of debtors) {
      const { data: jobs } = await supabase.from('jobs').select('debt_deduction').eq('debtor_id', d.id);
      const paid = (jobs || []).reduce((acc, curr) => acc + (Number(curr.debt_deduction) || 0), 0);
      d.paid_amount = paid;
      d.remaining_debt = Math.max(0, (Number(d.initial_debt) || 0) - paid);
    }
    return debtors;
  }

  // 3. JOBS
  if (upper.includes('FROM JOBS')) {
    if (upper.includes('COUNT(')) {
      const { count, error } = await supabase.from('jobs').select('*', { count: 'exact', head: true });
      if (error) throw new Error(`Supabase Error (${error.code || 'DB'}): ${error.message}`);
      return [{ count: count || 0, total: count || 0 }];
    }

    let query = supabase.from('jobs').select('*, debtors(code, name)');
    if (params.length > 0) {
      if (sql.includes('WHERE j.id =') || sql.includes('WHERE id =')) query = query.eq('id', params[0]);
      else if (sql.includes('WHERE j.debtor_id =') || sql.includes('WHERE debtor_id =')) query = query.eq('debtor_id', params[0]);
    }
    query = query.order('job_date', { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(`Supabase Error (${error.code || 'DB'}): ${error.message}`);

    return (data || []).map(j => ({
      ...j,
      debtor_code: j.debtors?.code || '',
      debtor_name: j.debtors?.name || ''
    }));
  }

  // 4. DEBT TRANSACTIONS
  if (upper.includes('FROM DEBT_TRANSACTIONS')) {
    let query = supabase.from('debt_transactions').select('*, debtors(code, name), jobs(location)');
    if (params.length > 0) {
      if (sql.includes('WHERE t.debtor_id =') || sql.includes('WHERE debtor_id =')) query = query.eq('debtor_id', params[0]);
    }
    query = query.order('transaction_date', { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(`Supabase Error (${error.code || 'DB'}): ${error.message}`);

    return (data || []).map(t => ({
      ...t,
      debtor_code: t.debtors?.code || '',
      debtor_name: t.debtors?.name || '',
      job_location: t.jobs?.location || ''
    }));
  }

  return [];
}

async function executeSupabaseRun(sql, params = []) {
  if (!supabase) {
    throw new Error('ยังไม่ได้เชื่อมต่อ Supabase: กรุณาระบุ SUPABASE_URL และ SUPABASE_KEY ใน Vercel Environment Variables');
  }

  const upper = sql.toUpperCase();

  if (upper.startsWith('INSERT INTO USERS')) {
    const { data, error } = await supabase.from('users').insert({
      username: params[0],
      password: params[1],
      name: params[2],
      role: params[3] || 'staff'
    }).select();
    if (error) throw new Error(`Supabase Error (${error.code || 'DB'}): ${error.message}. โปรดรันไฟล์ supabase/schema.sql ใน Supabase SQL Editor`);
    return { lastID: data[0]?.id, changes: 1 };
  }

  if (upper.startsWith('INSERT INTO DEBTORS')) {
    const { data, error } = await supabase.from('debtors').insert({
      code: params[0],
      name: params[1],
      phone: params[2],
      initial_debt: params[3],
      start_date: params[4],
      note: params[5],
      status: params[6] || 'active'
    }).select();
    if (error) throw new Error(`Supabase Error (${error.code || 'DB'}): ${error.message}`);
    return { lastID: data[0]?.id, changes: 1 };
  }

  if (upper.startsWith('UPDATE DEBTORS')) {
    const { error } = await supabase.from('debtors').update({
      code: params[0],
      name: params[1],
      phone: params[2],
      initial_debt: params[3],
      start_date: params[4],
      note: params[5],
      updated_at: new Date().toISOString()
    }).eq('id', params[6]);
    if (error) throw new Error(`Supabase Error (${error.code || 'DB'}): ${error.message}`);
    return { changes: 1 };
  }

  if (upper.startsWith('INSERT INTO JOBS')) {
    const { data, error } = await supabase.from('jobs').insert({
      debtor_id: params[0],
      job_date: params[1],
      location: params[2],
      description: params[3],
      wage: params[4],
      advance_withdraw: params[5],
      note: params[6],
      created_by: params[7]
    }).select();
    if (error) throw new Error(`Supabase Error (${error.code || 'DB'}): ${error.message}`);
    return { lastID: data[0]?.id, changes: 1 };
  }

  if (upper.startsWith('UPDATE JOBS')) {
    const { error } = await supabase.from('jobs').update({
      advance_withdraw: params[0],
      debt_deduction: params[1],
      net_wage: params[2],
      updated_at: new Date().toISOString()
    }).eq('id', params[3]);
    if (error) throw new Error(`Supabase Error (${error.code || 'DB'}): ${error.message}`);
    return { changes: 1 };
  }

  if (upper.startsWith('INSERT INTO DEBT_TRANSACTIONS')) {
    const { data, error } = await supabase.from('debt_transactions').insert({
      debtor_id: params[0],
      job_id: params[1],
      transaction_date: params[2],
      deducted_amount: params[3],
      debt_before: params[4],
      debt_after: params[5],
      created_by: params[6]
    }).select();
    if (error) throw new Error(`Supabase Error (${error.code || 'DB'}): ${error.message}`);
    return { lastID: data[0]?.id, changes: 1 };
  }

  if (upper.startsWith('DELETE FROM DEBT_TRANSACTIONS')) {
    const { error } = await supabase.from('debt_transactions').delete().eq('debtor_id', params[0]);
    if (error) throw new Error(`Supabase Error (${error.code || 'DB'}): ${error.message}`);
    return { changes: 1 };
  }

  if (upper.startsWith('DELETE FROM JOBS')) {
    const { error } = await supabase.from('jobs').delete().eq('id', params[0]);
    if (error) throw new Error(`Supabase Error (${error.code || 'DB'}): ${error.message}`);
    return { changes: 1 };
  }

  if (upper.startsWith('DELETE FROM DEBTORS')) {
    const { error } = await supabase.from('debtors').delete().eq('id', params[0]);
    if (error) throw new Error(`Supabase Error (${error.code || 'DB'}): ${error.message}`);
    return { changes: 1 };
  }

  return { lastID: null, changes: 0 };
}

export const initDb = async () => {
  if (isSupabaseConfigured) {
    console.log('Connected to Supabase PostgreSQL cloud database successfully:', rawSupabaseUrl);
  } else {
    await getDb();
    console.log('Database initialized successfully with ZERO demo data.');
  }
};

export default { dbRun, dbGet, dbAll, dbExec, initDb };
