import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Wallet, 
  CheckCircle2, 
  TrendingDown, 
  DollarSign, 
  ArrowRight, 
  Briefcase, 
  Database,
  Plus,
  FileSpreadsheet
} from 'lucide-react';
import { apiFetch, formatCurrency, formatDate } from '../services/api';
import { DBEngine } from '../services/dbEngine';
import { GoogleSheetsModal } from '../components/GoogleSheetsModal';

export const Dashboard = ({ setActiveTab, onSelectDebtor }) => {
  const [data, setData] = useState(() => {
    // Instant initial calculation before first paint
    try {
      const initial = DBEngine.getState();
      if (initial && Array.isArray(initial.debtors) && initial.debtors.length > 0) {
        const debtors = initial.debtors || [];
        const jobs = initial.jobs || [];
        const transactions = initial.transactions || [];
        const now = new Date();
        const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const totalDebtors = debtors.length;
        const totalInitialDebt = debtors.reduce((sum, d) => sum + (Number(d.initial_debt) || 0), 0);
        const totalDeducted = jobs.reduce((sum, j) => sum + (Number(j.debt_deduction) || 0), 0);
        const remainingDebt = Math.max(0, totalInitialDebt - totalDeducted);
        const currentMonthJobs = jobs.filter(j => j.job_date && String(j.job_date).startsWith(currentYearMonth));
        const currentMonthWage = currentMonthJobs.reduce((sum, j) => sum + (Number(j.wage) || 0), 0);
        const currentMonthAdvance = currentMonthJobs.reduce((sum, j) => sum + (Number(j.advance_withdraw) || 0), 0);
        const currentMonthDeduction = currentMonthJobs.reduce((sum, j) => sum + (Number(j.debt_deduction) || 0), 0);
        const paidInFullCount = debtors.filter(d => (Number(d.remaining_debt) <= 0 && Number(d.initial_debt) > 0) || d.status === 'paid_in_full').length;
        const activeDebtorsCount = Math.max(0, totalDebtors - paidInFullCount);
        return {
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
          recentTransactions: transactions.slice(0, 5)
        };
      }
    } catch (e) {}
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  const calculateDashboardFromState = (state) => {
    const debtors = state.debtors || [];
    const jobs = state.jobs || [];
    const transactions = state.transactions || [];

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const totalDebtors = debtors.length;
    const totalInitialDebt = debtors.reduce((sum, d) => sum + (Number(d.initial_debt) || 0), 0);
    const totalDeducted = jobs.reduce((sum, j) => sum + (Number(j.debt_deduction) || 0), 0);
    const remainingDebt = Math.max(0, totalInitialDebt - totalDeducted);

    const currentMonthJobs = jobs.filter(j => j.job_date && String(j.job_date).startsWith(currentYearMonth));
    const currentMonthWage = currentMonthJobs.reduce((sum, j) => sum + (Number(j.wage) || 0), 0);
    const currentMonthAdvance = currentMonthJobs.reduce((sum, j) => sum + (Number(j.advance_withdraw) || 0), 0);
    const currentMonthDeduction = currentMonthJobs.reduce((sum, j) => sum + (Number(j.debt_deduction) || 0), 0);

    const paidInFullCount = debtors.filter(d => (Number(d.remaining_debt) <= 0 && Number(d.initial_debt) > 0) || d.status === 'paid_in_full').length;
    const activeDebtorsCount = Math.max(0, totalDebtors - paidInFullCount);

    return {
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
      recentTransactions: transactions.slice(0, 5)
    };
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      // 1. Instant calculation from local state (0ms)
      const localState = DBEngine.getState();
      if (localState && Array.isArray(localState.debtors) && localState.debtors.length > 0) {
        setData(calculateDashboardFromState(localState));
      }

      // 2. Fetch fresh stats from server
      const res = await apiFetch('/dashboard/stats');
      if (res && res.stats && res.stats.totalDebtors > 0) {
        setData(res);
      } else {
        const state = await DBEngine.pullData();
        if (state && Array.isArray(state.debtors) && state.debtors.length > 0) {
          setData(calculateDashboardFromState(state));
        }
      }
    } catch (err) {
      const localState = DBEngine.getState();
      if (localState && Array.isArray(localState.debtors) && localState.debtors.length > 0) {
        setData(calculateDashboardFromState(localState));
      } else {
        setError(err.message || 'ไม่สามารถโหลดข้อมูล Dashboard ได้');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
        กำลังโหลดข้อมูล Dashboard...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="card" style={{ borderLeft: '4px solid var(--accent-rose)', color: '#f87171' }}>
        {error}
      </div>
    );
  }

  const { stats, recentTransactions } = data || {};
  const isDatabaseEmpty = stats?.totalDebtors === 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard สรุปภาพรวม</h1>
          <p className="page-subtitle">แสดงข้อมูลสถิติจริงจากฐานข้อมูลเรียลไทม์</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setIsSheetsModalOpen(true)}
            style={{ 
              color: '#4ade80', 
              borderColor: 'rgba(34, 197, 94, 0.4)', 
              background: 'rgba(34, 197, 94, 0.12)',
              fontWeight: 500
            }}
            title="ตั้งค่าและซิงก์ข้อมูลไปยัง Google Sheets"
          >
            <FileSpreadsheet size={16} />
            <span>ซิงก์ Google Sheets</span>
          </button>
          <button className="btn btn-primary" onClick={() => setActiveTab('debtors')}>
            <Plus size={16} />
            <span>เพิ่มลูกหนี้</span>
          </button>
          <button className="btn btn-emerald" onClick={() => setActiveTab('jobs')}>
            <Plus size={16} />
            <span>บันทึกงาน</span>
          </button>
        </div>
      </div>

      {/* Primary Key Metric Stat Cards */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-header">
            <span className="stat-label">ลูกหนี้ทั้งหมด</span>
            <div className="stat-icon">
              <Users size={18} />
            </div>
          </div>
          <div className="stat-value">{stats?.totalDebtors || 0} คน</div>
          <div className="stat-sub">
            กำลังชำระ {stats?.activeDebtorsCount || 0} คน | ชำระหมด {stats?.paidInFullCount || 0} คน
          </div>
        </div>

        <div className="card stat-card purple">
          <div className="stat-header">
            <span className="stat-label">ยอดหนี้รวมทั้งหมด</span>
            <div className="stat-icon" style={{ color: 'var(--accent-purple)' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div className="stat-value">{formatCurrency(stats?.totalInitialDebt)}</div>
          <div className="stat-sub">
            หักชำระสะสม {formatCurrency(stats?.totalDeducted)}
          </div>
        </div>

        <div className="card stat-card rose">
          <div className="stat-header">
            <span className="stat-label">ยอดหนี้คงเหลือรวม</span>
            <div className="stat-icon" style={{ color: 'var(--accent-rose)' }}>
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#f87171' }}>
            {formatCurrency(stats?.remainingDebt)}
          </div>
          <div className="stat-sub">
            ห้ามแก้ไขโดยตรง คำนวณจากธุรกรรมจริง
          </div>
        </div>

        <div className="card stat-card emerald">
          <div className="stat-header">
            <span className="stat-label">ลูกหนี้ที่ชำระหมดแล้ว</span>
            <div className="stat-icon" style={{ color: 'var(--accent-emerald)' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#34d399' }}>
            {stats?.paidInFullCount || 0} คน
          </div>
          <div className="stat-sub">
            สถานะ "ชำระหมด" อัตโนมัติเมื่อยอดเหลือ 0
          </div>
        </div>
      </div>

      {/* Monthly Metrics Section */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'white' }}>
        สถิติเดือนปัจจุบัน ({stats?.currentMonth?.yearMonth})
      </h3>
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="card stat-card">
          <div className="stat-header">
            <span className="stat-label">ค่าแรงเดือนนี้</span>
            <div className="stat-icon">
              <Briefcase size={18} />
            </div>
          </div>
          <div className="stat-value">{formatCurrency(stats?.currentMonth?.wage)}</div>
          <div className="stat-sub">รวมจากบันทึกงานในเดือนนี้</div>
        </div>

        <div className="card stat-card amber">
          <div className="stat-header">
            <span className="stat-label">เบิกค่าแรงเดือนนี้</span>
            <div className="stat-icon" style={{ color: 'var(--accent-amber)' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#fbbf24' }}>
            {formatCurrency(stats?.currentMonth?.advance)}
          </div>
          <div className="stat-sub">จ่ายสดให้ลูกหนี้</div>
        </div>

        <div className="card stat-card emerald">
          <div className="stat-header">
            <span className="stat-label">หักชำระหนี้เดือนนี้</span>
            <div className="stat-icon" style={{ color: 'var(--accent-emerald)' }}>
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#34d399' }}>
            {formatCurrency(stats?.currentMonth?.deduction)}
          </div>
          <div className="stat-sub">นำไปหักลดยอดหนี้คงเหลือ</div>
        </div>

        <div className="card stat-card">
          <div className="stat-header">
            <span className="stat-label">ค่าแรงสุทธิเดือนนี้</span>
            <div className="stat-icon">
              <Wallet size={18} />
            </div>
          </div>
          <div className="stat-value">
            {formatCurrency((stats?.currentMonth?.wage || 0) - (stats?.currentMonth?.advance || 0) - (stats?.currentMonth?.deduction || 0))}
          </div>
          <div className="stat-sub">ส่วนต่างค่าแรงที่จ่ายจริง</div>
        </div>
      </div>

      {/* Recent Debt Deduction Transactions */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'white' }}>
            ประวัติการหักหนี้ล่าสุด (5 รายการล่าสุด)
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('jobs')}>
            ดูทั้งหมด <ArrowRight size={14} />
          </button>
        </div>

        {isDatabaseEmpty ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Database size={28} />
            </div>
            <div className="empty-title">ฐานข้อมูลว่างพร้อมสำหรับกรอกข้อมูลจริง</div>
            <div className="empty-desc">
              ยังไม่มีข้อมูลลูกหนี้และรายการงานในระบบ กดปุ่ม "เพิ่มลูกหนี้" ด้านบนเพื่อเริ่มบันทึกข้อมูลจริง
            </div>
            <button className="btn btn-primary" onClick={() => setActiveTab('debtors')}>
              <Plus size={16} />
              <span>เพิ่มลูกหนี้คนแรก</span>
            </button>
          </div>
        ) : recentTransactions && recentTransactions.length > 0 ? (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>รหัส/ชื่อลูกหนี้</th>
                  <th>สถานที่งาน</th>
                  <th>ยอดหนี้ก่อนหัก</th>
                  <th>จำนวนเงินที่หัก</th>
                  <th>ยอดหนี้คงเหลือ</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{formatDate(tx.transaction_date)}</td>
                    <td>
                      <button
                        onClick={() => onSelectDebtor(tx.debtor_id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-primary)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        {tx.debtor_code} - {tx.debtor_name}
                      </button>
                    </td>
                    <td>{tx.job_location}</td>
                    <td>{formatCurrency(tx.debt_before)}</td>
                    <td style={{ color: '#34d399', fontWeight: 600 }}>
                      -{formatCurrency(tx.deducted_amount)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(tx.debt_after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            ยังไม่มีรายการหักชำระหนี้ในระบบ
          </div>
        )}
      </div>

      {/* Google Sheets Modal */}
      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        onSyncComplete={fetchDashboard}
      />
    </div>
  );
};
