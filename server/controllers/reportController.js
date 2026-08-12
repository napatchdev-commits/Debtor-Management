import { dbAll } from '../db.js';

export const getReportsData = async (req, res) => {
  try {
    const { reportType, startDate, endDate, debtorId, year, month } = req.query;

    let data = [];
    let summary = {};

    if (reportType === 'debtors') {
      const debtors = (await dbAll('SELECT * FROM debtors')) || [];
      const jobs = (await dbAll('SELECT * FROM jobs')) || [];

      const paidMap = jobs.reduce((acc, j) => {
        const dId = Number(j.debtor_id);
        acc[dId] = (acc[dId] || 0) + (Number(j.debt_deduction) || 0);
        return acc;
      }, {});

      const jobCountMap = jobs.reduce((acc, j) => {
        const dId = Number(j.debtor_id);
        acc[dId] = (acc[dId] || 0) + 1;
        return acc;
      }, {});

      data = debtors.map(d => {
        const id = Number(d.id);
        const initial_debt = Number(d.initial_debt) || 0;
        const paid_amount = paidMap[id] || 0;
        const remaining_debt = Math.max(0, initial_debt - paid_amount);
        return {
          ...d,
          id,
          initial_debt,
          paid_amount,
          remaining_debt,
          job_count: jobCountMap[id] || 0
        };
      });

      data.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true }));

      const totalInitial = data.reduce((acc, curr) => acc + curr.initial_debt, 0);
      const totalPaid = data.reduce((acc, curr) => acc + curr.paid_amount, 0);
      const totalRemaining = data.reduce((acc, curr) => acc + curr.remaining_debt, 0);

      summary = {
        totalDebtors: data.length,
        totalInitial,
        totalPaid,
        totalRemaining
      };
    } else if (reportType === 'jobs' || reportType === 'wages' || reportType === 'advances' || reportType === 'deductions') {
      let jobs = (await dbAll('SELECT * FROM jobs')) || [];

      if (startDate) {
        jobs = jobs.filter(j => j.job_date && j.job_date >= startDate);
      }
      if (endDate) {
        jobs = jobs.filter(j => j.job_date && j.job_date <= endDate);
      }
      if (debtorId && !isNaN(Number(debtorId))) {
        jobs = jobs.filter(j => Number(j.debtor_id) === Number(debtorId));
      }
      if (year && month) {
        const targetYM = `${year}-${String(month).padStart(2, '0')}`;
        jobs = jobs.filter(j => j.job_date && String(j.job_date).startsWith(targetYM));
      }

      data = jobs.map(j => ({
        ...j,
        wage: Number(j.wage) || 0,
        advance_withdraw: Number(j.advance_withdraw) || 0,
        debt_deduction: Number(j.debt_deduction) || 0,
        net_wage: Number(j.net_wage) || 0,
        debtor_code: j.debtor_code || j.debtors?.code || '',
        debtor_name: j.debtor_name || j.debtors?.name || ''
      }));

      const totalWage = data.reduce((acc, curr) => acc + curr.wage, 0);
      const totalAdvance = data.reduce((acc, curr) => acc + curr.advance_withdraw, 0);
      const totalDeduction = data.reduce((acc, curr) => acc + curr.debt_deduction, 0);
      const totalNetWage = data.reduce((acc, curr) => acc + curr.net_wage, 0);

      summary = {
        totalJobs: data.length,
        totalWage,
        totalAdvance,
        totalDeduction,
        totalNetWage
      };
    } else if (reportType === 'transactions') {
      let transactions = (await dbAll('SELECT * FROM debt_transactions')) || [];

      if (startDate) {
        transactions = transactions.filter(t => t.transaction_date && t.transaction_date >= startDate);
      }
      if (endDate) {
        transactions = transactions.filter(t => t.transaction_date && t.transaction_date <= endDate);
      }
      if (debtorId && !isNaN(Number(debtorId))) {
        transactions = transactions.filter(t => Number(t.debtor_id) === Number(debtorId));
      }

      data = transactions.map(t => ({
        ...t,
        deducted_amount: Number(t.deducted_amount) || 0,
        debtor_code: t.debtor_code || t.debtors?.code || '',
        debtor_name: t.debtor_name || t.debtors?.name || '',
        job_location: t.job_location || t.jobs?.location || ''
      }));

      const totalDeducted = data.reduce((acc, curr) => acc + curr.deducted_amount, 0);

      summary = {
        totalTransactions: data.length,
        totalDeducted
      };
    }

    res.json({
      reportType,
      data,
      summary
    });
  } catch (err) {
    console.error('Get reports data error:', err);
    res.status(500).json({ message: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน' });
  }
};
