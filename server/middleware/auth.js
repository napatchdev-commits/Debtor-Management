import jwt from 'jsonwebtoken';

export const JWT_SECRET = 'debt_management_system_super_secret_key_2026';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'โปรดเข้าสู่ระบบเพื่อใช้งาน' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'สิทธิ์การเข้าใช้งานหมดอายุหรือไม่ถูกต้อง' });
    }
    req.user = user;
    next();
  });
};

export const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'จำเป็นต้องมีสิทธิ์ Admin เพื่อทำรายการนี้' });
  }
};
