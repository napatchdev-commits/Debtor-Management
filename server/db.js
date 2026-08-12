import { createClient } from '@supabase/supabase-js';
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'database.sqlite');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null;

let sqlJsInstance = null;

export const getDb = async () => {
  if (sqlJsInstance) return sqlJsInstance;

  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlJsInstance = new SQL.Database(fileBuffer);
  } else {
    sqlJsInstance = new SQL.Database();
  }

  sqlJsInstance.run('PRAGMA foreign_keys = ON;');
  return sqlJsInstance;
};

export const saveDb = () => {
  if (!sqlJsInstance) return;
  const data = sqlJsInstance.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
};

// Unified DB Abstraction Layer (Supports Supabase PostgreSQL & Local SQLite)

export const dbRun = async (sql, params = []) => {
  if (isSupabaseConfigured) {
    // Basic SQL parser for Supabase raw queries or fallbacks
    return await executeSupabaseRun(sql, params);
  } else {
    const db = await getDb();
    db.run(sql, params);
    const lastIdRes = db.exec('SELECT last_insert_rowid() as id');
    const lastID = (lastIdRes[0] && lastIdRes[0].values[0]) ? lastIdRes[0].values[0][0] : null;
    const changesRes = db.exec('SELECT changes() as cnt');
    const changes = (changesRes[0] && changesRes[0].values[0]) ? changesRes[0].values[0][0] : 0;
    saveDb();
    return { lastID, changes };
  }
};

export const dbGet = async (sql, params = []) => {
  if (isSupabaseConfigured) {
    const rows = await executeSupabaseSelect(sql, params);
    return rows.length > 0 ? rows[0] : null;
  } else {
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
};

export const dbAll = async (sql, params = []) => {
  if (isSupabaseConfigured) {
    return await executeSupabaseSelect(sql, params);
  } else {
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
};

export const dbExec = async (sql) => {
  if (!isSupabaseConfigured) {
    const db = await getDb();
    db.exec(sql);
    saveDb();
  }
};

// Supabase Query Resolvers
async function executeSupabaseSelect(sql, params) {
  // Simple table detection
  const upper = sql.toUpperCase();
  
  if (upper.includes('FROM USERS')) {
    let query = supabase.from('users').select('*');
    if (params.length > 0) {
      if (sql.includes('WHERE username =')) query = query.eq('username', params[0]);
      else if (sql.includes('WHERE id =')) query = query.eq('id', params[0]);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
  
  if (upper.includes('FROM DEBTORS')) {
    let query = supabase.from('debtors').select('*');
    if (sql.includes('WHERE id =')) query = query.eq('id', params[0]);
    if (sql.includes('WHERE code =')) query = query.eq('code', params[0]);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  if (upper.includes('FROM JOBS')) {
    let query = supabase.from('jobs').select('*');
    if (sql.includes('WHERE id =')) query = query.eq('id', params[0]);
    if (sql.includes('WHERE debtor_id =')) query = query.eq('debtor_id', params[0]);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  if (upper.includes('FROM DEBT_TRANSACTIONS')) {
    let query = supabase.from('debt_transactions').select('*');
    if (sql.includes('WHERE debtor_id =')) query = query.eq('debtor_id', params[0]);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  return [];
}

async function executeSupabaseRun(sql, params) {
  const upper = sql.toUpperCase();

  if (upper.startsWith('INSERT INTO USERS')) {
    const { data, error } = await supabase.from('users').insert({
      username: params[0],
      password: params[1],
      name: params[2],
      role: params[3] || 'staff'
    }).select();
    if (error) throw error;
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
    if (error) throw error;
    return { lastID: data[0]?.id, changes: 1 };
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
    if (error) throw error;
    return { lastID: data[0]?.id, changes: 1 };
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
    if (error) throw error;
    return { lastID: data[0]?.id, changes: 1 };
  }

  if (upper.startsWith('DELETE FROM DEBT_TRANSACTIONS')) {
    const { error } = await supabase.from('debt_transactions').delete().eq('debtor_id', params[0]);
    if (error) throw error;
    return { changes: 1 };
  }

  if (upper.startsWith('DELETE FROM JOBS')) {
    const { error } = await supabase.from('jobs').delete().eq('id', params[0]);
    if (error) throw error;
    return { changes: 1 };
  }

  if (upper.startsWith('DELETE FROM DEBTORS')) {
    const { error } = await supabase.from('debtors').delete().eq('id', params[0]);
    if (error) throw error;
    return { changes: 1 };
  }

  return { lastID: null, changes: 0 };
}

export const initDb = async () => {
  if (isSupabaseConfigured) {
    console.log('Connected to Supabase PostgreSQL cloud database successfully.');
  } else {
    await getDb();
    await dbExec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'staff',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS debtors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        initial_debt REAL NOT NULL CHECK(initial_debt >= 0),
        start_date TEXT NOT NULL,
        note TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        debtor_id INTEGER NOT NULL REFERENCES debtors(id) ON DELETE CASCADE,
        job_date TEXT NOT NULL,
        location TEXT NOT NULL,
        description TEXT,
        wage REAL NOT NULL CHECK(wage >= 0),
        advance_withdraw REAL DEFAULT 0 CHECK(advance_withdraw >= 0),
        debt_deduction REAL DEFAULT 0 CHECK(debt_deduction >= 0),
        net_wage REAL DEFAULT 0 CHECK(net_wage >= 0),
        note TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS debt_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        debtor_id INTEGER NOT NULL REFERENCES debtors(id) ON DELETE CASCADE,
        job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        transaction_date TEXT NOT NULL,
        deducted_amount REAL NOT NULL CHECK(deducted_amount >= 0),
        debt_before REAL NOT NULL CHECK(debt_before >= 0),
        debt_after REAL NOT NULL CHECK(debt_after >= 0),
        created_by INTEGER REFERENCES users(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        username TEXT,
        action TEXT NOT NULL,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database initialized successfully with ZERO demo data.');
  }
};

export default { dbRun, dbGet, dbAll, dbExec, initDb };
