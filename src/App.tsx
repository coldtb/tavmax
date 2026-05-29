import React, { useState, useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useProjectStore } from './store/projectStore';
import { Auth } from './pages/Auth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Dashboard } from './pages/Dashboard';
import { Editor } from './pages/Editor';
import { Cutting } from './pages/Cutting';
import { Pricing } from './pages/Pricing';
import { Materials } from './pages/Materials';
import { Customer } from './pages/Customer';
import { Settings } from './pages/Settings';
import {
  LayoutDashboard,
  Box,
  Scissors,
  DollarSign,
  Warehouse,
  CreditCard,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';

// Attach global log helper
if (typeof window !== 'undefined') {
  (window as any).tavmaxLog = (msg: string) => {
    console.log(`[TavmaxDebug] ${msg}`);
    window.dispatchEvent(new CustomEvent('tavmax-log', { detail: `[${new Date().toLocaleTimeString()}] ${msg}` }));
  };
}

export const App: React.FC = () => {
  const { isLoggedIn, user, logout } = useAuthStore();
  const { activeProject, setActiveProject } = useProjectStore();

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('tavmax_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
    localStorage.setItem('tavmax_theme', theme);
    // Dispatch custom event to notify other components (e.g. Settings)
    window.dispatchEvent(new CustomEvent('tavmax-theme-change', { detail: theme }));
  }, [theme]);

  // Sync state if theme is toggled elsewhere (e.g. in Settings)
  useEffect(() => {
    const handleThemeChange = (e: any) => {
      if (e.detail && (e.detail === 'dark' || e.detail === 'light') && e.detail !== theme) {
        setTheme(e.detail);
      }
    };
    window.addEventListener('tavmax-theme-change', handleThemeChange);
    return () => window.removeEventListener('tavmax-theme-change', handleThemeChange);
  }, [theme]);

  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('tavmax_active_tab') || 'dashboard';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const handleLog = (e: any) => {
      setLogs((prev) => [...prev, e.detail].slice(-30));
    };
    window.addEventListener('tavmax-log', handleLog);
    
    // Log app start
    if ((window as any).tavmaxLog) {
      (window as any).tavmaxLog('Tavmax App loaded');
    }

    return () => window.removeEventListener('tavmax-log', handleLog);
  }, []);

  // Authentication gate
  if (!isLoggedIn) {
    return <Auth />;
  }

  // Navigation Links
  const navLinks = [
    { id: 'dashboard', label: 'Хянах самбар', icon: <LayoutDashboard size={18} /> },
    { id: 'editor', label: '3D Засварлагч', icon: <Box size={18} /> },
    { id: 'cutting', label: 'Зүсэлт оновчлол', icon: <Scissors size={18} /> },
    { id: 'pricing', label: 'Үнэ & Бэлдэц', icon: <DollarSign size={18} /> },
    { id: 'materials', label: 'Материал', icon: <Warehouse size={18} /> },
    { id: 'customer', label: 'Миний Эрх & Төлбөр', icon: <CreditCard size={18} /> },
    { id: 'settings', label: 'Тохиргоо', icon: <SettingsIcon size={18} /> },
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    localStorage.setItem('tavmax_active_tab', tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#08090d] text-neutral-100 flex flex-col">
      {/* Top Header bar */}
      <header className="sticky top-0 z-40 bg-[#0c0d12]/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex justify-between items-center glass">
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <span className="font-display font-extrabold text-2xl tracking-tight bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-transparent">
            TavMax
          </span>
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold uppercase tracking-wider">
            Pro v1.0.4
          </span>
        </div>

        {/* User Session status widget */}
        <div className="flex items-center gap-3.5 text-xs font-semibold text-neutral-300">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-white font-bold">{user?.name}</span>
            <span className="text-[9px] text-neutral-500 uppercase">{user?.role === 'factory' ? 'Техникч' : 'Карпентер'}</span>
          </div>
          
          {/* Light/Dark Mode Switcher */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2.5 rounded-xl bg-neutral-800/60 border border-white/5 text-neutral-400 hover:text-amber-500 hover:bg-amber-500/10 transition-all cursor-pointer flex items-center justify-center"
            title={theme === 'dark' ? 'Цагаан горимд шилжих' : 'Харанхуй горимд шилжих'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            onClick={logout}
            className="p-2.5 rounded-xl bg-neutral-800/60 border border-white/5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
            title="Системээс гарах"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main layout grid */}
      <div className="flex-1 flex relative">
        {/* Sidebar Nav (Desktop) */}
        <aside className="hidden lg:flex w-64 flex-col border-r border-white/5 p-6 bg-[#0c0d12]/50 shrink-0">
          <nav className="flex-1 flex flex-col gap-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleTabChange(link.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all text-left cursor-pointer ${
                  activeTab === link.id
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-lg shadow-amber-500/10'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.02]'
                }`}
              >
                {link.icon}
                {link.label}
              </button>
            ))}
          </nav>
          
          <div className="text-[10px] text-neutral-600 text-center border-t border-white/5 pt-4 mt-6">
            © 2026 TavMax AI Platform
          </div>
        </aside>

        {/* Mobile Navigation Sidebar Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-30 lg:hidden flex">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            
            {/* Drawer */}
            <div className="relative w-64 bg-[#0c0d12] border-r border-white/10 p-6 flex flex-col h-full z-45 animate-fade-in">
              <div className="mb-6 flex justify-between items-center">
                <span className="font-display font-extrabold text-xl text-white">Удирдах Цэс</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400"
                >
                  <X size={18} />
                </button>
              </div>
              <nav className="flex-1 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => handleTabChange(link.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all text-left ${
                      activeTab === link.id
                        ? 'bg-amber-500 text-neutral-950 font-bold shadow-lg shadow-amber-500/10'
                        : 'text-neutral-400 hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Content Pane */}
        <main className="flex-1 p-3 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          <ErrorBoundary>
            {activeTab === 'dashboard' && (
              <Dashboard onSelectProject={setActiveProject} onNavigate={handleTabChange} />
            )}
            {activeTab === 'editor' && <Editor />}
            {activeTab === 'cutting' && <Cutting />}
            {activeTab === 'pricing' && <Pricing />}
            {activeTab === 'materials' && <Materials />}
            {activeTab === 'customer' && <Customer />}
            {activeTab === 'settings' && <Settings />}
          </ErrorBoundary>
        </main>
      </div>

      {/* Floating Debug Panel */}
      <div className="fixed bottom-4 right-4 z-[999999] flex flex-col items-end gap-2">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-white/10 text-[10px] font-bold text-amber-500 hover:bg-neutral-800 transition-colors shadow-xl shadow-black/50 cursor-pointer"
        >
          {showDebug ? '✕ Debug Хаах' : '⚙️ Debug Нээх'}
        </button>
        
        {showDebug && (
          <div className="w-96 h-80 bg-[#0c0d12]/95 border border-white/10 rounded-xl p-4 flex flex-col gap-3 shadow-2xl font-mono text-[9px] text-neutral-300">
            <div className="flex justify-between items-center border-b border-white/5 pb-2 text-white font-bold">
              <span>Системийн Лог (Debug)</span>
              <button onClick={() => setLogs([])} className="text-red-400 hover:text-red-300">Цэвэрлэх</button>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1" style={{ scrollbarWidth: 'thin' }}>
              {logs.length === 0 ? (
                <span className="text-neutral-600">Одоогоор лог байхгүй байна.</span>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="whitespace-pre-wrap leading-tight break-all border-b border-white/2 pb-1 last:border-0">{log}</div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default App;
