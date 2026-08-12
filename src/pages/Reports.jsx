import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  Search, 
  Calendar, 
  Filter, 
  Users, 
  Briefcase, 
  DollarSign, 
  TrendingDown 
} from 'lucide-react';
import { apiFetch, formatCurrency, formatDate } from '../services/api';
import * as XLSX from 'xlsx';

export const Reports = () => {
  const [reportType, setReportType] = useState('debtors');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [debtorId, setDebtorId] = useState('');
  
  const [reportData, setReportData] = useState(null);
  const [debtorsList, setDebtorsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDebtorsDropdown = async () => {
    try {
      const res = await apiFetch('/debtors?limit=500');
      setDebtorsList(res.debtors || []);
    } catch (err) {
      console.error('Failed to fetch debtors:', err);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('reportType', reportType);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (debtorId) params.append('debtorId', debtorId);

      const res = await apiFetch(`/reports?${params.toString()}`);
      setReportData(res);
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebtorsDropdown();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [reportType, startDate, endDate, debtorId]);

  const { data = [], summary = {} } = reportData || {};

  // Export to Excel (.xlsx)
  const exportToExcel = () => {
    if (!data || data.length === 0) {
      alert('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    let exportRows = [];
    if (reportType === 'debtors') {
      exportRows = data.map(d => ({
        'รหัสลูกหนี้': d.code,
        'ชื่อ-นามสกุล': d.name,
        'เบอร์โทรศัพท์': d.phone || '-',
        'ยอดหนี้เริ่มต้น (บาท)': d.initial_debt,
        'หักชำระแล้ว (บาท)': d.paid_amount,
        'ยอดหนี้คงเหลือ (บาท)': d.remaining_debt,
        'สถานะ': d.status === 'paid_in_full' ? 'ชำระหมด' : 'กำลังชำระ',
        'วันที่เริ่มต้น': d.start_date
      }));
    } else if (['jobs', 'wages', 'advances', 'deductions'].includes(reportType)) {
      exportRows = data.map(j => ({
        'วันที่จัดงาน': j.job_date,
        'รหัสลูกหนี้': j.debtor_code,
        'ชื่อลูกหนี้': j.debtor_name,
        'สถานที่จัดงาน': j.location,
        'รายละเอียดงาน': j.description || '-',
        'จำนวนค่าแรง (บาท)': j.wage,
        'เบิกค่าแรง (บาท)': j.advance_withdraw,
        'หักหนี้จริง (บาท)': j.debt_deduction,
        'ค่าแรงคงเหลือจ่าย (บาท)': j.net_wage
      }));
    } else if (reportType === 'transactions') {
      exportRows = data.map(t => ({
        'วันที่ธุรกรรม': t.transaction_date,
        'รหัสลูกหนี้': t.debtor_code,
        'ชื่อลูกหนี้': t.debtor_name,
        'สถานที่งาน': t.job_location || '-',
        'ยอดหนี้ก่อนหัก (บาท)': t.debt_before,
        'จำนวนเงินที่หัก (บาท)': t.deducted_amount,
        'ยอดหนี้หลังหัก (บาท)': t.debt_after
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงาน');
    XLSX.writeFile(workbook, `รายงาน_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export / Print PDF (.pdf) via native browser print formatted document
  const exportToPDF = () => {
    if (!data || data.length === 0) {
      alert('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    const printWindow = window.open('', '_blank');
    const titleText = `รายงาน${
      reportType === 'debtors' ? 'ลูกหนี้' :
      reportType === 'jobs' ? 'การทำงาน' :
      reportType === 'wages' ? 'ค่าแรง' :
      reportType === 'advances' ? 'การเบิกค่าแรง' :
      reportType === 'deductions' ? 'การหักหนี้' : 'ประวัติธุรกรรม'
    }`;

    let tableHtml = '';
    if (reportType === 'debtors') {
      tableHtml = `
        <thead>
          <tr>
            <th>รหัส</th><th>ชื่อ-นามสกุล</th><th>เบอร์โทร</th><th>ยอดหนี้เริ่มต้น</th><th>หักชำระแล้ว</th><th>ยอดหนี้คงเหลือ</th><th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(d => `
            <tr>
              <td>${d.code}</td>
              <td>${d.name}</td>
              <td>${d.phone || '-'}</td>
              <td>${formatCurrency(d.initial_debt)}</td>
              <td>${formatCurrency(d.paid_amount)}</td>
              <td>${formatCurrency(d.remaining_debt)}</td>
              <td>${d.remaining_debt <= 0 ? 'ชำระหมด' : 'กำลังชำระ'}</td>
            </tr>
          `).join('')}
        </tbody>
      `;
    } else if (['jobs', 'wages', 'advances', 'deductions'].includes(reportType)) {
      tableHtml = `
        <thead>
          <tr>
            <th>วันที่</th><th>ลูกหนี้</th><th>สถานที่</th><th>ค่าแรง</th><th>เบิกค่าแรง</th><th>หักหนี้จริง</th><th>ค่าแรงคงเหลือ</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(j => `
            <tr>
              <td>${formatDate(j.job_date)}</td>
              <td>${j.debtor_code} - ${j.debtor_name}</td>
              <td>${j.location}</td>
              <td>${formatCurrency(j.wage)}</td>
              <td>${formatCurrency(j.advance_withdraw)}</td>
              <td>${formatCurrency(j.debt_deduction)}</td>
              <td>${formatCurrency(j.net_wage)}</td>
            </tr>
          `).join('')}
        </tbody>
      `;
    } else if (reportType === 'transactions') {
      tableHtml = `
        <thead>
          <tr>
            <th>วันที่</th><th>ลูกหนี้</th><th>สถานที่</th><th>ยอดหนี้ก่อนหัก</th><th>จำนวนที่หัก</th><th>ยอดหนี้หลังหัก</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(t => `
            <tr>
              <td>${formatDate(t.transaction_date)}</td>
              <td>${t.debtor_code} - ${t.debtor_name}</td>
              <td>${t.job_location || '-'}</td>
              <td>${formatCurrency(t.debt_before)}</td>
              <td>${formatCurrency(t.deducted_amount)}</td>
              <td>${formatCurrency(t.debt_after)}</td>
            </tr>
          `).join('')}
        </tbody>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${titleText}</title>
        <style>
          body { font-family: 'Sarabun', sans-serif; padding: 20px; color: #000; }
          h2 { margin-bottom: 5px; }
          .sub { color: #666; font-size: 13px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; }
        </style>
      </head>
      <body>
        <h2>${titleText}</h2>
        <div class="sub">วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH')} | ระบบจัดการลูกหนี้หักจากค่าแรง</div>
        <table>${tableHtml}</table>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">ระบบรายงานและการส่งออกข้อมูล</h1>
          <p className="page-subtitle">ออกรายงานจากฐานข้อมูลจริง พร้อมรองรับการดาวน์โหลดไฟล์ Excel และ PDF</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-emerald" onClick={exportToExcel}>
            <FileSpreadsheet size={18} />
            <span>Export Excel (.xlsx)</span>
          </button>
          <button className="btn btn-primary" onClick={exportToPDF}>
            <Printer size={18} />
            <span>Export PDF / พิมพ์ (.pdf)</span>
          </button>
        </div>
      </div>

      {/* Report Types and Filter Toolbar */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${reportType === 'debtors' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setReportType('debtors')}
            >
              <Users size={14} /> รายงานลูกหนี้
            </button>
            <button
              className={`btn btn-sm ${reportType === 'jobs' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setReportType('jobs')}
            >
              <Briefcase size={14} /> รายงานการทำงาน
            </button>
            <button
              className={`btn btn-sm ${reportType === 'wages' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setReportType('wages')}
            >
              <DollarSign size={14} /> รายงานค่าแรง
            </button>
            <button
              className={`btn btn-sm ${reportType === 'advances' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setReportType('advances')}
            >
              <DollarSign size={14} /> รายงานการเบิกค่าแรง
            </button>
            <button
              className={`btn btn-sm ${reportType === 'deductions' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setReportType('deductions')}
            >
              <TrendingDown size={14} /> รายงานการหักหนี้
            </button>
            <button
              className={`btn btn-sm ${reportType === 'transactions' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setReportType('transactions')}
            >
              <FileSpreadsheet size={14} /> รายงานประวัติธุรกรรม
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="form-label" style={{ marginBottom: 0 }}>ตั้งแต่วันที่:</span>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto', padding: '0.4rem 0.6rem', fontSize: '0.825rem' }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="form-label" style={{ marginBottom: 0 }}>ถึงวันที่:</span>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto', padding: '0.4rem 0.6rem', fontSize: '0.825rem' }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '180px', padding: '0.4rem 0.6rem', fontSize: '0.825rem' }}
              value={debtorId}
              onChange={(e) => setDebtorId(e.target.value)}
            >
              <option value="">ลูกหนี้ทุกคน</option>
              {debtorsList.map(d => (
                <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
              ))}
            </select>

            {(startDate || endDate || debtorId) && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => { setStartDate(''); setEndDate(''); setDebtorId(''); }}
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Box */}
      {summary && Object.keys(summary).length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {summary.totalDebtors !== undefined && (
            <div className="card" style={{ flex: 1, minWidth: '150px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>จำนวนลูกหนี้</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{summary.totalDebtors} คน</div>
            </div>
          )}
          {summary.totalInitial !== undefined && (
            <div className="card" style={{ flex: 1, minWidth: '150px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ยอดหนี้เริ่มต้นรวม</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{formatCurrency(summary.totalInitial)}</div>
            </div>
          )}
          {summary.totalPaid !== undefined && (
            <div className="card" style={{ flex: 1, minWidth: '150px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ชำระแล้วรวม</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#34d399' }}>{formatCurrency(summary.totalPaid)}</div>
            </div>
          )}
          {summary.totalRemaining !== undefined && (
            <div className="card" style={{ flex: 1, minWidth: '150px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ยอดหนี้คงเหลือรวม</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f87171' }}>{formatCurrency(summary.totalRemaining)}</div>
            </div>
          )}
          {summary.totalWage !== undefined && (
            <div className="card" style={{ flex: 1, minWidth: '150px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ค่าแรงรวม</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{formatCurrency(summary.totalWage)}</div>
            </div>
          )}
          {summary.totalAdvance !== undefined && (
            <div className="card" style={{ flex: 1, minWidth: '150px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>เบิกค่าแรงรวม</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fbbf24' }}>{formatCurrency(summary.totalAdvance)}</div>
            </div>
          )}
          {summary.totalDeduction !== undefined && (
            <div className="card" style={{ flex: 1, minWidth: '150px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ยอดหักหนี้รวม</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#34d399' }}>{formatCurrency(summary.totalDeduction)}</div>
            </div>
          )}
        </div>
      )}

      {/* Report Data Table Preview */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            กำลังสร้างข้อมูลรายงาน...
          </div>
        ) : data.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">ไม่พบข้อมูลรายงาน</div>
            <div className="empty-desc">ไม่มีข้อมูลตรงตามเงื่อนไขรายงานที่เลือก</div>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              {reportType === 'debtors' && (
                <>
                  <thead>
                    <tr>
                      <th>รหัสลูกหนี้</th>
                      <th>ชื่อ-นามสกุล</th>
                      <th>เบอร์โทร</th>
                      <th>ยอดหนี้เริ่มต้น</th>
                      <th>หักชำระแล้ว</th>
                      <th>ยอดหนี้คงเหลือ</th>
                      <th>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map(d => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{d.code}</td>
                        <td style={{ fontWeight: 600, color: 'white' }}>{d.name}</td>
                        <td>{d.phone || '-'}</td>
                        <td>{formatCurrency(d.initial_debt)}</td>
                        <td style={{ color: '#34d399', fontWeight: 600 }}>{formatCurrency(d.paid_amount)}</td>
                        <td style={{ fontWeight: 700, color: d.remaining_debt <= 0 ? '#60a5fa' : '#f87171' }}>
                          {formatCurrency(d.remaining_debt)}
                        </td>
                        <td>
                          <span className={`badge ${d.remaining_debt <= 0 ? 'badge-paid' : 'badge-active'}`}>
                            {d.remaining_debt <= 0 ? 'ชำระหมด' : 'กำลังชำระ'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {['jobs', 'wages', 'advances', 'deductions'].includes(reportType) && (
                <>
                  <thead>
                    <tr>
                      <th>วันที่จัดงาน</th>
                      <th>รหัส/ชื่อลูกหนี้</th>
                      <th>สถานที่จัดงาน</th>
                      <th>รายละเอียดงาน</th>
                      <th>ค่าแรง</th>
                      <th>เบิกค่าแรง</th>
                      <th>หักหนี้จริง</th>
                      <th>ค่าแรงคงเหลือจ่าย</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map(j => (
                      <tr key={j.id}>
                        <td>{formatDate(j.job_date)}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                          {j.debtor_code} - {j.debtor_name}
                        </td>
                        <td>{j.location}</td>
                        <td>{j.description || '-'}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(j.wage)}</td>
                        <td style={{ color: '#fbbf24' }}>{formatCurrency(j.advance_withdraw)}</td>
                        <td style={{ color: '#34d399', fontWeight: 700 }}>{formatCurrency(j.debt_deduction)}</td>
                        <td style={{ fontWeight: 600, color: 'white' }}>{formatCurrency(j.net_wage)}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {reportType === 'transactions' && (
                <>
                  <thead>
                    <tr>
                      <th>วันที่ธุรกรรม</th>
                      <th>รหัส/ชื่อลูกหนี้</th>
                      <th>สถานที่งาน</th>
                      <th>ยอดหนี้ก่อนหัก</th>
                      <th>จำนวนเงินที่หัก</th>
                      <th>ยอดหนี้หลังหัก</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map(t => (
                      <tr key={t.id}>
                        <td>{formatDate(t.transaction_date)}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                          {t.debtor_code} - {t.debtor_name}
                        </td>
                        <td>{t.job_location || '-'}</td>
                        <td>{formatCurrency(t.debt_before)}</td>
                        <td style={{ color: '#34d399', fontWeight: 700 }}>-{formatCurrency(t.deducted_amount)}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(t.debt_after)}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
