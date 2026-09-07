import { dbAll, dbRun, fetchFromGoogleSheets, isGoogleSheetsConfigured } from '../db.js';
import { recalculateDebtorHistory } from '../services/recalculateService.js';

export const pullState = async (req, res) => {
  try {
    const rawDebtors = (await dbAll('SELECT * FROM debtors')) || [];
    const rawJobs = (await dbAll('SELECT * FROM jobs')) || [];
    const rawTx = (await dbAll('SELECT * FROM debt_transactions')) || [];

    const jobs = rawJobs.map(j => ({
      ...j,
      id: Number(j.id),
      debtor_id: Number(j.debtor_id),
      wage: Number(j.wage) || 0,
      advance_withdraw: Number(j.advance_withdraw) || 0,
      debt_deduction: Number(j.debt_deduction) || 0,
      net_wage: Number(j.net_wage) || 0,
      debtor_code: j.debtor_code || '',
      debtor_name: j.debtor_name || ''
    }));

    const paidMap = jobs.reduce((acc, j) => {
      acc[j.debtor_id] = (acc[j.debtor_id] || 0) + j.debt_deduction;
      return acc;
    }, {});

    const debtors = rawDebtors.map(d => {
      const id = Number(d.id);
      const initial_debt = Number(d.initial_debt) || 0;
      const paid_amount = paidMap[id] !== undefined ? paidMap[id] : (Number(d.paid_amount) || 0);
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

    const transactions = rawTx.map(t => ({
      ...t,
      id: Number(t.id),
      debtor_id: Number(t.debtor_id),
      job_id: Number(t.job_id),
      deducted_amount: Number(t.deducted_amount) || 0,
      debt_before: Number(t.debt_before) || 0,
      debt_after: Number(t.debt_after) || 0,
      debtor_code: t.debtor_code || '',
      debtor_name: t.debtor_name || '',
      job_location: t.job_location || ''
    }));

    return res.json({
      state: {
        debtors,
        jobs,
        transactions
      }
    });
  } catch (err) {
    console.error('Pull state error:', err);
    res.status(500).json({ message: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจากระบบ' });
  }
};

export const pushState = async (req, res) => {
  try {
    const { state } = req.body;
    if (!state) {
      return res.status(400).json({ message: 'ไม่พบข้อมูล state ในการบันทึก' });
    }

    if (Array.isArray(state.debtors)) {
      for (const d of state.debtors) {
        if (d.id && Number(d.id) > 0) {
          await dbRun(
            'UPDATE debtors SET code = ?, name = ?, phone = ?, initial_debt = ?, start_date = ?, note = ? WHERE id = ?',
            [d.code, d.name, d.phone || '', Number(d.initial_debt) || 0, d.start_date, d.note || '', Number(d.id)]
          );
        } else {
          await dbRun(
            'INSERT INTO debtors (code, name, phone, initial_debt, start_date, note, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [d.code, d.name, d.phone || '', Number(d.initial_debt) || 0, d.start_date, d.note || '', d.status || 'active']
          );
        }
      }
    }

    if (Array.isArray(state.jobs)) {
      for (const j of state.jobs) {
        if (j.id && Number(j.id) > 0) {
          await dbRun(
            'UPDATE jobs SET debtor_id = ?, job_date = ?, location = ?, description = ?, wage = ?, advance_withdraw = ?, note = ? WHERE id = ?',
            [Number(j.debtor_id), j.job_date, j.location, j.description || '', Number(j.wage) || 0, Number(j.advance_withdraw) || 0, j.note || '', Number(j.id)]
          );
        } else {
          await dbRun(
            'INSERT INTO jobs (debtor_id, job_date, location, description, wage, advance_withdraw, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [Number(j.debtor_id), j.job_date, j.location, j.description || '', Number(j.wage) || 0, Number(j.advance_withdraw) || 0, j.note || '', req.user?.id]
          );
        }
      }
    }

    const dbts = (await dbAll('SELECT * FROM debtors')) || [];
    for (const d of dbts) {
      await recalculateDebtorHistory(Number(d.id), req.user?.id);
    }

    // Direct single batch sync to Google Sheets (One fast HTTP call)
    if (isGoogleSheetsConfigured) {
      const finalDebtors = (await dbAll('SELECT * FROM debtors')) || [];
      const finalJobs = (await dbAll('SELECT * FROM jobs')) || [];
      const finalTx = (await dbAll('SELECT * FROM debt_transactions')) || [];
      await fetchFromGoogleSheets({
        action: 'push',
        state: {
          debtors: finalDebtors,
          jobs: finalJobs,
          transactions: finalTx
        }
      });
    }

    return await pullState(req, res);
  } catch (err) {
    console.error('Push state error:', err);
    res.status(500).json({ message: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
  }
};
