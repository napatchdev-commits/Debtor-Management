import { dbRun, dbGet, dbAll } from '../db.js';

export const getMonthlySummary = async (req, res) => {
  try {
    const now = new Date();
    const selectedYear = req.query.year ? String(req.query.year) : String(now.getFullYear());
    const selectedMonth = req.query.month ? String(req.query.month).padStart(2, '0') : String(now.getMonth() + 1).padStart(2, '0');
    const selectedDebtorId = req.query.debtor_id ? Number(req.query.debtor_id) : null;

    const yearMonthStr = `${selectedYear}-${selectedMonth}`;

    // Total jobs calculation for the selected month
    let jobQuery = `
      SELECT 
        COALESCE(SUM(wage), 0) as total_wage,
        COALESCE(SUM(advance_withdraw), 0) as total_advance,
        COALESCE(SUM(debt_deduction), 0) as total_deduction,
        COUNT(DISTINCT debtor_id) as active_debtors_count
      FROM jobs
      WHERE strftime('%Y-%m', job_date) = ?
    `;
    const jobParams = [yearMonthStr];
    if (selectedDebtorId) {
      jobQuery += ' AND debtor_id = ?';
      jobParams.push(selectedDebtorId);
    }
    const jobStats = await dbGet(jobQuery, jobParams);

    // Debtor breakdown list for selected month
    let debtorBreakdownQuery = `
      SELECT 
        d.id as debtor_id,
        d.code as debtor_code,
        d.name as debtor_name,
        d.phone as debtor_phone,
        d.initial_debt,
        d.status,
        COALESCE(SUM(j.wage), 0) as monthly_wage,
        COALESCE(SUM(j.advance_withdraw), 0) as monthly_advance,
        COALESCE(SUM(j.debt_deduction), 0) as monthly_deduction,
        COUNT(j.id) as job_count
      FROM debtors d
      LEFT JOIN jobs j ON d.id = j.debtor_id AND strftime('%Y-%m', j.job_date) = ?
    `;
    const breakdownParams = [yearMonthStr];
    if (selectedDebtorId) {
      debtorBreakdownQuery += ' WHERE d.id = ?';
      breakdownParams.push(selectedDebtorId);
    }
    debtorBreakdownQuery += ' GROUP BY d.id ORDER BY d.code ASC';
    const debtorsList = await dbAll(debtorBreakdownQuery, breakdownParams);

    // Calculate start-of-month and end-of-month debt
    // Start-of-month debt = initial_debt - debt_deductions prior to selected month
    // End-of-month debt = start-of-month debt - debt_deductions during selected month
    let totalStartDebt = 0;
    let totalEndDebt = 0;
    let paidInFullCount = 0;

    for (const d of debtorsList) {
      const priorDeductionsRow = await dbGet(
        "SELECT COALESCE(SUM(debt_deduction), 0) as prior_paid FROM jobs WHERE debtor_id = ? AND strftime('%Y-%m', job_date) < ?",
        [d.debtor_id, yearMonthStr]
      );
      const priorPaid = priorDeductionsRow ? priorDeductionsRow.prior_paid : 0;
      
      const startDebt = Math.max(0, d.initial_debt - priorPaid);
      const endDebt = Math.max(0, startDebt - d.monthly_deduction);

      d.start_debt = startDebt;
      d.end_debt = endDebt;

      totalStartDebt += startDebt;
      totalEndDebt += endDebt;

      if (endDebt === 0 && d.initial_debt > 0) {
        paidInFullCount++;
      }
    }

    res.json({
      summary: {
        year: selectedYear,
        month: selectedMonth,
        total_wage: jobStats.total_wage || 0,
        total_advance: jobStats.total_advance || 0,
        total_deduction: jobStats.total_deduction || 0,
        start_month_debt: totalStartDebt,
        end_month_debt: totalEndDebt,
        active_debtors_count: jobStats.active_debtors_count || 0,
        paid_in_full_count: paidInFullCount
      },
      debtors: debtorsList
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
