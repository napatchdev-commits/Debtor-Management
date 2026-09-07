import { apiFetch } from './api';

const STORAGE_KEY = 'DEBTOR_SYSTEM_STATE_V2';
const SNAPSHOT_KEY = 'DEBTOR_SYSTEM_SNAPSHOT_V2';

// Pre-seeded original data from Excel (DB-001: นรรฐพล กาบแก้ว, Initial Debt: 360,000)
export const SEED_DEBTORS = [
  {
    id: 1,
    code: 'DB-001',
    name: 'นรรฐพล กาบแก้ว',
    phone: '081-234-5678',
    initial_debt: 360000,
    paid_amount: 27500,
    remaining_debt: 332500,
    start_date: '2026-05-01',
    note: 'ลูกหนี้งานหักค่าแรงประจำ',
    status: 'active',
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-09-03T00:00:00.000Z'
  }
];

export const SEED_JOBS = [
  { id: 1, debtor_id: 1, job_date: '2026-09-03', location: 'จัดงานธรรมศาสตร์', description: 'จัดงาน rxtu 2ภาค', wage: 2000, advance_withdraw: 0, debt_deduction: 2000, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
  { id: 2, debtor_id: 1, job_date: '2026-09-02', location: 'จัดงานลาดกระบัง', description: 'จัดงาน 4ภาค', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
  { id: 3, debtor_id: 1, job_date: '2026-08-28', location: 'วัดปากบ่อ', description: 'จัดงานบวช', wage: 1000, advance_withdraw: 0, debt_deduction: 1000, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
  { id: 4, debtor_id: 1, job_date: '2026-08-21', location: 'จัดงานขึ้นบ้านใหม่', description: 'ฉากงานขึ้นบ้านใหม่', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
  { id: 5, debtor_id: 1, job_date: '2026-08-14', location: 'จัดงานแต่งร้านส้มแก้ว', description: 'จัดฉากงานแต่ง', wage: 1000, advance_withdraw: 0, debt_deduction: 1000, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
  { id: 6, debtor_id: 1, job_date: '2026-07-31', location: 'จัดงานมหาวิทยาลัยกรุงเทพธนบุรี', description: 'จัดงานเกษียณ', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
  { id: 7, debtor_id: 1, job_date: '2026-07-23', location: 'วัดงานวัดส้ม', description: 'จัดงานบวช', wage: 1500, advance_withdraw: 1000, debt_deduction: 500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
  { id: 8, debtor_id: 1, job_date: '2026-07-17', location: 'จัดงานบวชศาลายา', description: 'จัดงานบวชด่วน', wage: 1500, advance_withdraw: 500, debt_deduction: 1000, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
  { id: 9, debtor_id: 1, job_date: '2026-07-17', location: 'งานทำบุญบ้านสมุทรสาคร', description: 'จัดงานทำบุญบ้าน', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
  { id: 10, debtor_id: 1, job_date: '2026-07-16', location: 'วัดงานบวชราชดำเนิน', description: 'จัดงานบวช', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
  { id: 11, debtor_id: 1, job_date: '2026-07-09', location: 'สิงห์ เบเวอเรช', description: 'จัดพิธีส่งงานทำบุญ', wage: 1000, advance_withdraw: 0, debt_deduction: 1000, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
  { id: 12, debtor_id: 1, job_date: '2026-07-04', location: 'วัดปากน้ำฝั่งใต้', description: 'จัดงานบวช', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
  { id: 13, debtor_id: 1, job_date: '2026-06-19', location: 'งานบวชหนองหล่ม', description: 'จัดงานบวชหนองหล่ม', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
  { id: 14, debtor_id: 1, job_date: '2026-06-08', location: 'สิงห์ เบเวอเรช', description: 'จัดฉากงาน QCC', wage: 1000, advance_withdraw: 0, debt_deduction: 1000, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
  { id: 15, debtor_id: 1, job_date: '2026-06-05', location: 'งานบวชวัดบางโฉลง', description: 'จัดงานบวชวัดบางโฉลง', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
  { id: 16, debtor_id: 1, job_date: '2026-05-23', location: 'งาน bynior', description: 'จัดงานรับปริญญา', wage: 1000, advance_withdraw: 0, debt_deduction: 1000, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
  { id: 17, debtor_id: 1, job_date: '2026-05-21', location: 'จัดงานบวชนพรรณ', description: 'จัดงานบวชสุพรรณบุรี', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
  { id: 18, debtor_id: 1, job_date: '2026-05-16', location: 'จัดงานบวชวัดกู้', description: 'จัดงานบวชวัดประสิทธิ์ อยุธยา', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
  { id: 19, debtor_id: 1, job_date: '2026-05-15', location: 'จัดงานบวชวัดชลนที', description: 'ฉากถ่ายรูป1ภาค', wage: 1000, advance_withdraw: 0, debt_deduction: 1000, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
  { id: 20, debtor_id: 1, job_date: '2026-05-08', location: 'จัดงานบวช นครปฐม', description: 'จัดงานบวช นครปฐม', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' },
  { id: 21, debtor_id: 1, job_date: '2026-05-07', location: 'บวชบางโทรัด', description: 'จัดงานบวช', wage: 1500, advance_withdraw: 0, debt_deduction: 1500, net_wage: 0, debtor_code: 'DB-001', debtor_name: 'นรรฐพล กาบแก้ว' }
];

export const SEED_TRANSACTIONS = SEED_JOBS.map((j, idx) => ({
  id: idx + 1,
  debtor_id: 1,
  job_id: j.id,
  transaction_date: j.job_date,
  deducted_amount: j.debt_deduction,
  debt_before: 360000 - (SEED_JOBS.slice(idx + 1).reduce((acc, curr) => acc + curr.debt_deduction, 0)),
  debt_after: 360000 - (SEED_JOBS.slice(idx).reduce((acc, curr) => acc + curr.debt_deduction, 0)),
  debtor_code: 'DB-001',
  debtor_name: 'นรรฐพล กาบแก้ว',
  job_location: j.location,
  created_at: j.job_date + 'T00:00:00.000Z'
}));

let activePullPromise = null;

export class DBEngine {
  static getInitialSeedState() {
    return {
      debtors: JSON.parse(JSON.stringify(SEED_DEBTORS)),
      jobs: JSON.parse(JSON.stringify(SEED_JOBS)),
      transactions: JSON.parse(JSON.stringify(SEED_TRANSACTIONS))
    };
  }

  static getState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.debtors) && parsed.debtors.length > 0) {
          // Auto-migrate legacy 358500 -> 360000 in existing local storage
          let migrated = false;
          parsed.debtors = parsed.debtors.map(d => {
            if (Number(d.id) === 1 && (Number(d.initial_debt) === 358500 || Number(d.initial_debt) <= 0)) {
              migrated = true;
              return {
                ...d,
                initial_debt: 360000,
                remaining_debt: 360000 - (Number(d.paid_amount) || 27500)
              };
            }
            return d;
          });

          if (migrated) {
            this.saveStateLocally(parsed);
            this.recalculateDebtor(1);
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse local state:', e);
    }

    const defaultSeed = this.getInitialSeedState();
    this.saveStateLocally(defaultSeed);
    return defaultSeed;
  }

  static saveStateLocally(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
  }

  static updateOrAddDebtor(debtor, isEdit) {
    const state = this.getState();
    const debtors = state.debtors || [];
    const targetId = Number(debtor.id);
    let updatedDebtors = [];

    if (isEdit && targetId) {
      updatedDebtors = debtors.map(d => Number(d.id) === targetId ? { ...d, ...debtor } : d);
    } else {
      const newId = targetId || (debtors.length > 0 ? Math.max(...debtors.map(d => Number(d.id) || 0)) + 1 : 1);
      const newDebtor = {
        ...debtor,
        id: newId,
        paid_amount: Number(debtor.paid_amount) || 0,
        remaining_debt: Number(debtor.initial_debt) || 0,
        status: debtor.status || 'active'
      };
      updatedDebtors = [newDebtor, ...debtors];
    }

    state.debtors = updatedDebtors;
    this.saveStateLocally(state);
    this.recalculateDebtor(targetId || 1);
    this.pushData(this.getState()).catch(() => {});
    return this.getState();
  }

  static deleteDebtor(debtorId) {
    const state = this.getState();
    const dId = Number(debtorId);
    state.debtors = (state.debtors || []).filter(d => Number(d.id) !== dId);
    state.jobs = (state.jobs || []).filter(j => Number(j.debtor_id) !== dId);
    state.transactions = (state.transactions || []).filter(t => Number(t.debtor_id) !== dId);
    this.saveStateLocally(state);
    this.pushData(state).catch(() => {});
    return state;
  }

  static updateOrAddJob(job, isEdit) {
    const state = this.getState();
    const jobs = state.jobs || [];
    const targetId = Number(job.id);
    let updatedJobs = [];

    const debtor = (state.debtors || []).find(d => Number(d.id) === Number(job.debtor_id));
    const debtor_code = debtor ? debtor.code : '';
    const debtor_name = debtor ? debtor.name : '';

    const wage = Number(job.wage) || 0;
    const advance = Number(job.advance_withdraw) || 0;
    const deduction = Math.max(0, wage - advance);
    const net = 0;

    const enrichedJob = {
      ...job,
      wage,
      advance_withdraw: advance,
      debt_deduction: deduction,
      net_wage: net,
      debtor_code: job.debtor_code || debtor_code,
      debtor_name: job.debtor_name || debtor_name
    };

    if (isEdit && targetId) {
      updatedJobs = jobs.map(j => Number(j.id) === targetId ? { ...j, ...enrichedJob } : j);
    } else {
      const newId = targetId || (jobs.length > 0 ? Math.max(...jobs.map(j => Number(j.id) || 0)) + 1 : 1);
      updatedJobs = [{ ...enrichedJob, id: newId }, ...jobs];
    }

    state.jobs = updatedJobs;
    this.saveStateLocally(state);
    this.recalculateDebtor(Number(job.debtor_id));
    this.pushData(this.getState()).catch(() => {});
    return this.getState();
  }

  static deleteJob(jobId, debtorId) {
    const state = this.getState();
    const jId = Number(jobId);
    state.jobs = (state.jobs || []).filter(j => Number(j.id) !== jId);
    state.transactions = (state.transactions || []).filter(t => Number(t.job_id) !== jId);
    this.saveStateLocally(state);
    if (debtorId) {
      this.recalculateDebtor(Number(debtorId));
    }
    this.pushData(this.getState()).catch(() => {});
    return state;
  }

  static recalculateDebtor(debtorId) {
    const state = this.getState();
    const dId = Number(debtorId);
    const debtor = (state.debtors || []).find(d => Number(d.id) === dId);
    if (!debtor) return;

    const debtorJobs = (state.jobs || []).filter(j => Number(j.debtor_id) === dId);
    const totalDeducted = debtorJobs.reduce((sum, j) => sum + (Number(j.debt_deduction) || 0), 0);
    const initialDebt = Number(debtor.initial_debt) || 0;
    const remainingDebt = Math.max(0, initialDebt - totalDeducted);

    debtor.paid_amount = totalDeducted;
    debtor.remaining_debt = remainingDebt;
    debtor.status = (remainingDebt <= 0 && initialDebt > 0) ? 'paid_in_full' : (debtor.status || 'active');

    // Recalculate transactions for this debtor
    const sortedJobsAsc = [...debtorJobs].sort((a, b) => new Date(a.job_date) - new Date(b.job_date));
    let runningDebt = initialDebt;
    const debtorTx = sortedJobsAsc.map((j) => {
      const before = runningDebt;
      const after = Math.max(0, before - (Number(j.debt_deduction) || 0));
      runningDebt = after;
      return {
        id: j.id,
        debtor_id: dId,
        job_id: j.id,
        transaction_date: j.job_date,
        deducted_amount: Number(j.debt_deduction) || 0,
        debt_before: before,
        debt_after: after,
        debtor_code: debtor.code,
        debtor_name: debtor.name,
        job_location: j.location,
        created_at: j.job_date + 'T00:00:00.000Z'
      };
    });

    const otherTx = (state.transactions || []).filter(t => Number(t.debtor_id) !== dId);
    state.transactions = [...debtorTx.reverse(), ...otherTx];
    this.saveStateLocally(state);
  }

  static async pullData(force = false) {
    if (activePullPromise && !force) {
      return activePullPromise;
    }

    activePullPromise = (async () => {
      try {
        const res = await apiFetch('/sync/pull');
        
        if (res && res.state && Array.isArray(res.state.debtors) && res.state.debtors.length > 0) {
          const serverDebtors = res.state.debtors.map(d => {
            if (Number(d.id) === 1 && (Number(d.initial_debt) === 358500 || Number(d.initial_debt) <= 0)) {
              return {
                ...d,
                initial_debt: 360000,
                remaining_debt: 360000 - (Number(d.paid_amount) || 27500)
              };
            }
            return d;
          });

          // Safeguard user modifications in localStorage
          const local = this.getState();
          const localD1 = (local.debtors || []).find(d => Number(d.id) === 1);
          if (localD1 && Number(localD1.initial_debt) === 360000) {
            const sD1 = serverDebtors.find(d => Number(d.id) === 1);
            if (sD1) {
              sD1.initial_debt = 360000;
              sD1.remaining_debt = 360000 - (Number(sD1.paid_amount) || 27500);
            }
          }

          const state = {
            debtors: serverDebtors,
            jobs: Array.isArray(res.state.jobs) && res.state.jobs.length > 0 ? res.state.jobs : (local.jobs || []),
            transactions: Array.isArray(res.state.transactions) && res.state.transactions.length > 0 ? res.state.transactions : (local.transactions || [])
          };

          this.saveStateLocally(state);
          return state;
        }
      } catch (err) {
        console.warn('[DBEngine] Sync pull notice, using local database cache:', err);
      } finally {
        activePullPromise = null;
      }

      return this.getState();
    })();

    return activePullPromise;
  }

  static async pullFromSupabase(force = false) {
    return this.pullData(force);
  }

  static getGoogleSheetsUrl() {
    return localStorage.getItem('GOOGLE_SHEETS_WEBAPP_URL') || '';
  }

  static setGoogleSheetsUrl(url) {
    if (url) {
      localStorage.setItem('GOOGLE_SHEETS_WEBAPP_URL', url.trim());
    } else {
      localStorage.removeItem('GOOGLE_SHEETS_WEBAPP_URL');
    }
  }

  static async pushData(state) {
    this.saveStateLocally(state);
    const gsUrl = this.getGoogleSheetsUrl();

    // 1. Send via Backend Serverless API
    try {
      const res = await apiFetch('/sync/push', {
        method: 'POST',
        body: JSON.stringify({ state, googleSheetsUrl: gsUrl })
      });
      if (res && res.state) {
        this.saveStateLocally(res.state);
      }
    } catch (err) {
      console.warn('[DBEngine] Backend sync push notice:', err);
    }

    // 2. Direct browser sync to Google Apps Script Web App (Avoids CORS preflight via text/plain)
    if (gsUrl && gsUrl.startsWith('http')) {
      try {
        const separator = gsUrl.includes('?') ? '&' : '?';
        const targetUrl = `${gsUrl}${separator}action=push`;
        await fetch(targetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'push', state })
        });
        console.log('[DBEngine] Direct Google Sheets push sent successfully.');
      } catch (directErr) {
        console.warn('[DBEngine] Direct Google Sheets push error:', directErr);
      }
    }

    return this.getState();
  }

  static async pushToSupabase(state) {
    return this.pushData(state);
  }
}
