
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AppData, Camera, ProcessedWorker, Status, User, Alarm } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Video, WifiOff, Users, Box, AlertTriangle, MessageSquare, ShieldAlert, DoorClosed, ShieldCheck, PieChart as PieChartIcon, Shield, Warehouse, Clock, BellRing, Activity } from 'lucide-react';
import { monitoringService } from '../services/monitoring';

interface DashboardProps {
  data: AppData;
  thirdPartyWorkers?: ProcessedWorker[];
  onSetWarehouseStatus?: (warehouse: string, status: Status) => void;
  currentUser?: User | null;
}

const Dashboard: React.FC<DashboardProps> = ({ data, thirdPartyWorkers = [], onSetWarehouseStatus, currentUser }) => {
  const { cameras, alarms = [], accessPoints, documents } = data;
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const userRole = currentUser?.role;
  const isManager = userRole === 'manager';

  useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
  }, []);

  // --- FILTRO PERMISSÕES ---
  const visibleCameras = useMemo(() => {
      if (isManager && currentUser?.allowedWarehouses) {
          return cameras.filter(c => currentUser.allowedWarehouses?.includes(c.warehouse));
      }
      return cameras;
  }, [cameras, isManager, currentUser]);

  const visibleAlarms = useMemo(() => {
      if (isManager && currentUser?.allowedWarehouses) {
          return alarms.filter(a => currentUser.allowedWarehouses?.includes(a.warehouse));
      }
      return alarms;
  }, [alarms, isManager, currentUser]);

  // --- MÉTRICAS CÂMERAS ---
  const { totalCameras, camerasOnline, camerasOffline, availability } = useMemo(() => {
      const total = visibleCameras.length;
      const online = visibleCameras.filter(c => c.status === 'ONLINE').length;
      const offline = visibleCameras.filter(c => c.status === 'OFFLINE').length;
      const avail = total > 0 ? ((online / total) * 100).toFixed(1) : '0.0';
      return { totalCameras: total, camerasOnline: online, camerasOffline: offline, availability: avail };
  }, [visibleCameras]);

  // --- MÉTRICAS ALARMES ---
  const { totalAlarms, alarmsOnline, alarmsOffline } = useMemo(() => {
      const total = visibleAlarms.length;
      const online = visibleAlarms.filter(a => a.status === 'ONLINE').length;
      const offline = visibleAlarms.filter(a => a.status === 'OFFLINE').length;
      return { totalAlarms: total, alarmsOnline: online, alarmsOffline: offline };
  }, [visibleAlarms]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* 1. Header Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 animate-fade-in">
        
        {/* Card Câmeras */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg flex flex-col justify-between group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 -mr-8 -mt-8 rounded-full"></div>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Câmeras de Vídeo</p>
            <div className="flex justify-between items-end mt-2">
                <div className="flex flex-col">
                    <span className="text-3xl font-black text-slate-800 dark:text-white">{totalCameras}</span>
                    <span className="text-[10px] text-emerald-500 font-bold">{camerasOnline} ONLINE</span>
                </div>
                <Video className="text-blue-500/40 group-hover:scale-110 transition-transform" size={28} />
            </div>
        </div>

        {/* Card Alarmes (NOVO) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg flex flex-col justify-between group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 -mr-8 -mt-8 rounded-full"></div>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Alarmes Unidade</p>
            <div className="flex justify-between items-end mt-2">
                <div className="flex flex-col">
                    <span className="text-3xl font-black text-slate-800 dark:text-white">{totalAlarms}</span>
                    <span className={`text-[10px] font-bold ${alarmsOffline > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {alarmsOffline > 0 ? `${alarmsOffline} OFFLINE` : 'TUDO OK'}
                    </span>
                </div>
                <BellRing className={`${alarmsOffline > 0 ? 'text-rose-500' : 'text-amber-500/40'} group-hover:scale-110 transition-transform`} size={28} />
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg flex flex-col justify-between">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Acessos Portaria</p>
            <div className="flex justify-between items-end mt-2">
                <span className="text-3xl font-bold text-slate-800 dark:text-white">{accessPoints.length}</span>
                <DoorClosed className="text-slate-400/50" size={28} />
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg flex flex-col justify-between">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Disponibilidade</p>
            <div className="flex justify-between items-end mt-2">
                <span className="text-3xl font-black text-blue-500">{availability}%</span>
                <Activity className="text-blue-500/20" size={28} />
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg flex flex-col justify-between">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Pessoas Unid.</p>
            <div className="flex justify-between items-end mt-2">
                <span className="text-3xl font-bold text-slate-800 dark:text-white">{thirdPartyWorkers.length}</span>
                <Users className="text-emerald-500/30" size={28} />
            </div>
        </div>
      </div>
      
      {/* Restante do conteúdo do dashboard... */}
    </div>
  );
};

export default Dashboard;
