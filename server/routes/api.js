import express from 'express';
import { checkSystemStatus, register, login, getMe } from '../controllers/authController.js';
import { getDebtors, getDebtorById, createDebtor, updateDebtor, deleteDebtor } from '../controllers/debtorController.js';
import { getJobs, previewJobDeduction, createJob, updateJob, deleteJob } from '../controllers/jobController.js';
import { getMonthlySummary } from '../controllers/monthlyController.js';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { getReportsData } from '../controllers/reportController.js';
import { pullState, pushState } from '../controllers/syncController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Auth routes
router.get('/auth/status', checkSystemStatus);
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', authenticateToken, getMe);

// Sync State Engine (Sombat Apartment Innovation Architecture)
router.get('/sync/pull', authenticateToken, pullState);
router.post('/sync/push', authenticateToken, pushState);

// Dashboard
router.get('/dashboard/stats', authenticateToken, getDashboardStats);

// Debtors
router.get('/debtors', authenticateToken, getDebtors);
router.get('/debtors/:id', authenticateToken, getDebtorById);
router.post('/debtors', authenticateToken, createDebtor);
router.put('/debtors/:id', authenticateToken, updateDebtor);
router.delete('/debtors/:id', authenticateToken, deleteDebtor);

// Jobs
router.get('/jobs', authenticateToken, getJobs);
router.post('/jobs/preview', authenticateToken, previewJobDeduction);
router.post('/jobs', authenticateToken, createJob);
router.put('/jobs/:id', authenticateToken, updateJob);
router.delete('/jobs/:id', authenticateToken, deleteJob);

// Monthly Summary
router.get('/monthly-summary', authenticateToken, getMonthlySummary);

// Reports
router.get('/reports', authenticateToken, getReportsData);

export default router;
