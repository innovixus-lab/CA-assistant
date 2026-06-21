import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import DashboardOverview from './components/Dashboard';
import InboxPanel from './components/InboxPanel';
import ClientDatabase from './components/ClientDatabase';
import TaskBoard from './components/TaskBoard';
import DocumentVault from './components/DocumentVault';
import EmployeeManager from './components/EmployeeManager';
import FinanceManager from './components/FinanceManager';
import PerformanceAnalysis from './components/PerformanceAnalysis';
import ClientPortal from './portal/ClientPortal';
import EmployeePortal from './portal/EmployeePortal';
import CALogin from './portal/CALogin';
import CommSettings from './components/CommSettings';
import LandingPage from './landing/LandingPage';
import { motion, AnimatePresence } from 'motion/react';
import { type Employee } from './lib/firestore';

const CA_SESSION_KEY = 'ca_session';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [portalClientId, setPortalClientId] = useState<string | null>(null);
  const [isEmployeeRoute, setIsEmployeeRoute] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // CA session — persisted in sessionStorage so a page refresh keeps you logged in
  const [caUser, setCaUser] = useState<Employee | null>(() => {
    try { return JSON.parse(sessionStorage.getItem(CA_SESSION_KEY) ?? 'null'); }
    catch { return null; }
  });

  const detectRoute = () => {
    const path = window.location.pathname;
    setCurrentPath(path);
    const clientMatch = path.match(/^\/portal\/([^/]+)/);
    setPortalClientId(clientMatch ? clientMatch[1] : null);
    setIsEmployeeRoute(path.startsWith('/employee'));
  };

  useEffect(() => { detectRoute(); }, []);

  useEffect(() => {
    const handler = () => detectRoute();
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // Persist CA session
  useEffect(() => {
    if (caUser) sessionStorage.setItem(CA_SESSION_KEY, JSON.stringify(caUser));
    else sessionStorage.removeItem(CA_SESSION_KEY);
  }, [caUser]);

  // ── Employee portal route ──
  if (isEmployeeRoute) return <EmployeePortal />;

  // ── Client portal route ──
  if (portalClientId) return <ClientPortal clientId={portalClientId} />;

  // ── Logged-in user hitting /login or / → push them to /dashboard ──
  if (caUser && (currentPath === '/' || currentPath === '/login' || currentPath === '/register')) {
    window.history.replaceState({}, '', '/dashboard');
    setCurrentPath('/dashboard');
  }

  // ── Landing page (public marketing site) ──
  // Show at "/" and "/register" when not already logged in
  const isPublicRoute = currentPath === '/' || currentPath === '/register';
  if (!caUser && isPublicRoute) return <LandingPage />;

  // ── CA login gate — shown at /login or any unknown path while logged out ──
  if (!caUser) return <CALogin onLogin={(ca) => {
    setCaUser(ca);
    window.history.replaceState({}, '', '/dashboard');
    setCurrentPath('/dashboard');
  }} />;

  // ── CA dashboard ──
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':  return <DashboardOverview />;
      case 'inbox':      return <InboxPanel />;
      case 'clients':    return <ClientDatabase />;
      case 'tasks':      return <TaskBoard />;
      case 'documents':  return <DocumentVault />;
      case 'team':       return <EmployeeManager />;
      case 'finance':    return <FinanceManager />;
      case 'performance': return <PerformanceAnalysis />;
      case 'settings':   return <CommSettings />;
      default:           return <DashboardOverview />;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      caName={caUser.name}
      onLogout={() => {
        setCaUser(null);
        window.history.replaceState({}, '', '/');
        setCurrentPath('/');
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
