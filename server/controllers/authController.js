import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbGet, dbRun, dbAll } from '../db.js';
import { JWT_SECRET } from '../middleware/auth.js';
import { logAudit } from '../services/recalculateService.js';

export const checkSystemStatus = async (req, res) => {
  try {
    const userCount = await dbGet('SELECT COUNT(*) as count FROM users');
    res.json({
      initialized: userCount.count > 0,
      userCount: userCount.count
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const register = async (req, res) => {
  try {
    const { username, password, name, role } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    const existing = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });
    }

    // First user is automatically Admin
    const userCount = await dbGet('SELECT COUNT(*) as count FROM users');
    const assignedRole = userCount.count === 0 ? 'admin' : (role || 'staff');

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await dbRun(
      'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
      [username.trim(), hashedPassword, name.trim(), assignedRole]
    );

    const newUser = await dbGet('SELECT id, username, name, role, created_at FROM users WHERE id = ?', [result.lastID]);
    
    await logAudit(newUser.id, newUser.username, 'REGISTER_USER', { role: assignedRole, name });

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'ลงทะเบียนสำเร็จ',
      token,
      user: newUser
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }

    const user = await dbGet('SELECT * FROM users WHERE username = ?', [username.trim()]);
    if (!user) {
      return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logAudit(user.id, user.username, 'LOGIN', { timestamp: new Date().toISOString() });

    res.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await dbGet('SELECT id, username, name, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(444).json({ message: 'ไม่พบผู้ใช้' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
