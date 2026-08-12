import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  Briefcase, 
  DollarSign, 
  TrendingDown, 
  CheckCircle2, 
  Search, 
  Filter,
  ExternalLink
} from 'lucide-react';
import { apiFetch, formatCurrency } from '../services/api';

export const MonthlySummary = ({ onSelectDebtor }) => {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [selectedDebtorId, setSelectedDebtorId] = useState('');

  const [summaryData, setSummaryData] = useState(null);
  const [debtorsDropdown, setDebtorsDropdown] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMonthlySummary = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('year', year);
      params.append('month', month);
      if (selectedDebtorId) params.append('debtor_id', selectedDebtorId);

      const res = await apiFetch(`/monthly-summary?${params.toString()}`);
      setSummaryData(res);
    } catch (err) {
      console.error('Failed to fetch monthly summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDebtorsDropdown = async () => {
    try {
      const res = await apiFetch('/debtors?limit=500');
      setDebtorsDropdown(res.debtors || []);
    } catch (err) {
      console.error('Failed to fetch debtors dropdown:', err);
    }
  };

  useEffect(() => {
    fetchDebtorsDropdown();
  }, []);

  useEffect(() => {
    fetchMonthlySummary();
  }, [year, month, selectedDebtorId]);

  const { summary, debtors = [] } = summaryData || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">สรุปภาพรวมรายเดือน</h1>
          <p className="page-subtitle">แสดงสถิติค่าแรง ยอดเบิก การหักหนี้ และยอดหนี้ต้นเดือน/ปลายเดือน</p>
        </div>
      </div>

      {/* Month & Year & Individual Debtor Selector */}
      <div className="card filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'white' }}>เลือกเดือนและปี:</span>
        </div>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '130px' }}
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              พ.ศ. {y + 543} ({y})
            </option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '140px' }}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              เดือน {m} ({new Date(2026, m - 1, 1).toLocaleString('th-TH', { month: 'long' })})
            </option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '200px' }}
          value={selectedDebtorId}
          onChange={(e) => setSelectedDebtorId(e.target.value)}
        >
          <option value="">-- แสดงลูกหนี้ทุกคน --</option>
          {debtorsDropdown.map((d) => (
            <option key={d.id} value={d.id}>
              {d.code} - {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          กำลังคำนวณสรุปยอดรายเดือน...
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="card stat-card">
              <div className="stat-header">
                <span className="stat-label">ค่าแรงรวมในเดือน</span>
                <div className="stat-icon">
                  <Briefcase size={18} />
                </div>
              </div>
              <div className="stat-value">{formatCurrency(summary?.total_wage)}</div>
              <div className="stat-sub">จากบันทึกงานประจำเดือน</div>
            </div>

            <div className="card stat-card amber">
              <div className="stat-header">
                <span className="stat-label">เบิกค่าแรงรวม</span>
                <div className="stat-icon" style={{ color: 'var(--accent-amber)' }}>
                  <DollarSign size={18} />
                </div>
              </div>
              <div className="stat-value" style={{ color: '#fbbf24' }}>
                {formatCurrency(summary?.total_advance)}
              </div>
              <div className="stat-sub">จ่ายสดให้ลูกหนี้</div>
            </div>

            <div className="card stat-card emerald">
              <div className="stat-header">
                <span className="stat-label">ยอดหักหนี้รวม</span>
                <div className="stat-icon" style={{ color: 'var(--accent-emerald)' }}>
                  <TrendingDown size={18} />
                </div>
              </div>
              <div className="stat-value" style={{ color: '#34d399' }}>
                {formatCurrency(summary?.total_deduction)}
              </div>
              <div className="stat-sub">หักจากค่าแรงไปชำระหนี้</div>
            </div>

            <div className="card stat-card purple">
              <div className="stat-header">
                <span className="stat-label">ลูกหนี้มีงานทำ / ชำระหมด</span>
                <div className="stat-icon" style={{ color: 'var(--accent-purple)' }}>
                  <Users size={18} />
                </div>
              </div>
              <div className="stat-value" style={{ color: '#a78bfa' }}>
                {summary?.active_debtors_count || 0} คน / {summary?.paid_in_full_count || 0} คน
              </div>
              <div className="stat-sub">จำนวนลูกหนี้ที่ทำงานในเดือนนี้</div>
            </div>
          </div>

          {/* Start and End Debt Balance Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                ยอดหนี้รวมต้นเดือน ({year}-{String(month).padStart(2, '0')})
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white' }}>
                {formatCurrency(summary?.start_month_debt)}
              </div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                ยอดหนี้รวมปลายเดือน ({year}-{String(month).padStart(2, '0')})
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#34d399' }}>
                {formatCurrency(summary?.end_month_debt)}
              </div>
            </div>
          </div>

          {/* Individual Debtor Breakdown Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'white' }}>
                สรุปการทำงานและการหักหนี้รายบุคคลประจำเดือน
              </h3>
            </div>

            {debtors.length === 0 ? (
              <div className="empty-state">
                <div className="empty-title">ไม่พบข้อมูลในเดือนนี้</div>
                <div className="empty-desc">ไม่มีรายการงานหรือลูกหนี้ในเดือนและปีที่เลือก</div>
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>รหัส / ชื่อลูกหนี้</th>
                      <th>เบอร์โทร</th>
                      <th>หนี้ต้นเดือน</th>
                      <th>ค่าแรงเดือนนี้</th>
                      <th>เบิกค่าแรง</th>
                      <th>หักหนี้เดือนนี้</th>
                      <th>หนี้ปลายเดือน</th>
                      <th>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debtors.map((d) => {
                      const isPaid = d.end_debt <= 0;
                      return (
                        <tr key={d.debtor_id}>
                          <td>
                            <button
                              onClick={() => onSelectDebtor(d.debtor_id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--accent-primary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'left',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                            >
                              {d.debtor_code} - {d.debtor_name} <ExternalLink size={13} />
                            </button>
                          </td>
                          <td>{d.debtor_phone || '-'}</td>
                          <td>{formatCurrency(d.start_debt)}</td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(d.monthly_wage)}</td>
                          <td style={{ color: '#fbbf24' }}>{formatCurrency(d.monthly_advance)}</td>
                          <td style={{ color: '#34d399', fontWeight: 700 }}>
                            -{formatCurrency(d.monthly_deduction)}
                          </td>
                          <td style={{ fontWeight: 700, color: isPaid ? '#60a5fa' : '#f87171' }}>
                            {formatCurrency(d.end_debt)}
                          </td>
                          <td>
                            <span className={`badge ${isPaid ? 'badge-paid' : 'badge-active'}`}>
                              {isPaid ? 'ชำระหมด' : 'กำลังชำระ'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
