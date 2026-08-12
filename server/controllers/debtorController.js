import { dbRun, dbGet, dbAll } from '../db.js';
import { recalculateDebtorHistory, logAudit } from '../services/recalculateService.js';

export const getDebtors = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 500 } = req.query;

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

    if (search && search.trim()) {
      conditions.push('(d.code LIKE ? OR d.name LIKE ? OR d.phone LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term);
    }

    if (status && status.trim()) {
      conditions.push('d.status = ?');
      params.push(status.trim());
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY d.id ORDER BY d.created_at DESC';

    const debtors = await dbAll(query, params);

    res.json({
      debtors: (debtors || []).map(d => ({
        id: Number(d.id),
        code: String(d.code),
        name: String(d.name),
        phone: d.phone ? String(d.phone) : '',
        initial_debt: Number(d.initial_debt) || 0,
        start_date: d.start_date,
        note: d.note || '',
        status: d.status || 'active',
        paid_amount: Number(d.paid_amount) || 0,
        remaining_debt: Number(d.remaining_debt) || 0,
        created_at: d.created_at,
        updated_at: d.updated_at
      })),
      pagination: {
        total: debtors ? debtors.length : 0,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (err) {
    console.error('Get debtors controller error:', err);
    res.status(500).json({ message: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลลูกหนี้' });
  }
};

export const getDebtorById = async (req, res) => {
  try {
    const debtorId = Number(req.params.id);
    if (isNaN(debtorId) || debtorId <= 0) {
      return res.status(400).json({ message: 'รหัสไอดีลูกหนี้ไม่ถูกต้อง' });
    }

    const debtor = await dbGet(`
      SELECT d.*, 
        COALESCE(SUM(j.debt_deduction), 0) as paid_amount,
        MAX(0, d.initial_debt - COALESCE(SUM(j.debt_deduction), 0)) as remaining_debt
      FROM debtors d
      LEFT JOIN jobs j ON d.id = j.debtor_id
      WHERE d.id = ?
      GROUP BY d.id
    `, [debtorId]);

    if (!debtor) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลลูกหนี้ในระบบ' });
    }

    // Jobs history
    const jobs = await dbAll(
      'SELECT j.*, u.name as creator_name FROM jobs j LEFT JOIN users u ON j.created_by = u.id WHERE j.debtor_id = ? ORDER BY date(j.job_date) DESC, j.id DESC',
      [debtorId]
    );

    // Debt deduction transactions history
    const transactions = await dbAll(
      `SELECT t.*, j.location as job_location, u.name as creator_name 
       FROM debt_transactions t 
       LEFT JOIN jobs j ON t.job_id = j.id 
       LEFT JOIN users u ON t.created_by = u.id 
       WHERE t.debtor_id = ? 
       ORDER BY date(t.transaction_date) DESC, t.id DESC`,
      [debtorId]
    );

    res.json({
      debtor: {
        ...debtor,
        id: Number(debtor.id),
        initial_debt: Number(debtor.initial_debt) || 0,
        paid_amount: Number(debtor.paid_amount) || 0,
        remaining_debt: Number(debtor.remaining_debt) || 0
      },
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

    if (!name || !name.trim() || initial_debt === undefined || initial_debt === null || !start_date) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อ, ยอดหนี้เริ่มต้น และวันที่เริ่มต้นให้ครบถ้วน' });
    }

    const numInitialDebt = Number(initial_debt);
    if (isNaN(numInitialDebt) || numInitialDebt < 0) {
      return res.status(400).json({ message: 'ยอดหนี้เริ่มต้นต้องเป็นจำนวนเงินที่ถูกต้องและไม่ติดลบ' });
    }

    // Auto code generation DB-XXXX (sequential based on total rows) if code is empty
    let debtorCode = code ? code.trim() : '';
    if (!debtorCode) {
      const countRow = await dbGet('SELECT COUNT(*) as count FROM debtors');
      const nextNum = (countRow && countRow.count ? Number(countRow.count) : 0) + 1;
      debtorCode = `DB-${String(nextNum).padStart(4, '0')}`;
    }

    // Check duplicate code
    const existingCode = await dbGet('SELECT id FROM debtors WHERE code = ?', [debtorCode]);
    if (existingCode && existingCode.id) {
      return res.status(400).json({ message: `รหัสลูกหนี้ "${debtorCode}" มีในระบบแล้ว` });
    }

    const initialStatus = numInitialDebt === 0 ? 'paid_in_full' : 'active';

    const result = await dbRun(
      `INSERT INTO debtors (code, name, phone, initial_debt, start_date, note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [debtorCode, name.trim(), phone ? phone.trim() : '', numInitialDebt, start_date, note ? note.trim() : '', initialStatus]
    );

    const insertedId = Number(result.lastID);

    await logAudit(req.user?.id, req.user?.username, 'CREATE_DEBTOR', { id: insertedId, code: debtorCode, name: name.trim(), initial_debt: numInitialDebt });

    const newDebtor = await dbGet('SELECT * FROM debtors WHERE id = ?', [insertedId]);

    if (!newDebtor) {
      throw new Error('ไม่สามารถดึงข้อมูลลูกหนี้ที่เพิ่งสร้างจาก Supabase ได้');
    }

    res.status(201).json({
      message: 'เพิ่มข้อมูลลูกหนี้เรียบร้อยแล้ว',
      debtor: newDebtor
    });
  } catch (err) {
    console.error('Create debtor controller error:', err);
    res.status(500).json({ message: err.message || 'เกิดข้อผิดพลาดในการสร้างลูกหนี้' });
  }
};

export const updateDebtor = async (req, res) => {
  try {
    const debtorId = Number(req.params.id);
    if (isNaN(debtorId) || debtorId <= 0) {
      return res.status(400).json({ message: 'รหัสไอดีลูกหนี้ไม่ถูกต้อง' });
    }

    const { code, name, phone, initial_debt, start_date, note } = req.body;

    const existing = await dbGet('SELECT * FROM debtors WHERE id = ?', [debtorId]);
    if (!existing) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลลูกหนี้ในระบบ' });
    }

    if (!name || !name.trim() || initial_debt === undefined || initial_debt === null || !start_date) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อ, ยอดหนี้เริ่มต้น และวันที่เริ่มต้นให้ครบถ้วน' });
    }

    const numInitialDebt = Number(initial_debt);
    if (isNaN(numInitialDebt) || numInitialDebt < 0) {
      return res.status(400).json({ message: 'ยอดหนี้เริ่มต้นต้องไม่ติดลบ' });
    }

    // Check code duplication if changed
    if (code && code.trim() !== existing.code) {
      const codeCheck = await dbGet('SELECT id FROM debtors WHERE code = ? AND id != ?', [code.trim(), debtorId]);
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
        debtorId
      ]
    );

    // Recalculate if initial debt changed
    await recalculateDebtorHistory(debtorId, req.user?.id);

    await logAudit(req.user?.id, req.user?.username, 'UPDATE_DEBTOR', { id: debtorId, code, name, numInitialDebt });

    const updated = await dbGet(`
      SELECT d.*, 
        COALESCE(SUM(j.debt_deduction), 0) as paid_amount,
        MAX(0, d.initial_debt - COALESCE(SUM(j.debt_deduction), 0)) as remaining_debt
      FROM debtors d
      LEFT JOIN jobs j ON d.id = j.debtor_id
      WHERE d.id = ?
      GROUP BY d.id
    `, [debtorId]);

    res.json({
      message: 'แก้ไขข้อมูลลูกหนี้เรียบร้อยแล้ว',
      debtor: {
        ...updated,
        id: debtorId
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteDebtor = async (req, res) => {
  try {
    const debtorId = Number(req.params.id);
    if (isNaN(debtorId) || debtorId <= 0) {
      return res.status(400).json({ message: 'รหัสไอดีลูกหนี้ไม่ถูกต้อง' });
    }

    const existing = await dbGet('SELECT * FROM debtors WHERE id = ?', [debtorId]);
    if (!existing) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลลูกหนี้ในระบบ' });
    }

    await dbRun('DELETE FROM debtors WHERE id = ?', [debtorId]);
    await logAudit(req.user?.id, req.user?.username, 'DELETE_DEBTOR', { id: debtorId, code: existing.code, name: existing.name });

    res.json({ message: `ลบลูกหนี้ "${existing.name}" เรียบร้อยแล้ว` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
