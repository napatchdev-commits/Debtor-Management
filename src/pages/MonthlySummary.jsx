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
import { DBEngine } from '../services/dbEngine';

export const MonthlySummary = ({ onSelectDebtor }) => {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [selectedDebtorId, setSelectedDebtorId] = useState('');

  const calculateMonthlyFromState = (state, y, m, dId) => {
    const debtors = (state.debtors || []).filter(d => !dId || Number(d.id) === Number(dId));
    const allJobs = state.jobs || [];
    const monthStr = `${y}-${String(m).padStart(2, '0')}`;

    const currentMonthJobs = allJobs.filter(j => {
      if (!j.job_date || !String(j.job_date).startsWith(monthStr)) return false;
      if (dId && Number(j.debtor_id) !== Number(dId)) return false;
      return true;
    });

    const priorMonthJobs = allJobs.filter(j => {
      if (!j.job_date || String(j.job_date).substring(0, 7) >= monthStr) return false;
      return true;
    });

    const totalWage = currentMonthJobs.reduce((sum, j) => sum + (Number(j.wage) || 0), 0);
    const totalAdvance = currentMonthJobs.reduce((sum, j) => sum + (Number(j.advance_withdraw) || 0), 0);
    const totalDeduction = currentMonthJobs.reduce((sum, j) => sum + (Number(j.debt_deduction) || 0), 0);
    const activeDebtorsCount = new Set(currentMonthJobs.map(j => Number(j.debtor_id))).size;

    let totalStartDebt = 0;
    let totalEndDebt = 0;
    let paidInFullCount = 0;

    const debtorRows = debtors.map(d => {
      const id = Number(d.id);
      const initialDebt = Number(d.initial_debt) || 0;
      const dMonthJobs = currentMonthJobs.filter(j => Number(j.debtor_id) === id);
      const dPriorJobs = priorMonthJobs.filter(j => Number(j.debtor_id) === id);

      const mWage = dMonthJobs.reduce((sum, j) => sum + (Number(j.wage) || 0), 0);
      const mAdvance = dMonthJobs.reduce((sum, j) => sum + (Number(j.advance_withdraw) || 0), 0);
      const mDeduction = dMonthJobs.reduce((sum, j) => sum + (Number(j.debt_deduction) || 0), 0);
      const priorPaid = dPriorJobs.reduce((sum, j) => sum + (Number(j.debt_deduction) || 0), 0);
      const startDebt = Math.max(0, initialDebt - priorPaid);
      const endDebt = Math.max(0, startDebt - mDeduction);

      totalStartDebt += startDebt;
      totalEndDebt += endDebt;
      if ((endDebt === 0 && initialDebt > 0) || d.status === 'paid_in_full') paidInFullCount++;

      return {
        debtor_id: id,
        debtor_code: d.code,
        debtor_name: d.name,
        debtor_phone: d.phone,
        initial_debt: initialDebt,
        status: d.status,
        monthly_wage: mWage,
        monthly_advance: mAdvance,
        monthly_deduction: mDeduction,
        job_count: dMonthJobs.length,
        start_debt: startDebt,
        end_debt: endDebt
      };
    });

    return {
      summary: {
        year: y,
        month: String(m).padStart(2, '0'),
        total_wage: totalWage,
        total_advance: totalAdvance,
        total_deduction: totalDeduction,
        start_month_debt: totalStartDebt,
        end_month_debt: totalEndDebt,
        active_debtors_count: activeDebtorsCount,
        paid_in_full_count: paidInFullCount
      },
      debtors: debtorRows
    };
  };

  const [summaryData, setSummaryData] = useState(() => {
    try {
      const state = DBEngine.getState();
      return calculateMonthlyFromState(state, String(now.getFullYear()), String(now.getMonth() + 1), '');
    } catch (e) {
      return null;
    }
  });

  const [debtorsDropdown, setDebtorsDropdown] = useState(() => {
    try {
      const state = DBEngine.getState();
      return state && Array.isArray(state.debtors) ? state.debtors : [];
    } catch (e) {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);

  const fetchMonthlySummary = async () => {
    try {
      // 1. Instant local calculation (0ms)
      const localState = DBEngine.getState();
      if (localState && Array.isArray(localState.debtors) && localState.debtors.length > 0) {
        setSummaryData(calculateMonthlyFromState(localState, year, month, selectedDebtorId));
      }

      // 2. Fetch fresh summary from API
      const params = new URLSearchParams();
      params.append('year', year);
      params.append('month', month);
      if (selectedDebtorId) params.append('debtor_id', selectedDebtorId);

      const res = await apiFetch(`/monthly-summary?${params.toString()}`);
      if (res && res.summary) {
        setSummaryData(res);
      }
    } catch (err) {
      const localState = DBEngine.getState();
      if (localState && Array.isArray(localState.debtors)) {
        setSummaryData(calculateMonthlyFromState(localState, year, month, selectedDebtorId));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDebtorsDropdown = async () => {
    try {
      const res = await apiFetch('/debtors?limit=500');
      if (res && Array.isArray(res.debtors) && res.debtors.length > 0) {
        setDebtorsDropdown(res.debtors);
      } else {
        const state = DBEngine.getState();
        if (state && Array.isArray(state.debtors)) {
          setDebtorsDropdown(state.debtors);
        }
      }
    } catch (err) {
      const state = DBEngine.getState();
      if (state && Array.isArray(state.debtors)) {
        setDebtorsDropdown(state.debtors);
      }
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
