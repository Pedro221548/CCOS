
import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import { LayoutDashboard, Video, DoorClosed, Menu, Bell, X, Power, FileSpreadsheet, Trash2, Check, AlertCircle, CheckCircle2, Shield, Eye, Loader2, LogOut, Users, PlusSquare, Calendar, Settings, Camera as CameraIcon, Save, Briefcase, Mail, User as UserIcon, Image as ImageIcon, Sun, Moon, ClipboardList, CheckSquare, Ban, HelpCircle, Lock, Activity, Grid, Volume2, ChevronUp, BellRing } from 'lucide-react';
import { Camera, AccessPoint, User, PublicDocument, Note, ProcessedWorker, AppNotification, Status, ThirdPartyImport, ShiftNote, Alarm } from './types';
import { authService } from './services/auth';
import { monitoringService } from './services/monitoring';
import { organizerService } from './services/organizer';
import { ref, onValue, update, query, orderByChild } from 'firebase/database';
import { db } from './services/firebase';

// Hooks
import { useTheme } from './hooks/useTheme';
import { useAppData } from './hooks/useAppData';
import { useNotificationSounds } from './hooks/useNotificationSounds';

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
  const [monitoringSubTab, setMonitoringSubTab] = useState<'cameras' | 'access' | 'alarms'>('cameras');
  // ... resto dos estados existentes ...
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editProfile, setEditProfile] = useState({ name: '', jobTitle: '', bio: '', photoURL: '', bannerURL: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // --- HOOKS ---
  const { theme, toggleTheme } = useTheme();
  const { data, thirdPartyWorkers, isLoading: dataLoading } = useAppData(user);
  useNotificationSounds(user);

  // ... (Efeitos de Auth e Notificação simplificados para brevidade) ...
  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- HANDLERS ---
  const handleImportData = useCallback(async (cameras: Camera[], accessPoints: AccessPoint[], alarms: Alarm[]) => {
      try {
          await monitoringService.importData(cameras, accessPoints, alarms);
          alert("Monitoramento atualizado! Câmeras, Alarmes e Acessos sincronizados.");
      } catch { alert("Erro na importação."); }
  }, []);

  // ... CRUD Handlers simplificados ...
  const handleToggleCameraStatus = useCallback(async (uuid: string) => {
      if (user?.role !== 'admin') return;
      await monitoringService.toggleCameraStatus(uuid, data.cameras);
  }, [user, data.cameras]);

  const handleSetWarehouseStatus = useCallback(async (warehouse: string, status: Status) => {
      if (user?.role !== 'admin') return;
      await monitoringService.setWarehouseStatus(warehouse, status, data.cameras);
  }, [user, data.cameras]);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  if (authLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10" /></div>;
  if (!user) return <Suspense fallback={<LoadingFallback />}><Login onLogin={() => {}} /></Suspense>;

  return (
    <div className="h-screen w-full bg-slate-200 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex font-sans overflow-hidden">
      {/* Sidebar ... */}
      <aside className={`fixed inset-y-0 left-0 z-40 bg-slate-50 dark:bg-slate-900 border-r border-slate-300 dark:border-slate-800 transition-transform duration-300 lg:translate-x-0 lg:static lg:h-full lg:w-64 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Menu Items ... */}
          <nav className="p-4 space-y-1.5 flex-1">
              <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                <LayoutDashboard size={20}/> Dashboard
              </button>
              <button onClick={() => setActiveTab('monitoring')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'monitoring' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                <Shield size={20}/> Câmeras/Acessos
              </button>
              <button onClick={() => setActiveTab('third-party-mgmt')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'third-party-mgmt' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                <Users size={20}/> Gestão de Acessos
              </button>
              {isAdmin && (
                  <button onClick={() => setActiveTab('data')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mt-10 ${activeTab === 'data' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>
                    <FileSpreadsheet size={20}/> Fonte de Dados
                  </button>
              )}
          </nav>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-200 dark:bg-slate-900">
        <header className="h-16 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-300 dark:border-slate-800 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                {/* SELO BETA */}
                <div className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[9px] font-black text-amber-500 uppercase tracking-tighter animate-pulse">BETA</div>
                <span className="text-xs text-slate-500">Atualizado: {data.lastSync}</span>
            </div>
            <button onClick={() => authService.logout()} className="text-slate-500 hover:text-rose-500 transition-colors"><LogOut size={20} /></button>
        </header>

        <div className="flex-1 overflow-auto p-6" ref={mainContentRef}>
          <div className="max-w-7xl mx-auto space-y-6">
            <Suspense fallback={<LoadingFallback />}>
                {activeTab === 'dashboard' && <Dashboard data={data} thirdPartyWorkers={thirdPartyWorkers} currentUser={user} onSetWarehouseStatus={handleSetWarehouseStatus} />}
                
                {activeTab === 'monitoring' && (
                  <div className="space-y-6 animate-fade-in">
                    <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">Monitoramento Centralizado</h2>
                    <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl w-fit">
                      <button onClick={() => setMonitoringSubTab('cameras')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${monitoringSubTab === 'cameras' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Câmeras ({data.cameras.length})</button>
                      <button onClick={() => setMonitoringSubTab('alarms')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${monitoringSubTab === 'alarms' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}>Alarmes ({data.alarms.length})</button>
                      <button onClick={() => setMonitoringSubTab('access')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${monitoringSubTab === 'access' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Acessos ({data.accessPoints.length})</button>
                    </div>

                    <div className="transition-all">
                      {monitoringSubTab === 'cameras' && <CameraList cameras={data.cameras} onToggleStatus={handleToggleCameraStatus} readOnly={!isAdmin} allowedWarehouses={isManager ? user.allowedWarehouses : undefined} />}
                      {monitoringSubTab === 'access' && <AccessControlList accessPoints={data.accessPoints} onToggleStatus={() => {}} readOnly={!isAdmin} allowedWarehouses={isManager ? user.allowedWarehouses : undefined} />}
                      {monitoringSubTab === 'alarms' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {data.alarms.length === 0 ? <p className="text-slate-500 italic col-span-full">Nenhum alarme configurado.</p> : data.alarms.map(alarm => (
                                  <div key={alarm.uuid} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-center group">
                                      <div>
                                          <p className="text-[10px] font-bold text-amber-500 uppercase">{alarm.type}</p>
                                          <h3 className="font-bold text-white text-sm">{alarm.name}</h3>
                                          <p className="text-xs text-slate-500">{alarm.location}</p>
                                      </div>
                                      <div className={`px-2 py-1 rounded text-[10px] font-bold border ${alarm.status === 'ONLINE' ? 'text-emerald-500 border-emerald-500/20' : 'text-rose-500 border-rose-500/20'}`}>{alarm.status}</div>
                                  </div>
                              ))}
                          </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'data' && isAdmin && <Importer onImport={handleImportData} onImportThirdParty={() => {}} onDeleteImport={() => {}} thirdPartyImports={data.thirdPartyImports} onReset={() => {}} />}
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
};
export default App;
