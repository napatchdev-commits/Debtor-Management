import React, { useState } from 'react';
import { CreditCard, Lock, User, UserPlus, LogIn, ShieldAlert, Key, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const { login, register, systemInitialized } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(!systemInitialized);

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuickLogin = async (targetUser, targetPass) => {
    setUsername(targetUser);
    setPassword(targetPass);
    setError('');
    setLoading(true);
    try {
      await login(targetUser, targetPass);
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegisterMode) {
        if (!name.trim()) {
          setError('กรุณากรอกชื่อ-นามสกุล');
          setLoading(false);
          return;
        }
        await register(username, password, name, !systemInitialized ? 'admin' : 'staff');
      } else {
        await login(username, password);
      }
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการทำรายการ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.15), transparent 40%), radial-gradient(circle at bottom left, rgba(139, 92, 246, 0.15), transparent 40%), var(--bg-primary)'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div className="brand-icon" style={{ width: '56px', height: '56px', margin: '0 auto 1rem auto' }}>
            <CreditCard size={30} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white', marginBottom: '0.35rem' }}>
            {!systemInitialized
              ? 'เริ่มต้นใช้งานระบบ'
              : (isRegisterMode ? 'สร้างบัญชีผู้ใช้งาน' : 'เข้าสู่ระบบ')}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {!systemInitialized
              ? 'กรอกข้อมูลเพื่อสร้างบัญชีผู้ดูแลระบบ (Admin) คนแรก'
              : 'ระบบจัดการลูกหนี้หักจากค่าแรง'}
          </p>
        </div>

        {/* Quick 1-Click Login Box for Convenience */}
        {!isRegisterMode && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: 600, color: '#93c5fd' }}>
              <Sparkles size={16} />
              <span>เข้าสู่ระบบด่วน 1 คลิก (Quick Login)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'admin123')}
                disabled={loading}
                className="btn btn-secondary"
                style={{
                  justifyContent: 'flex-start',
                  padding: '0.6rem 0.85rem',
                  fontSize: '0.85rem',
                  background: 'rgba(30, 41, 59, 0.8)',
                  borderColor: 'rgba(59, 130, 246, 0.4)'
                }}
              >
                👑 <strong>เข้าสู่ระบบด้วย Admin</strong> (รหัส: admin123)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('NaphatDev', 'admin123')}
                disabled={loading}
                className="btn btn-secondary"
                style={{
                  justifyContent: 'flex-start',
                  padding: '0.6rem 0.85rem',
                  fontSize: '0.85rem',
                  background: 'rgba(30, 41, 59, 0.8)',
                  borderColor: 'rgba(139, 92, 246, 0.4)'
                }}
              >
                💻 <strong>เข้าสู่ระบบด้วย NaphatDev</strong> (รหัส: admin123)
              </button>
            </div>
          </div>
        )}

        {!systemInitialized && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.85rem 1rem',
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontSize: '0.825rem',
            color: '#93c5fd'
          }}>
            <ShieldAlert size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>พร้อมสำหรับการใช้งานจริง:</strong> ฐานข้อมูลเปิดใหม่ยังไม่มีข้อมูลใดๆ บัญชีแรกจะเป็น Admin โดยอัตโนมัติ
            </div>
          </div>
        )}

        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#f87171',
            fontSize: '0.85rem',
            marginBottom: '1.25rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegisterMode && (
            <div className="form-group">
              <label className="form-label">ชื่อ - นามสกุล ผู้ใช้งาน</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="เช่น สมชาย ใจดี"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">ชื่อผู้ใช้ (Username)</label>
            <input
              type="text"
              className="form-input"
              placeholder="กรอกชื่อผู้ใช้ (เช่น admin หรือ NaphatDev)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label className="form-label">รหัสผ่าน (Password)</label>
            <input
              type="password"
              className="form-input"
              placeholder="กรอกรหัสผ่าน (เช่น admin123)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : (
              isRegisterMode ? (
                <>
                  <UserPlus size={18} />
                  <span>สร้างบัญชีผู้ใช้งาน</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>เข้าสู่ระบบ</span>
                </>
              )
            )}
          </button>
        </form>

        {systemInitialized && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => {
                setError('');
                setIsRegisterMode(!isRegisterMode);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-primary)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 500
              }}
            >
              {isRegisterMode ? 'มีบัญชีแล้ว? เข้าสู่ระบบ' : 'ต้องการเพิ่มบัญชีผู้ใช้งานใหม่? สมัครที่นี่'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};