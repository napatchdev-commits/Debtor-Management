import { dbAll } from '../db.js';

export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const debtors = (await dbAll('SELECT * FROM debtors')) || [];
    const jobs = (await dbAll('SELECT * FROM jobs')) || [];
    const recentTx = (await dbAll('SELECT * FROM debt_transactions')) || [];

    const totalDebtors = debtors.length;
    const totalInitialDebt = debtors.reduce((sum, d) => sum + (Number(d.initial_debt) || 0), 0);
    const totalDeducted = jobs.reduce((sum, j) => sum + (Number(j.debt_deduction) || 0), 0);
    const remainingDebt = Math.max(0, totalInitialDebt - totalDeducted);

    const currentMonthJobs = jobs.filter(j => j.job_date && String(j.job_date).startsWith(currentYearMonth));
    const currentMonthWage = currentMonthJobs.reduce((sum, j) => sum + (Number(j.wage) || 0), 0);
    const currentMonthAdvance = currentMonthJobs.reduce((sum, j) => sum + (Number(j.advance_withdraw) || 0), 0);
    const currentMonthDeduction = currentMonthJobs.reduce((sum, j) => sum + (Number(j.debt_deduction) || 0), 0);

    const paidInFullCount = debtors.filter(d => {
      const dId = Number(d.id);
      const dPaid = jobs.filter(j => Number(j.debtor_id) === dId).reduce((sum, j) => sum + (Number(j.debt_deduction) || 0), 0);
      const rem = Math.max(0, (Number(d.initial_debt) || 0) - dPaid);
      return rem <= 0 && Number(d.initial_debt) > 0;
    }).length;

    const activeDebtorsCount = Math.max(0, totalDebtors - paidInFullCount);

    const recentTransactions = recentTx.slice(0, 5).map(t => ({
      ...t,
      debtor_code: t.debtor_code || t.debtors?.code || '',
      debtor_name: t.debtor_name || t.debtors?.name || '',
      job_location: t.job_location || t.jobs?.location || ''
    }));

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
          wage: currentMonthWage,
          advance: currentMonthAdvance,
          deduction: currentMonthDeduction
        }
      },
      recentTransactions
    });
  } catch (err) {
    console.error('Get dashboard stats error:', err);
    res.status(500).json({ message: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลแดชบอร์ด' });
  }
};
