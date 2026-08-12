import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navigation } from './components/Navigation';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Debtors } from './pages/Debtors';
import { DebtorProfile } from './pages/DebtorProfile';
import { JobRecords } from './pages/JobRecords';
import { MonthlySummary } from './pages/MonthlySummary';
import { Reports } from './pages/Reports';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDebtorId, setSelectedDebtorId] = useState(null);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-heading)'
      }}>
        <div>กำลังเริ่มต้นระบบ...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleSelectDebtor = (id) => {
    setSelectedDebtorId(id);
  };

  return (
    <div className="app-container">
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedDebtorId={selectedDebtorId}
        setSelectedDebtorId={setSelectedDebtorId}
      />

      <main className="main-content">
        {selectedDebtorId ? (
          <DebtorProfile
            debtorId={selectedDebtorId}
            onBack={() => setSelectedDebtorId(null)}
          />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                setActiveTab={setActiveTab}
                onSelectDebtor={handleSelectDebtor}
              />
            )}
            {activeTab === 'debtors' && (
              <Debtors onSelectDebtor={handleSelectDebtor} />
            )}
            {activeTab === 'jobs' && (
              <JobRecords onSelectDebtor={handleSelectDebtor} />
            )}
            {activeTab === 'monthly' && (
              <MonthlySummary onSelectDebtor={handleSelectDebtor} />
            )}
            {activeTab === 'reports' && <Reports />}
          </>
        )}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
