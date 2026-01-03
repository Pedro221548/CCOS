
import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import { LayoutDashboard, Video, DoorClosed, Menu, Bell, X, Power, FileSpreadsheet, Trash2, Check, AlertCircle, CheckCircle2, Shield, Eye, Loader2, LogOut, Users, PlusSquare, Calendar, Settings, Camera as CameraIcon, Save, Briefcase, Mail, User as UserIcon, Image as ImageIcon, Sun, Moon, ClipboardList, CheckSquare, Ban, HelpCircle, Lock, Activity, Grid, Volume2, ChevronUp, BellRing } from 'lucide-react';
import { Camera, AccessPoint, User, PublicDocument, Note, ProcessedWorker, AppNotification, Status, ThirdPartyImport, ShiftNote } from './types';
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

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full w-full">
    <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
  </div>
);

const App: React.FC = () => {
  // --- STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'monitoring' | 'third-party-mgmt' | 'work-mgmt' | 'organizer' | 'data' | 'users' | 'registration'>('dashboard');
  const [monitoringSubTab, setMonitoringSubTab] = useState<'cameras' | 'alarms' | 'access'>('cameras');
  const [thirdPartySubTab, setThirdPartySubTab] = useState<'status' | 'access-mgmt' | 'heatmap'>('status');
  const [workSubTab, setWorkSubTab] = useState<'tasks' | 'pendencies' | 'notes'>('tasks');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // --- HOOKS ---
  const { theme, toggleTheme } = useTheme();
  const { data, thirdPartyWorkers } = useAppData(user);
  useNotificationSounds(user);
  
  const addLocalAlert = useCallback((message: string, type: 'alert' | 'info' | 'success' | 'message' | 'system') => {
      console.log("Local Alert:", message, type);
  }, []);

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
      if (currentUser) {
          const tourKey = `ccos_tour_seen_${currentUser.uid}`;
          if (!localStorage.getItem(tourKey)) setShowTour(true);
      }
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
    const isAdmin = user?.role === 'admin';
    const isManager = user?.role === 'manager';
    if (['data', 'users'].includes(tab) && !isAdmin) { alert("Acesso negado."); return; }
    if (isManager && !['dashboard', 'third-party-mgmt', 'monitoring'].includes(tab)) { alert("Acesso não permitido."); return; }
    setActiveTab(tab);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, [user]);

  const handleLogout = useCallback(() => { authService.logout(); setActiveTab('dashboard'); }, []);
  const markAllRead = async () => {
      if (!user) return;
      const updates: any = {};
      notifications.forEach(n => { if (!n.read) updates[`notifications/${user.uid}/${n.id}/read`] = true; });
      if (Object.keys(updates).length > 0) await update(ref(db), updates);
  };
  const removeNotification = async (id: string) => { if (!user) return; await update(ref(db, `notifications/${user.uid}`), { [id]: null }); };

  const handleImportData = useCallback(async (cameras: Camera[], accessPoints: AccessPoint[]) => { await monitoringService.importData(cameras, accessPoints); }, []);
  const handleSaveThirdPartyImport = useCallback(async (workers: ProcessedWorker[], fileName: string) => { await monitoringService.addThirdPartyImport(workers, fileName); }, []);
  const handleDeleteThirdPartyImport = useCallback(async (id: string) => { if (window.confirm("Excluir?")) await monitoringService.deleteThirdPartyImport(id); }, []);

  const handleToggleCameraStatus = useCallback(async (uuid: string) => {
      if (user?.role !== 'admin') return;
      const res = await monitoringService.toggleCameraStatus(uuid, data.cameras);
      if (res) addLocalAlert(`Alterado para ${res.newStatus}`, 'info');
  }, [user, data.cameras, addLocalAlert]);

  const handleSetWarehouseStatus = useCallback(async (warehouse: string, status: Status) => {
      if (user?.role !== 'admin') return;
      await monitoringService.setWarehouseStatus(warehouse, status, data.cameras);
  }, [user, data.cameras]);

  const handleToggleAccessStatus = useCallback(async (uuid: string) => {
      if (user?.role !== 'admin') return;
      await monitoringService.toggleAccessStatus(uuid, data.accessPoints);
  }, [user, data.accessPoints]);

  const handleAddCamera = useCallback(async (cam: Camera) => {
      await monitoringService.addCamera(cam, data.cameras);
  }, [data.cameras]);

  const handleAddAccess = useCallback(async (ap: AccessPoint) => {
      await monitoringService.addAccessPoint(ap, data.accessPoints);
  }, [data.accessPoints]);

  const handleAddDocument = useCallback(async (doc: PublicDocument) => {
      await monitoringService.addDocument(doc, data.documents);
  }, [data.documents]);

  const handleDeleteDocument = useCallback(async (uuid: string) => {
      await monitoringService.deleteDocument(uuid, data.documents);
  }, [data.documents]);

  const handleAddNote = useCallback(async (note: Note) => await organizerService.addNote(note, data.notes), [data.notes]);
  const handleToggleNote = useCallback(async (id: string) => await organizerService.toggleNote(id, data.notes), [data.notes]);
  const handleDeleteNote = useCallback(async (id: string) => await organizerService.deleteNote(id, data.notes), [data.notes]);
  const handleEditNote = useCallback(async (id: string, content: string) => await organizerService.editNote(id, content, data.notes), [data.notes]);
  const handleAddShiftNote = useCallback(async (sn: ShiftNote) => await organizerService.addShiftNote(sn, data.shiftNotes || []), [data.shiftNotes]);
  const handleDeleteShiftNote = useCallback(async (id: string) => await organizerService.deleteShiftNote(id, data.shiftNotes || []), [data.shiftNotes]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  if (authLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10" /></div>;
  if (!user) return <Suspense fallback={<LoadingFallback />}><Login onLogin={() => {}} /></Suspense>;

  return (
    <div className="h-screen w-full bg-slate-200 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 bg-slate-50 dark:bg-slate-950 border-r border-slate-300 dark:border-slate-800 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-64 lg:translate-x-0 lg:static lg:h-full lg:w-64 flex flex-col shadow-2xl lg:shadow-none`}>
        
        {/* LOGO AREA - REPLICA DO LOGIN */}
        <div className="flex flex-col items-center justify-center py-10 px-4 shrink-0 select-none">
            <div onClick={() => handleTabChange('dashboard')} className="flex flex-col items-center cursor-pointer group w-full">
                <div className="relative mb-4 transform transition-transform group-hover:scale-105 duration-300">
                    <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full"></div>
                    <Shield className="w-16 h-16 text-amber-400 relative z-10 fill-amber-400/20 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" strokeWidth={2} />
                </div>
                <h1 className="text-6xl font-black italic text-amber-400 tracking-tighter uppercase mb-6 leading-none drop-shadow-2xl font-sans">CCOS</h1>
                <div className="flex items-center gap-3 w-full justify-center">
                     <div className="bg-white px-2 py-1 rounded-[4px] flex-1 max-w-[95px] h-9 flex items-center justify-center shadow-lg border border-slate-100">
                        <span className="text-[8px] font-black text-red-700 leading-tight text-center tracking-tighter uppercase">UNILOG<br/>EXPRESS</span>
                     </div>
                     <div className="bg-white px-2 py-1 rounded-[4px] flex-1 max-w-[95px] h-9 flex items-center justify-center shadow-lg border border-slate-100">
                        <span className="text-[8px] font-black text-cyan-600 leading-tight text-center tracking-tighter uppercase">4ELOS<br/>DISTRIB.</span>
                     </div>
                </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
        </div>
        
        {/* NAVEGAÇÃO */}
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto custom-scrollbar border-t border-slate-800/50 mt-4">
          <button onClick={() => handleTabChange('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
            <LayoutDashboard size={20} /> <span className="text-sm font-bold uppercase tracking-wider">Dashboard</span>
          </button>
          <button onClick={() => handleTabChange('monitoring')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'monitoring' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                <Shield size={20} /> <span className="text-sm font-bold uppercase tracking-wider">Monitoramento</span> 
          </button>
          <button onClick={() => handleTabChange('third-party-mgmt')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'third-party-mgmt' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
            <Users size={20} /> <span className="text-sm font-bold uppercase tracking-wider">Gestão Fluxo</span>
          </button>
          {!isManager && (
              <>
                <button onClick={() => handleTabChange('work-mgmt')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'work-mgmt' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                    <ClipboardList size={20} /> <span className="text-sm font-bold uppercase tracking-wider">Operacional</span>
                </button>
                <button onClick={() => handleTabChange('registration')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'registration' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                    <PlusSquare size={20} /> <span className="text-sm font-bold uppercase tracking-wider">Cadastro</span>
                </button>
              </>
          )}
          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-slate-800/50 shrink-0">
                <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">Administração</p>
                <button onClick={() => handleTabChange('data')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'data' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-900 hover:text-white'}`}>
                  <FileSpreadsheet size={20} /> <span className="text-sm font-bold uppercase tracking-wider">Fonte Dados</span>
                </button>
                <button onClick={() => handleTabChange('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-900 hover:text-white'}`}>
                  <Users size={20} /> <span className="text-sm font-bold uppercase tracking-wider">Usuários</span>
                </button>
            </div>
          )}
        </nav>
        
        {/* PERFIL DO USUÁRIO */}
        <div className="mt-auto p-4 border-t border-slate-800/50 bg-slate-950/50">
           <div className="flex items-center gap-3 mb-2">
              <div className="relative group cursor-pointer" onClick={() => setShowProfileModal(true)}>
                <img 
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.name}&background=f59e0b&color=fff`} 
                    alt="Avatar" 
                    className="w-11 h-11 rounded-full border-2 border-slate-800 object-cover group-hover:border-blue-500 transition-colors"
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950"></div>
              </div>
              <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white uppercase truncate tracking-tight">{user.name}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase leading-tight truncate">{user.jobTitle || 'OPERADOR DE MONITORAMENTO'}</p>
              </div>
              <button onClick={() => setShowProfileModal(true)} className="p-2 text-slate-600 hover:text-white transition-colors" title="Editar Perfil">
                  <Settings size={18} />
              </button>
           </div>
           <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/5 transition-all text-[10px] font-black uppercase tracking-widest">
               <LogOut size={14} /> <span>Sair do Sistema</span>
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-200 dark:bg-[#0d1117] w-full relative">
        <header className="h-16 bg-slate-50/80 dark:bg-[#0d1117]/80 backdrop-blur-md border-b border-slate-300 dark:border-slate-800/50 flex items-center justify-between px-6 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"><Menu size={24} /></button>
            <div className="hidden sm:flex px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Operação CCOS Ativa
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="hidden md:block text-[10px] font-bold text-slate-500 uppercase tracking-tight mr-4">
                Sincronizado: {data.lastSync}
             </div>
             <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-white transition-colors">{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button>
             <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-slate-400 hover:text-white focus:outline-none transition-colors"><Bell size={20} />{unreadCount > 0 && <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">{unreadCount}</span>}</button>
                {showNotifications && (
                    <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                        <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/50"><span className="text-xs font-bold uppercase text-slate-400">Notificações</span><button onClick={markAllRead} className="text-[10px] text-blue-400 font-bold hover:text-white transition-colors">Limpar Tudo</button></div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">{notifications.length === 0 ? <div className="p-8 text-center text-slate-600 text-[10px] uppercase font-bold tracking-widest">Sem novas notificações</div> : notifications.map(n => (<div key={n.id} className={`p-3 border-b border-slate-800 flex gap-2 ${!n.read ? 'bg-blue-600/5' : ''}`}><div className="flex-1"><p className="text-xs text-white leading-relaxed">{n.message}</p><span className="text-[9px] text-slate-600 font-bold uppercase mt-1 block">{new Date(n.timestamp).toLocaleTimeString()}</span></div></div>))}</div>
                    </div>
                )}
             </div>
             <button onClick={() => setShowTour(true)} className="p-2 text-slate-400 hover:text-white transition-colors" title="Manual do Sistema"><HelpCircle size={20} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 scroll-smooth custom-scrollbar" ref={mainContentRef} onScroll={handleScroll}>
          <div className="max-w-[1600px] mx-auto space-y-8">
            <Suspense fallback={<LoadingFallback />}>
                {activeTab === 'dashboard' && <Dashboard data={data} thirdPartyWorkers={thirdPartyWorkers} onSetWarehouseStatus={handleSetWarehouseStatus} currentUser={user} />}
                
                {activeTab === 'monitoring' && (
                  <div className="space-y-8 animate-fade-in">
                    <div className="bg-slate-900/50 p-1 rounded-2xl border border-slate-800/50 shadow-sm overflow-hidden">
                        <div className="flex bg-[#0a0c10] border border-slate-800 p-1.5 rounded-xl shadow-inner w-full overflow-x-auto no-scrollbar scroll-smooth gap-2">
                            <button onClick={() => setMonitoringSubTab('cameras')} className={`flex-1 min-w-[110px] px-3 py-3 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${monitoringSubTab === 'cameras' ? 'bg-[#2563eb] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
                                    <Video size={14} /> CÂMERAS
                                </div>
                                <span className="text-[10px] font-bold opacity-80">({data.cameras.filter(c => c.channelType === 'video').length})</span>
                            </button>
                            <button onClick={() => setMonitoringSubTab('alarms')} className={`flex-1 min-w-[110px] px-3 py-3 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${monitoringSubTab === 'alarms' ? 'bg-[#ea580c] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
                                    <BellRing size={14} /> ALARMES
                                </div>
                                <span className="text-[10px] font-bold opacity-80">({data.cameras.filter(c => c.channelType === 'alarm').length})</span>
                            </button>
                            <button onClick={() => setMonitoringSubTab('access')} className={`flex-1 min-w-[110px] px-3 py-3 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${monitoringSubTab === 'access' ? 'bg-[#2563eb] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
                                    <DoorClosed size={14} /> ACESSO
                                </div>
                                <span className="text-[10px] font-bold opacity-80">({data.accessPoints.length})</span>
                            </button>
                        </div>
                    </div>

                    <div className="transition-all duration-300">
                      {monitoringSubTab === 'cameras' && <CameraList cameras={data.cameras.filter(c => c.channelType === 'video')} onToggleStatus={handleToggleCameraStatus} onSetWarehouseStatus={handleSetWarehouseStatus} readOnly={!isAdmin} allowedWarehouses={isManager ? user.allowedWarehouses : undefined} />}
                      {monitoringSubTab === 'alarms' && <CameraList cameras={data.cameras.filter(c => c.channelType === 'alarm')} onToggleStatus={handleToggleCameraStatus} onSetWarehouseStatus={handleSetWarehouseStatus} readOnly={!isAdmin} allowedWarehouses={isManager ? user.allowedWarehouses : undefined} />}
                      {monitoringSubTab === 'access' && <AccessControlList accessPoints={data.accessPoints} onToggleStatus={handleToggleAccessStatus} readOnly={!isAdmin} allowedWarehouses={isManager ? user.allowedWarehouses : undefined} />}
                    </div>
                  </div>
                )}

                {activeTab === 'third-party-mgmt' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="bg-slate-900/50 p-1 rounded-2xl border border-slate-800/50 shadow-sm overflow-hidden">
                        <div className="flex bg-[#0a0c10] border border-slate-800 p-1.5 rounded-xl shadow-inner w-full overflow-x-auto no-scrollbar scroll-smooth gap-2">
                            <button onClick={() => setThirdPartySubTab('status')} className={`flex-1 min-w-[110px] px-3 py-3 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${thirdPartySubTab === 'status' ? 'bg-[#2563eb] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">STATUS</div>
                            </button>
                            {(isAdmin || isManager) && (
                                <>
                                    <button onClick={() => setThirdPartySubTab('access-mgmt')} className={`flex-1 min-w-[110px] px-3 py-3 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${thirdPartySubTab === 'access-mgmt' ? 'bg-[#2563eb] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-center">RELATÓRIOS</div>
                                    </button>
                                    <button onClick={() => setThirdPartySubTab('heatmap')} className={`flex-1 min-w-[110px] px-3 py-3 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${thirdPartySubTab === 'heatmap' ? 'bg-[#2563eb] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-center">MAPA CALOR</div>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    {thirdPartySubTab === 'status' && <ThirdPartyStatus workers={thirdPartyWorkers} currentUser={user} />}
                    {thirdPartySubTab === 'access-mgmt' && <AccessManagement accessPoints={data.accessPoints} thirdPartyWorkers={thirdPartyWorkers} currentUser={user} />}
                    {thirdPartySubTab === 'heatmap' && <Heatmap thirdPartyWorkers={thirdPartyWorkers} currentUser={user} />}
                  </div>
                )}

                {activeTab === 'work-mgmt' && !isManager && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="bg-slate-900/50 p-1 rounded-2xl border border-slate-800/50 shadow-sm overflow-hidden">
                        <div className="flex bg-[#0a0c10] border border-slate-800 p-1.5 rounded-xl shadow-inner w-full overflow-x-auto no-scrollbar scroll-smooth gap-2">
                            <button onClick={() => setWorkSubTab('tasks')} className={`flex-1 min-w-[110px] px-3 py-3 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${workSubTab === 'tasks' ? 'bg-[#2563eb] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-center">{isAdmin ? 'TAREFAS ADM' : 'MINHAS TAREFAS'}</div>
                            </button>
                            <button onClick={() => setWorkSubTab('pendencies')} className={`flex-1 min-w-[110px] px-3 py-3 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${workSubTab === 'pendencies' ? 'bg-[#2563eb] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-center">E-MAILS</div>
                            </button>
                            <button onClick={() => setWorkSubTab('notes')} className={`flex-1 min-w-[110px] px-3 py-3 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${workSubTab === 'notes' ? 'bg-[#2563eb] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-center">AGENDA</div>
                            </button>
                        </div>
                    </div>
                    {workSubTab === 'tasks' && (isAdmin ? <TaskManagement currentUser={user} /> : <MyTasks currentUser={user} />)}
                    {workSubTab === 'pendencies' && <EmailPendencies currentUser={user} />}
                    {workSubTab === 'notes' && <Organizer currentUser={user} notes={data.notes} shiftNotes={data.shiftNotes || []} onAddNote={handleAddNote} onToggleNote={handleToggleNote} onDeleteNote={handleDeleteNote} onEditNote={handleEditNote} onAddShiftNote={handleAddShiftNote} onDeleteShiftNote={handleDeleteShiftNote} />}
                  </div>
                )}

                {activeTab === 'registration' && !isManager && <Registration onAddCamera={handleAddCamera} onAddAccess={handleAddAccess} onAddDocument={handleAddDocument} onDeleteDocument={handleDeleteDocument} documents={data.documents} userRole={user.role} />}
                {activeTab === 'data' && isAdmin && <Importer onImport={handleImportData} onImportThirdParty={handleSaveThirdPartyImport} onDeleteImport={handleDeleteThirdPartyImport} thirdPartyImports={data.thirdPartyImports} onReset={monitoringService.fullReset} />}
                {activeTab === 'users' && isAdmin && <UserManagement currentUser={user} />}
            </Suspense>
          </div>
          {showScrollTop && (<button onClick={scrollToTop} className="fixed bottom-8 right-8 z-50 p-4 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-full shadow-2xl transition-all active:scale-90 animate-bounce"><ChevronUp size={24} strokeWidth={3} /></button>)}
        </div>
      </main>

      {/* Profile Modal */}
      {showProfileModal && user && (
          <ProfileModal user={user} onClose={() => setShowProfileModal(false)} />
      )}

      {showTour && <OnboardingTour role={user.role} onFinish={() => { setShowTour(false); localStorage.setItem(`ccos_tour_seen_${user.uid}`, 'true'); }} />}
    </div>
  );
};
export default App;
