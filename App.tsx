import React, {
  useState,
  useEffect,
  Suspense,
  lazy
} from 'react';

import {
  LayoutDashboard,
  Video,
  DoorClosed,
  Menu,
  Bell,
  X,
  Power,
  FileSpreadsheet,
  Trash2,
  Check,
  AlertCircle,
  CheckCircle2,
  Shield,
  Eye,
  Loader2,
  LogOut,
  Users,
  PlusSquare,
  Calendar,
  Settings,
  Camera as CameraIcon,
  Save,
  Briefcase,
  Mail,
  User as UserIcon,
  Image as ImageIcon,
  Sun,
  Moon,
  ClipboardList,
  CheckSquare,
  Ban,
  HelpCircle,
  Lock,
  Activity,
  Grid,
  Volume2,
  ChevronUp
} from 'lucide-react';

import {
  Camera,
  AccessPoint,
  User as AppUser,
  PublicDocument,
  Note,
  ProcessedWorker,
  AppNotification,
  Status,
  ThirdPartyImport,
  ShiftNote
} from './types';

import { authService } from './services/auth';
import { monitoringService } from './services/monitoring';

/* ===========================
   LAZY COMPONENTS
=========================== */
const Dashboard = lazy(() => import('./components/Dashboard'));
const CameraList = lazy(() => import('./components/CameraList'));
const AccessControlList = lazy(() => import('./components/AccessControlList'));
const AccessManagement = lazy(() => import('./components/AccessManagement'));
const Heatmap = lazy(() => import('./components/Heatmap'));
const ThirdPartyStatus = lazy(() => import('./components/ThirdPartyStatus'));
const OnboardingTour = lazy(() => import('./components/OnboardingTour'));

/* ===========================
   APP
=========================== */
const App: React.FC = () => {
  /* ---------- STATE ---------- */
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'monitoring'
    | 'organizer'
    | 'data'
    | 'users'
    | 'registration'
    | 'third-party'
    | 'pendencies'
    | 'task-management'
    | 'my-tasks'
    | 'access-management'
    | 'heatmap'
  >('dashboard');

  const [monitoringSubTab, setMonitoringSubTab] =
    useState<'cameras' | 'access'>('cameras');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);

  const [data, setData] = useState<{
    cameras: Camera[];
    accessPoints: AccessPoint[];
    lastSync?: string;
  }>({
    cameras: [],
    accessPoints: []
  });

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  /* ---------- AUTH ---------- */
  useEffect(() => {
    const unsub = authService.onAuthStateChanged(currentUser => {
      if (currentUser) {
        setUser(currentUser);

        const tourKey = `ccos_tour_seen_${currentUser.uid}`;
        if (!localStorage.getItem(tourKey)) {
          setShowTour(true);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsub();
  }, []);

  /* ---------- GUARD ---------- */
  const handleTabChange = (tab: typeof activeTab) => {
    if (
      isManager &&
      !['dashboard', 'monitoring', 'access-management', 'heatmap', 'third-party'].includes(tab)
    ) {
      alert('Acesso não permitido para o perfil de Gestor.');
      return;
    }
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Usuário não autenticado</p>
      </div>
    );
  }

  /* ===========================
     RENDER
  =========================== */
  return (
    <div className="h-screen w-full bg-slate-200 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex overflow-hidden">

      <Suspense fallback={null}>
        {showTour && (
          <OnboardingTour
            role={user.role}
            onFinish={() => {
              localStorage.setItem(`ccos_tour_seen_${user.uid}`, 'true');
              setShowTour(false);
            }}
          />
        )}
      </Suspense>

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-300 dark:border-slate-800 transform transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="p-4 border-b">
          <h1 className="text-2xl font-black text-amber-500">CCOS</h1>
        </div>

        <nav className="p-3 space-y-1">
          <button
            onClick={() => handleTabChange('dashboard')}
            className="w-full flex items-center gap-2 p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>

          <button
            onClick={() => handleTabChange('monitoring')}
            className="w-full flex items-center gap-2 p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <Shield size={18} /> Monitoramento
          </button>
        </nav>
      </aside>

      {/* CONTENT */}
      <main className="flex-1 overflow-auto p-4 lg:ml-64">
        <Suspense fallback={<Loader2 className="animate-spin" />}>
          {activeTab === 'dashboard' && <Dashboard data={data} currentUser={user} />}

          {activeTab === 'monitoring' && (
            monitoringSubTab === 'cameras' ? (
              <CameraList cameras={data.cameras} />
            ) : (
              <AccessControlList accessPoints={data.accessPoints} />
            )
          )}

          {activeTab === 'access-management' && (
            <AccessManagement accessPoints={data.accessPoints} currentUser={user} />
          )}

          {activeTab === 'heatmap' && (
            <Heatmap currentUser={user} />
          )}

          {activeTab === 'third-party' && (
            <ThirdPartyStatus currentUser={user} />
          )}
        </Suspense>
      </main>
    </div>
  );
};

export default App;
