import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Calendar, 
  FileSpreadsheet, 
  LogOut,
  UserCheck,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navigation = ({ activeTab, setActiveTab, selectedDebtorId, setSelectedDebtorId }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'debtors', label: 'ลูกหนี้', icon: Users },
    { id: 'jobs', label: 'บันทึกงาน', icon: Briefcase },
    { id: 'monthly', label: 'สรุปรายเดือน', icon: Calendar },
    { id: 'reports', label: 'รายงาน', icon: FileSpreadsheet },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="desktop-sidebar">
        <div className="brand-header">
          <div className="brand-icon">
            <CreditCard size={24} />
          </div>
          <div>
            <div className="brand-title">หักค่าแรงชำระหนี้</div>
            <div className="brand-subtitle">ระบบจัดการลูกหนี้</div>
          </div>
        </div>

        <nav className="nav-menu">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && !selectedDebtorId;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setSelectedDebtorId(null);
                  setActiveTab(item.id);
                }}
              >
                <Icon className="nav-item-icon" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', padding: '0 0.5rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
              <UserCheck size={18} />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.name || 'ผู้ใช้งาน'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {user?.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'เจ้าหน้าที่ (Staff)'}
              </div>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'flex-start', color: '#f87171' }}
          >
            <LogOut size={16} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="mobile-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="brand-icon" style={{ width: '32px', height: '32px' }}>
            <CreditCard size={18} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'white' }}>
            {navItems.find(i => i.id === activeTab)?.label || 'ระบบลูกหนี้'}
          </span>
        </div>
        <button
          onClick={logout}
          className="btn btn-secondary btn-sm"
          style={{ padding: '0.35rem 0.6rem' }}
          title="ออกจากระบบ"
        >
          <LogOut size={16} />
        </button>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id && !selectedDebtorId;
          return (
            <button
              key={item.id}
              className={`mobile-nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => {
                setSelectedDebtorId(null);
                setActiveTab(item.id);
              }}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
