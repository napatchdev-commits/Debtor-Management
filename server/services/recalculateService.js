import { dbRun, dbGet, dbAll } from '../db.js';

/**
 * Recalculates the complete debt history and deduction transactions for a given debtor.
 * This guarantees strict calculation integrity and prevents negative debt or inconsistent states.
 * 
 * @param {number} debtorId - ID of debtor to recalculate
 * @param {number|null} userId - ID of user performing the action (for audit)
 */
export const recalculateDebtorHistory = async (debtorId, userId = null) => {
  try {
    const debtor = await dbGet('SELECT * FROM debtors WHERE id = ?', [debtorId]);
    if (!debtor) {
      throw new Error(`Debtor with ID ${debtorId} not found`);
    }

    // Clear existing debt transactions for this debtor
    await dbRun('DELETE FROM debt_transactions WHERE debtor_id = ?', [debtorId]);

    // Fetch all jobs for this debtor ordered chronologically by job_date and id
    const jobs = await dbAll(
      'SELECT * FROM jobs WHERE debtor_id = ? ORDER BY date(job_date) ASC, id ASC',
      [debtorId]
    );

    let currentDebt = Number(debtor.initial_debt) || 0;
    let accumulatedPaid = 0;

    for (const job of jobs) {
      const wage = Math.max(0, Number(job.wage) || 0);
      const advance = Math.max(0, Number(job.advance_withdraw) || 0);
      
      // Ensure advance withdrawal does not exceed wage
      const safeAdvance = Math.min(advance, wage);
      const availableForDeduction = wage - safeAdvance;

      // Actual debt deduction cannot exceed remaining debt
      const actualDeduction = Math.min(availableForDeduction, currentDebt);
      const netWage = Math.max(0, availableForDeduction - actualDeduction);

      const debtBefore = currentDebt;
      currentDebt = Math.max(0, currentDebt - actualDeduction);
      accumulatedPaid += actualDeduction;

      // Update job calculation fields
      await dbRun(
        `UPDATE jobs 
         SET advance_withdraw = ?, debt_deduction = ?, net_wage = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [safeAdvance, actualDeduction, netWage, job.id]
      );

      // Record transaction if debt was deducted
      if (actualDeduction > 0) {
        await dbRun(
          `INSERT INTO debt_transactions 
           (debtor_id, job_id, transaction_date, deducted_amount, debt_before, debt_after, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [debtorId, job.id, job.job_date, actualDeduction, debtBefore, currentDebt, userId || job.created_by]
        );
      }
    }

    // Determine status (paid_in_full if remaining debt is 0, else active)
    const newStatus = (currentDebt <= 0 && debtor.initial_debt > 0) ? 'paid_in_full' : 'active';

    await dbRun(
      'UPDATE debtors SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, debtorId]
    );

    return {
      debtorId,
      initialDebt: debtor.initial_debt,
      accumulatedPaid,
      remainingDebt: currentDebt,
      status: newStatus
    };
  } catch (err) {
    console.error('Error recalculating debtor history:', err);
    throw err;
  }
};

/**
 * Audit log helper
 */
export const logAudit = async (userId, username, action, details) => {
  try {
    await dbRun(
      'INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, ?, ?)',
      [userId || null, username || 'System', action, JSON.stringify(details)]
    );
  } catch (e) {
    console.error('Failed to log audit:', e);
  }
};
