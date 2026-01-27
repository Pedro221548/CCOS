
import React, { useState, useEffect, useCallback, Suspense, lazy, useRef, useMemo } from 'react';
import { LayoutDashboard, Menu, Bell, X, FileSpreadsheet, CheckCircle2, Shield, Loader2, LogOut, Users, PlusSquare, ClipboardList, ChevronUp, MessageSquareHeart, AlertTriangle, Megaphone, Info, Sun, Moon, HelpCircle, Mail, Calendar, Clock, RefreshCw, BookOpen, DollarSign } from 'lucide-react';
import { Camera, AccessPoint, User, ProcessedWorker, AppNotification, ThirdPartyImport, Note, ShiftNote, ThirdPartyPayment, PaymentImport, Status } from './types';
import { authService } from './services/auth';
import { monitoringService } from './services/monitoring';
import { organizerService } from './services/organizer';
import { ref, onValue, update, query, orderByChild } from 'firebase/database';
import { db } from './services/firebase';

// Hooks
import { useTheme } from './hooks/useTheme';
import { useAppData } from './hooks/useAppData';
import { useNotificationSounds } from './hooks/useNotificationSounds';

// Components
import ProfileModal from './components/ProfileModal';
import FeedbackModal from './components/FeedbackModal';

// Lazy Load Components
const Dashboard = lazy(() => import('./components/Dashboard'));
const CameraList = lazy(() => import('./components/CameraList'));
const AccessControlList = lazy(() => import('./components/AccessControlList'));
const Importer = lazy(() => import('./components/Importer'));
const Login = lazy(() => import('./components/Login'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const Registration = lazy(() => import('./components/Registration'));
const OnboardingTour = lazy(() => import('./components/OnboardingTour'));
const Organizer = lazy(() => import('./components/Organizer'));
const ThirdPartyStatus = lazy(() => import('./components/ThirdPartyStatus'));
const EmailPendencies = lazy(() => import('./components/EmailPendencies'));
const TaskManagement = lazy(() => import('./components/TaskManagement'));
const MyTasks = lazy(() => import('./components/MyTasks'));
const AccessManagement = lazy(() => import('./components/AccessManagement'));
const Heatmap = lazy(() => import('./components/Heatmap'));
const Manual = lazy(() => import('./components/Manual'));
const Payments = lazy(() => import('./components/Payments'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full w-full">
    <Loader2 className="animate-spin text-amber-500 w-8 h-8" />
  </div>
);

const hasWarehousePermission = (allowedList: string[] | undefined, targetWarehouse: string) => {
    if (!allowedList || allowedList.length === 0) return false;
    const normalizedTarget = (targetWarehouse || '').toUpperCase();
    return allowedList.some(allowed => {
        const normalizedAllowed = allowed.toUpperCase();
        if (normalizedAllowed === normalizedTarget) return true;
        if (normalizedAllowed.includes(normalizedTarget) || normalizedTarget.includes(normalizedAllowed)) return true;
        return false;
    });
};

interface Toast {
    id: string;
    message: string;
    type: 'info' | 'success' | 'alert';
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'monitoring' | 'third-party-mgmt' | 'work-mgmt' | 'finance' | 'manual' | 'organizer' | 'data' | 'users' | 'registration'>(
    (localStorage.getItem('cv_active_tab') as any) || 'dashboard'
  );
  const [monitoringSubTab, setMonitoringSubTab] = useState<'cameras' | 'alarms' | 'access'>(
    (localStorage.getItem('cv_mon_tab') as any) || 'cameras'
  );
  const [thirdPartySubTab, setThirdPartySubTab] = useState<'status' | 'access-mgmt' | 'heatmap'>(
    (localStorage.getItem('cv_tp_tab') as any) || 'status'
  );
  const [workSubTab, setWorkSubTab] = useState<'tasks' | 'pendencies' | 'notes'>(
    (localStorage.getItem('cv_work_tab') as any) || 'tasks'
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshCountdown, setRefreshCountdown] = useState(600); 
  
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  const { theme, toggleTheme } = useTheme();
  const { data, thirdPartyWorkers, paymentRecords } = useAppData(user);

  const isAdmin = user?.role === 'admin';

  useEffect(() => { localStorage.setItem('cv_active_tab', activeTab); }, [activeTab]);
  useEffect(() => { localStorage.setItem('cv_mon_tab', monitoringSubTab); }, [monitoringSubTab]);
  useEffect(() => { localStorage.setItem('cv_tp_tab', thirdPartySubTab); }, [thirdPartySubTab]);
  useEffect(() => { localStorage.setItem('cv_work_tab', workSubTab); }, [workSubTab]);

  useEffect(() => {
    const timer = setInterval(() => {
        setCurrentTime(new Date());
        setRefreshCountdown(prev => {
            if (prev <= 1) {
                window.location.reload();
                return 600;
            }
            return prev - 1;
        });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  useNotificationSounds(user, addToast);
  
  const handleScroll = () => {
    if (mainContentRef.current) setShowScrollTop(mainContentRef.current.scrollTop > 400);
  };

  const scrollToTop = () => {
    if (mainContentRef.current) mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
      if (!user) { setNotifications([]); return; }
      const notifRef = query(ref(db, `notifications/${user.uid}`), orderByChild('timestamp'));
      const unsubscribe = onValue(notifRef, (snapshot) => {
          if (snapshot.exists()) {
              const raw = snapshot.val();
              const list: AppNotification[] = Object.keys(raw).map(key => ({ id: key, ...raw[key] }));
              setNotifications(list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
          } else { setNotifications([]); }
      });
      return () => unsubscribe();
  }, [user]);

  const handleTabChange = useCallback((tab: typeof activeTab) => {
    if (['data', 'users'].includes(tab) && !isAdmin) { alert("Acesso negado."); return; }
    setActiveTab(tab);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, [isAdmin]);

  const handleLogout = useCallback(() => { authService.logout(); setActiveTab('dashboard'); }, []);
  
  const markAllRead = async () => {
      if (!user) return;
      const updates: any = {};
      notifications.forEach(n => { if (!n.read) updates[`notifications/${user.uid}/${n.id}/read`] = true; });
      if (Object.keys(updates).length > 0) await update(ref(db), updates);
  };

  const handleImportData = async (cameras: Camera[], accessPoints: AccessPoint[]) => {
      try {
          await monitoringService.importData(cameras, accessPoints);
          addToast("Sistema atualizado!", "success");
      } catch (e) {
          addToast("Erro ao importar dados.", "alert");
      }
  };

  const handleToggleCameraStatus = async (uuid: string) => {
    try {
        const result = await monitoringService.toggleCameraStatus(uuid, data.cameras);
        if (result) {
            addToast(`${result.name}: Status alterado para ${result.newStatus}`, "info");
        }
    } catch (e) {
        addToast("Erro ao alterar status da câmera.", "alert");
    }
  };

  const handleToggleAccessStatus = async (uuid: string) => {
    try {
        const result = await monitoringService.toggleAccessStatus(uuid, data.accessPoints);
        if (result) {
            addToast(`${result.name}: Status alterado para ${result.newStatus}`, "info");
        }
    } catch (e) {
        addToast("Erro ao alterar status de acesso.", "alert");
    }
  };

  const handleSetWarehouseStatus = async (warehouse: string, status: Status) => {
    try {
        await monitoringService.setWarehouseStatus(warehouse, status, data.cameras);
        addToast(`${warehouse}: Todas as câmeras definidas como ${status}`, "success");
    } catch (e) {
        addToast("Erro ao alterar status do galpão.", "alert");
    }
  };

  const handleImportThirdParty = async (workers: ProcessedWorker[], fileName: string) => {
      try {
          await monitoringService.addThirdPartyImport(workers, fileName);
          addToast(`Importado: ${fileName}`, "success");
      } catch (e) {
          addToast("Erro ao importar terceirizados.", "alert");
      }
  };

  const handleImportPayments = async (payments: ThirdPartyPayment[], fileName: string) => {
    try {
        await monitoringService.addPaymentImport(payments, fileName);
        addToast(`Pagamentos importados: ${fileName}`, "success");
    } catch (e) {
        addToast("Erro ao importar pagamentos.", "alert");
    }
  };

  const handleDeleteImport = async (id: string) => {
      if (!window.confirm("Deseja remover este histórico?")) return;
      try { await monitoringService.deleteThirdPartyImport(id); addToast("Removido.", "info"); } catch (e) { addToast("Erro.", "alert"); }
  };

  const handleDeletePayment = async (id: string) => {
      if (!window.confirm("Deseja remover este histórico financeiro?")) return;
      try { await monitoringService.deletePaymentImport(id); addToast("Financeiro removido.", "info"); } catch (e) { addToast("Erro.", "alert"); }
  };

  const handleResetCameras = async () => {
    try { await monitoringService.resetCameras(); addToast("Câmeras limpas!", "success"); } catch (e) { addToast("Erro.", "alert"); }
  };

  const handleResetAccess = async () => {
    try { await monitoringService.resetAccessPoints(); addToast("Acessos limpos!", "success"); } catch (e) { addToast("Erro.", "alert"); }
  };

  const handleResetThirdParty = async () => {
    try { await monitoringService.resetThirdParty(); addToast("Terceirizados limpos!", "success"); } catch (e) { addToast("Erro.", "alert"); }
  };

  const handleResetPayments = async () => {
    try { await monitoringService.resetPayments(); addToast("Financeiro limpo!", "success"); } catch (e) { addToast("Erro.", "alert"); }
  };

  const counts = useMemo(() => {
    let filteredCameras = data.cameras;
    let filteredAccess = data.accessPoints;
    if (user?.role === 'manager' && user?.allowedWarehouses) {
      filteredCameras = data.cameras.filter(c => hasWarehousePermission(user.allowedWarehouses, c.warehouse));
      filteredAccess = data.accessPoints.filter(a => hasWarehousePermission(user.allowedWarehouses, a.warehouse));
    }
    return {
      video: filteredCameras.filter(c => c.channelType === 'video').length,
      alarm: filteredCameras.filter(c => c.channelType === 'alarm').length,
      access: filteredAccess.length
    };
  }, [data.cameras, data.accessPoints, user]);

  const handleAddNote = (note: Note) => organizerService.addNote(note, data.notes);
  const handleToggleNote = (id: string) => organizerService.toggleNote(id, data.notes);
  const handleDeleteNote = (id: string) => organizerService.deleteNote(id, data.notes);
  const handleEditNote = (id: string, content: string) => organizerService.editNote(id, content, data.notes);
  const handleAddShiftNote = (note: ShiftNote) => organizerService.addShiftNote(note, data.shiftNotes || []);
  const handleDeleteShiftNote = (id: string) => organizerService.deleteShiftNote(id, data.shiftNotes || []);

  if (authLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-amber-500 w-10 h-10" /></div>;
  if (!user) return <Suspense fallback={<LoadingFallback />}><Login onLogin={() => {}} /></Suspense>;

  return (
    <div className="h-screen w-full bg-slate-200 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex font-sans overflow-hidden">
      
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-3 pointer-events-none">
          {toasts.map(t => (
              <div key={t.id} className={`pointer-events-auto min-w-[280px] max-w-sm p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-slide-in-right ${
                  t.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-amber-600 border-amber-500 text-white'
              }`}>
                  {t.type === 'success' ? <CheckCircle2 size={24} /> : t.type === 'alert' ? <Megaphone size={24} /> : <Info size={24} />}
                  <p className="text-sm font-bold">{t.message}</p>
              </div>
          ))}
      </div>

      <aside className={`fixed inset-y-0 left-0 z-40 bg-slate-50 dark:bg-slate-950 border-r border-slate-300 dark:border-slate-800 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-64 lg:translate-x-0 lg:static lg:h-full lg:w-64 flex flex-col shadow-2xl lg:shadow-none`}>
        <div className="flex flex-col items-center justify-center py-10 px-4 shrink-0 select-none">
            <div onClick={() => handleTabChange('dashboard')} className="flex flex-col items-center cursor-pointer group w-full text-center">
                <div className="relative mb-4 transform transition-transform group-hover:scale-105 duration-300 mx-auto">
                    <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full"></div>
                    <Shield className="w-16 h-16 text-amber-500 relative z-10 fill-amber-500/10 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" strokeWidth={1.5} />
                </div>
                <h1 className="text-4xl font-black text-amber-500 mb-4 leading-none tracking-tighter drop-shadow-md">CCOS</h1>
                <div className="px-5 py-1.5 bg-amber-500/5 border border-amber-500/20 rounded-full inline-block mx-auto shadow-inner"><span className="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em]">DEMONSTRAÇÃO</span></div>
            </div>
        </div>
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto custom-scrollbar border-t border-slate-800/50 mt-4">
          <button onClick={() => handleTabChange('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-amber-600 text-slate-950 shadow-lg font-black' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white'}`}><LayoutDashboard size={20} /> <span className="text-sm font-bold uppercase tracking-wider">Dashboard</span></button>
          <button onClick={() => handleTabChange('monitoring')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'monitoring' ? 'bg-amber-600 text-slate-950 shadow-lg font-black' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white'}`}><Shield size={20} /> <span className="text-sm font-bold uppercase tracking-wider">Monitoramento</span></button>
          <button onClick={() => handleTabChange('third-party-mgmt')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'third-party-mgmt' ? 'bg-amber-600 text-slate-950 shadow-lg font-black' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white'}`}><Users size={20} /> <span className="text-sm font-bold uppercase tracking-wider">Gestão Fluxo</span></button>
          <button onClick={() => handleTabChange('finance')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'finance' ? 'bg-amber-600 text-slate-950 shadow-lg font-black' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white'}`}><DollarSign size={20} /> <span className="text-sm font-bold uppercase tracking-wider">Financeiro</span></button>
          {user?.role !== 'manager' && (
              <>
                <button onClick={() => handleTabChange('work-mgmt')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'work-mgmt' ? 'bg-amber-600 text-slate-950 shadow-lg font-black' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white'}`}><ClipboardList size={20} /> <span className="text-sm font-bold uppercase tracking-wider">Operacional</span></button>
                <button onClick={() => handleTabChange('registration')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'registration' ? 'bg-amber-600 text-slate-950 shadow-lg font-black' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white'}`}><PlusSquare size={20} /> <span className="text-sm font-bold uppercase tracking-wider">Cadastro</span></button>
              </>
          )}
          <button onClick={() => handleTabChange('manual')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'manual' ? 'bg-blue-600 text-white shadow-lg font-black' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white'}`}><BookOpen size={20} /> <span className="text-sm font-bold uppercase tracking-wider">Manual</span></button>
          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-slate-800/50 shrink-0">
                <button onClick={() => handleTabChange('data')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'data' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-900 hover:text-white'}`}><FileSpreadsheet size={20} /> <span className="text-sm font-bold uppercase tracking-wider">Fonte Dados</span></button>
                <button onClick={() => handleTabChange('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-900 hover:text-white'}`}><Users size={20} /> <span className="text-sm font-bold uppercase tracking-wider">Usuários</span></button>
            </div>
          )}
        </nav>
        <div className="mt-auto p-4 border-t border-slate-800/50 bg-slate-950/50">
           <div className="flex items-center gap-3 mb-2" onClick={() => setShowProfileModal(true)}>
              <div className="relative group cursor-pointer">
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.name}&background=f59e0b&color=000`} alt="Avatar" className="w-11 h-11 rounded-full border-2 border-slate-800 object-cover group-hover:border-amber-500 transition-colors" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950"></div>
              </div>
              <div className="flex-1 min-w-0"><p className="text-xs font-black text-white uppercase truncate tracking-tight">{user.name}</p><p className="text-[9px] font-bold text-slate-500 uppercase truncate">{user.jobTitle || 'OPERADOR'}</p></div>
           </div>
           <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/5 transition-all text-[10px] font-black uppercase tracking-widest"><LogOut size={14} /> <span>Sair</span></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-200 dark:bg-[#020408] w-full relative">
        <header className="h-16 bg-slate-50/80 dark:bg-[#020408]/80 backdrop-blur-md border-b border-slate-300 dark:border-slate-800/50 flex items-center justify-between px-6 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"><Menu size={24} /></button>
            <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>Operação Ativa</div>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex items-center bg-slate-950/80 px-4 py-1.5 rounded-xl border border-slate-800 shadow-inner mr-2"><div className="text-sm font-mono font-black text-white tracking-widest flex items-center gap-2"><Clock size={16} className="text-blue-500" />{currentTime.toLocaleTimeString('pt-BR')}</div></div>
             <button onClick={() => setShowFeedbackModal(true)} className="p-2 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all flex items-center gap-1 group" title="Sugerir Melhoria"><MessageSquareHeart size={20} strokeWidth={2.5} /><span className="hidden xl:inline text-[10px] font-black uppercase tracking-widest">Feedback</span></button>
             <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-white transition-colors">{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button>
             <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-slate-400 hover:text-white focus:outline-none transition-colors"><Bell size={20} />{notifications.filter(n => !n.read).length > 0 && <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">{notifications.filter(n => !n.read).length}</span>}</button>
                {showNotifications && (
                    <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                        <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/50"><span className="text-xs font-bold uppercase text-slate-400">Notificações</span><button onClick={markAllRead} className="text-[10px] text-amber-400 font-bold hover:text-white transition-colors">Limpar</button></div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">{notifications.length === 0 ? <div className="p-8 text-center text-slate-600 text-[10px] uppercase font-bold tracking-widest">Vazio</div> : notifications.map(n => (<div key={n.id} className={`p-3 border-b border-slate-800 flex gap-2 ${!n.read ? 'bg-amber-600/5' : ''}`}><div className="flex-1"><p className="text-xs text-white leading-relaxed">{n.message}</p><span className="text-[9px] text-slate-600 font-bold uppercase mt-1 block">{new Date(n.timestamp).toLocaleTimeString()}</span></div></div>))}</div>
                    </div>
                )}
             </div>
             <button onClick={() => setShowTour(true)} className="p-2 text-slate-400 hover:text-white transition-colors" title="Manual"><HelpCircle size={20} /></button>
          </div>
        </header>

        <div className="bg-amber-600/10 border-b border-amber-600/20 py-2 px-4 flex items-center justify-center gap-3 animate-fade-in relative z-10">
             <Shield size={14} className="text-amber-500" />
             <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">CCOS • Plataforma em Fase de Desenvolvimento<span className="mx-2 opacity-30">|</span><RefreshCw size={12} className="animate-spin-slow" />Sincronização Automática em <span className="text-amber-400 font-mono w-12 inline-block text-left">{formatCountdown(refreshCountdown)}</span></span>
             <Shield size={14} className="text-amber-500" />
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 scroll-smooth custom-scrollbar" ref={mainContentRef} onScroll={handleScroll}>
          <div className="max-w-[1600px] mx-auto space-y-8">
            <Suspense fallback={<LoadingFallback />}>
                {activeTab === 'dashboard' && <Dashboard data={data} thirdPartyWorkers={thirdPartyWorkers} currentUser={user} />}
                {activeTab === 'finance' && <Payments payments={paymentRecords} currentUser={user} />}
                {activeTab === 'monitoring' && (
                  <div className="space-y-8 animate-fade-in">
                    <div className="bg-slate-900/50 p-1 rounded-2xl border border-slate-800/50 shadow-sm">
                        <div className="flex bg-[#020408] border border-slate-800 p-1.5 rounded-xl shadow-inner w-full overflow-x-auto no-scrollbar scroll-smooth gap-2">
                            <button onClick={() => setMonitoringSubTab('cameras')} className={`flex-1 min-w-[110px] px-3 py-3 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${monitoringSubTab === 'cameras' ? 'bg-amber-600 text-slate-950 font-bold shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>CÂMERAS <span className="text-[10px] opacity-80">({counts.video})</span></button>
                            <button onClick={() => setMonitoringSubTab('alarms')} className={`flex-1 min-w-[110px] px-3 py-3 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${monitoringSubTab === 'alarms' ? 'bg-[#ea580c] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>ALARMES <span className="text-[10px] opacity-80">({counts.alarm})</span></button>
                            {/* Fix: changed monitoringSubSubTab to monitoringSubTab below */}
                            <button onClick={() => setMonitoringSubTab('access')} className={`flex-1 min-w-[110px] px-3 py-3 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${monitoringSubTab === 'access' ? 'bg-amber-600 text-slate-950 font-bold shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>ACESSO <span className="text-[10px] opacity-80">({counts.access})</span></button>
                        </div>
                    </div>
                    {monitoringSubTab === 'cameras' && <CameraList cameras={data.cameras.filter(c => c.channelType === 'video')} onToggleStatus={handleToggleCameraStatus} onSetWarehouseStatus={handleSetWarehouseStatus} readOnly={user.role !== 'admin'} allowedWarehouses={user.role === 'manager' ? user.allowedWarehouses : undefined} />}
                    {monitoringSubTab === 'alarms' && <CameraList cameras={data.cameras.filter(c => c.channelType === 'alarm')} onToggleStatus={handleToggleCameraStatus} onSetWarehouseStatus={handleSetWarehouseStatus} readOnly={user.role !== 'admin'} allowedWarehouses={user.role === 'manager' ? user.allowedWarehouses : undefined} />}
                    {monitoringSubTab === 'access' && <AccessControlList accessPoints={data.accessPoints} onToggleStatus={handleToggleAccessStatus} readOnly={user.role !== 'admin'} allowedWarehouses={user.role === 'manager' ? user.allowedWarehouses : undefined} />}
                  </div>
                )}
                {activeTab === 'third-party-mgmt' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="bg-slate-900/50 p-1 rounded-2xl border border-slate-800/50 shadow-sm overflow-hidden">
                        <div className="flex bg-[#020408] border border-slate-800 p-1.5 rounded-xl shadow-inner w-full overflow-x-auto no-scrollbar scroll-smooth gap-2">
                            <button onClick={() => setThirdPartySubTab('status')} className={`flex-1 min-w-[110px] px-3 py-3 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${thirdPartySubTab === 'status' ? 'bg-amber-600 text-slate-950 font-bold shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>STATUS</button>
                            <button onClick={() => setThirdPartySubTab('access-mgmt')} className={`flex-1 min-w-[110px] px-3 py-3 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${thirdPartySubTab === 'access-mgmt' ? 'bg-amber-600 text-slate-950 font-bold shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>RELATÓRIOS</button>
                            <button onClick={() => setThirdPartySubTab('heatmap')} className={`flex-1 min-w-[110px] px-3 py-3 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${thirdPartySubTab === 'heatmap' ? 'bg-amber-600 text-slate-950 font-bold shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>MAPA CALOR</button>
                        </div>
                    </div>
                    {thirdPartySubTab === 'status' && <ThirdPartyStatus workers={thirdPartyWorkers} currentUser={user} />}
                    {thirdPartySubTab === 'access-mgmt' && <AccessManagement accessPoints={data.accessPoints} thirdPartyWorkers={thirdPartyWorkers} currentUser={user} />}
                    {thirdPartySubTab === 'heatmap' && <Heatmap thirdPartyWorkers={thirdPartyWorkers} currentUser={user} />}
                  </div>
                )}
                {activeTab === 'manual' && <Manual />}
                {activeTab === 'work-mgmt' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="bg-slate-900/50 p-1 rounded-2xl border border-slate-800/50 shadow-sm">
                        <div className="flex bg-[#020408] border border-slate-800 p-1.5 rounded-xl shadow-inner w-full overflow-x-auto no-scrollbar scroll-smooth gap-2">
                            <button onClick={() => setWorkSubTab('tasks')} className={`flex-1 min-w-[110px] px-3 py-3 rounded-lg transition-all flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest ${workSubTab === 'tasks' ? 'bg-amber-600 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                <ClipboardList size={16} /> TAREFAS
                            </button>
                            <button onClick={() => setWorkSubTab('pendencies')} className={`flex-1 min-w-[110px] px-3 py-3 rounded-lg transition-all flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest ${workSubTab === 'pendencies' ? 'bg-amber-600 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                <Mail size={16} /> E-MAILS
                            </button>
                            <button onClick={() => setWorkSubTab('notes')} className={`flex-1 min-w-[110px] px-3 py-3 rounded-lg transition-all flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest ${workSubTab === 'notes' ? 'bg-amber-600 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                <Calendar size={16} /> AGENDA
                            </button>
                        </div>
                    </div>
                    <div>
                        {workSubTab === 'tasks' ? (user.role === 'admin' ? <TaskManagement currentUser={user} /> : <MyTasks currentUser={user} />) : 
                         workSubTab === 'pendencies' ? <EmailPendencies currentUser={user} /> : 
                         <Organizer 
                            currentUser={user} 
                            notes={data.notes} 
                            shiftNotes={data.shiftNotes || []} 
                            onAddNote={handleAddNote} 
                            onToggleNote={handleToggleNote} 
                            onDeleteNote={handleDeleteNote} 
                            onEditNote={handleEditNote} 
                            onAddShiftNote={handleAddShiftNote} 
                            onDeleteShiftNote={handleDeleteShiftNote} 
                         />}
                    </div>
                  </div>
                )}
                {activeTab === 'registration' && <Registration onAddCamera={() => {}} onAddAccess={() => {}} onAddDocument={() => {}} onDeleteDocument={() => {}} documents={data.documents} userRole={user.role} />}
                {activeTab === 'data' && (
                    <Importer 
                        onImport={handleImportData} 
                        onImportThirdParty={handleImportThirdParty} 
                        onImportPayments={handleImportPayments}
                        onDeleteImport={handleDeleteImport} 
                        onDeletePayment={handleDeletePayment}
                        thirdPartyImports={data.thirdPartyImports} 
                        paymentImports={data.paymentImports}
                        onResetCameras={handleResetCameras}
                        onResetAccess={handleResetAccess}
                        onResetThirdParty={handleResetThirdParty}
                        onResetPayments={handleResetPayments}
                    />
                )}
                {activeTab === 'users' && <UserManagement currentUser={user} />}
            </Suspense>
          </div>
          {showScrollTop && (<button onClick={scrollToTop} className="fixed bottom-24 right-8 z-50 p-4 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-full shadow-2xl transition-all active:scale-90 animate-bounce"><ChevronUp size={24} strokeWidth={3} /></button>)}
        </div>
      </main>
      {showProfileModal && <ProfileModal user={user} onClose={() => setShowProfileModal(false)} />}
      {showFeedbackModal && <FeedbackModal user={user} onClose={() => setShowFeedbackModal(false)} />}
      {showTour && <OnboardingTour role={user.role} onFinish={() => setShowTour(false)} />}
    </div>
  );
};
export default App;
