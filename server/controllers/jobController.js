import { dbRun, dbGet, dbAll } from '../db.js';
import { recalculateDebtorHistory, logAudit } from '../services/recalculateService.js';

export const getJobs = async (req, res) => {
  try {
    const { debtor_id, search, location, month, year, page = 1, limit = 100 } = req.query;
    let query = `
      SELECT j.*, d.code as debtor_code, d.name as debtor_name, u.name as creator_name
      FROM jobs j
      JOIN debtors d ON j.debtor_id = d.id
      LEFT JOIN users u ON j.created_by = u.id
    `;
    const params = [];
    const conditions = [];

    if (debtor_id) {
      conditions.push('j.debtor_id = ?');
      params.push(debtor_id);
    }

    if (location) {
      conditions.push('j.location LIKE ?');
      params.push(`%${location}%`);
    }

    if (search) {
      conditions.push('(d.name LIKE ? OR d.code LIKE ? OR j.location LIKE ? OR j.description LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (year) {
      conditions.push("strftime('%Y', j.job_date) = ?");
      params.push(String(year));
    }

    if (month) {
      const paddedMonth = String(month).padStart(2, '0');
      conditions.push("strftime('%m', j.job_date) = ?");
      params.push(paddedMonth);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY date(j.job_date) DESC, j.id DESC';

    const offset = (Number(page) - 1) * Number(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const jobs = await dbAll(query, params);

    // Count
    let countQuery = 'SELECT COUNT(*) as total FROM jobs j JOIN debtors d ON j.debtor_id = d.id';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    const totalRow = await dbGet(countQuery, params.slice(0, params.length - 2));

    res.json({
      jobs,
      pagination: {
        total: totalRow ? totalRow.total : 0,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const previewJobDeduction = async (req, res) => {
  try {
    const { debtor_id, wage, advance_withdraw } = req.body;
    
    const numDebtorId = Number(debtor_id);
    if (!debtor_id || isNaN(numDebtorId) || numDebtorId <= 0) {
      return res.status(400).json({ message: 'กรุณาเลือกลูกหนี้' });
    }

    const debtor = await dbGet(`
      SELECT d.*, 
        MAX(0, d.initial_debt - COALESCE(SUM(j.debt_deduction), 0)) as remaining_debt
      FROM debtors d
      LEFT JOIN jobs j ON d.id = j.debtor_id
      WHERE d.id = ?
      GROUP BY d.id
    `, [numDebtorId]);

    if (!debtor) {
      return res.status(404).json({ message: 'ไม่พบลูกหนี้' });
    }

    const numWage = Math.max(0, Number(wage) || 0);
    const numAdvance = Math.max(0, Number(advance_withdraw) || 0);

    if (numAdvance > numWage) {
      return res.status(400).json({ message: 'จำนวนเงินเบิกต้องไม่เกินค่าแรง' });
    }

    const availableForDeduction = numWage - numAdvance;
    const debtDeduction = Math.min(availableForDeduction, debtor.remaining_debt);
    const netWage = availableForDeduction - debtDeduction;

    res.json({
      wage: numWage,
      advance_withdraw: numAdvance,
      available_for_deduction: availableForDeduction,
      debt_deduction: debtDeduction,
      net_wage: netWage,
      remaining_debt_before: debtor.remaining_debt,
      remaining_debt_after: Math.max(0, debtor.remaining_debt - debtDeduction)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createJob = async (req, res) => {
  try {
    const { debtor_id, job_date, location, description, wage, advance_withdraw, note } = req.body;

    const numDebtorId = Number(debtor_id);
    if (!debtor_id || isNaN(numDebtorId) || numDebtorId <= 0 || !job_date || !location || wage === undefined || wage === null) {
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลลูกหนี้, วันที่จัดงาน, สถานที่จัดงาน และค่าแรงให้ครบถ้วน' });
    }

    const numWage = Number(wage);
    const numAdvance = Number(advance_withdraw || 0);

    if (isNaN(numWage) || numWage < 0) {
      return res.status(400).json({ message: 'จำนวนค่าแรงต้องไม่ติดลบ' });
    }
    if (isNaN(numAdvance) || numAdvance < 0) {
      return res.status(400).json({ message: 'จำนวนเงินเบิกต้องไม่ติดลบ' });
    }
    if (numAdvance > numWage) {
      return res.status(400).json({ message: 'จำนวนเงินเบิกต้องไม่เกินจำนวนค่าแรง' });
    }

    const debtor = await dbGet('SELECT id FROM debtors WHERE id = ?', [numDebtorId]);
    if (!debtor) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลลูกหนี้' });
    }

    // Insert job draft (deduction and net_wage calculated by recalculateDebtorHistory)
    const result = await dbRun(
      `INSERT INTO jobs (debtor_id, job_date, location, description, wage, advance_withdraw, debt_deduction, net_wage, note, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
      [numDebtorId, job_date, location.trim(), description ? description.trim() : '', numWage, numAdvance, note ? note.trim() : '', req.user.id]
    );

    const jobId = result.lastID;

    // Trigger full atomic recalculation
    const recalcResult = await recalculateDebtorHistory(numDebtorId, req.user.id);

    await logAudit(req.user.id, req.user.username, 'CREATE_JOB', {
      jobId,
      debtor_id: numDebtorId,
      job_date,
      wage: numWage,
      advance: numAdvance
    });

    const createdJob = await dbGet(`
      SELECT j.*, d.code as debtor_code, d.name as debtor_name
      FROM jobs j JOIN debtors d ON j.debtor_id = d.id
      WHERE j.id = ?
    `, [jobId]);

    res.status(201).json({
      message: 'บันทึกงานเรียบร้อยแล้ว',
      job: createdJob,
      debtorSummary: recalcResult
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { debtor_id, job_date, location, description, wage, advance_withdraw, note } = req.body;

    const existing = await dbGet('SELECT * FROM jobs WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ message: 'ไม่พบรายการงานที่ต้องการแก้ไข' });
    }

    const targetDebtorId = Number(debtor_id || existing.debtor_id);
    if (isNaN(targetDebtorId) || targetDebtorId <= 0) {
      return res.status(400).json({ message: 'กรุณาเลือกลูกหนี้' });
    }
    const numWage = Number(wage !== undefined ? wage : existing.wage);
    const numAdvance = Number(advance_withdraw !== undefined ? advance_withdraw : existing.advance_withdraw);

    if (isNaN(numWage) || numWage < 0) {
      return res.status(400).json({ message: 'จำนวนค่าแรงต้องไม่ติดลบ' });
    }
    if (isNaN(numAdvance) || numAdvance < 0) {
      return res.status(400).json({ message: 'จำนวนเงินเบิกต้องไม่ติดลบ' });
    }
    if (numAdvance > numWage) {
      return res.status(400).json({ message: 'จำนวนเงินเบิกต้องไม่เกินจำนวนค่าแรง' });
    }

    await dbRun(
      `UPDATE jobs 
       SET debtor_id = ?, job_date = ?, location = ?, description = ?, wage = ?, advance_withdraw = ?, note = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        targetDebtorId,
        job_date || existing.job_date,
        location ? location.trim() : existing.location,
        description !== undefined ? description.trim() : existing.description,
        numWage,
        numAdvance,
        note !== undefined ? note.trim() : existing.note,
        id
      ]
    );

    // If debtor changed, recalculate old debtor first
    if (existing.debtor_id !== targetDebtorId) {
      await recalculateDebtorHistory(existing.debtor_id, req.user.id);
    }
    // Recalculate target debtor
    const recalcResult = await recalculateDebtorHistory(targetDebtorId, req.user.id);

    await logAudit(req.user.id, req.user.username, 'UPDATE_JOB', { jobId: id, debtor_id: targetDebtorId, wage: numWage, advance: numAdvance });

    const updatedJob = await dbGet(`
      SELECT j.*, d.code as debtor_code, d.name as debtor_name
      FROM jobs j JOIN debtors d ON j.debtor_id = d.id
      WHERE j.id = ?
    `, [id]);

    res.json({
      message: 'แก้ไขรายการงานและคำนวณยอดหนี้ใหม่เรียบร้อยแล้ว',
      job: updatedJob,
      debtorSummary: recalcResult
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await dbGet('SELECT * FROM jobs WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ message: 'ไม่พบรายการงานที่ต้องการลบ' });
    }

    const debtorId = existing.debtor_id;

    // Delete job (cascades debt_transactions referencing job_id)
    await dbRun('DELETE FROM jobs WHERE id = ?', [id]);

    // Recalculate debtor history safely
    const recalcResult = await recalculateDebtorHistory(debtorId, req.user.id);

    await logAudit(req.user.id, req.user.username, 'DELETE_JOB', { jobId: id, debtor_id: debtorId, wage: existing.wage });

    res.json({
      message: 'ลบรายการงาน ยกเลิกการหักหนี้ที่เกี่ยวข้อง และคำนวณยอดหนี้ใหม่เรียบร้อยแล้ว',
      debtorSummary: recalcResult
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
