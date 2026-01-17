
import React, { useState, useEffect, useCallback, Suspense, lazy, useRef, useMemo } from 'react';
import { LayoutDashboard, Menu, Bell, X, FileSpreadsheet, CheckCircle2, Shield, Loader2, LogOut, Users, PlusSquare, ClipboardList, ChevronUp, MessageSquareHeart, AlertTriangle, Megaphone, Info, Sun, Moon, HelpCircle, Mail, Calendar, Clock, RefreshCw, BookOpen } from 'lucide-react';
import { Camera, AccessPoint, User, ProcessedWorker, AppNotification, ThirdPartyImport, Note, ShiftNote } from './types';
import { authService } from './services/auth';
import { monitoringService } from './services/monitoring';
import { organizerService } from './services/organizer';
import { ref, onValue, update, query, orderByChild } from 'firebase/database';
import { db } from './services/firebase';
import { useTheme } from './hooks/useTheme';
import { useAppData } from './hooks/useAppData';
import { useNotificationSounds } from './hooks/useNotificationSounds';
import ProfileModal from './components/ProfileModal';
import FeedbackModal from './components/FeedbackModal';

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

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full w-full">
    <Loader2 className="animate-spin text-amber-500 w-10 h-10" />
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'monitoring' | 'third-party-mgmt' | 'work-mgmt' | 'manual' | 'organizer' | 'data' | 'users' | 'registration'>(
    (localStorage.getItem('cv_active_tab') as any) || 'dashboard'
  );
  const [monitoringSubTab, setMonitoringSubTab] = useState<'cameras' | 'alarms' | 'access'>(
    (localStorage.getItem('cv_mon_tab') as any) || 'cameras'
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const mainContentRef = useRef<HTMLDivElement>(null);
  const { data, thirdPartyWorkers } = useAppData(user);
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleTabChange = useCallback((tab: any) => {
    setActiveTab(tab);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, []);

  if (authLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-amber-500 w-12 h-12" /></div>;
  if (!user) return <Suspense fallback={<LoadingFallback />}><Login onLogin={() => {}} /></Suspense>;

  const NavItem = ({ id, icon: Icon, label }: any) => (
    <button 
      onClick={() => handleTabChange(id)} 
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${activeTab === id ? 'bg-amber-500 text-slate-950 font-black shadow-xl shadow-amber-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
    >
      <Icon size={22} className={activeTab === id ? 'text-slate-950' : 'group-hover:scale-110 transition-transform'} />
      <span className="text-[11px] uppercase tracking-[0.2em]">{label}</span>
    </button>
  );

  return (
    <div className="h-screen w-full flex overflow-hidden font-sans">
      {/* Expansive Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 glass-panel border-r-0 transition-transform duration-500 lg:translate-x-0 lg:static flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-10 pb-6 flex flex-col items-center">
            <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center border border-amber-500/20 mb-6 animate-float">
                <Shield className="text-amber-500" size={40} />
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">ControlVision</h1>
            <span className="text-[9px] font-black text-amber-500/50 uppercase tracking-[0.4em] mt-1">Enterprise Core</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-6 py-8 space-y-2 custom-scrollbar">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Visão Geral" />
          <NavItem id="monitoring" icon={Shield} label="Monitoramento" />
          <NavItem id="third-party-mgmt" icon={Users} label="Fluxo de Acesso" />
          {user?.role !== 'manager' && (
            <>
              <NavItem id="work-mgmt" icon={ClipboardList} label="Operacional" />
              <NavItem id="registration" icon={PlusSquare} label="Cadastros" />
            </>
          )}
          <NavItem id="manual" icon={BookOpen} label="Manual" />
        </nav>

        <div className="p-8 bg-black/10 mt-auto">
            <div className="flex items-center gap-4 cursor-pointer hover:bg-white/5 p-4 rounded-2xl transition-all">
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.name}&background=f59e0b&color=fff`} className="w-12 h-12 rounded-xl border border-white/10" alt="Profile" />
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white truncate uppercase">{user.name}</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{user.jobTitle || 'Operator'}</p>
                </div>
            </div>
            <button onClick={() => authService.logout()} className="w-full mt-6 flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-rose-500 text-[10px] font-black uppercase tracking-widest transition-colors">
                <LogOut size={14} /> Sair
            </button>
        </div>
      </aside>

      {/* Edge-to-Edge Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-transparent">
        <header className="h-24 flex items-center justify-between px-12 border-b border-white/5 backdrop-blur-md z-30">
          <div className="flex items-center gap-8">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-400"><Menu size={28} /></button>
            <div className="flex flex-col">
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">{activeTab.replace(/-/g, ' ')}</h2>
                <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] text-white font-black uppercase tracking-widest">Servidor Online</span>
                </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="bg-white/5 px-8 py-3 rounded-2xl border border-white/5 flex items-center gap-4">
                <Clock size={18} className="text-blue-500" />
                <span className="text-sm font-black text-white font-mono tracking-widest">{currentTime.toLocaleTimeString('pt-BR')}</span>
            </div>
            <button className="p-4 bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 rounded-2xl transition-all border border-amber-500/10"><Bell size={20}/></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 lg:p-14 custom-scrollbar scroll-smooth" ref={mainContentRef}>
          <div className="w-full max-w-[1920px] mx-auto animate-fade-in pb-32">
            <Suspense fallback={<LoadingFallback />}>
                {activeTab === 'dashboard' && <Dashboard data={data} thirdPartyWorkers={thirdPartyWorkers} currentUser={user} />}
                {activeTab === 'monitoring' && (
                    <div className="space-y-12">
                        <div className="flex gap-4 p-2 bg-black/40 rounded-3xl border border-white/5 w-fit">
                            {['cameras', 'alarms', 'access'].map(sub => (
                                <button 
                                    key={sub}
                                    onClick={() => setMonitoringSubTab(sub as any)}
                                    className={`px-12 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${monitoringSubTab === sub ? 'bg-amber-500 text-slate-950 shadow-2xl' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {sub}
                                </button>
                            ))}
                        </div>
                        {monitoringSubTab === 'cameras' && <CameraList cameras={data.cameras.filter(c => c.channelType === 'video')} onToggleStatus={() => {}} readOnly={user.role !== 'admin'} />}
                        {monitoringSubTab === 'alarms' && <CameraList cameras={data.cameras.filter(c => c.channelType === 'alarm')} onToggleStatus={() => {}} readOnly={user.role !== 'admin'} />}
                        {monitoringSubTab === 'access' && <AccessControlList accessPoints={data.accessPoints} onToggleStatus={() => {}} readOnly={user.role !== 'admin'} />}
                    </div>
                )}
                {activeTab === 'third-party-mgmt' && <ThirdPartyStatus workers={thirdPartyWorkers} currentUser={user} />}
                {activeTab === 'work-mgmt' && <TaskManagement currentUser={user} />}
                {activeTab === 'registration' && <Registration onAddCamera={() => {}} onAddAccess={() => {}} onAddDocument={() => {}} onDeleteDocument={() => {}} documents={data.documents} userRole={user.role} />}
                {activeTab === 'manual' && <Manual />}
                {activeTab === 'data' && <Importer onImport={() => {}} onImportThirdParty={() => {}} onDeleteImport={() => {}} onResetCameras={() => {}} onResetAccess={() => {}} onResetThirdParty={() => {}} />}
                {activeTab === 'users' && <UserManagement currentUser={user} />}
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
};
export default App;
