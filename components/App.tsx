
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ScanLine, Users, LogOut, Menu, Settings as SettingsIcon, GraduationCap, BarChart2, Building2, CircleDollarSign, UserCheck } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import StudentDirectory from './components/StudentDirectory';
import Settings from './components/Settings';
import Analytics from './components/Analytics';
import AcademicStructure from './components/AcademicStructure';
import TuitionRules from './components/TuitionRules';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import { UserRole, User } from './types';
import { ToastProvider } from './contexts/ToastContext';
import { subscribeToAuth, logoutUser, GLOBAL_CONFIG, subscribeToDataChanges } from './services/dataService';

const AppContent: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App Config State (Logo/Name)
  const [config, setConfig] = useState(GLOBAL_CONFIG);

  // Navigation State
  const [currentView, setCurrentView] = useState<'dashboard' | 'scanner' | 'directory' | 'settings' | 'analytics' | 'academic' | 'tuition' | 'users'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Global Listeners
  useEffect(() => {
    // Auth Listener
    const authUnsub = subscribeToAuth((user) => {
        setCurrentUser(user);
        setAuthLoading(false);
        if (user) {
            setCurrentView('dashboard');
        }
    });

    // Config Data Listener (for Logo updates)
    const dataUnsub = subscribeToDataChanges(() => {
        setConfig({...GLOBAL_CONFIG});
    });

    return () => {
        authUnsub();
        dataUnsub();
    };
  }, []);

  // Handle Logout
  const handleLogout = () => {
    logoutUser();
    // State will update via listener
  };

  if (authLoading) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-[#1a237e] rounded-full animate-spin mb-4"></div>
                <p className="text-sm text-gray-500 font-medium">Chargement sécurisé...</p>
            </div>
        </div>
      );
  }

  // If not logged in, show Login Screen
  // Note: Login component handles the actual sign-in call
  if (!currentUser) {
    return <Login onLogin={() => {}} />; 
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar UCAO THEME */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30 w-64 bg-[#1a237e] text-white flex flex-col transition-transform duration-300 transform shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-20 flex flex-col justify-center px-6 border-b border-blue-800/50 bg-[#101966] shrink-0">
          <div className="flex items-center gap-3">
             {/* Logo Placeholder */}
            {config.logoUrl ? (
                <div className="w-10 h-10 rounded bg-white p-1 flex items-center justify-center">
                     <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                </div>
            ) : (
                <div className="w-10 h-10 rounded bg-white text-[#1a237e] flex items-center justify-center font-bold text-xs border-2 border-[#fbc02d]">
                    U
                </div>
            )}
            
            <div>
                <h1 className="font-bold text-sm tracking-tight truncate max-w-[140px]">{config.institutionName || 'UCAO Biométrique'}</h1>
                <p className="text-[10px] text-blue-300">Portail Sécurisé</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <button
            onClick={() => { setCurrentView('dashboard'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'dashboard' 
                ? 'bg-white text-[#1a237e] shadow-md' 
                : 'text-blue-100 hover:bg-white/10 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Tableau de Bord
          </button>
          
          {/* Scanner is only for Admin/Security, not Accounting */}
          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => { setCurrentView('scanner'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'scanner' 
                  ? 'bg-white text-[#1a237e] shadow-md' 
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ScanLine className="w-5 h-5" />
              Lecteur Biométrique
            </button>
          )}

          <button
            onClick={() => { setCurrentView('directory'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'directory' 
                ? 'bg-white text-[#1a237e] shadow-md' 
                : 'text-blue-100 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Users className="w-5 h-5" />
            {currentUser.role === 'ACCOUNTANT' ? 'Caisse & Paiements' : 'Annuaire Étudiants'}
          </button>

          {/* New Academic Structure Menu */}
           {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => { setCurrentView('academic'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'academic' 
                  ? 'bg-white text-[#1a237e] shadow-md' 
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Building2 className="w-5 h-5" />
              Structure Académique
            </button>
           )}

           {/* New Tuition Rules Menu */}
           {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => { setCurrentView('tuition'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'tuition' 
                  ? 'bg-white text-[#1a237e] shadow-md' 
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <CircleDollarSign className="w-5 h-5" />
              Tarifs & Scolarité
            </button>
           )}

          <button
            onClick={() => { setCurrentView('analytics'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'analytics' 
                ? 'bg-white text-[#1a237e] shadow-md' 
                : 'text-blue-100 hover:bg-white/10 hover:text-white'
            }`}
          >
            <BarChart2 className="w-5 h-5" />
            Statistiques & Suivi
          </button>

          {/* USER MANAGEMENT (ADMIN ONLY) */}
          {(currentUser.role === 'ADMIN' || currentUser.role === 'GHOST') && (
            <button
              onClick={() => { setCurrentView('users'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'users' 
                  ? 'bg-white text-[#1a237e] shadow-md' 
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <UserCheck className="w-5 h-5" />
              Gestion Utilisateurs
            </button>
          )}

          {/* Settings only for Admin */}
          {currentUser.role === 'ADMIN' && (
            <div className="pt-4 mt-4 border-t border-blue-800/50">
              <button
                onClick={() => { setCurrentView('settings'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  currentView === 'settings' 
                    ? 'bg-white text-[#1a237e] shadow-md' 
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <SettingsIcon className="w-5 h-5" />
                Paramètres
              </button>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-blue-800/50 bg-[#101966] shrink-0">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-300 hover:bg-red-500/20 hover:text-red-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
          <button 
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex flex-col ml-2 md:ml-0">
             <h1 className="text-xl font-bold text-[#1a237e]">
                {currentView === 'dashboard' && 'Vue d\'Ensemble'}
                {currentView === 'scanner' && 'Contrôle d\'Accès'}
                {currentView === 'directory' && 'Gestion Académique'}
                {currentView === 'academic' && 'Structure & Départements'}
                {currentView === 'tuition' && 'Grille Tarifaire'}
                {currentView === 'users' && 'Utilisateurs Système'}
                {currentView === 'analytics' && 'Business Intelligence'}
                {currentView === 'settings' && 'Administration'}
             </h1>
          </div>

          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-bold text-gray-800">{currentUser.name}</p>
               <div className="flex items-center justify-end gap-1">
                 <span className="w-2 h-2 rounded-full bg-green-500"></span>
                 <p className="text-xs text-gray-500">{currentUser.department}</p>
               </div>
             </div>
             <div className={`w-10 h-10 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white font-bold ${currentUser.role === 'ADMIN' ? 'bg-[#1a237e]' : 'bg-[#c62828]'}`}>
               {currentUser.role === 'ADMIN' ? 'SA' : 'CP'}
             </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            {currentView === 'dashboard' && <Dashboard />}
            {currentView === 'scanner' && <Scanner />}
            {currentView === 'directory' && <StudentDirectory />}
            {currentView === 'academic' && <AcademicStructure />}
            {currentView === 'tuition' && <TuitionRules />}
            {currentView === 'users' && <UserManagement currentUser={currentUser} />}
            {currentView === 'analytics' && <Analytics />}
            {currentView === 'settings' && <Settings />}
          </div>
        </div>
        
      </main>
    </div>
  );
};

const App: React.FC = () => {
    return (
        <ToastProvider>
            <AppContent />
        </ToastProvider>
    );
};

export default App;
