
import React, { useState, useEffect, useCallback, Suspense, lazy, useRef, useMemo } from 'react';
import { LayoutDashboard, Menu, Bell, X, FileSpreadsheet, CheckCircle2, Shield, Loader2, LogOut, Users, PlusSquare, ClipboardList, ChevronUp, MessageSquareHeart, AlertTriangle, Megaphone, Info, Sun, Moon, HelpCircle, Mail, Calendar, Clock, RefreshCw, BookOpen, DollarSign, UserPlus, History, BarChart3 } from 'lucide-react';
import { Camera, AccessPoint, User, ProcessedWorker, AppNotification, ThirdPartyImport, Note, ShiftNote, ThirdPartyPayment, PaymentImport, Status } from './types';
import { authService } from './services/auth';
import { monitoringService, getResponsibleByWarehouse } from './services/monitoring';
import { organizerService } from './services/organizer';
import { ref, onValue, update, query, orderByChild } from 'firebase/database';
import { db } from './services/firebase';

import { useTheme } from './hooks/useTheme';
import { useAppData } from './hooks/useAppData';
import { useNotificationSounds } from './hooks/useNotificationSounds';

import ProfileModal from './components/ProfileModal';
import FeedbackModal from './components/FeedbackModal';

const PainelPrincipal = lazy(() => import('./components/PainelPrincipal'));
const CameraList = lazy(() => import('./components/CameraList'));
const AccessControlList = lazy(() => import('./components/AccessControlList'));
const Importer = lazy(() => import('./components/Importer'));
const Login = lazy(() => import('./components/Login'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const OnboardingTour = lazy(() => import('./components/OnboardingTour'));
const Organizer = lazy(() => import('./components/Organizer'));
const ThirdPartyStatus = lazy(() => import('./components/ThirdPartyStatus'));
const AccessManagement = lazy(() => import('./components/AccessManagement'));
const Heatmap = lazy(() => import('./components/Heatmap'));
const Manual = lazy(() => import('./components/Manual'));
const Payments = lazy(() => import('./components/Payments'));
const Registration = lazy(() => import('./components/Registration'));
const RegistrationHistory = lazy(() => import('./components/RegistrationHistory'));
const FinanceAudit = lazy(() => import('./components/FinanceAudit'));
const OccurrencesDashboard = lazy(() => import('./components/OccurrencesDashboard'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full w-full bg-[#1c1e26]">
    <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-amber-500 w-12 h-12" />
        <span className="text-amber-500/50 text-[10px] font-black uppercase tracking-[0.3em]">Carregando Módulos...</span>
  </div>
  </div>
);

const MASTER_EMAIL = 'pedro.fernandes@ccos.com';

const hasTabPermission = (user: User | null, tab: string) => {
    if (!user) return false;
    if (user.email === MASTER_EMAIL) return true;
    
    // Fornecedores têm acesso fixo
    if (user.role === 'provider') {
        return ['registration', 'registration-history'].includes(tab);
    }

    if (!user.permissions) {
        // Fallback para lógica baseada em cargo se não houver permissões definidas
        if (['data', 'users'].includes(tab)) return user.role === 'admin';
        return true;
    }
    return user.permissions.includes(tab);
};

const hasWarehousePermission = (allowedList: string[] | undefined, targetWarehouse: string) => {
    if (!allowedList || allowedList.length === 0) return false;
    const normalizedTarget = (targetWarehouse || '').toUpperCase();
    return allowedList.some(allowed => {
        const normalizedAllowed = allowed.toUpperCase();
        return normalizedAllowed === normalizedTarget || normalizedAllowed.includes(normalizedTarget) || normalizedTarget.includes(normalizedAllowed);
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
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'monitoring' | 'occurrences' | 'occurrences-bi' | 'registration' | 'registration-history' | 'third-party-mgmt' | 'work-mgmt' | 'finance' | 'manual' | 'organizer' | 'data' | 'users'>('dashboard');
  const [monitoringSubTab, setMonitoringSubTab] = useState<'cameras' | 'alarms' | 'access'>('cameras');
  const [occurrencesSubTab, setOccurrencesSubTab] = useState<'occurrences' | 'requests'>('occurrences');
  const [thirdPartySubTab, setThirdPartySubTab] = useState<'status' | 'access-mgmt' | 'heatmap'>('status');
  const [financeSubTab, setFinanceSubTab] = useState<'payments' | 'audit'>('payments');

  const [passwordPromptTab, setPasswordPromptTab] = useState<'data' | 'users' | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  const { theme, toggleTheme } = useTheme();
  const { data, thirdPartyWorkers, paymentRecords } = useAppData(user);

  const occurrencesData = useMemo(() => data.occurrenceImports || [], [data.occurrenceImports]);
  const requestData = useMemo(() => data.requestImports || [], [data.requestImports]);

  const isAdmin = user?.role === 'admin';

  useEffect(() => { 
    if (user) {
      localStorage.setItem('cv_active_tab', activeTab); 
    }
  }, [activeTab, user]);
  
  useEffect(() => { if(user) localStorage.setItem('cv_mon_tab', monitoringSubTab); }, [monitoringSubTab, user]);
  useEffect(() => { if(user) localStorage.setItem('cv_tp_tab', thirdPartySubTab); }, [thirdPartySubTab, user]);
  useEffect(() => { if(user) localStorage.setItem('cv_fin_tab', financeSubTab); }, [financeSubTab, user]);

  useEffect(() => {
    const timer = setInterval(() => {
        setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
      
      if (currentUser) {
          setActiveTab(currentUser.role === 'provider' ? 'registration' : 'dashboard');
          setSidebarOpen(false);
          
          const savedMon = localStorage.getItem('cv_mon_tab') as any;
          const savedTp = localStorage.getItem('cv_tp_tab') as any;
          const savedFin = localStorage.getItem('cv_fin_tab') as any;
          if (savedMon) setMonitoringSubTab(savedMon);
          if (savedTp) setThirdPartySubTab(savedTp);
          if (savedFin) setFinanceSubTab(savedFin);
      }
      
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

  const unreadNotificationsCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const markAllRead = async () => {
      if (!user) return;
      const updates: any = {};
      notifications.forEach(n => { if (!n.read) updates[`notifications/${user.uid}/${n.id}/read`] = true; });
      if (Object.keys(updates).length > 0) await update(ref(db), updates);
  };

  const handleToggleNotifications = () => {
      const willShow = !showNotifications;
      setShowNotifications(willShow);
      if (willShow && unreadNotificationsCount > 0) {
          markAllRead();
      }
  };

  const handleTabChange = useCallback((tab: typeof activeTab) => {
    if (!hasTabPermission(user, tab)) return;

    if (['data', 'users'].includes(tab) && !isUnlocked) {
      setPasswordPromptTab(tab as 'data' | 'users');
      setPasswordInput('');
      return;
    }

    setActiveTab(tab);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, [isAdmin, user, isUnlocked]);

  const handleLogout = useCallback(() => { 
    authService.logout(); 
    setActiveTab('dashboard');
    setSidebarOpen(false);
    setUser(null);
  }, []);

  const handleImportData = async (cameras: Camera[], accessPoints: AccessPoint[]) => {
      try {
          // Merge logic: start with existing data and update/add based on spreadsheet
          const currentCameras = [...data.cameras];
          const currentAccess = [...data.accessPoints];
          const matchedCameraIndices = new Set<number>();
          const matchedAccessIndices = new Set<number>();

          // Process Cameras
          cameras.forEach(newCam => {
              const cleanNewName = newCam.name.trim().toUpperCase();
              const cleanNewId = newCam.id.trim().toUpperCase();
              const cleanNewResp = newCam.responsible?.trim().toUpperCase();

              // 1. Try exact match: ID + Name + Responsible
              let existingIdx = currentCameras.findIndex((c, idx) => 
                  !matchedCameraIndices.has(idx) &&
                  c.id.trim().toUpperCase() === cleanNewId && 
                  c.name.trim().toUpperCase() === cleanNewName &&
                  c.responsible.trim().toUpperCase() === cleanNewResp &&
                  cleanNewId !== 'N/A'
              );

              // 2. Try ID match (if ID is valid)
              if (existingIdx < 0 && cleanNewId !== 'N/A') {
                  existingIdx = currentCameras.findIndex((c, idx) => 
                      !matchedCameraIndices.has(idx) &&
                      c.id.trim().toUpperCase() === cleanNewId
                  );
              }

              // 3. Try Name + Responsible match (tie-breaker for duplicate names)
              if (existingIdx < 0) {
                  existingIdx = currentCameras.findIndex((c, idx) => 
                      !matchedCameraIndices.has(idx) &&
                      c.name.trim().toUpperCase() === cleanNewName &&
                      c.responsible.trim().toUpperCase() === cleanNewResp
                  );
              }

              // 3.1 Try Name + Warehouse match (if responsible changed but warehouse stayed same)
              if (existingIdx < 0 && newCam.warehouse) {
                  const cleanNewWarehouse = newCam.warehouse.trim().toUpperCase();
                  existingIdx = currentCameras.findIndex((c, idx) => 
                      !matchedCameraIndices.has(idx) &&
                      c.name.trim().toUpperCase() === cleanNewName &&
                      c.warehouse.trim().toUpperCase() === cleanNewWarehouse
                  );
              }

              // 4. Try Name only match
              if (existingIdx < 0) {
                  existingIdx = currentCameras.findIndex((c, idx) => 
                      !matchedCameraIndices.has(idx) &&
                      c.name.trim().toUpperCase() === cleanNewName
                  );
              }

              if (existingIdx >= 0) {
                  const existingCam = currentCameras[existingIdx];
                  const merged = { ...existingCam, ...newCam };
                  
                  // Priority logic: If spreadsheet has a warehouse, use it. 
                  // If spreadsheet is empty but system has one, preserve system's.
                  if (!newCam.warehouseManuallyEdited && existingCam.warehouseManuallyEdited) {
                      merged.warehouse = existingCam.warehouse;
                      merged.responsible = existingCam.responsible;
                      merged.warehouseManuallyEdited = true;
                  } else {
                      merged.warehouseManuallyEdited = newCam.warehouseManuallyEdited;
                      merged.responsible = getResponsibleByWarehouse(merged.warehouse, newCam.responsible);
                  }
                  currentCameras[existingIdx] = merged;
                  matchedCameraIndices.add(existingIdx);
              } else {
                  currentCameras.push(newCam);
              }
          });

          // Process Access Points
          accessPoints.forEach(newAp => {
              const cleanNewName = newAp.name.trim().toUpperCase();
              const cleanNewId = newAp.id.trim().toUpperCase();
              const cleanNewResp = newAp.responsible?.trim().toUpperCase();

              // 1. Try exact match: ID + Name + Responsible
              let existingIdx = currentAccess.findIndex((a, idx) => 
                  !matchedAccessIndices.has(idx) &&
                  a.id.trim().toUpperCase() === cleanNewId && 
                  a.name.trim().toUpperCase() === cleanNewName &&
                  a.responsible.trim().toUpperCase() === cleanNewResp &&
                  cleanNewId !== 'N/A'
              );

              // 2. Try ID match
              if (existingIdx < 0 && cleanNewId !== 'N/A') {
                  existingIdx = currentAccess.findIndex((a, idx) => 
                      !matchedAccessIndices.has(idx) &&
                      a.id.trim().toUpperCase() === cleanNewId
                  );
              }

              // 3. Try Name + Responsible match
              if (existingIdx < 0) {
                  existingIdx = currentAccess.findIndex((a, idx) => 
                      !matchedAccessIndices.has(idx) &&
                      a.name.trim().toUpperCase() === cleanNewName &&
                      a.responsible.trim().toUpperCase() === cleanNewResp
                  );
              }

              // 3.1 Try Name + Warehouse match
              if (existingIdx < 0 && newAp.warehouse) {
                  const cleanNewWarehouse = newAp.warehouse.trim().toUpperCase();
                  existingIdx = currentAccess.findIndex((a, idx) => 
                      !matchedAccessIndices.has(idx) &&
                      a.name.trim().toUpperCase() === cleanNewName &&
                      a.warehouse.trim().toUpperCase() === cleanNewWarehouse
                  );
              }

              // 4. Try Name only match
              if (existingIdx < 0) {
                  existingIdx = currentAccess.findIndex((a, idx) => 
                      !matchedAccessIndices.has(idx) &&
                      a.name.trim().toUpperCase() === cleanNewName
                  );
              }

              if (existingIdx >= 0) {
                  const existingAp = currentAccess[existingIdx];
                  const merged = { ...existingAp, ...newAp };
                  
                  if (!newAp.warehouseManuallyEdited && existingAp.warehouseManuallyEdited) {
                      merged.warehouse = existingAp.warehouse;
                      merged.responsible = existingAp.responsible;
                      merged.warehouseManuallyEdited = true;
                  } else {
                      merged.warehouseManuallyEdited = newAp.warehouseManuallyEdited;
                      merged.responsible = getResponsibleByWarehouse(merged.warehouse, newAp.responsible);
                  }
                  currentAccess[existingIdx] = merged;
                  matchedAccessIndices.add(existingIdx);
              } else {
                  currentAccess.push(newAp);
              }
          });

          await monitoringService.importData(currentCameras, currentAccess);
          addToast("Sistema atualizado com sucesso!", "success");
      } catch (e) {
          console.error(e);
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

  const handleAddCamera = async (cam: Camera) => {
      try {
          await monitoringService.addCamera(cam, data.cameras);
          addToast("Câmera adicionada com sucesso!", "success");
      } catch (e) {
          addToast("Erro ao adicionar câmera.", "alert");
      }
  };

  const handleEditCamera = async (cam: Camera) => {
      try {
          await monitoringService.updateCamera(cam, data.cameras);
          addToast("Câmera atualizada com sucesso!", "success");
      } catch (e) {
          addToast("Erro ao atualizar câmera.", "alert");
      }
  };

  const handleImportCameraData = async (updates: { name: string; recordingTime?: string; warehouse?: string; responsible?: string }[]) => {
      try {
          let updatedCount = 0;
          const currentCameras = [...data.cameras];
          const matchedIndices = new Set<number>();
          
          // Two-pass matching to handle duplicate names correctly
          // Pass 1: Match by name AND responsible (exact match for existing items)
          for (const update of updates) {
              const updateName = update.name.trim().toUpperCase();
              const updateResponsible = update.responsible?.trim().toUpperCase();

              const exactMatchIdx = currentCameras.findIndex((cam, idx) => 
                  !matchedIndices.has(idx) && 
                  cam.name.trim().toUpperCase() === updateName &&
                  cam.responsible.trim().toUpperCase() === updateResponsible
              );

              // 1.1 Try Name + Warehouse match (if responsible changed but warehouse stayed same)
              let matchIdx = exactMatchIdx;
              if (matchIdx < 0 && update.warehouse) {
                  let finalWarehouse = update.warehouse.toUpperCase().trim();
                  if (finalWarehouse === 'G2') finalWarehouse = 'GALPÃO G2';
                  else if (finalWarehouse === 'G3') finalWarehouse = 'GALPÃO G3';
                  else if (finalWarehouse === 'G5') finalWarehouse = 'GALPÃO G5';
                  else if (finalWarehouse === 'SP') finalWarehouse = 'GALPÃO SP';
                  else if (finalWarehouse === 'LSP') finalWarehouse = 'GALPÃO LSP';
                  else if (finalWarehouse === 'PAVUNA') finalWarehouse = 'GALPÃO PAVUNA';
                  else if (finalWarehouse === 'MERITI') finalWarehouse = 'GALPÃO MERITI';
                  else if (finalWarehouse === '4 ELOS RJ' || finalWarehouse === '4ELOS RJ') finalWarehouse = 'GALPÃO 4 ELOS RJ';
                  else if (finalWarehouse === '4 ELOS ES' || finalWarehouse === '4ELOS ES') finalWarehouse = 'GALPÃO 4 ELOS ES';

                  matchIdx = currentCameras.findIndex((cam, idx) => 
                      !matchedIndices.has(idx) && 
                      cam.name.trim().toUpperCase() === updateName &&
                      cam.warehouse.trim().toUpperCase() === finalWarehouse
                  );
              }

              if (matchIdx >= 0) {
                  const cam = currentCameras[matchIdx];
                  const newCam = { ...cam };
                  let needsUpdate = false;

                  if (update.recordingTime && cam.recordingTime !== update.recordingTime) {
                      newCam.recordingTime = update.recordingTime;
                      needsUpdate = true;
                  }

                  if (update.warehouse) {
                      let finalWarehouse = update.warehouse.toUpperCase().trim();
                      if (finalWarehouse === 'G2') finalWarehouse = 'GALPÃO G2';
                      else if (finalWarehouse === 'G3') finalWarehouse = 'GALPÃO G3';
                      else if (finalWarehouse === 'G5') finalWarehouse = 'GALPÃO G5';
                      else if (finalWarehouse === 'SP') finalWarehouse = 'GALPÃO SP';
                      else if (finalWarehouse === 'LSP') finalWarehouse = 'GALPÃO LSP';
                      else if (finalWarehouse === 'PAVUNA') finalWarehouse = 'GALPÃO PAVUNA';
                      else if (finalWarehouse === 'MERITI') finalWarehouse = 'GALPÃO MERITI';
                      else if (finalWarehouse === '4 ELOS RJ' || finalWarehouse === '4ELOS RJ') finalWarehouse = 'GALPÃO 4 ELOS RJ';
                      else if (finalWarehouse === '4 ELOS ES' || finalWarehouse === '4ELOS ES') finalWarehouse = 'GALPÃO 4 ELOS ES';

                      if (cam.warehouse !== finalWarehouse) {
                          newCam.warehouse = finalWarehouse;
                          newCam.warehouseManuallyEdited = true;
                          needsUpdate = true;
                      }
                  }

                  // Update responsible if provided and different
                  if (update.responsible && cam.responsible !== update.responsible) {
                      newCam.responsible = update.responsible;
                      needsUpdate = true;
                  } else if (newCam.warehouse && newCam.warehouse !== cam.warehouse) {
                      // If warehouse changed but responsible wasn't in spreadsheet, auto-map it
                      newCam.responsible = getResponsibleByWarehouse(newCam.warehouse, cam.responsible);
                      needsUpdate = true;
                  }

                  if (needsUpdate) {
                      currentCameras[matchIdx] = newCam;
                      updatedCount++;
                  }
                  matchedIndices.add(matchIdx);
                  (update as any)._matched = true;
              }
          }

          // Pass 2: Match remaining updates by name only (for items where responsible or warehouse changed)
          for (const update of updates) {
              if ((update as any)._matched) continue;

              const updateName = update.name.trim().toUpperCase();
              const nameMatchIdx = currentCameras.findIndex((cam, idx) => 
                  !matchedIndices.has(idx) && 
                  cam.name.trim().toUpperCase() === updateName
              );

              if (nameMatchIdx >= 0) {
                  const cam = currentCameras[nameMatchIdx];
                  const newCam = { ...cam };
                  let needsUpdate = false;

                  if (update.recordingTime && cam.recordingTime !== update.recordingTime) {
                      newCam.recordingTime = update.recordingTime;
                      needsUpdate = true;
                  }

                  if (update.warehouse) {
                      let finalWarehouse = update.warehouse.toUpperCase().trim();
                      if (finalWarehouse === 'G2') finalWarehouse = 'GALPÃO G2';
                      else if (finalWarehouse === 'G3') finalWarehouse = 'GALPÃO G3';
                      else if (finalWarehouse === 'G5') finalWarehouse = 'GALPÃO G5';
                      else if (finalWarehouse === 'SP') finalWarehouse = 'GALPÃO SP';
                      else if (finalWarehouse === 'LSP') finalWarehouse = 'GALPÃO LSP';
                      else if (finalWarehouse === 'PAVUNA') finalWarehouse = 'GALPÃO PAVUNA';
                      else if (finalWarehouse === 'MERITI') finalWarehouse = 'GALPÃO MERITI';
                      else if (finalWarehouse === '4 ELOS RJ' || finalWarehouse === '4ELOS RJ') finalWarehouse = 'GALPÃO 4 ELOS RJ';
                      else if (finalWarehouse === '4 ELOS ES' || finalWarehouse === '4ELOS ES') finalWarehouse = 'GALPÃO 4 ELOS ES';

                      if (cam.warehouse !== finalWarehouse) {
                          newCam.warehouse = finalWarehouse;
                          newCam.warehouseManuallyEdited = true;
                          needsUpdate = true;
                      }
                  }

                  if (update.responsible && cam.responsible !== update.responsible) {
                      newCam.responsible = update.responsible;
                      needsUpdate = true;
                  } else if (newCam.warehouse && newCam.warehouse !== cam.warehouse) {
                      newCam.responsible = getResponsibleByWarehouse(newCam.warehouse, cam.responsible);
                      needsUpdate = true;
                  }

                  if (needsUpdate) {
                      currentCameras[nameMatchIdx] = newCam;
                      updatedCount++;
                  }
                  matchedIndices.add(nameMatchIdx);
              }
          }
          
          if (updatedCount > 0) {
              await monitoringService.importData(currentCameras, data.accessPoints);
              addToast(`${updatedCount} câmeras atualizadas com sucesso!`, "success");
          } else {
              addToast("Nenhuma câmera precisou ser atualizada.", "info");
          }
      } catch (e) {
          console.error(e);
          addToast("Erro ao atualizar câmeras via Excel.", "alert");
      }
  };

  const handleImportAccessPoints = async (updates: { name: string; warehouse?: string; responsible?: string }[]) => {
      try {
          let updatedCount = 0;
          const currentAccess = [...data.accessPoints];
          const matchedIndices = new Set<number>();

          // Pass 1: Match by name AND responsible
          for (const update of updates) {
              const updateName = update.name.trim().toUpperCase();
              const updateResponsible = update.responsible?.trim().toUpperCase();

              const exactMatchIdx = currentAccess.findIndex((ap, idx) => 
                  !matchedIndices.has(idx) && 
                  ap.name.trim().toUpperCase() === updateName &&
                  ap.responsible.trim().toUpperCase() === updateResponsible
              );

              if (exactMatchIdx >= 0) {
                  const ap = currentAccess[exactMatchIdx];
                  const newAp = { ...ap };
                  let needsUpdate = false;

                  if (update.warehouse) {
                      let finalWarehouse = update.warehouse.toUpperCase().trim();
                      if (finalWarehouse === 'G2') finalWarehouse = 'GALPÃO G2';
                      else if (finalWarehouse === 'G3') finalWarehouse = 'GALPÃO G3';
                      else if (finalWarehouse === 'G5') finalWarehouse = 'GALPÃO G5';
                      else if (finalWarehouse === 'SP') finalWarehouse = 'GALPÃO SP';
                      else if (finalWarehouse === 'LSP') finalWarehouse = 'GALPÃO LSP';
                      else if (finalWarehouse === 'PAVUNA') finalWarehouse = 'GALPÃO PAVUNA';
                      else if (finalWarehouse === 'MERITI') finalWarehouse = 'GALPÃO MERITI';
                      else if (finalWarehouse === '4 ELOS RJ' || finalWarehouse === '4ELOS RJ') finalWarehouse = 'GALPÃO 4 ELOS RJ';
                      else if (finalWarehouse === '4 ELOS ES' || finalWarehouse === '4ELOS ES') finalWarehouse = 'GALPÃO 4 ELOS ES';

                      if (ap.warehouse !== finalWarehouse) {
                          newAp.warehouse = finalWarehouse;
                          newAp.warehouseManuallyEdited = true;
                          needsUpdate = true;
                      }
                  }

                  if (update.responsible && ap.responsible !== update.responsible) {
                      newAp.responsible = update.responsible;
                      needsUpdate = true;
                  } else if (newAp.warehouse && newAp.warehouse !== ap.warehouse) {
                      newAp.responsible = getResponsibleByWarehouse(newAp.warehouse, ap.responsible);
                      needsUpdate = true;
                  }

                  if (needsUpdate) {
                      currentAccess[exactMatchIdx] = newAp;
                      updatedCount++;
                  }
                  matchedIndices.add(exactMatchIdx);
                  (update as any)._matched = true;
              }
          }

          // Pass 2: Match by name only
          for (const update of updates) {
              if ((update as any)._matched) continue;

              const updateName = update.name.trim().toUpperCase();
              const nameMatchIdx = currentAccess.findIndex((ap, idx) => 
                  !matchedIndices.has(idx) && 
                  ap.name.trim().toUpperCase() === updateName
              );

              if (nameMatchIdx >= 0) {
                  const ap = currentAccess[nameMatchIdx];
                  const newAp = { ...ap };
                  let needsUpdate = false;

                  if (update.warehouse) {
                      let finalWarehouse = update.warehouse.toUpperCase().trim();
                      if (finalWarehouse === 'G2') finalWarehouse = 'GALPÃO G2';
                      else if (finalWarehouse === 'G3') finalWarehouse = 'GALPÃO G3';
                      else if (finalWarehouse === 'G5') finalWarehouse = 'GALPÃO G5';
                      else if (finalWarehouse === 'SP') finalWarehouse = 'GALPÃO SP';
                      else if (finalWarehouse === 'LSP') finalWarehouse = 'GALPÃO LSP';
                      else if (finalWarehouse === 'PAVUNA') finalWarehouse = 'GALPÃO PAVUNA';
                      else if (finalWarehouse === 'MERITI') finalWarehouse = 'GALPÃO MERITI';
                      else if (finalWarehouse === '4 ELOS RJ' || finalWarehouse === '4ELOS RJ') finalWarehouse = 'GALPÃO 4 ELOS RJ';
                      else if (finalWarehouse === '4 ELOS ES' || finalWarehouse === '4ELOS ES') finalWarehouse = 'GALPÃO 4 ELOS ES';

                      if (ap.warehouse !== finalWarehouse) {
                          newAp.warehouse = finalWarehouse;
                          newAp.warehouseManuallyEdited = true;
                          needsUpdate = true;
                      }
                  }

                  if (update.responsible && ap.responsible !== update.responsible) {
                      newAp.responsible = update.responsible;
                      needsUpdate = true;
                  } else if (newAp.warehouse && newAp.warehouse !== ap.warehouse) {
                      newAp.responsible = getResponsibleByWarehouse(newAp.warehouse, ap.responsible);
                      needsUpdate = true;
                  }

                  if (needsUpdate) {
                      currentAccess[nameMatchIdx] = newAp;
                      updatedCount++;
                  }
                  matchedIndices.add(nameMatchIdx);
              }
          }
          
          if (updatedCount > 0) {
              await monitoringService.importData(data.cameras, currentAccess);
              addToast(`${updatedCount} acessos atualizados com sucesso!`, "success");
          } else {
              addToast("Nenhum acesso precisou ser atualizado.", "info");
          }
      } catch (e) {
          console.error(e);
          addToast("Erro ao atualizar dados de acesso via Excel.", "alert");
      }
  };

  const handleAddAccessPoint = async (ap: AccessPoint) => {
      try {
          await monitoringService.addAccessPoint(ap, data.accessPoints);
          addToast("Acesso adicionado com sucesso!", "success");
      } catch (e) {
          addToast("Erro ao adicionar acesso.", "alert");
      }
  };

  const handleEditAccessPoint = async (ap: AccessPoint) => {
      try {
          await monitoringService.updateAccessPoint(ap, data.accessPoints);
          addToast("Acesso atualizado com sucesso!", "success");
      } catch (e) {
          addToast("Erro ao atualizar acesso.", "alert");
      }
  };

  const handleDeleteAccessPoint = async (uuid: string) => {
      try {
          await monitoringService.deleteAccessPoint(uuid, data.accessPoints);
          addToast("Acesso removido com sucesso!", "success");
      } catch (e) {
          addToast("Erro ao remover acesso.", "alert");
      }
  };

  const handleDeleteCamera = async (uuid: string) => {
      try {
          await monitoringService.deleteCamera(uuid, data.cameras);
          addToast("Câmera removida com sucesso!", "success");
      } catch (e) {
          addToast("Erro ao remover câmera.", "alert");
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

  const handleImportThirdParty = async (workers: ProcessedWorker[], fileName: string, startDate?: string, endDate?: string) => {
      try {
          await monitoringService.addThirdPartyImport(workers, fileName, startDate, endDate);
          
          // Lógica de presença no histórico
          if (data.attendanceRoster && data.attendanceRoster.length > 0) {
              const updates: Promise<void>[] = [];
              const processedIds = new Set<string>();

              for (const worker of workers) {
                  // Busca no histórico por nome e data
                  const matches = data.attendanceRoster.filter(r => 
                      r.date === worker.date && 
                      r.workerName.toUpperCase() === worker.name.toUpperCase() &&
                      !r.presence
                  );

                  for (const match of matches) {
                      if (!processedIds.has(match.id)) {
                          updates.push(monitoringService.updateAttendancePresence(match.id, true));
                          processedIds.add(match.id);
                      }
                  }
              }

              if (updates.length > 0) {
                  await Promise.all(updates);
                  addToast(`${updates.length} presenças confirmadas no histórico!`, "success");
              }
          }

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

  // REMOÇÃO DO window.confirm - A confirmação agora é feita pelo modal do Importer
  const handleDeleteImport = async (id: string) => {
      try { await monitoringService.deleteThirdPartyImport(id); addToast("Removido.", "info"); } catch (e) { addToast("Erro.", "alert"); }
  };

  const handleDeletePayment = async (id: string) => {
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

  const handleAddNote = (note: Note) => user && organizerService.addNote(note, data.notes, user.uid);
  const handleToggleNote = (id: string) => user && organizerService.toggleNote(id, data.notes, user.uid);
  const handleDeleteNote = (id: string) => user && organizerService.deleteNote(id, data.notes, user.uid);
  const handleEditNote = (id: string, content: string) => user && organizerService.editNote(id, content, data.notes, user.uid);
  const handleAddShiftNote = (note: ShiftNote) => organizerService.addShiftNote(note, data.shiftNotes || []);
  const handleDeleteShiftNote = (id: string) => organizerService.deleteShiftNote(id, data.shiftNotes || []);

  if (authLoading) return <div className="min-h-screen bg-[#121212] flex items-center justify-center"><Loader2 className="animate-spin text-amber-500 w-10 h-10" /></div>;
  if (!user) return <Suspense fallback={<LoadingFallback />}><Login onLogin={() => {}} /></Suspense>;

  return (
    <div className="h-screen w-full bg-slate-200 dark:bg-[#121212] text-slate-900 dark:text-slate-100 flex font-sans overflow-hidden">
      
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

      <aside className={`fixed inset-y-0 left-0 z-40 bg-slate-50 dark:bg-[#0d0d0d] border-r border-slate-300 dark:border-slate-800 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-64 lg:translate-x-0 lg:static lg:h-full lg:w-72 flex flex-col shadow-2xl lg:shadow-none`}>
        <div className="flex flex-col items-center justify-center py-8 px-6 shrink-0 select-none">
            <div onClick={() => handleTabChange('dashboard')} className="flex items-center gap-3 group w-full cursor-pointer">
                <div className="relative transform transition-transform group-hover:scale-110 duration-300">
                    <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full"></div>
                    <Shield className="w-10 h-10 text-amber-500 relative z-10 fill-amber-500/10" strokeWidth={2} />
                </div>
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black text-amber-500 leading-none tracking-tighter">CCOS</h1>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Security Systems</span>
                </div>
            </div>
        </div>
        <nav className="p-4 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
          {/* GRUPO OPERACIONAL */}
          <div>
            <p className="px-4 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] opacity-50">Operacional</p>
            <div className="space-y-1">
              {hasTabPermission(user, 'dashboard') && (
                <button onClick={() => handleTabChange('dashboard')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] font-black' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <LayoutDashboard size={18} /> 
                  <span className="text-xs font-bold uppercase tracking-wider">Painel principal</span>
                </button>
              )}
              {hasTabPermission(user, 'monitoring') && (
                <button onClick={() => handleTabChange('monitoring')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'monitoring' ? 'bg-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] font-black' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <Shield size={18} /> 
                  <span className="text-xs font-bold uppercase tracking-wider">Monitoramento</span>
                </button>
              )}
              {hasTabPermission(user, 'occurrences') && (
                <button onClick={() => handleTabChange('occurrences')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'occurrences' ? 'bg-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] font-black' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <BarChart3 size={18} /> 
                  <span className="text-xs font-bold uppercase tracking-wider">Ocorrências</span>
                </button>
              )}
              {hasTabPermission(user, 'work-mgmt') && (
                <button onClick={() => handleTabChange('work-mgmt')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'work-mgmt' ? 'bg-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] font-black' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <ClipboardList size={18} /> 
                  <span className="text-xs font-bold uppercase tracking-wider">Plantão</span>
                </button>
              )}
            </div>
          </div>

          {/* GRUPO GESTÃO */}
          <div>
            <p className="px-4 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] opacity-50">Gestão & Acesso</p>
            <div className="space-y-1">
              {hasTabPermission(user, 'third-party-mgmt') && (
                <button onClick={() => handleTabChange('third-party-mgmt')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'third-party-mgmt' ? 'bg-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] font-black' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <Users size={18} /> 
                  <span className="text-xs font-bold uppercase tracking-wider">Fluxo de Acesso</span>
                </button>
              )}
              {hasTabPermission(user, 'registration') && (
                <button onClick={() => handleTabChange('registration')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all relative ${activeTab === 'registration' ? 'bg-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] font-black' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <UserPlus size={18} /> 
                  <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Cadastro</span>
                      {unreadNotificationsCount > 0 && (
                          <div className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
                          </div>
                      )}
                  </div>
                </button>
              )}
              {hasTabPermission(user, 'registration-history') && (
                <button onClick={() => handleTabChange('registration-history')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'registration-history' ? 'bg-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] font-black' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <History size={18} /> 
                  <span className="text-xs font-bold uppercase tracking-wider">Histórico</span>
                </button>
              )}
              {hasTabPermission(user, 'finance') && (
                <button onClick={() => handleTabChange('finance')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'finance' ? 'bg-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] font-black' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <DollarSign size={18} /> 
                  <span className="text-xs font-bold uppercase tracking-wider">Financeiro</span>
                </button>
              )}
            </div>
          </div>

          {/* GRUPO SUPORTE & SISTEMA */}
          <div>
            <p className="px-4 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] opacity-50">Sistema</p>
            <div className="space-y-1">
              {hasTabPermission(user, 'manual') && (
                <button onClick={() => handleTabChange('manual')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'manual' ? 'bg-blue-600 text-white shadow-lg font-black' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <BookOpen size={18} /> 
                  <span className="text-xs font-bold uppercase tracking-wider">Manual</span>
                </button>
              )}
              {hasTabPermission(user, 'data') && (
                <button onClick={() => handleTabChange('data')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'data' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-900 hover:text-white'}`}>
                  <FileSpreadsheet size={18} /> 
                  <span className="text-xs font-bold uppercase tracking-wider">Fonte Dados</span>
                </button>
              )}
              {hasTabPermission(user, 'users') && (
                <button onClick={() => handleTabChange('users')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'users' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-900 hover:text-white'}`}>
                  <Users size={18} /> 
                  <span className="text-xs font-bold uppercase tracking-wider">Usuários</span>
                </button>
              )}
            </div>
          </div>
        </nav>
        
        <div className="mt-auto p-4 border-t border-slate-800/50 bg-slate-950/50">
           <div className="flex items-center gap-3 mb-2 cursor-pointer relative" onClick={() => setShowProfileModal(true)}>
              <div className="relative group shrink-0">
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.name}&background=f59e0b&color=000`} alt="Avatar" className="w-11 h-11 rounded-full border-2 border-slate-800 object-cover group-hover:border-amber-500 transition-colors" />
                
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950"></div>
                
                {unreadNotificationsCount > 0 && (
                   <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                       <div className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600 border border-white/20"></div>
                   </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white uppercase truncate tracking-tight">{user.name}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase truncate">{user.jobTitle || user.role.toUpperCase()}</p>
              </div>
           </div>
           <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/5 transition-all text-[10px] font-black uppercase tracking-widest"><LogOut size={14} /> <span>Sair</span></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-200 dark:bg-[#121212] w-full relative">
        <header className="h-16 sm:h-20 bg-white/80 dark:bg-[#0d0d0d]/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-4 sm:gap-6">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"><Menu className="w-5 h-5 sm:w-6 sm:h-6" /></button>
            <div className="hidden sm:flex flex-col">
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {activeTab === 'dashboard' ? 'Painel principal' : 
                     activeTab === 'monitoring' ? 'Central de Monitoramento' :
                     activeTab === 'occurrences' ? 'Ocorrências' :
                     activeTab === 'occurrences-bi' ? 'Ocorrências' :
                     activeTab === 'third-party-mgmt' ? 'Gestão de Acesso' :
                     activeTab === 'registration' ? 'Cadastro de Acesso' :
                     activeTab === 'registration-history' ? 'Histórico de Registros' :
                     activeTab === 'finance' ? 'Gestão Financeira' :
                     activeTab === 'work-mgmt' ? 'Controle Operacional' :
                     activeTab === 'manual' ? 'Manual do Sistema' :
                     activeTab === 'data' ? 'Fonte de Dados' :
                     activeTab === 'users' ? 'Gestão de Usuários' : 'Sistema'}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Servidor Online</span>
                </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-950 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
                <div className="text-xs font-mono font-black text-slate-600 dark:text-amber-500 tracking-widest flex items-center gap-3">
                    <Clock size={14} className="text-blue-500" />
                    {currentTime.toLocaleTimeString('pt-BR')}
                    <span className="text-slate-300 dark:text-slate-800">|</span>
                    <Calendar size={14} className="text-purple-500" />
                    {currentTime.toLocaleDateString('pt-BR')}
                </div>
             </div>
             <button onClick={() => setShowFeedbackModal(true)} className="p-2 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all flex items-center gap-1 group" title="Sugerir Melhoria"><MessageSquareHeart size={20} strokeWidth={2.5} /><span className="hidden xl:inline text-[10px] font-black uppercase tracking-widest">Feedback</span></button>
             <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-white transition-colors">{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button>
             <div className="relative">
                <button 
                  onClick={handleToggleNotifications} 
                  className={`p-2 text-slate-400 hover:text-white focus:outline-none transition-colors relative ${unreadNotificationsCount > 0 ? 'animate-[pulse_1.5s_infinite]' : ''}`}
                >
                  <Bell size={20} />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-lg animate-fade-in">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>
                
                {showNotifications && (
                    <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                        <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                          <span className="text-xs font-bold uppercase text-slate-400">Notificações</span>
                          <button onClick={markAllRead} className="text-[10px] text-amber-400 font-bold hover:text-white transition-colors">Limpar</button>
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-600 text-[10px] uppercase font-bold tracking-widest">Vazio</div>
                          ) : (
                            notifications.map(n => (
                              <div key={n.id} className={`p-3 border-b border-slate-800 flex gap-2 ${!n.read ? 'bg-amber-600/5' : 'opacity-60'}`}>
                                <div className="flex-1">
                                  <p className="text-xs text-white leading-relaxed font-medium">{n.message}</p>
                                  <span className="text-[9px] text-slate-600 font-bold uppercase mt-1 block font-mono">{new Date(n.timestamp).toLocaleTimeString()}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                    </div>
                )}
             </div>
             <button onClick={() => setShowTour(true)} className="p-2 text-slate-400 hover:text-white transition-colors" title="Manual"><HelpCircle size={20} /></button>
          </div>
        </header>

        <div className="bg-amber-600/10 border-b border-amber-600/20 py-2 px-4 flex items-center justify-center gap-3 animate-fade-in relative z-10">
             <Shield size={14} className="hidden md:inline text-amber-500" />
             <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest text-center">CCOS • AMBIENTE DE DEMONSTRAÇÃO E MONITORAMENTO</span>
             <Shield size={14} className="hidden md:inline text-amber-500" />
        </div>

        <div className="flex-1 overflow-auto p-3 sm:p-6 lg:p-8 scroll-smooth custom-scrollbar" ref={mainContentRef} onScroll={handleScroll}>
          <div className="max-w-[1600px] mx-auto space-y-6 sm:space-y-8">
            <Suspense fallback={<LoadingFallback />}>
                {activeTab === 'dashboard' && <PainelPrincipal data={data} thirdPartyWorkers={thirdPartyWorkers} currentUser={user} />}
                {activeTab === 'finance' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex border-b border-slate-300 dark:border-slate-800/50 overflow-x-auto no-scrollbar">
                        <button 
                            onClick={() => setFinanceSubTab('payments')} 
                            className={`px-3 sm:px-8 py-3 sm:py-4 text-xs font-black uppercase tracking-normal sm:tracking-[0.2em] transition-all relative whitespace-nowrap ${financeSubTab === 'payments' ? 'text-amber-600 dark:text-amber-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            Frequência
                            {financeSubTab === 'payments' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 dark:bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>}
                        </button>
                        <button 
                            onClick={() => setFinanceSubTab('audit')} 
                            className={`px-3 sm:px-8 py-3 sm:py-4 text-xs font-black uppercase tracking-normal sm:tracking-[0.2em] transition-all relative whitespace-nowrap ${financeSubTab === 'audit' ? 'text-amber-600 dark:text-amber-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            Auditoria
                            {financeSubTab === 'audit' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 dark:bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>}
                        </button>
                    </div>
                    {financeSubTab === 'payments' && <Payments payments={paymentRecords} workers={thirdPartyWorkers} currentUser={user} />}
                    {financeSubTab === 'audit' && <FinanceAudit workers={thirdPartyWorkers} payments={paymentRecords} currentUser={user} />}
                  </div>
                )}
                {activeTab === 'registration' && <Registration currentUser={user} />}
                {activeTab === 'registration-history' && <RegistrationHistory currentUser={user} />}
                {activeTab === 'monitoring' && (
                  <div className="space-y-8 animate-fade-in">
                    <div className="flex border-b border-slate-300 dark:border-slate-800/50 overflow-x-auto no-scrollbar">
                        <button 
                            onClick={() => setMonitoringSubTab('cameras')} 
                            className={`px-3 sm:px-8 py-3 sm:py-4 text-xs font-black uppercase tracking-normal sm:tracking-[0.2em] transition-all relative whitespace-nowrap ${monitoringSubTab === 'cameras' ? 'text-amber-600 dark:text-amber-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            Câmeras <span className="hidden sm:inline-block text-[10px] opacity-60 ml-1">({counts.video})</span>
                            {monitoringSubTab === 'cameras' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 dark:bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>}
                        </button>
                        <button 
                            onClick={() => setMonitoringSubTab('access')} 
                            className={`px-3 sm:px-8 py-3 sm:py-4 text-xs font-black uppercase tracking-normal sm:tracking-[0.2em] transition-all relative whitespace-nowrap ${monitoringSubTab === 'access' ? 'text-amber-600 dark:text-amber-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            Acessos <span className="hidden sm:inline-block text-[10px] opacity-60 ml-1">({counts.access})</span>
                            {monitoringSubTab === 'access' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 dark:bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>}
                        </button>
                    </div>
                    {monitoringSubTab === 'cameras' && <CameraList cameras={data.cameras.filter(c => c.channelType === 'video')} onToggleStatus={handleToggleCameraStatus} onSetWarehouseStatus={handleSetWarehouseStatus} onAdd={handleAddCamera} onEdit={handleEditCamera} onDelete={handleDeleteCamera} onImportCameraData={handleImportCameraData} readOnly={user.role !== 'admin'} allowedWarehouses={user.role === 'manager' ? user.allowedWarehouses : undefined} userRole={user.role} />}
                    {monitoringSubTab === 'access' && <AccessControlList accessPoints={data.accessPoints} onToggleStatus={handleToggleAccessStatus} onAdd={handleAddAccessPoint} onEdit={handleEditAccessPoint} onDelete={handleDeleteAccessPoint} onImport={handleImportAccessPoints} readOnly={user.role !== 'admin'} allowedWarehouses={user.role === 'manager' ? user.allowedWarehouses : undefined} />}
                  </div>
                )}
                {activeTab === 'occurrences' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex border-b border-slate-300 dark:border-slate-800/50 overflow-x-auto no-scrollbar">
                        <button 
                            onClick={() => setOccurrencesSubTab('occurrences')} 
                            className={`px-3 sm:px-8 py-3 sm:py-4 text-xs font-black uppercase tracking-normal sm:tracking-[0.2em] transition-all relative whitespace-nowrap ${occurrencesSubTab === 'occurrences' ? 'text-amber-600 dark:text-amber-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            Ocorrências
                            {occurrencesSubTab === 'occurrences' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 dark:bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>}
                        </button>
                        <button 
                            onClick={() => setOccurrencesSubTab('requests')} 
                            className={`px-3 sm:px-8 py-3 sm:py-4 text-xs font-black uppercase tracking-normal sm:tracking-[0.2em] transition-all relative whitespace-nowrap ${occurrencesSubTab === 'requests' ? 'text-amber-600 dark:text-amber-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            Requisições
                            {occurrencesSubTab === 'requests' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 dark:bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>}
                        </button>
                    </div>
                    {occurrencesSubTab === 'occurrences' && <OccurrencesDashboard occurrencesData={occurrencesData} currentUser={user} type="occurrence" />}
                    {occurrencesSubTab === 'requests' && <OccurrencesDashboard occurrencesData={requestData} currentUser={user} type="request" />}
                  </div>
                )}
                {activeTab === 'occurrences-bi' && <OccurrencesDashboard occurrencesData={occurrencesData} currentUser={user} />}
                {activeTab === 'third-party-mgmt' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex border-b border-slate-300 dark:border-slate-800/50 overflow-x-auto no-scrollbar">
                        <button 
                            onClick={() => setThirdPartySubTab('status')} 
                            className={`px-3 sm:px-8 py-3 sm:py-4 text-xs font-black uppercase tracking-normal sm:tracking-[0.2em] transition-all relative whitespace-nowrap ${thirdPartySubTab === 'status' ? 'text-amber-600 dark:text-amber-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            Status
                            {thirdPartySubTab === 'status' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 dark:bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>}
                        </button>
                        <button 
                            onClick={() => setThirdPartySubTab('access-mgmt')} 
                            className={`px-3 sm:px-8 py-3 sm:py-4 text-xs font-black uppercase tracking-normal sm:tracking-[0.2em] transition-all relative whitespace-nowrap ${thirdPartySubTab === 'access-mgmt' ? 'text-amber-600 dark:text-amber-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            Relatórios
                            {thirdPartySubTab === 'access-mgmt' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 dark:bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>}
                        </button>
                        <button 
                            onClick={() => setThirdPartySubTab('heatmap')} 
                            className={`px-3 sm:px-8 py-3 sm:py-4 text-xs font-black uppercase tracking-normal sm:tracking-[0.2em] transition-all relative whitespace-nowrap ${thirdPartySubTab === 'heatmap' ? 'text-amber-600 dark:text-amber-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            Mapa Calor
                            {thirdPartySubTab === 'heatmap' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 dark:bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>}
                        </button>
                    </div>
                    {thirdPartySubTab === 'status' && <ThirdPartyStatus workers={thirdPartyWorkers} paymentRecords={paymentRecords} currentUser={user} />}
                    {thirdPartySubTab === 'access-mgmt' && <AccessManagement accessPoints={data.accessPoints} thirdPartyWorkers={thirdPartyWorkers} currentUser={user} />}
                    {thirdPartySubTab === 'heatmap' && <Heatmap thirdPartyWorkers={thirdPartyWorkers} currentUser={user} />}
                  </div>
                )}
                {activeTab === 'manual' && <Manual />}
                {activeTab === 'work-mgmt' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex border-b border-slate-300 dark:border-slate-800/50 overflow-x-auto no-scrollbar">
                        <button 
                            className="px-8 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap text-amber-600 dark:text-amber-500"
                        >
                            <div className="flex items-center gap-2">
                                <Calendar size={14} /> Agenda
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 dark:bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                        </button>
                    </div>
                    <div>
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
                         />
                    </div>
                  </div>
                )}
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
      {passwordPromptTab && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
                  <h3 className="text-xl font-bold text-white mb-4">Acesso Restrito</h3>
                  <p className="text-sm text-slate-400 mb-4">Digite a senha para acessar esta área.</p>
                  <input 
                      type="password" 
                      value={passwordInput}
                      onChange={e => setPasswordInput(e.target.value)}
                      onKeyDown={e => {
                          if (e.key === 'Enter') {
                              if (passwordInput === 'Uni@745896321') {
                                  setIsUnlocked(true);
                                  setActiveTab(passwordPromptTab);
                                  setPasswordPromptTab(null);
                                  if (window.innerWidth < 1024) setSidebarOpen(false);
                              } else {
                                  addToast('Senha incorreta!', 'alert');
                              }
                          }
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm mb-4"
                      placeholder="Senha"
                      autoFocus
                  />
                  <div className="flex gap-3">
                      <button onClick={() => setPasswordPromptTab(null)} className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700">Cancelar</button>
                      <button onClick={() => {
                          if (passwordInput === 'Uni@745896321') {
                              setIsUnlocked(true);
                              setActiveTab(passwordPromptTab);
                              setPasswordPromptTab(null);
                              if (window.innerWidth < 1024) setSidebarOpen(false);
                          } else {
                              addToast('Senha incorreta!', 'alert');
                          }
                      }} className="flex-1 px-4 py-2 bg-amber-600 text-slate-950 rounded hover:bg-amber-500 font-bold">Acessar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
export default App;
