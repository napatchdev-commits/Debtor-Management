import { dbAll, dbRun, dbGet, getSupabaseClient } from '../db.js';
import { recalculateDebtorHistory } from '../services/recalculateService.js';

export const pullState = async (req, res) => {
  try {
    const client = getSupabaseClient();

    // 1. Fetch debtors
    const { data: rawDebtors, error: dErr } = await client
      .from('debtors')
      .select('*')
      .order('created_at', { ascending: false });

    if (dErr) throw dErr;

    // 2. Fetch jobs
    const { data: rawJobs, error: jErr } = await client
      .from('jobs')
      .select('*, debtors(code, name)')
      .order('job_date', { ascending: false });

    if (jErr) throw jErr;

    // 3. Fetch transactions
    const { data: rawTx, error: tErr } = await client
      .from('debt_transactions')
      .select('*, debtors(code, name), jobs(location)')
      .order('transaction_date', { ascending: false });

    if (tErr) throw tErr;

    // Map & compute paid_amount / remaining_debt in bulk
    const jobs = (rawJobs || []).map(j => ({
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

    const paidMap = jobs.reduce((acc, j) => {
      acc[j.debtor_id] = (acc[j.debtor_id] || 0) + j.debt_deduction;
      return acc;
    }, {});

    const debtors = (rawDebtors || []).map(d => {
      const id = Number(d.id);
      const initial_debt = Number(d.initial_debt) || 0;
      const paid_amount = paidMap[id] || 0;
      const remaining_debt = Math.max(0, initial_debt - paid_amount);
      const status = (remaining_debt <= 0 && initial_debt > 0) ? 'paid_in_full' : (d.status || 'active');

      return {
        ...d,
        id,
        code: d.code || `DB-${id}`,
        name: d.name || `ลูกหนี้รหัส ${id}`,
        phone: d.phone || '',
        initial_debt,
        paid_amount,
        remaining_debt,
        status
      };
    });

    const transactions = (rawTx || []).map(t => ({
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

    res.json({
      state: {
        debtors,
        jobs,
        transactions
      }
    });
  } catch (err) {
    console.error('Pull state error:', err);
    res.status(500).json({ message: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจาก Supabase' });
  }
};

export const pushState = async (req, res) => {
  try {
    const { state } = req.body;
    if (!state) {
      return res.status(400).json({ message: 'ไม่พบข้อมูล state ในการบันทึก' });
    }

    const client = getSupabaseClient();

    // 1. Sync debtors
    if (Array.isArray(state.debtors)) {
      for (const d of state.debtors) {
        const payload = {
          code: d.code,
          name: d.name,
          phone: d.phone || '',
          initial_debt: Number(d.initial_debt) || 0,
          start_date: d.start_date || new Date().toISOString().split('T')[0],
          note: d.note || '',
          status: d.status || 'active',
          updated_at: new Date().toISOString()
        };

        if (d.id && Number(d.id) > 0) {
          await client.from('debtors').upsert({ id: Number(d.id), ...payload });
        } else {
          await client.from('debtors').insert(payload);
        }
      }
    }

    // 2. Sync jobs
    if (Array.isArray(state.jobs)) {
      for (const j of state.jobs) {
        const payload = {
          debtor_id: Number(j.debtor_id),
          job_date: j.job_date,
          location: j.location,
          description: j.description || '',
          wage: Number(j.wage) || 0,
          advance_withdraw: Number(j.advance_withdraw) || 0,
          note: j.note || '',
          updated_at: new Date().toISOString()
        };

        if (j.id && Number(j.id) > 0) {
          await client.from('jobs').upsert({ id: Number(j.id), ...payload });
        } else {
          await client.from('jobs').insert(payload);
        }
      }
    }

    // Recalculate debt balances for all debtors
    const { data: dbts } = await client.from('debtors').select('id');
    if (dbts) {
      for (const d of dbts) {
        await recalculateDebtorHistory(Number(d.id), req.user?.id);
      }
    }

    // Return fresh pulled state
    return await pullState(req, res);
  } catch (err) {
    console.error('Push state error:', err);
    res.status(500).json({ message: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลไปยัง Supabase' });
  }
};
