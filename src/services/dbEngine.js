import { apiFetch } from './api';

const STORAGE_KEY = 'DEBTOR_SYSTEM_STATE_V1';
const SNAPSHOT_KEY = 'DEBTOR_SYSTEM_SNAPSHOT_V1';

export class DBEngine {
  static getState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to parse local state:', e);
    }
    return {
      debtors: [],
      jobs: [],
      transactions: []
    };
  }

  static saveStateLocally(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
  }

  static async pullFromSupabase() {
    try {
      console.log('[DBEngine] Pulling fresh state from Supabase...');
      const res = await apiFetch('/sync/pull');
      
      if (res && res.state) {
        const state = {
          debtors: Array.isArray(res.state.debtors) ? res.state.debtors : [],
          jobs: Array.isArray(res.state.jobs) ? res.state.jobs : [],
          transactions: Array.isArray(res.state.transactions) ? res.state.transactions : []
        };

        this.saveStateLocally(state);
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(state));
        console.log('[DBEngine] Pull success. State loaded:', state);
        return state;
      }
    } catch (err) {
      console.error('[DBEngine] Pull failed, using local cache:', err);
    }

    return this.getState();
  }

  static async pushToSupabase(state) {
    this.saveStateLocally(state);
    try {
      console.log('[DBEngine] Syncing state to Supabase cloud...');
      const res = await apiFetch('/sync/push', {
        method: 'POST',
        body: JSON.stringify({ state })
      });
      if (res && res.state) {
        this.saveStateLocally(res.state);
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(res.state));
        return res.state;
      }
    } catch (err) {
      console.error('[DBEngine] Push error (will retry next time):', err);
    }
    return state;
  }
}
