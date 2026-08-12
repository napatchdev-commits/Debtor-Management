import { dbRun, dbGet, dbAll } from '../db.js';
import { recalculateDebtorHistory, logAudit } from '../services/recalculateService.js';

export const getDebtors = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 100 } = req.query;
    let query = `
      SELECT d.*, 
        COALESCE(SUM(j.debt_deduction), 0) as paid_amount,
        MAX(0, d.initial_debt - COALESCE(SUM(j.debt_deduction), 0)) as remaining_debt,
        COUNT(j.id) as total_jobs
      FROM debtors d
      LEFT JOIN jobs j ON d.id = j.debtor_id
    `;
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push('(d.code LIKE ? OR d.name LIKE ? OR d.phone LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (status) {
      conditions.push('d.status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY d.id ORDER BY d.created_at DESC';

    const offset = (Number(page) - 1) * Number(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const debtors = await dbAll(query, params);

    // Count query
    let countQuery = 'SELECT COUNT(DISTINCT d.id) as total FROM debtors d';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    const totalRow = await dbGet(countQuery, params.slice(0, params.length - 2));

    res.json({
      debtors,
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

export const getDebtorById = async (req, res) => {
  try {
    const { id } = req.params;
    const debtor = await dbGet(`
      SELECT d.*, 
        COALESCE(SUM(j.debt_deduction), 0) as paid_amount,
        MAX(0, d.initial_debt - COALESCE(SUM(j.debt_deduction), 0)) as remaining_debt
      FROM debtors d
      LEFT JOIN jobs j ON d.id = j.debtor_id
      WHERE d.id = ?
      GROUP BY d.id
    `, [id]);

    if (!debtor) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลลูกหนี้' });
    }

    // Jobs history
    const jobs = await dbAll(
      'SELECT j.*, u.name as creator_name FROM jobs j LEFT JOIN users u ON j.created_by = u.id WHERE j.debtor_id = ? ORDER BY date(j.job_date) DESC, j.id DESC',
      [id]
    );

    // Debt deduction transactions history
    const transactions = await dbAll(
      `SELECT t.*, j.location as job_location, u.name as creator_name 
       FROM debt_transactions t 
       LEFT JOIN jobs j ON t.job_id = j.id 
       LEFT JOIN users u ON t.created_by = u.id 
       WHERE t.debtor_id = ? 
       ORDER BY date(t.transaction_date) DESC, t.id DESC`,
      [id]
    );

    res.json({
      debtor,
      jobs,
      transactions
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createDebtor = async (req, res) => {
  try {
    const { code, name, phone, initial_debt, start_date, note } = req.body;

    if (!name || initial_debt === undefined || initial_debt === null || !start_date) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อ, ยอดหนี้เริ่มต้น และวันที่เริ่มต้นให้ครบถ้วน' });
    }

    const numInitialDebt = Number(initial_debt);
    if (isNaN(numInitialDebt) || numInitialDebt < 0) {
      return res.status(400).json({ message: 'ยอดหนี้เริ่มต้นต้องเป็นจำนวนเงินที่ถูกต้องและไม่ติดลบ' });
    }

    // Auto code generation if code is empty
    let debtorCode = code ? code.trim() : '';
    if (!debtorCode) {
      const maxIdRow = await dbGet('SELECT MAX(id) as maxId FROM debtors');
      const nextNum = (maxIdRow && maxIdRow.maxId ? maxIdRow.maxId : 0) + 1;
      debtorCode = `DB-${String(nextNum).padStart(4, '0')}`;
    }

    // Check duplicate code
    const existingCode = await dbGet('SELECT id FROM debtors WHERE code = ?', [debtorCode]);
    if (existingCode) {
      return res.status(400).json({ message: `รหัสลูกหนี้ "${debtorCode}" มีในระบบแล้ว` });
    }

    const initialStatus = numInitialDebt === 0 ? 'paid_in_full' : 'active';

    const result = await dbRun(
      `INSERT INTO debtors (code, name, phone, initial_debt, start_date, note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [debtorCode, name.trim(), phone ? phone.trim() : '', numInitialDebt, start_date, note ? note.trim() : '', initialStatus]
    );

    await logAudit(req.user.id, req.user.username, 'CREATE_DEBTOR', { id: result.lastID, code: debtorCode, name, initial_debt: numInitialDebt });

    const newDebtor = await dbGet('SELECT * FROM debtors WHERE id = ?', [result.lastID]);
    res.status(201).json({
      message: 'เพิ่มข้อมูลลูกหนี้เรียบร้อยแล้ว',
      debtor: {
        ...newDebtor,
        paid_amount: 0,
        remaining_debt: numInitialDebt
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateDebtor = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, phone, initial_debt, start_date, note } = req.body;

    const existing = await dbGet('SELECT * FROM debtors WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลลูกหนี้' });
    }

    if (!name || initial_debt === undefined || initial_debt === null || !start_date) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อ, ยอดหนี้เริ่มต้น และวันที่เริ่มต้นให้ครบถ้วน' });
    }

    const numInitialDebt = Number(initial_debt);
    if (isNaN(numInitialDebt) || numInitialDebt < 0) {
      return res.status(400).json({ message: 'ยอดหนี้เริ่มต้นต้องไม่ติดลบ' });
    }

    // Check code duplication if changed
    if (code && code.trim() !== existing.code) {
      const codeCheck = await dbGet('SELECT id FROM debtors WHERE code = ? AND id != ?', [code.trim(), id]);
      if (codeCheck) {
        return res.status(400).json({ message: `รหัสลูกหนี้ "${code.trim()}" มีในระบบแล้ว` });
      }
    }

    await dbRun(
      `UPDATE debtors 
       SET code = ?, name = ?, phone = ?, initial_debt = ?, start_date = ?, note = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        code ? code.trim() : existing.code,
        name.trim(),
        phone ? phone.trim() : '',
        numInitialDebt,
        start_date,
        note ? note.trim() : '',
        id
      ]
    );

    // Recalculate if initial debt changed
    await recalculateDebtorHistory(id, req.user.id);

    await logAudit(req.user.id, req.user.username, 'UPDATE_DEBTOR', { id, code, name, numInitialDebt });

    const updated = await dbGet(`
      SELECT d.*, 
        COALESCE(SUM(j.debt_deduction), 0) as paid_amount,
        MAX(0, d.initial_debt - COALESCE(SUM(j.debt_deduction), 0)) as remaining_debt
      FROM debtors d
      LEFT JOIN jobs j ON d.id = j.debtor_id
      WHERE d.id = ?
      GROUP BY d.id
    `, [id]);

    res.json({ message: 'แก้ไขข้อมูลลูกหนี้เรียบร้อยแล้ว', debtor: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteDebtor = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await dbGet('SELECT * FROM debtors WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลลูกหนี้' });
    }

    await dbRun('DELETE FROM debtors WHERE id = ?', [id]);
    await logAudit(req.user.id, req.user.username, 'DELETE_DEBTOR', { id, code: existing.code, name: existing.name });

    res.json({ message: `ลบลูกหนี้ "${existing.name}" เรียบร้อยแล้ว` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
