-- =========================================================================
-- SUPABASE POSTGRESQL SCHEMA FOR DEBTOR MANAGEMENT SYSTEM
-- =========================================================================
-- Instructions: Copy and paste this complete SQL script into the 
-- Supabase SQL Editor (https://app.supabase.com -> SQL Editor) and click RUN.
-- This creates all necessary tables, indexes, and constraints.
-- =========================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'staff',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Debtors Table
CREATE TABLE IF NOT EXISTS debtors (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  initial_debt NUMERIC NOT NULL CHECK (initial_debt >= 0),
  start_date DATE NOT NULL,
  note TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  debtor_id BIGINT NOT NULL REFERENCES debtors(id) ON DELETE CASCADE,
  job_date DATE NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  wage NUMERIC NOT NULL CHECK (wage >= 0),
  advance_withdraw NUMERIC DEFAULT 0 CHECK (advance_withdraw >= 0),
  debt_deduction NUMERIC DEFAULT 0 CHECK (debt_deduction >= 0),
  net_wage NUMERIC DEFAULT 0 CHECK (net_wage >= 0),
  note TEXT,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Debt Transactions Table
CREATE TABLE IF NOT EXISTS debt_transactions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  debtor_id BIGINT NOT NULL REFERENCES debtors(id) ON DELETE CASCADE,
  job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  deducted_amount NUMERIC NOT NULL CHECK (deducted_amount >= 0),
  debt_before NUMERIC NOT NULL CHECK (debt_before >= 0),
  debt_after NUMERIC NOT NULL CHECK (debt_after >= 0),
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  username TEXT,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_debtors_code ON debtors(code);
CREATE INDEX IF NOT EXISTS idx_debtors_status ON debtors(status);
CREATE INDEX IF NOT EXISTS idx_jobs_debtor_id ON jobs(debtor_id);
CREATE INDEX IF NOT EXISTS idx_jobs_job_date ON jobs(job_date);
CREATE INDEX IF NOT EXISTS idx_transactions_debtor_id ON debt_transactions(debtor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_job_id ON debt_transactions(job_id);

-- Disable Row Level Security for custom backend API access, or configure public policies
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE debtors DISABLE ROW LEVEL SECURITY;
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE debt_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
