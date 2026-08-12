import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Calculator, 
  Calendar, 
  MapPin, 
  DollarSign, 
  TrendingDown, 
  AlertCircle,
  Filter
} from 'lucide-react';
import { apiFetch, formatCurrency, formatDate } from '../services/api';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';

export const JobRecords = ({ onSelectDebtor }) => {
  const [jobs, setJobs] = useState([]);
  const [debtorsList, setDebtorsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState('');
  const [debtorFilter, setDebtorFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [deletingJob, setDeletingJob] = useState(null);

  // Form states
  const [selectedDebtorId, setSelectedDebtorId] = useState('');
  const [jobDate, setJobDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [wage, setWage] = useState('');
  const [advanceWithdraw, setAdvanceWithdraw] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Real-time calculation preview state
  const [calcPreview, setCalcPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (debtorFilter) params.append('debtor_id', debtorFilter);
      if (locationFilter) params.append('location', locationFilter);
      if (selectedYear) params.append('year', selectedYear);
      if (selectedMonth) params.append('month', selectedMonth);

      const res = await apiFetch(`/jobs?${params.toString()}`);
      setJobs(res.jobs || []);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDebtorsDropdown = async () => {
    try {
      const res = await apiFetch('/debtors?limit=500');
      setDebtorsList(res.debtors || []);
    } catch (err) {
      console.error('Failed to fetch debtors list:', err);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [search, debtorFilter, locationFilter, selectedYear, selectedMonth]);

  useEffect(() => {
    fetchDebtorsDropdown();
  }, []);

  // Update real-time calculation preview whenever debtor, wage, or advance changes in modal
  useEffect(() => {
    if (!selectedDebtorId || wage === '' || isNaN(Number(wage))) {
      setCalcPreview(null);
      return;
    }

    const numWage = Number(wage);
    const numAdvance = Number(advanceWithdraw || 0);

    if (numWage < 0 || numAdvance < 0 || numAdvance > numWage) {
      setCalcPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setPreviewLoading(true);
        const res = await apiFetch('/jobs/preview', {
          method: 'POST',
          body: JSON.stringify({
            debtor_id: selectedDebtorId,
            wage: numWage,
            advance_withdraw: numAdvance
          })
        });
        setCalcPreview(res);
      } catch (e) {
        setCalcPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [selectedDebtorId, wage, advanceWithdraw]);

  const resetForm = () => {
    setSelectedDebtorId('');
    setJobDate(new Date().toISOString().split('T')[0]);
    setLocation('');
    setDescription('');
    setWage('');
    setAdvanceWithdraw('');
    setNote('');
    setFormError('');
    setCalcPreview(null);
    setEditingJob(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (job) => {
    setEditingJob(job);
    setSelectedDebtorId(String(job.debtor_id));
    setJobDate(job.job_date);
    setLocation(job.location);
    setDescription(job.description || '');
    setWage(String(job.wage));
    setAdvanceWithdraw(String(job.advance_withdraw || 0));
    setNote(job.note || '');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!selectedDebtorId) {
      setFormError('กรุณาเลือกลูกหนี้');
      return;
    }
    if (!jobDate) {
      setFormError('กรุณาเลือกวันที่จัดงาน');
      return;
    }
    if (!location.trim()) {
      setFormError('กรุณากรอกสถานที่จัดงาน');
      return;
    }
    const numWage = Number(wage);
    const numAdvance = Number(advanceWithdraw || 0);

    if (isNaN(numWage) || numWage < 0) {
      setFormError('จำนวนค่าแรงต้องเป็นตัวเลขที่ไม่ติดลบ');
      return;
    }
    if (isNaN(numAdvance) || numAdvance < 0) {
      setFormError('จำนวนเงินเบิกต้องไม่ติดลบ');
      return;
    }
    if (numAdvance > numWage) {
      setFormError('จำนวนเงินเบิกต้องไม่เกินจำนวนค่าแรง');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        debtor_id: Number(selectedDebtorId),
        job_date: jobDate,
        location: location.trim(),
        description: description.trim(),
        wage: numWage,
        advance_withdraw: numAdvance,
        note: note.trim()
      };

      if (editingJob) {
        await apiFetch(`/jobs/${editingJob.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch('/jobs', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      setIsAddModalOpen(false);
      resetForm();
      fetchJobs();
      fetchDebtorsDropdown();
    } catch (err) {
      setFormError(err.message || 'เกิดข้อผิดพลาดในการบันทึกงาน');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!deletingJob) return;
    setSubmitting(true);
    try {
      await apiFetch(`/jobs/${deletingJob.id}`, {
        method: 'DELETE'
      });
      setDeletingJob(null);
      fetchJobs();
      fetchDebtorsDropdown();
    } catch (err) {
      alert(err.message || 'ไม่สามารถลบรายการงานได้');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">บันทึกงานและค่าแรง</h1>
          <p className="page-subtitle">บันทึกงาน เบิกเงิน และคำนวณหักหนี้จากค่าแรงให้อัตโนมัติ</p>
        </div>
        <button className="btn btn-emerald" onClick={handleOpenAddModal}>
          <Plus size={18} />
          <span>บันทึกงานใหม่</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card filter-bar">
        <div className="search-box">
          <Search className="search-icon" />
          <input
            type="text"
            className="form-input search-input"
            placeholder="ค้นหาตามสถานที่, คำอธิบายงาน..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '180px' }}
          value={debtorFilter}
          onChange={(e) => setDebtorFilter(e.target.value)}
        >
          <option value="">ลูกหนี้ทั้งหมด</option>
          {debtorsList.map((d) => (
            <option key={d.id} value={d.id}>
              {d.code} - {d.name} ({d.remaining_debt <= 0 ? 'ชำระหมด' : `คงเหลือ ${formatCurrency(d.remaining_debt)}`})
            </option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ width: 'auto' }}
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
          style={{ width: 'auto' }}
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          <option value="">ทุกเดือน</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>เดือน {m}</option>
          ))}
        </select>
      </div>

      {/* Jobs List Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            กำลังโหลดบันทึกงาน...
          </div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Briefcase size={28} />
            </div>
            <div className="empty-title">ไม่พบรายการงาน</div>
            <div className="empty-desc">
              {search || debtorFilter || selectedYear || selectedMonth
                ? 'ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา'
                : 'ยังไม่มีการบันทึกงานในระบบ เริ่มต้นด้วยการกดปุ่ม "บันทึกงานใหม่"'}
            </div>
            {!search && !debtorFilter && (
              <button className="btn btn-emerald" onClick={handleOpenAddModal}>
                <Plus size={16} />
                <span>บันทึกงานใหม่</span>
              </button>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>รหัส / ชื่อลูกหนี้</th>
                  <th>สถานที่จัดงาน</th>
                  <th>ค่าแรง</th>
                  <th>เบิกค่าแรง</th>
                  <th>หักหนี้จริง</th>
                  <th>ค่าแรงคงเหลือจ่าย</th>
                  <th style={{ textAlign: 'right' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td>{formatDate(j.job_date)}</td>
                    <td>
                      <button
                        onClick={() => onSelectDebtor(j.debtor_id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-primary)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        {j.debtor_code} - {j.debtor_name}
                      </button>
                    </td>
                    <td style={{ fontWeight: 600 }}>{j.location}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(j.wage)}</td>
                    <td style={{ color: '#fbbf24' }}>{formatCurrency(j.advance_withdraw)}</td>
                    <td style={{ color: '#34d399', fontWeight: 700 }}>
                      -{formatCurrency(j.debt_deduction)}
                    </td>
                    <td style={{ fontWeight: 700, color: 'white' }}>
                      {formatCurrency(j.net_wage)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-secondary btn-icon btn-sm"
                          onClick={() => handleOpenEditModal(j)}
                          title="แก้ไข"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          className="btn btn-danger btn-icon btn-sm"
                          onClick={() => setDeletingJob(j)}
                          title="ลบ"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Job Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        title={editingJob ? 'แก้ไขรายการงาน' : 'บันทึกงานและคำนวณหักหนี้'}
      >
        {formError && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#f87171',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmitForm}>
          <div className="form-group">
            <label className="form-label">เลือกลูกหนี้ *</label>
            <select
              className="form-select"
              value={selectedDebtorId}
              onChange={(e) => setSelectedDebtorId(e.target.value)}
              required
            >
              <option value="">-- เลือกลูกหนี้ --</option>
              {debtorsList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} - {d.name} ({d.remaining_debt <= 0 ? 'ชำระหมด' : `ยอดหนี้คงเหลือ ${formatCurrency(d.remaining_debt)}`})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">วันที่จัดงาน *</label>
              <input
                type="date"
                className="form-input"
                value={jobDate}
                onChange={(e) => setJobDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">สถานที่จัดงาน *</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น บูธงาน A / คลังสินค้า B"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">จำนวนค่าแรง (บาท) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                placeholder="0.00"
                value={wage}
                onChange={(e) => setWage(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">เบิกค่าแรง (บาท)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                placeholder="0.00 (เบิกสด)"
                value={advanceWithdraw}
                onChange={(e) => setAdvanceWithdraw(e.target.value)}
              />
            </div>
          </div>

          {/* Real-time Dynamic Calculation Preview Card */}
          {calcPreview && (
            <div style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              marginBottom: '1rem',
              fontSize: '0.85rem'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calculator size={16} /> สรุปผลการคำนวณหักหนี้อัตโนมัติ:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', color: 'var(--text-main)' }}>
                <div>ยอดหนี้คงเหลือก่อนหัก:</div>
                <div style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(calcPreview.remaining_debt_before)}</div>
                
                <div>เงินคงเหลือหักหนี้ได้ (ค่าแรง - เบิก):</div>
                <div style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(calcPreview.available_for_deduction)}</div>

                <div style={{ color: '#34d399', fontWeight: 700 }}>ยอดเงินที่หักหนี้จริง:</div>
                <div style={{ textAlign: 'right', color: '#34d399', fontWeight: 700 }}>-{formatCurrency(calcPreview.debt_deduction)}</div>

                <div style={{ color: 'white', fontWeight: 700 }}>ค่าแรงสุทธิที่ต้องจ่ายลูกหนี้:</div>
                <div style={{ textAlign: 'right', color: 'white', fontWeight: 700 }}>{formatCurrency(calcPreview.net_wage)}</div>

                <div style={{ color: '#60a5fa', fontWeight: 700, paddingTop: '0.25rem', borderTop: '1px solid var(--border-color)' }}>ยอดหนี้คงเหลือหลังหัก:</div>
                <div style={{ textAlign: 'right', color: '#60a5fa', fontWeight: 700, paddingTop: '0.25rem', borderTop: '1px solid var(--border-color)' }}>
                  {formatCurrency(calcPreview.remaining_debt_after)}
                  {calcPreview.remaining_debt_after === 0 && ' (ชำระหมดแล้ว 🎉)'}
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">รายละเอียดงานเพิ่มเติม</label>
            <input
              type="text"
              className="form-input"
              placeholder="เช่น ยกของหนัก / ดูแลงานจัดแสดง"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">หมายเหตุ</label>
            <input
              type="text"
              className="form-input"
              placeholder="หมายเหตุประกอบการบันทึก"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => {
                setIsAddModalOpen(false);
                resetForm();
              }}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="btn btn-emerald"
              style={{ flex: 1 }}
              disabled={submitting}
            >
              {submitting ? 'กำลังคำนวณและบันทึก...' : (editingJob ? 'บันทึกแก้ไขและคำนวณใหม่' : 'บันทึกงานและหักหนี้')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Job Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingJob}
        onClose={() => setDeletingJob(null)}
        onConfirm={handleDeleteJob}
        title="ยืนยันการลบรายการงาน"
        message={`คุณต้องการลบรายการงาน "${deletingJob?.location}" ของลูกหนี้ "${deletingJob?.debtor_name}" ใช่หรือไม่? ระบบจะยกเลิกธุรกรรมการหักหนี้ที่เกี่ยวข้องและคำนวณยอดหนี้คงเหลือใหม่ทั้งหมด`}
        loading={submitting}
      />
    </div>
  );
};
