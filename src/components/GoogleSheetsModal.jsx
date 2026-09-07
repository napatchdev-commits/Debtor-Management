import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { DBEngine } from '../services/dbEngine';
import { apiFetch } from '../services/api';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink,
  Save,
  Database
} from 'lucide-react';

export const GoogleSheetsModal = ({ isOpen, onClose, onSyncComplete }) => {
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const storedUrl = DBEngine.getGoogleSheetsUrl();
      setUrl(storedUrl);
      setMessage('');
      
      // Also query server
      apiFetch('/sync/config').then(res => {
        if (res && res.url && !storedUrl) {
          setUrl(res.url);
          DBEngine.setGoogleSheetsUrl(res.url);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  const handleSaveUrl = async () => {
    try {
      setSaving(true);
      setMessage('');
      DBEngine.setGoogleSheetsUrl(url.trim());
      await apiFetch('/sync/config', {
        method: 'POST',
        body: JSON.stringify({ url: url.trim() })
      });
      setIsSuccess(true);
      setMessage('บันทึก URL การเชื่อมต่อ Google Sheets สำเร็จ');
      setTimeout(() => setMessage(''), 3500);
    } catch (err) {
      setIsSuccess(false);
      setMessage(err.message || 'ไม่สามารถบันทึก URL ได้');
    } finally {
      setSaving(false);
    }
  };

  const handlePushToSheets = async () => {
    try {
      setSyncing(true);
      setMessage('');
      if (url.trim()) {
        DBEngine.setGoogleSheetsUrl(url.trim());
      }
      const state = DBEngine.getState();
      await DBEngine.pushData(state);
      setIsSuccess(true);
      setMessage('ส่งข้อมูลลูกหนี้และบันทึกงาน (21 รายการ) ไปยัง Google Sheets สำเร็จแล้ว!');
      if (onSyncComplete) onSyncComplete();
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setIsSuccess(false);
      setMessage('เกิดข้อผิดพลาดในการส่งข้อมูล: ' + (err.message || 'เครือข่ายขัดข้อง'));
    } finally {
      setSyncing(false);
    }
  };

  const isConfigured = Boolean(url && url.startsWith('http'));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ตั้งค่าเชื่อมต่อ Google Sheets (Database 100%)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Status Box */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.85rem 1rem',
          borderRadius: '0.5rem',
          background: isConfigured ? 'rgba(52, 211, 153, 0.12)' : 'rgba(245, 158, 11, 0.12)',
          border: `1px solid ${isConfigured ? 'rgba(52, 211, 153, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
        }}>
          {isConfigured ? (
            <CheckCircle2 size={22} style={{ color: '#34d399', flexShrink: 0 }} />
          ) : (
            <AlertTriangle size={22} style={{ color: '#fbbf24', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: isConfigured ? '#34d399' : '#fbbf24' }}>
              {isConfigured ? 'เชื่อมต่อกับ Google Sheet พร้อมใช้งาน' : 'ยังไม่ได้ระบุ Web App URL (ใช้ระบบบันทึกความเร็วสูงในตัว)'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {isConfigured 
                ? 'ทุกการบันทึกจะซิงก์ข้อมูลไปยังสเปรดชีตของคุณโดยอัตโนมัติ' 
                : 'คุณสามารถใช้งานระบบได้ทันที และวาง URL ด้านล่างเพื่อซิงก์ลง Google Sheets'}
            </div>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            background: isSuccess ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${isSuccess ? 'rgba(52, 211, 153, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: isSuccess ? '#34d399' : '#f87171',
            fontSize: '0.875rem',
            fontWeight: 500
          }}>
            {message}
          </div>
        )}

        {/* URL Input */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>
            Apps Script Web App URL:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="form-input"
              style={{ flex: 1 }}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button
              className="btn btn-secondary"
              onClick={handleSaveUrl}
              disabled={saving}
              style={{ whiteSpace: 'nowrap' }}
            >
              <Save size={16} />
              <span>{saving ? 'กำลังบันทึก...' : 'บันทึก URL'}</span>
            </button>
          </div>
          <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
            คัดลอกจาก Google Sheets เมนู ส่วนขยาย (Extensions) &gt; Apps Script &gt; ทำให้ใช้งานได้ (Deploy)
          </small>
        </div>

        {/* Sync Actions */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.75rem',
          padding: '1rem', 
          background: 'var(--bg-input)', 
          borderRadius: '0.5rem',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={16} style={{ color: 'var(--accent-primary)' }} />
            <span>ซิงก์ข้อมูลไปยัง Google Sheets ทันที:</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={handlePushToSheets}
              disabled={syncing}
              style={{ flex: 1, minWidth: '200px' }}
            >
              <RefreshCw size={16} className={syncing ? 'spin' : ''} />
              <span>{syncing ? 'กำลังส่งข้อมูล...' : 'ส่งข้อมูลทั้งหมดลง Google Sheets'}</span>
            </button>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            * ระบบจะส่งข้อมูลลูกหนี้ (DB-001 นรรฐพล กาบแก้ว) และบันทึกงานทั้งหมด 21 รายการไปบันทึกลงในสเปรดชีต
          </div>
        </div>

        {/* Instructions */}
        <div style={{ 
          padding: '0.9rem 1rem', 
          background: 'rgba(15, 23, 42, 0.6)', 
          borderRadius: '0.5rem',
          border: '1px solid var(--border-color)',
          fontSize: '0.82rem',
          lineHeight: '1.5'
        }}>
          <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>
            💡 ขั้นตอนการเชื่อมต่อ Google Sheets ครั้งแรก (ทำเพียงครั้งเดียว):
          </div>
          <ol style={{ paddingLeft: '1.25rem', margin: 0, color: 'var(--text-secondary)' }}>
            <li>เปิด Google Sheet ที่คุณต้องการใช้เก็บข้อมูล</li>
            <li>ไปที่เมนู <strong>ส่วนขยาย (Extensions)</strong> &gt; <strong>Apps Script</strong></li>
            <li>วางโค้ดจากไฟล์ <code>google_sheets_setup/GoogleSheetsScript.gs</code></li>
            <li>ด้านบน เลือกฟังก์ชัน <strong>INITIALIZE_NOW</strong> แล้วกดปุ่ม <strong>เรียกใช้ (Run)</strong> เพื่อให้ข้อมูล 21 รายการปรากฏในชีตทันที</li>
            <li>กด <strong>ทำให้ใช้งานได้ (Deploy)</strong> &gt; <strong>การทำให้ใช้งานได้รายการใหม่ (New Deployment)</strong> &gt; เลือก <strong>เว็บแอป (Web App)</strong> &gt; ผู้มีสิทธิ์เข้าถึง: <strong>ทุกคน (Anyone)</strong></li>
            <li>คัดลอก URL ที่ได้มาวางในช่องด้านบน แล้วกด <strong>บันทึก URL</strong></li>
          </ol>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </Modal>
  );
};
