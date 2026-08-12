import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Calendar, 
  FileText, 
  Briefcase, 
  TrendingDown, 
  DollarSign, 
  History, 
  CheckCircle2,
  Filter
} from 'lucide-react';
import { apiFetch, formatCurrency, formatDate } from '../services/api';

export const DebtorProfile = ({ debtorId, onBack }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs', 'advances', 'deductions', 'monthly'

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/debtors/${debtorId}`);
      setProfileData(res);
    } catch (err) {
      setError(err.message || 'ไม่สามารถดึงข้อมูลโปรไฟล์ลูกหนี้ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debtorId) {
      fetchProfile();
    }
  }, [debtorId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
        กำลังโหลดโปรไฟล์ลูกหนี้...
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="card">
        <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> ย้อนกลับ
        </button>
        <div style={{ color: '#f87171' }}>{error || 'ไม่พบข้อมูล'}</div>
      </div>
    );
  }

  const { debtor, jobs = [], transactions = [] } = profileData;
  const isPaid = debtor.status === 'paid_in_full' || debtor.remaining_debt <= 0;

  // Filter jobs by year/month if selected
  const filteredJobs = jobs.filter((job) => {
    if (!job.job_date) return true;
    const d = new Date(job.job_date);
    if (selectedYear && d.getFullYear() !== Number(selectedYear)) return false;
    if (selectedMonth && (d.getMonth() + 1) !== Number(selectedMonth)) return false;
    return true;
  });

  // Filter transactions by year/month if selected
  const filteredTransactions = transactions.filter((tx) => {
    if (!tx.transaction_date) return true;
    const d = new Date(tx.transaction_date);
    if (selectedYear && d.getFullYear() !== Number(selectedYear)) return false;
    if (selectedMonth && (d.getMonth() + 1) !== Number(selectedMonth)) return false;
    return true;
  });

  // Filter advance withdrawals (jobs where advance_withdraw > 0)
  const advanceWithdrawals = filteredJobs.filter(j => j.advance_withdraw > 0);

  // Group monthly totals
  const monthlyMap = {};
  jobs.forEach(job => {
    if (!job.job_date) return;
    const key = job.job_date.substring(0, 7); // YYYY-MM
    if (!monthlyMap[key]) {
      monthlyMap[key] = { yearMonth: key, totalWage: 0, totalAdvance: 0, totalDeduction: 0, totalNetWage: 0, count: 0 };
    }
    monthlyMap[key].totalWage += job.wage;
    monthlyMap[key].totalAdvance += job.advance_withdraw;
    monthlyMap[key].totalDeduction += job.debt_deduction;
    monthlyMap[key].totalNetWage += job.net_wage;
    monthlyMap[key].count += 1;
  });

  const monthlySummaries = Object.values(monthlyMap).sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));

  return (
    <div>
      <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: '1.25rem' }}>
        <ArrowLeft size={16} /> ย้อนกลับไปหน้าลูกหนี้
      </button>

      {/* Profile Banner */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9), rgba(30, 41, 59, 0.9))' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-purple))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.4rem',
                fontWeight: 700
              }}>
                {debtor.name.charAt(0)}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{debtor.code}</span>
                  <span className={`badge ${isPaid ? 'badge-paid' : 'badge-active'}`}>
                    {isPaid ? 'ชำระหมด' : 'กำลังชำระ'}
                  </span>
                </div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white', marginTop: '0.2rem' }}>
                  {debtor.name}
                </h1>
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <div><Phone size={14} style={{ display: 'inline', marginRight: '4px' }} /> {debtor.phone || 'ไม่ระบุเบอร์'}</div>
              <div><Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} /> เริ่มต้นหนี้: {formatDate(debtor.start_date)}</div>
            </div>
          </div>

          {debtor.note && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <FileText size={14} style={{ display: 'inline', marginRight: '6px', color: 'var(--accent-amber)' }} />
              <strong>หมายเหตุ:</strong> {debtor.note}
            </div>
          )}
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="card stat-card">
          <div className="stat-header">
            <span className="stat-label">ยอดหนี้เริ่มต้น</span>
          </div>
          <div className="stat-value">{formatCurrency(debtor.initial_debt)}</div>
          <div className="stat-sub">ตั้งต้นสัญญากู้ยืม</div>
        </div>

        <div className="card stat-card emerald">
          <div className="stat-header">
            <span className="stat-label">ชำระแล้วสะสม</span>
          </div>
          <div className="stat-value" style={{ color: '#34d399' }}>
            {formatCurrency(debtor.paid_amount)}
          </div>
          <div className="stat-sub">หักจากค่าแรงการทำงานจริง</div>
        </div>

        <div className="card stat-card rose">
          <div className="stat-header">
            <span className="stat-label">ยอดหนี้คงเหลือ</span>
          </div>
          <div className="stat-value" style={{ color: isPaid ? '#60a5fa' : '#f87171' }}>
            {formatCurrency(debtor.remaining_debt)}
          </div>
          <div className="stat-sub">คำนวณอัตโนมัติ ห้ามแก้ไขโดยตรง</div>
        </div>

        <div className="card stat-card purple">
          <div className="stat-header">
            <span className="stat-label">จำนวนงานที่ทำ</span>
          </div>
          <div className="stat-value" style={{ color: '#a78bfa' }}>
            {jobs.length} ครั้ง
          </div>
          <div className="stat-sub">ประวัติบันทึกการทำงานทั้งหมด</div>
        </div>
      </div>

      {/* Tab Navigation & Filters */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '2px' }}>
              <button
                className={`btn btn-sm ${activeTab === 'jobs' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('jobs')}
              >
                <Briefcase size={14} /> ประวัติการทำงาน ({filteredJobs.length})
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'advances' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('advances')}
              >
                <DollarSign size={14} /> ประวัติเบิกค่าแรง ({advanceWithdrawals.length})
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'deductions' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('deductions')}
              >
                <TrendingDown size={14} /> ประวัติการหักหนี้ ({filteredTransactions.length})
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('monthly')}
              >
                <History size={14} /> สรุปรายเดือน ({monthlySummaries.length})
              </button>
            </div>

            {/* Date Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={15} style={{ color: 'var(--text-muted)' }} />
              <select
                className="form-select"
                style={{ width: 'auto', fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="">ทุกปี</option>
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y + 543} ({y})</option>
                ))}
              </select>

              <select
                className="form-select"
                style={{ width: 'auto', fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="">ทุกเดือน</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>เดือน {m}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content Display */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {activeTab === 'jobs' && (
          filteredJobs.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              ไม่พบประวัติการทำงานตามเงื่อนไขที่เลือก
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>วันที่จัดงาน</th>
                    <th>สถานที่</th>
                    <th>รายละเอียด</th>
                    <th>ค่าแรง</th>
                    <th>เบิกค่าแรง</th>
                    <th>หักหนี้</th>
                    <th>ค่าแรงคงเหลือจ่าย</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((j) => (
                    <tr key={j.id}>
                      <td>{formatDate(j.job_date)}</td>
                      <td style={{ fontWeight: 600 }}>{j.location}</td>
                      <td>{j.description || '-'}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(j.wage)}</td>
                      <td style={{ color: '#fbbf24' }}>{formatCurrency(j.advance_withdraw)}</td>
                      <td style={{ color: '#34d399', fontWeight: 600 }}>{formatCurrency(j.debt_deduction)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{formatCurrency(j.net_wage)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeTab === 'advances' && (
          advanceWithdrawals.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              ไม่มีประวัติการเบิกค่าแรง
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>วันที่งาน</th>
                    <th>สถานที่</th>
                    <th>ค่าแรงงานนั้น</th>
                    <th>จำนวนเงินที่เบิก</th>
                    <th>หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {advanceWithdrawals.map((j) => (
                    <tr key={j.id}>
                      <td>{formatDate(j.job_date)}</td>
                      <td>{j.location}</td>
                      <td>{formatCurrency(j.wage)}</td>
                      <td style={{ color: '#fbbf24', fontWeight: 700 }}>{formatCurrency(j.advance_withdraw)}</td>
                      <td>{j.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeTab === 'deductions' && (
          filteredTransactions.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              ไม่มีประวัติการหักหนี้
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>วันที่</th>
                    <th>สถานที่งาน</th>
                    <th>ยอดหนี้ก่อนหัก</th>
                    <th>จำนวนเงินที่หัก</th>
                    <th>ยอดหนี้หลังหัก</th>
                    <th>ผู้บันทึก</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{formatDate(tx.transaction_date)}</td>
                      <td>{tx.job_location || '-'}</td>
                      <td>{formatCurrency(tx.debt_before)}</td>
                      <td style={{ color: '#34d399', fontWeight: 700 }}>-{formatCurrency(tx.deducted_amount)}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(tx.debt_after)}</td>
                      <td>{tx.creator_name || 'ระบบ'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeTab === 'monthly' && (
          monthlySummaries.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              ไม่มีสรุปยอดรายเดือน
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>เดือน / ปี</th>
                    <th>จำนวนงาน</th>
                    <th>ค่าแรงรวม</th>
                    <th>เบิกค่าแรงรวม</th>
                    <th>หักหนี้รวม</th>
                    <th>ค่าแรงสุทธิรับเงิน</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySummaries.map((m) => (
                    <tr key={m.yearMonth}>
                      <td style={{ fontWeight: 700, color: 'white' }}>{m.yearMonth}</td>
                      <td>{m.count} งาน</td>
                      <td>{formatCurrency(m.totalWage)}</td>
                      <td style={{ color: '#fbbf24' }}>{formatCurrency(m.totalAdvance)}</td>
                      <td style={{ color: '#34d399', fontWeight: 700 }}>{formatCurrency(m.totalDeduction)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{formatCurrency(m.totalNetWage)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
};
