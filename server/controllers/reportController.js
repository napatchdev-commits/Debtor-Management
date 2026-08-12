import { dbAll, dbGet } from '../db.js';

export const getReportsData = async (req, res) => {
  try {
    const { reportType, startDate, endDate, debtorId, year, month } = req.query;

    let data = [];
    let summary = {};

    if (reportType === 'debtors') {
      data = await dbAll(`
        SELECT d.*,
          COALESCE(SUM(j.debt_deduction), 0) as paid_amount,
          MAX(0, d.initial_debt - COALESCE(SUM(j.debt_deduction), 0)) as remaining_debt,
          COUNT(j.id) as job_count
        FROM debtors d
        LEFT JOIN jobs j ON d.id = j.debtor_id
        GROUP BY d.id
        ORDER BY d.code ASC
      `);

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
      let query = `
        SELECT j.*, d.code as debtor_code, d.name as debtor_name, d.phone as debtor_phone
        FROM jobs j
        JOIN debtors d ON j.debtor_id = d.id
      `;
      const params = [];
      const conditions = [];

      if (startDate) {
        conditions.push('j.job_date >= ?');
        params.push(startDate);
      }
      if (endDate) {
        conditions.push('j.job_date <= ?');
        params.push(endDate);
      }
      if (debtorId) {
        conditions.push('j.debtor_id = ?');
        params.push(debtorId);
      }
      if (year && month) {
        conditions.push("strftime('%Y-%m', j.job_date) = ?");
        params.push(`${year}-${String(month).padStart(2, '0')}`);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      query += ' ORDER BY date(j.job_date) DESC, j.id DESC';

      data = await dbAll(query, params);

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
      let query = `
        SELECT t.*, d.code as debtor_code, d.name as debtor_name, j.location as job_location
        FROM debt_transactions t
        JOIN debtors d ON t.debtor_id = d.id
        JOIN jobs j ON t.job_id = j.id
      `;
      const params = [];
      const conditions = [];

      if (startDate) {
        conditions.push('t.transaction_date >= ?');
        params.push(startDate);
      }
      if (endDate) {
        conditions.push('t.transaction_date <= ?');
        params.push(endDate);
      }
      if (debtorId) {
        conditions.push('t.debtor_id = ?');
        params.push(debtorId);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      query += ' ORDER BY date(t.transaction_date) DESC, t.id DESC';

      data = await dbAll(query, params);

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
    res.status(500).json({ message: err.message });
  }
};
