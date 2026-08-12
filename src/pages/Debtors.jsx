import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  Phone, 
  Calendar, 
  FileText,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { apiFetch, formatCurrency, formatDate } from '../services/api';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';

export const Debtors = ({ onSelectDebtor }) => {
  const [debtors, setDebtors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDebtor, setEditingDebtor] = useState(null);
  const [deletingDebtor, setDeletingDebtor] = useState(null);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [initialDebt, setInitialDebt] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDebtors = async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (statusFilter) queryParams.append('status', statusFilter);

      console.log('[FRONTEND] Fetching debtors from Supabase API...');
      const res = await apiFetch(`/debtors?${queryParams.toString()}`);
      console.log('[FRONTEND] Debtors query result:', res);

      if (res && Array.isArray(res.debtors)) {
        setDebtors(res.debtors);
      } else {
        setDebtors([]);
      }
    } catch (err) {
      console.error('[FRONTEND] Debtors query error:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลลูกหนี้จากฐานข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebtors();
  }, [search, statusFilter]);

  const resetForm = () => {
    setCode('');
    setName('');
    setPhone('');
    setInitialDebt('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setNote('');
    setFormError('');
    setEditingDebtor(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (debtor) => {
    if (!debtor || !debtor.id || isNaN(Number(debtor.id))) {
      alert('ข้อมูลลูกหนี้ไม่ถูกต้อง กรุณารีเฟรชแล้วลองอีกครั้ง');
      return;
    }
    setEditingDebtor(debtor);
    setCode(debtor.code || '');
    setName(debtor.name || '');
    setPhone(debtor.phone || '');
    setInitialDebt(debtor.initial_debt !== undefined ? String(debtor.initial_debt) : '');
    setStartDate(debtor.start_date || new Date().toISOString().split('T')[0]);
    setNote(debtor.note || '');
    setFormError('');
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('กรุณากรอกชื่อลูกหนี้');
      return;
    }
    if (initialDebt === '' || isNaN(Number(initialDebt)) || Number(initialDebt) < 0) {
      setFormError('ยอดหนี้เริ่มต้นต้องเป็นตัวเลขที่ไม่ติดลบ');
      return;
    }
    if (!startDate) {
      setFormError('กรุณาเลือกวันที่เริ่มต้น');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        code: code.trim(),
        name: name.trim(),
        phone: phone.trim(),
        initial_debt: Number(initialDebt),
        start_date: startDate,
        note: note.trim()
      };

      if (editingDebtor) {
        await apiFetch(`/debtors/${editingDebtor.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch('/debtors', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      setIsAddModalOpen(false);
      setEditingDebtor(null);
      resetForm();
      
      // Re-fetch directly from Supabase and setDebtors
      await fetchDebtors();
    } catch (err) {
      setFormError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDebtor = async () => {
    if (!deletingDebtor || !deletingDebtor.id || isNaN(Number(deletingDebtor.id))) {
      alert('ไม่พบรหัสไอดีลูกหนี้ที่ถูกต้อง กรุณารีเฟรชแล้วลองอีกครั้ง');
      setDeletingDebtor(null);
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch(`/debtors/${deletingDebtor.id}`, {
        method: 'DELETE'
      });
      setDeletingDebtor(null);
      await fetchDebtors();
    } catch (err) {
      alert(err.message || 'ไม่สามารถลบลูกหนี้ได้');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">ระบบจัดการลูกหนี้</h1>
          <p className="page-subtitle">เพิ่ม แก้ไข ค้นหา และติดตามยอดหนี้คงเหลือรายบุคคล</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <Plus size={18} />
          <span>เพิ่มลูกหนี้ใหม่</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card filter-bar">
        <div className="search-box">
          <Search className="search-icon" />
          <input
            type="text"
            className="form-input search-input"
            placeholder="ค้นหาด้วย รหัสลูกหนี้, ชื่อ, หรือเบอร์โทรศัพท์..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '160px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">ทุกสถานะ</option>
          <option value="active">กำลังชำระ</option>
          <option value="paid_in_full">ชำระหมดแล้ว</option>
        </select>
      </div>

      {/* Debtors Content Table / Error / Empty State */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: '0.5rem' }} />
            <div>กำลังดึงข้อมูลลูกหนี้จาก Supabase...</div>
          </div>
        ) : error ? (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex',
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.15)',
              borderRadius: '50%',
              color: '#f87171',
              marginBottom: '1rem'
            }}>
              <AlertCircle size={32} />
            </div>
            <h3 style={{ color: '#f87171', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              เกิดข้อผิดพลาดในการโหลดข้อมูลลูกหนี้
            </h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '1.25rem', maxWidth: '500px', margin: '0 auto 1.25rem' }}>
              {error}
            </p>
            <button className="btn btn-secondary" onClick={fetchDebtors}>
              <RefreshCw size={16} />
              <span>ลองใหม่อีกครั้ง</span>
            </button>
          </div>
        ) : debtors.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Users size={28} />
            </div>
            <div className="empty-title">ไม่พบข้อมูลลูกหนี้</div>
            <div className="empty-desc">
              {search || statusFilter ? 'ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา' : 'ยังไม่มีลูกหนี้ในระบบ เพิ่มลูกหนี้คนแรกเพื่อเริ่มต้น'}
            </div>
            {!search && !statusFilter && (
              <button className="btn btn-primary" onClick={handleOpenAddModal}>
                <Plus size={16} />
                <span>เพิ่มลูกหนี้ใหม่</span>
              </button>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>ชื่อลูกหนี้</th>
                  <th>เบอร์โทรศัพท์</th>
                  <th>ยอดหนี้ทั้งหมด</th>
                  <th>หักชำระแล้ว</th>
                  <th>ยอดหนี้คงเหลือ</th>
                  <th>สถานะ</th>
                  <th>วันที่เริ่ม</th>
                  <th style={{ textAlign: 'right' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {debtors.map((d) => {
                  const isPaid = d.status === 'paid_in_full' || d.remaining_debt <= 0;
                  return (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{d.code}</td>
                      <td>
                        <button
                          onClick={() => onSelectDebtor(d.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          {d.name} <ExternalLink size={13} style={{ color: 'var(--text-muted)' }} />
                        </button>
                      </td>
                      <td>{d.phone || '-'}</td>
                      <td style={{ fontWeight: 500 }}>{formatCurrency(d.initial_debt)}</td>
                      <td style={{ color: '#34d399', fontWeight: 600 }}>{formatCurrency(d.paid_amount)}</td>
                      <td style={{ fontWeight: 700, color: isPaid ? '#60a5fa' : '#f87171' }}>
                        {formatCurrency(d.remaining_debt)}
                      </td>
                      <td>
                        <span className={`badge ${isPaid ? 'badge-paid' : 'badge-active'}`}>
                          {isPaid ? 'ชำระหมด' : 'กำลังชำระ'}
                        </span>
                      </td>
                      <td>{formatDate(d.start_date)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => onSelectDebtor(d.id)}
                            title="ดูโปรไฟล์"
                          >
                            โปรไฟล์
                          </button>
                          <button
                            className="btn btn-secondary btn-icon btn-sm"
                            onClick={() => handleOpenEditModal(d)}
                            title="แก้ไข"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            className="btn btn-danger btn-icon btn-sm"
                            onClick={() => setDeletingDebtor(d)}
                            title="ลบ"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isAddModalOpen || !!editingDebtor}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingDebtor(null);
        }}
        title={editingDebtor ? 'แก้ไขข้อมูลลูกหนี้' : 'เพิ่มลูกหนี้ใหม่'}
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
            <label className="form-label">รหัสลูกหนี้ (ปล่อยว่างไว้เพื่อให้ระบบสร้างให้อัตโนมัติ)</label>
            <input
              type="text"
              className="form-input"
              placeholder="เช่น DB-0001 (ว่าง = อัตโนมัติ)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">ชื่อ - นามสกุล ลูกหนี้ *</label>
            <input
              type="text"
              className="form-input"
              placeholder="เช่น นายสมชาย ชัยชนะ"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">เบอร์โทรศัพท์</label>
            <input
              type="text"
              className="form-input"
              placeholder="เช่น 081-234-5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">ยอดหนี้เริ่มต้น (บาท) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-input"
              placeholder="0.00"
              value={initialDebt}
              onChange={(e) => setInitialDebt(e.target.value)}
              required
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
              ⚠️ ยอดหนี้คงเหลือจะถูกคำนวณอัตโนมัติ ห้ามแก้ไขยอดหนี้คงเหลือโดยตรง
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">วันที่เริ่มต้นสร้างหนี้ *</label>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">หมายเหตุเพิ่มเติม</label>
            <textarea
              rows="3"
              className="form-textarea"
              placeholder="บันทึกรายละเอียดสัญญาหรือข้อตกลงเพิ่มเติม"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            ></textarea>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingDebtor(null);
              }}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={submitting}
            >
              {submitting ? 'กำลังบันทึก...' : (editingDebtor ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลลูกหนี้')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingDebtor && !!deletingDebtor.id}
        onClose={() => setDeletingDebtor(null)}
        onConfirm={handleDeleteDebtor}
        title="ยืนยันการลบลูกหนี้"
        message={`คุณต้องการลบข้อมูลลูกหนี้ "${deletingDebtor?.code || ''} - ${deletingDebtor?.name || ''}" ใช่หรือไม่? รายการงานและประวัติธุรกรรมทั้งหมดของลูกหนี้นี้จะถูกลบออกอย่างสมบูรณ์`}
        loading={submitting}
      />
    </div>
  );
};
