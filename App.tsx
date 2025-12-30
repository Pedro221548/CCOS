
import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import { LayoutDashboard, Video, DoorClosed, Menu, Bell, X, Power, FileSpreadsheet, Trash2, Check, AlertCircle, CheckCircle2, Shield, Loader2, LogOut, Users, PlusSquare, Calendar, Settings, Camera as CameraIcon, Save, Briefcase, Mail, User as UserIcon, Image as ImageIcon, Sun, Moon, ClipboardList, CheckSquare, Ban, HelpCircle, Lock, Activity, Grid, Volume2, ChevronUp } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cameras' | 'access' | 'organizer' | 'data' | 'users' | 'registration' | 'third-party' | 'pendencies' | 'task-management' | 'my-tasks' | 'access-management' | 'heatmap'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Refs
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Profile Modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editProfile, setEditProfile] = useState({ name: '', jobTitle: '', bio: '', photoURL: '', bannerURL: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  
  // Password Change
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // --- HOOKS ---
  const { theme, toggleTheme } = useTheme();
  const { data, thirdPartyWorkers, isLoading: dataLoading } = useAppData(user);
  
  // Activate Notification Sounds
  useNotificationSounds(user);
  
  // --- HELPERS ---
  const addLocalAlert = useCallback((message: string, type: 'alert' | 'info' | 'success' | 'message' | 'system') => {
      console.log("Local Alert:", message, type);
  }, []);

  // --- EFFECTS ---

  // Scroll Listener for "Back to Top" button
  const handleScroll = () => {
    if (mainContentRef.current) {
      setShowScrollTop(mainContentRef.current.scrollTop > 400);
    }
  };

  const scrollToTop = () => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (currentUser) {
          setEditProfile({
              name: currentUser.name,
              jobTitle: currentUser.jobTitle || '',
              bio: currentUser.bio || '',
              photoURL: currentUser.photoURL || '',
              bannerURL: currentUser.bannerURL || ''
          });

          const tourKey = `controlvision_tour_seen_${currentUser.uid}`;
          if (!localStorage.getItem(tourKey)) setShowTour(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Notifications Listener
  useEffect(() => {
      if (!user) {
          setNotifications([]);
          return;
      }

      const notifRef = query(ref(db, `notifications/${user.uid}`), orderByChild('timestamp'));
      const unsubscribe = onValue(notifRef, (snapshot) => {
          if (snapshot.exists()) {
              const raw = snapshot.val();
              const list: AppNotification[] = Object.keys(raw).map(key => ({
                  id: key,
                  ...raw[key]
              }));
              setNotifications(list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
          } else {
              setNotifications([]);
          }
      });

      return () => unsubscribe();
  }, [user]);

  // Route Guard
  useEffect(() => {
      if (!authLoading && user) {
          const isAdmin = user.role === 'admin';
          const isManager = user.role === 'manager';

          // Admin Routes Guard
          if (!isAdmin && ['data', 'users', 'task-management'].includes(activeTab)) {
              setActiveTab('dashboard');
              alert("Acesso negado: Área restrita.");
          }
          
          // Manager Routes Guard
          if (isManager && !['dashboard', 'access-management', 'heatmap', 'third-party', 'cameras', 'access'].includes(activeTab)) {
              setActiveTab('dashboard');
          }
      }
  }, [activeTab, user, authLoading]);

  // Responsive Sidebar
  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // --- HANDLERS ---

  const handleTabChange = useCallback((tab: typeof activeTab) => {
    const isAdmin = user?.role === 'admin';
    const isManager = user?.role === 'manager';

    // Admin Guard
    if (['data', 'users', 'task-management'].includes(tab) && !isAdmin) {
        alert("Acesso negado.");
        return;
    }

    // Manager Guard
    if (isManager && !['dashboard', 'access-management', 'heatmap', 'third-party', 'cameras', 'access'].includes(tab)) {
        alert("Acesso não permitido para o perfil de Gestor.");
        return;
    }

    setActiveTab(tab);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, [user]);

  const handleLogout = useCallback(() => {
    authService.logout();
    setActiveTab('dashboard');
  }, []);

  // Notification Helpers
  const markAllRead = async () => {
      if (!user) return;
      const updates: any = {};
      notifications.forEach(n => {
          if (!n.read) updates[`notifications/${user.uid}/${n.id}/read`] = true;
      });
      if (Object.keys(updates).length > 0) {
          await update(ref(db), updates);
      }
  };

  const removeNotification = async (id: string) => {
      if (!user) return;
      await update(ref(db, `notifications/${user.uid}`), { [id]: null });
  };

  // Profile & Password Handlers
  const handleSaveProfile = async () => {
      if (!user) return;
      setProfileSaving(true);
      try {
          await authService.updateUserProfile(user.uid, editProfile);
          alert('Perfil atualizado com sucesso!');
          setShowProfileModal(false);
      } catch (err) {
          alert('Erro ao atualizar perfil.');
      } finally {
          setProfileSaving(false);
      }
  };

  const handleChangePassword = async () => {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
          alert("As senhas não coincidem.");
          return;
      }
      if (passwordForm.newPassword.length < 6) {
          alert("A senha deve ter pelo menos 6 caracteres.");
          return;
      }
      setPasswordLoading(true);
      try {
          await authService.updateUserPassword(passwordForm.newPassword);
          alert("Senha alterada com sucesso!");
          setPasswordForm({ newPassword: '', confirmPassword: '' });
          setShowPasswordChange(false);
      } catch (err: any) {
          console.error(err);
          if (err.code === 'auth/requires-recent-login') {
              alert("Por segurança, faça login novamente antes de alterar sua senha.");
              authService.logout();
          } else {
              alert("Erro ao alterar senha: " + err.message);
          }
      } finally {
          setPasswordLoading(false);
      }
  };

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'photoURL' | 'bannerURL') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
          if (evt.target?.result) setEditProfile(prev => ({ ...prev, [field]: evt.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Monitoramento CRUD
  const handleImportData = useCallback(async (cameras: Camera[], accessPoints: AccessPoint[]) => {
      try {
          await monitoringService.importData(cameras, accessPoints);
          alert("Dados importados com sucesso.");
      } catch {
          alert("Erro ao importar dados.");
      }
  }, []);

  const handleSaveThirdPartyImport = useCallback(async (workers: ProcessedWorker[], fileName: string) => {
      try {
          await monitoringService.addThirdPartyImport(workers, fileName);
          alert("Planilha de terceiros importada para o histórico.");
      } catch {
          alert("Erro ao salvar importação.");
      }
  }, []);

  const handleDeleteThirdPartyImport = useCallback(async (id: string) => {
      if (window.confirm("Deseja realmente excluir este lote de importação?")) {
          try {
              await monitoringService.deleteThirdPartyImport(id);
          } catch {
              alert("Erro ao excluir lote.");
          }
      }
  }, []);

  const handleAddCamera = useCallback(async (cam: Camera) => await monitoringService.addCamera(cam, data.cameras), [data.cameras]);
  const handleEditCamera = useCallback(async (cam: Camera) => await monitoringService.updateCamera(cam, data.cameras), [data.cameras]);
  const handleDeleteCamera = useCallback(async (uuid: string) => await monitoringService.deleteCamera(uuid, data.cameras), [data.cameras]);
  const handleAddAccess = useCallback(async (ap: AccessPoint) => await monitoringService.addAccessPoint(ap, data.accessPoints), [data.accessPoints]);
  const handleEditAccess = useCallback(async (ap: AccessPoint) => await monitoringService.updateAccessPoint(ap, data.accessPoints), [data.accessPoints]);
  const handleDeleteAccess = useCallback(async (uuid: string) => await monitoringService.deleteAccessPoint(uuid, data.accessPoints), [data.accessPoints]);
  const handleAddDocument = useCallback(async (doc: PublicDocument) => await monitoringService.addDocument(doc, data.documents), [data.documents]);
  const handleDeleteDocument = useCallback(async (uuid: string) => await monitoringService.deleteDocument(uuid, data.documents), [data.documents]);

  const handleToggleCameraStatus = useCallback(async (uuid: string) => {
      if (user?.role !== 'admin') return;
      const res = await monitoringService.toggleCameraStatus(uuid, data.cameras);
      if (res) addLocalAlert(`Câmera ${res.name} mudou para ${res.newStatus}`, res.newStatus === 'OFFLINE' ? 'alert' : 'info');
  }, [user, data.cameras, addLocalAlert]);

  const handleSetWarehouseStatus = useCallback(async (warehouse: string, status: Status) => {
      if (user?.role !== 'admin') return;
      await monitoringService.setWarehouseStatus(warehouse, status, data.cameras);
      addLocalAlert(`Todas as câmeras de ${warehouse} foram definidas como ${status}.`, status === 'OFFLINE' ? 'alert' : 'success');
  }, [user, data.cameras, addLocalAlert]);

  const handleToggleAccessStatus = useCallback(async (uuid: string) => {
      if (user?.role !== 'admin') return;
      const res = await monitoringService.toggleAccessStatus(uuid, data.accessPoints);
      if (res) addLocalAlert(`Acesso ${res.name} mudou para ${res.newStatus}`, res.newStatus === 'OFFLINE' ? 'alert' : 'info');
  }, [user, data.accessPoints, addLocalAlert]);

  // Organizer CRUD
  const handleAddNote = useCallback(async (note: Note) => await organizerService.addNote(note, data.notes), [data.notes]);
  const handleToggleNote = useCallback(async (id: string) => await organizerService.toggleNote(id, data.notes), [data.notes]);
  const handleEditNote = useCallback(async (id: string, content: string) => await organizerService.editNote(id, content, data.notes), [data.notes]);
  const handleDeleteNote = useCallback(async (id: string) => await organizerService.deleteNote(id, data.notes), [data.notes]);
  
  const handleAddShiftNote = useCallback(async (sn: ShiftNote) => await organizerService.addShiftNote(sn, data.shiftNotes || []), [data.shiftNotes]);
  const handleDeleteShiftNote = useCallback(async (id: string) => await organizerService.deleteShiftNote(id, data.shiftNotes || []), [data.shiftNotes]);

  const handleFullReset = useCallback(async () => {
    await monitoringService.fullReset();
    setActiveTab('dashboard');
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  // --- RENDERS ---

  if (authLoading) return <div className="min-h-screen bg-slate-200 dark:bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10" /></div>;
  
  if (!user) return (
    <Suspense fallback={<LoadingFallback />}>
      <Login onLogin={() => {}} />
    </Suspense>
  );

  if (user.status === 'blocked') {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-center max-w-md shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                  <Ban size={48} className="mx-auto text-rose-500 mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">Acesso Suspenso</h2>
                  <p className="text-slate-400 mb-6 text-sm leading-relaxed">Conta bloqueada. Contate o administrador.</p>
                  <button onClick={handleLogout} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors w-full flex items-center justify-center gap-2">
                      <LogOut size={18} /> Voltar ao Login
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="h-screen w-full bg-slate-200 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex font-sans overflow-hidden transition-colors duration-300">
      
      <Suspense fallback={null}>
        {showTour && <OnboardingTour role={user.role} onFinish={() => { localStorage.setItem(`controlvision_tour_seen_${user.uid}`, 'true'); setShowTour(false); }} />}
      </Suspense>

      <aside className={`fixed inset-y-0 left-0 z-40 bg-slate-50 dark:bg-slate-900 border-r border-slate-300 dark:border-slate-800 transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-[280px] sm:w-64 lg:translate-x-0 lg:static lg:h-full lg:w-64 flex flex-col shadow-2xl lg:shadow-none`}>
        <div className="flex flex-col items-center justify-center py-6 lg:py-8 px-4 border-b border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 relative shrink-0">
            <div onClick={() => handleTabChange('dashboard')} className="flex flex-col items-center group transform transition-transform hover:scale-105 duration-300 cursor-pointer">
                <Shield className="w-10 h-10 lg:w-12 lg:h-12 text-amber-500 dark:text-amber-400 mb-2 lg:mb-3 fill-amber-400/20 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
                <h1 className="text-4xl lg:text-5xl font-black text-amber-500 dark:text-amber-400 tracking-tighter leading-none drop-shadow-xl mb-4 font-sans uppercase">CCOS</h1>
                <div className="flex items-center gap-2">
                     <div className="bg-white border border-slate-200 dark:border-0 px-2 py-0.5 rounded-[3px] h-7 flex items-center justify-center shadow-md"><span className="text-[8px] font-extrabold text-red-700 leading-none text-center tracking-tighter">UNILOG<br/>EXPRESS</span></div>
                     <div className="bg-white border border-slate-200 dark:border-0 px-2 py-0.5 rounded-[3px] h-7 flex items-center justify-center shadow-md"><span className="text-[8px] font-extrabold text-cyan-600 leading-none text-center tracking-tighter">4ELOS<br/>DISTRIB.</span></div>
                </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-500 hover:text-slate-900 dark:hover:text-white absolute top-4 right-4 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"><X size={24} /></button>
        </div>
        
        <div className="px-4 py-3 bg-slate-100 dark:bg-slate-950/50 border-b border-slate-300 dark:border-slate-800 flex items-center gap-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800/80 transition-colors group relative shrink-0" onClick={() => setShowProfileModal(true)}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                {user.photoURL ? <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" /> : <span className={`text-xs font-bold ${isAdmin ? 'text-amber-500' : 'text-blue-500'}`}>{user.name.charAt(0)}</span>}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{user.name}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user.jobTitle || (isAdmin ? 'Administrador' : isManager ? 'Gestor' : 'Operador')}</p>
            </div>
            <Settings size={14} className="text-slate-400 dark:text-slate-600 group-hover:text-slate-700 dark:group-hover:text-white transition-colors opacity-100 absolute right-2" />
        </div>

        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
          <button onClick={() => handleTabChange('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
            <LayoutDashboard size={20} className="shrink-0" /> <span className="text-sm font-medium">Dashboard</span>
          </button>
          
          {(isAdmin || isManager) && (
              <>
                <button onClick={() => handleTabChange('access-management')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${activeTab === 'access-management' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
                    <Activity size={20} className="shrink-0" /> <span className="text-sm font-medium">Gestão de Acessos</span>
                </button>
                <button onClick={() => handleTabChange('heatmap')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${activeTab === 'heatmap' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
                    <Grid size={20} className="shrink-0" /> <span className="text-sm font-medium">Mapa de Calor</span>
                </button>
              </>
          )}
          
          <button onClick={() => handleTabChange('third-party')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${activeTab === 'third-party' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
            <Briefcase size={20} className="shrink-0" /> <span className="text-sm font-medium">Status Terceirizados</span>
          </button>

          <button onClick={() => handleTabChange('cameras')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${activeTab === 'cameras' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
                <Video size={20} className="shrink-0" /> <span className="text-sm font-medium">Câmeras</span> {data.cameras.length > 0 && isAdmin && <span className="ml-auto text-xs bg-slate-300 dark:bg-slate-800 px-2 py-0.5 rounded-full">{data.cameras.length}</span>}
          </button>
          <button onClick={() => handleTabChange('access')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${activeTab === 'access' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
                <DoorClosed size={20} className="shrink-0" /> <span className="text-sm font-medium">Acessos</span> {data.accessPoints.length > 0 && isAdmin && <span className="ml-auto text-xs bg-slate-300 dark:bg-slate-800 px-2 py-0.5 rounded-full">{data.accessPoints.length}</span>}
          </button>

          {!isManager && (
              <>
                {isAdmin ? (
                    <button onClick={() => handleTabChange('task-management')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${activeTab === 'task-management' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
                        <ClipboardList size={20} className="shrink-0" /> <span className="text-sm font-medium">Gestão de Tarefas</span>
                    </button>
                ) : (
                    <button onClick={() => handleTabChange('my-tasks')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${activeTab === 'my-tasks' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
                        <CheckSquare size={20} className="shrink-0" /> <span className="text-sm font-medium">Minhas Tarefas</span>
                    </button>
                )}

                <button onClick={() => handleTabChange('pendencies')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${activeTab === 'pendencies' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
                    <Mail size={20} className="shrink-0" /> <span className="text-sm font-medium">Pendências E-mail</span>
                </button>
                <button onClick={() => handleTabChange('organizer')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${activeTab === 'organizer' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
                    <Calendar size={20} className="shrink-0" /> <span className="text-sm font-medium">Agenda e Notas</span>
                </button>
                
                <button onClick={() => handleTabChange('registration')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${activeTab === 'registration' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
                    <PlusSquare size={20} className="shrink-0" /> <span className="text-sm font-medium">Central de Cadastro</span>
                </button>
              </>
          )}

          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-slate-300 dark:border-slate-800 shrink-0">
                <p className="px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Administração</p>
                <button onClick={() => handleTabChange('data')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${activeTab === 'data' ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
                  <FileSpreadsheet size={20} className="shrink-0" /> <span className="text-sm font-medium">Fonte de Dados</span>
                </button>
                <button onClick={() => handleTabChange('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
                  <Users size={20} className="shrink-0" /> <span className="text-sm font-medium">Gerenciar Usuários</span>
                </button>
            </div>
          )}
        </nav>
        
        <div className="p-4 border-t border-slate-300 dark:border-slate-800 space-y-2 shrink-0">
           <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all text-sm font-medium">
               <LogOut size={18} className="shrink-0" /> <span>Sair do Sistema</span>
           </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm transition-opacity duration-300" onClick={() => setSidebarOpen(false)} />}

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-200 dark:bg-slate-900 w-full relative">
        <header className="h-16 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-300 dark:border-slate-800 flex items-center justify-between px-3 lg:px-6 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-2 lg:gap-3">
             <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"><Menu size={24} /></button>
             <div onClick={() => handleTabChange('dashboard')} className="flex items-center gap-1.5 lg:hidden cursor-pointer">
                <Shield className="w-5 h-5 text-amber-500 dark:text-amber-400 fill-amber-400/20" />
                <span className="text-xl font-black text-amber-500 dark:text-amber-400 tracking-tighter uppercase">CCOS</span>
             </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-4 relative">
             <div className="hidden md:flex px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] lg:text-xs text-slate-500 dark:text-slate-400 items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Atualizado: {data.lastSync}
             </div>

             <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[9px] lg:text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                <Volume2 size={12} className="animate-pulse" /> Alertas On
             </div>

             <button onClick={() => setShowTour(true)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors" title="Manual do Sistema"><HelpCircle size={20} /></button>
             <button onClick={toggleTheme} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button>
             <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors focus:outline-none"><Bell size={20} />{unreadCount > 0 && <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white border border-white dark:border-slate-900">{unreadCount > 9 ? '9+' : unreadCount}</span>}</button>
                {showNotifications && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notificações</span>{unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"><Check size={12} /> Marcar lidas</button>}</div>
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">{notifications.length === 0 ? <div className="p-8 text-center text-slate-500 text-xs"><Bell size={24} className="mx-auto mb-2 opacity-30" /> Nenhuma notificação</div> : notifications.map((note) => (<div key={note.id} onClick={() => { if (!note.read) update(ref(db, `notifications/${user.uid}/${note.id}`), { read: true }); setShowNotifications(false); }} className={`p-3 border-b border-slate-200/50 dark:border-slate-800/50 last:border-0 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors flex gap-3 relative group cursor-pointer border-l-4 ${!note.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''} ${note.type === 'alert' ? 'border-l-rose-500' : note.type === 'success' ? 'border-l-emerald-500' : 'border-l-blue-500'}`}><div className="mt-1 shrink-0">{note.type === 'message' ? <AlertCircle size={16} className="text-blue-500" /> : note.type === 'alert' ? <AlertCircle size={16} className="text-rose-500" /> : note.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-blue-500" />}</div><div className="flex-1 min-w-0"><p className={`text-xs ${!note.read ? 'text-slate-800 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-400'}`}>{note.message}</p><span className="text-[10px] text-slate-400 dark:text-slate-600 mt-1 block">{new Date(note.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span></div><button onClick={(e) => { e.stopPropagation(); removeNotification(note.id); }} className="absolute right-2 top-2 p-1 text-slate-400 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 transition-all" title="Remover"><X size={12} /></button></div>))}</div>
                        </div>
                    </>
                )}
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6 scroll-smooth custom-scrollbar relative" ref={mainContentRef} onScroll={handleScroll}>
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-20 lg:pb-10">
            <Suspense fallback={<LoadingFallback />}>
                {activeTab === 'dashboard' && <Dashboard data={data} thirdPartyWorkers={thirdPartyWorkers} onSetWarehouseStatus={handleSetWarehouseStatus} currentUser={user} />}
                
                {/* Renders for Manager and Admin */}
                {activeTab === 'access-management' && <AccessManagement accessPoints={data.accessPoints} thirdPartyWorkers={thirdPartyWorkers} currentUser={user} />}
                {activeTab === 'heatmap' && <Heatmap thirdPartyWorkers={thirdPartyWorkers} currentUser={user} />}
                {activeTab === 'third-party' && <ThirdPartyStatus workers={thirdPartyWorkers} currentUser={user} />}

                {/* VISIBLE FOR ADMIN, OPERATOR AND MANAGER (Filtered for Manager) */}
                {activeTab === 'cameras' && <CameraList cameras={data.cameras} onToggleStatus={handleToggleCameraStatus} onSetWarehouseStatus={handleSetWarehouseStatus} onAdd={isAdmin ? handleAddCamera : undefined} onEdit={isAdmin ? handleEditCamera : undefined} onDelete={isAdmin ? handleDeleteCamera : undefined} readOnly={!isAdmin} allowedWarehouses={isManager ? user.allowedWarehouses : undefined} />}
                {activeTab === 'access' && <AccessControlList accessPoints={data.accessPoints} onToggleStatus={handleToggleAccessStatus} onAdd={isAdmin ? handleAddAccess : undefined} onEdit={isAdmin ? handleEditAccess : undefined} onDelete={isAdmin ? handleDeleteAccess : undefined} readOnly={!isAdmin} allowedWarehouses={isManager ? user.allowedWarehouses : undefined} />}

                {/* Restricted Renders (Not for Manager) */}
                {!isManager && (
                    <>
                        {activeTab === 'pendencies' && user && <EmailPendencies currentUser={user} />}
                        {activeTab === 'organizer' && user && <Organizer currentUser={user} notes={data.notes} shiftNotes={data.shiftNotes || []} onAddNote={handleAddNote} onToggleNote={handleToggleNote} onDeleteNote={handleDeleteNote} onEditNote={handleEditNote} onAddShiftNote={handleAddShiftNote} onDeleteShiftNote={handleDeleteShiftNote} />}
                        {activeTab === 'task-management' && isAdmin && <TaskManagement currentUser={user} />}
                        {activeTab === 'my-tasks' && user && <MyTasks currentUser={user} />}
                        {activeTab === 'registration' && <Registration onAddCamera={handleAddCamera} onAddAccess={handleAddAccess} onAddDocument={handleAddDocument} onDeleteDocument={handleDeleteDocument} documents={data.documents} userRole={user.role} />}
                    </>
                )}

                {activeTab === 'data' && isAdmin && <Importer onImport={handleImportData} onImportThirdParty={handleSaveThirdPartyImport} onDeleteImport={handleDeleteThirdPartyImport} thirdPartyImports={data.thirdPartyImports} onReset={handleFullReset} />}
                {activeTab === 'users' && isAdmin && <UserManagement currentUser={user} />}
            </Suspense>
          </div>

          {/* Floating Back to Top Button */}
          {showScrollTop && (
            <button 
              onClick={scrollToTop}
              className="fixed bottom-6 right-6 z-50 p-3 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-full shadow-2xl shadow-amber-500/20 border border-amber-400/50 backdrop-blur transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
              title="Voltar ao topo"
            >
              <ChevronUp size={24} strokeWidth={3} />
            </button>
          )}
        </div>
      </main>

      {/* Profile Modal */}
      {showProfileModal && (
            <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex justify-center sm:justify-end animate-fade-in p-4 sm:p-0">
                <div className="w-full max-w-lg sm:max-w-md bg-white dark:bg-slate-900 h-fit sm:h-full rounded-2xl sm:rounded-none sm:border-l border-slate-300 dark:border-slate-800 shadow-2xl overflow-y-auto relative">
                    <button onClick={() => setShowProfileModal(false)} className="absolute top-4 right-4 z-20 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"><X size={20} /></button>
                    <div className="relative h-32 sm:h-40 bg-gradient-to-r from-blue-900 to-slate-900">
                        {editProfile.bannerURL ? <img src={editProfile.bannerURL} alt="Banner" className="w-full h-full object-cover opacity-80" /> : <div className="w-full h-full flex items-center justify-center opacity-30"><ImageIcon size={48} className="text-white" /></div>}
                        <label className="absolute bottom-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full cursor-pointer text-white transition-colors" title="Alterar Capa"><CameraIcon size={16} /><input type="file" className="hidden" accept="image/*" onChange={(e) => handleProfileImageUpload(e, 'bannerURL')} /></label>
                    </div>
                    <div className="px-6 relative -mt-12 sm:-mt-16 mb-4 flex flex-col items-center">
                         <div className="relative group">
                            {editProfile.photoURL ? <img src={editProfile.photoURL} alt="Avatar" className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-xl" /> : <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-slate-200 dark:bg-slate-800 border-4 border-white dark:border-slate-900 flex items-center justify-center text-slate-400 font-bold text-4xl shadow-xl">{(editProfile.name || '?').charAt(0).toUpperCase()}</div>}
                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity" title="Alterar Foto"><CameraIcon size={24} /><input type="file" className="hidden" accept="image/*" onChange={(e) => handleProfileImageUpload(e, 'photoURL')} /></label>
                         </div>
                    </div>
                    <div className="px-6 pb-8 space-y-4 sm:space-y-5">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white text-center mb-4 sm:mb-6">Editar Meu Perfil</h3>
                        <div><label className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1.5"><UserIcon size={14} /> Nome Completo</label><input type="text" value={editProfile.name} onChange={e => setEditProfile({...editProfile, name: e.target.value})} className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" /></div>
                        <div><label className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1.5"><Briefcase size={14} /> Cargo / Função</label><input type="text" placeholder="Ex: Supervisor Operacional" value={editProfile.jobTitle} onChange={e => setEditProfile({...editProfile, jobTitle: e.target.value})} className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" /></div>
                         <div><label className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1.5"><Mail size={14} /> Bio / Status</label><textarea placeholder="Escreva algo sobre você..." value={editProfile.bio} onChange={e => setEditProfile({...editProfile, bio: e.target.value})} className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none h-20 sm:h-24 resize-none" /></div>
                        <div className="pt-2 sm:pt-4 border-t border-slate-200 dark:border-slate-800">
                            <button onClick={() => setShowPasswordChange(!showPasswordChange)} className="flex items-center gap-2 text-xs text-blue-500 hover:text-blue-400 font-medium mb-3"><Lock size={14} /> {showPasswordChange ? 'Cancelar Alteração de Senha' : 'Alterar Senha'}</button>
                            {showPasswordChange && (<div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800"><div><label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Nova Senha</label><input type="password" placeholder="Mínimo 6 caracteres" value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" /></div><div><label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Confirmar Senha</label><input type="password" placeholder="Repita a nova senha" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none" /></div><button onClick={handleChangePassword} disabled={passwordLoading} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded text-xs transition-colors flex items-center justify-center gap-2">{passwordLoading ? <Loader2 className="animate-spin" size={14} /> : 'Atualizar Senha'}</button></div>)}
                        </div>
                        <button onClick={handleSaveProfile} disabled={profileSaving} className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 mt-4 transition-transform active:scale-95">{profileSaving ? 'Salvando...' : <><Save size={20} /> Salvar Alterações</>}</button>
                    </div>
                </div>
            </div>
      )}
    </div>
  );
};
export default App;
