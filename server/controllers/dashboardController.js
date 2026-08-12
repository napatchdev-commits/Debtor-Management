import { dbGet, dbAll } from '../db.js';

export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Total debtors
    const totalDebtorsRow = await dbGet('SELECT COUNT(*) as total FROM debtors');
    const totalDebtors = totalDebtorsRow ? totalDebtorsRow.total : 0;

    // Total initial debt
    const totalInitialDebtRow = await dbGet('SELECT COALESCE(SUM(initial_debt), 0) as total FROM debtors');
    const totalInitialDebt = totalInitialDebtRow ? totalInitialDebtRow.total : 0;

    // Total debt deductions across all history
    const totalDeductedRow = await dbGet('SELECT COALESCE(SUM(debt_deduction), 0) as total FROM jobs');
    const totalDeducted = totalDeductedRow ? totalDeductedRow.total : 0;

    // Remaining debt
    const remainingDebt = Math.max(0, totalInitialDebt - totalDeducted);

    // Current month job stats
    const currentMonthJobRow = await dbGet(
      `SELECT 
        COALESCE(SUM(wage), 0) as wage,
        COALESCE(SUM(advance_withdraw), 0) as advance,
        COALESCE(SUM(debt_deduction), 0) as deduction
       FROM jobs 
       WHERE strftime('%Y-%m', job_date) = ?`,
      [currentYearMonth]
    );

    // Paid in full debtors count
    const paidInFullRow = await dbGet("SELECT COUNT(*) as total FROM debtors WHERE status = 'paid_in_full'");
    const paidInFullCount = paidInFullRow ? paidInFullRow.total : 0;

    // Active debtors count
    const activeDebtorsCount = Math.max(0, totalDebtors - paidInFullCount);

    // Recent debt transactions (up to 5)
    const recentTransactions = await dbAll(
      `SELECT t.*, d.code as debtor_code, d.name as debtor_name, j.location as job_location
       FROM debt_transactions t
       JOIN debtors d ON t.debtor_id = d.id
       JOIN jobs j ON t.job_id = j.id
       ORDER BY t.created_at DESC
       LIMIT 5`
    );

    res.json({
      stats: {
        totalDebtors,
        activeDebtorsCount,
        paidInFullCount,
        totalInitialDebt,
        totalDeducted,
        remainingDebt,
        currentMonth: {
          yearMonth: currentYearMonth,
          wage: currentMonthJobRow ? currentMonthJobRow.wage : 0,
          advance: currentMonthJobRow ? currentMonthJobRow.advance : 0,
          deduction: currentMonthJobRow ? currentMonthJobRow.deduction : 0
        }
      },
      recentTransactions
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
