import { dbAll } from '../db.js';

export const getMonthlySummary = async (req, res) => {
  try {
    const now = new Date();
    const selectedYear = req.query.year ? String(req.query.year) : String(now.getFullYear());
    const selectedMonth = req.query.month ? String(req.query.month).padStart(2, '0') : String(now.getMonth() + 1).padStart(2, '0');
    const selectedDebtorId = req.query.debtor_id && !isNaN(Number(req.query.debtor_id)) ? Number(req.query.debtor_id) : null;

    const yearMonthStr = `${selectedYear}-${selectedMonth}`;

    // Fetch all debtors and jobs in bulk
    const allDebtors = await dbAll('SELECT * FROM debtors');
    const allJobs = await dbAll('SELECT * FROM jobs');

    // Filter debtors list
    const targetDebtors = (allDebtors || [])
      .filter(d => d && d.id && !isNaN(Number(d.id)))
      .filter(d => !selectedDebtorId || Number(d.id) === selectedDebtorId);

    // Filter jobs for selected month and prior months
    const currentMonthJobs = (allJobs || []).filter(j => {
      if (!j || !j.job_date) return false;
      const jYearMonth = String(j.job_date).substring(0, 7);
      if (jYearMonth !== yearMonthStr) return false;
      if (selectedDebtorId && Number(j.debtor_id) !== selectedDebtorId) return false;
      return true;
    });

    const priorMonthJobs = (allJobs || []).filter(j => {
      if (!j || !j.job_date) return false;
      const jYearMonth = String(j.job_date).substring(0, 7);
      return jYearMonth < yearMonthStr;
    });

    // Overall month statistics
    const totalWage = currentMonthJobs.reduce((sum, j) => sum + (Number(j.wage) || 0), 0);
    const totalAdvance = currentMonthJobs.reduce((sum, j) => sum + (Number(j.advance_withdraw) || 0), 0);
    const totalDeduction = currentMonthJobs.reduce((sum, j) => sum + (Number(j.debt_deduction) || 0), 0);
    
    const activeDebtorIds = new Set(currentMonthJobs.map(j => Number(j.debtor_id)));
    const activeDebtorsCount = activeDebtorIds.size;

    let totalStartDebt = 0;
    let totalEndDebt = 0;
    let paidInFullCount = 0;

    const debtorsList = targetDebtors.map(d => {
      const debtorId = Number(d.id);
      const initialDebt = Number(d.initial_debt) || 0;

      const dMonthJobs = currentMonthJobs.filter(j => Number(j.debtor_id) === debtorId);
      const dPriorJobs = priorMonthJobs.filter(j => Number(j.debtor_id) === debtorId);

      const monthlyWage = dMonthJobs.reduce((sum, j) => sum + (Number(j.wage) || 0), 0);
      const monthlyAdvance = dMonthJobs.reduce((sum, j) => sum + (Number(j.advance_withdraw) || 0), 0);
      const monthlyDeduction = dMonthJobs.reduce((sum, j) => sum + (Number(j.debt_deduction) || 0), 0);
      const jobCount = dMonthJobs.length;

      const priorPaid = dPriorJobs.reduce((sum, j) => sum + (Number(j.debt_deduction) || 0), 0);
      const startDebt = Math.max(0, initialDebt - priorPaid);
      const endDebt = Math.max(0, startDebt - monthlyDeduction);

      totalStartDebt += startDebt;
      totalEndDebt += endDebt;

      const isPaidInFull = (endDebt === 0 && initialDebt > 0) || d.status === 'paid_in_full';
      if (isPaidInFull) {
        paidInFullCount++;
      }

      return {
        debtor_id: debtorId,
        debtor_code: d.code || `DB-${debtorId}`,
        debtor_name: d.name || `ลูกหนี้รหัส ${debtorId}`,
        debtor_phone: d.phone || '',
        initial_debt: initialDebt,
        status: isPaidInFull ? 'paid_in_full' : (d.status || 'active'),
        monthly_wage: monthlyWage,
        monthly_advance: monthlyAdvance,
        monthly_deduction: monthlyDeduction,
        job_count: jobCount,
        start_debt: startDebt,
        end_debt: endDebt
      };
    });

    debtorsList.sort((a, b) => a.debtor_code.localeCompare(b.debtor_code, undefined, { numeric: true }));

    res.json({
      summary: {
        year: selectedYear,
        month: selectedMonth,
        total_wage: totalWage,
        total_advance: totalAdvance,
        total_deduction: totalDeduction,
        start_month_debt: totalStartDebt,
        end_month_debt: totalEndDebt,
        active_debtors_count: activeDebtorsCount,
        paid_in_full_count: paidInFullCount
      },
      debtors: debtorsList
    });
  } catch (err) {
    console.error('Get monthly summary error:', err);
    res.status(500).json({ message: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุปรายเดือน' });
  }
};
