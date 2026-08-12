import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'ยืนยันลบข้อมูล', loading = false }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || 'ยืนยันการทำรายการ'}>
      <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem auto'
        }}>
          <AlertTriangle size={28} />
        </div>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
            style={{ flex: 1 }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (!loading && onConfirm) {
                onConfirm();
              }
            }}
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? 'กำลังทำรายการ...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
