const API_BASE = '/api';

export const getAuthToken = () => localStorage.getItem('token');

export const apiFetch = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const gsUrl = localStorage.getItem('GOOGLE_SHEETS_WEBAPP_URL');
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    ...(gsUrl && gsUrl.trim().startsWith('http') ? { 'x-google-sheets-url': gsUrl.trim() } : {}),
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    const url = `${API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${Date.now()}`;
    response = await fetch(url, {
      ...options,
      headers
    });
  } catch (netErr) {
    throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.message || (response.status ? `การเชื่อมต่อขัดข้อง (HTTP ${response.status})` : 'เกิดข้อผิดพลาดในการประมวลผลของเซิร์ฟเวอร์');
    throw new Error(errorMsg);
  }

  return data;
};

export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2
  }).format(num);
};

export const getLocalDateString = (d = new Date()) => {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const str = String(dateString).trim().replace(/^'/, '');
    // 1. Direct match ISO / standard date string (YYYY-MM-DD) - 100% timezone-invariant
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const year = Number(m[1]) + 543;
      const monthIdx = Number(m[2]) - 1;
      const day = Number(m[3]);
      const monthName = THAI_MONTHS_SHORT[monthIdx] || m[2];
      return `${day} ${monthName} ${year}`;
    }
    // 2. Direct match DD/MM/YYYY
    const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmy) {
      let year = Number(dmy[3]);
      if (year < 2400) year += 543;
      const monthIdx = Number(dmy[2]) - 1;
      const day = Number(dmy[1]);
      const monthName = THAI_MONTHS_SHORT[monthIdx] || dmy[2];
      return `${day} ${monthName} ${year}`;
    }
    // 3. Fallback for other date objects
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
};
