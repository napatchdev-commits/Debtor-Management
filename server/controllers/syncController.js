import { dbAll, dbRun, fetchFromGoogleSheets, getIsGoogleSheetsConfigured, getGoogleSheetsUrl, setGoogleSheetsUrl, memoryState, hydrateFromGoogleSheets, isHydratedFromSheets, normDate, healSeptemberJobs } from '../db.js';
import { recalculateDebtorHistory } from '../services/recalculateService.js';

export const getSyncConfig = (req, res) => {
  const url = getGoogleSheetsUrl();
  res.json({
    configured: getIsGoogleSheetsConfigured(),
    url: url || ''
  });
};

export const updateSyncConfig = async (req, res) => {
  const { url } = req.body;
  if (url !== undefined) {
    setGoogleSheetsUrl(url);
  }
  res.json({
    configured: getIsGoogleSheetsConfigured(),
    url: getGoogleSheetsUrl(),
    message: 'อัปเดตการตั้งค่า Google Sheets สำเร็จ'
  });
};

export const pullState = async (req, res) => {
  try {
    await hydrateFromGoogleSheets({ maxAgeMs: 5000 });

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
    const { state, googleSheetsUrl } = req.body;
    if (googleSheetsUrl) {
      setGoogleSheetsUrl(googleSheetsUrl);
    }

    if (!state) {
      return res.status(400).json({ message: 'ไม่พบข้อมูล state ในการบันทึก' });
    }

    if (Array.isArray(state.debtors)) {
      for (const d of state.debtors) {
        const dId = Number(d.id);
        const existing = dId > 0 ? (memoryState.debtors || []).find(x => Number(x.id) === dId) : null;
        if (existing) {
          await dbRun(
            'UPDATE debtors SET code = ?, name = ?, phone = ?, initial_debt = ?, start_date = ?, note = ? WHERE id = ?',
            [d.code, d.name, d.phone || '', Number(d.initial_debt) || 0, d.start_date, d.note || '', dId]
          );
        } else {
          const maxDebtorId = (memoryState.debtors && memoryState.debtors.length > 0) ? Math.max(...memoryState.debtors.map(x => Number(x.id) || 0)) : 0;
          const newId = dId > 0 ? dId : (maxDebtorId + 1);
          const newDebtor = {
            id: newId,
            code: d.code || `DB-${newId}`,
            name: d.name || `ลูกหนี้รหัส ${newId}`,
            phone: d.phone || '',
            initial_debt: Number(d.initial_debt) || 0,
            start_date: d.start_date,
            note: d.note || '',
            status: d.status || 'active',
            created_at: d.created_at || new Date().toISOString()
          };
          memoryState.debtors.push(newDebtor);
        }
      }
    }

    if (Array.isArray(state.jobs)) {
      for (const j of state.jobs) {
        const jId = Number(j.id);
        const safeJobDate = normDate(j.job_date);
        const existing = jId > 0 ? (memoryState.jobs || []).find(job => Number(job.id) === jId) : null;
        if (existing) {
          await dbRun(
            'UPDATE jobs SET debtor_id = ?, job_date = ?, location = ?, description = ?, wage = ?, advance_withdraw = ?, note = ? WHERE id = ?',
            [Number(j.debtor_id), safeJobDate, j.location, j.description || '', Number(j.wage) || 0, Number(j.advance_withdraw) || 0, j.note || '', jId]
          );
        } else {
          const maxJobId = (memoryState.jobs && memoryState.jobs.length > 0) ? Math.max(...memoryState.jobs.map(x => Number(x.id) || 0)) : 0;
          const newId = jId > 0 ? jId : (maxJobId + 1);
          const newJob = {
            id: newId,
            debtor_id: Number(j.debtor_id),
            job_date: safeJobDate,
            location: j.location,
            description: j.description || '',
            wage: Number(j.wage) || 0,
            advance_withdraw: Number(j.advance_withdraw) || 0,
            debt_deduction: Number(j.debt_deduction) || 0,
            net_wage: Number(j.net_wage) || 0,
            note: j.note || '',
            created_by: req.user?.id || 1,
            created_at: j.created_at || new Date().toISOString()
          };
          memoryState.jobs.push(newJob);
        }
      }
      memoryState.jobs = healSeptemberJobs(memoryState.jobs);
    }

    const dbts = (await dbAll('SELECT * FROM debtors')) || [];
    for (const d of dbts) {
      await recalculateDebtorHistory(Number(d.id), req.user?.id);
    }

    // Direct single batch sync to Google Sheets (One fast HTTP call)
    if (getIsGoogleSheetsConfigured() && isHydratedFromSheets()) {
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
