
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AppData, Camera, ProcessedWorker, Status, User } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Video, WifiOff, Users, Box, AlertTriangle, MessageSquare, Copy, ShieldAlert, DoorClosed, ShieldCheck, PieChart as PieChartIcon, Ticket, Shield, FileText, Calendar, Briefcase, Save, CheckCircle, Warehouse, Power, Clock, Activity } from 'lucide-react';
import { monitoringService } from '../services/monitoring';

interface DashboardProps {
  data: AppData;
  thirdPartyWorkers?: ProcessedWorker[];
  onSetWarehouseStatus?: (warehouse: string, status: Status) => void;
  currentUser?: User | null;
}

const VALID_THIRD_PARTY_COMPANIES = ['B11', 'MULT', 'MPI', 'FORMA', 'SUPERA LOG', 'MJM', 'PRIMUS', 'PRAYLOG'];

// Helper para verificar permissão de forma flexível (Lida com 'G2' vs 'GALPÃO G2')
const hasWarehousePermission = (allowedList: string[] | undefined, targetWarehouse: string) => {
    if (!allowedList || allowedList.length === 0) return false;
    const normalizedTarget = (targetWarehouse || '').toUpperCase();
    
    return allowedList.some(allowed => {
        const normalizedAllowed = allowed.toUpperCase();
        // 1. Match Exato
        if (normalizedAllowed === normalizedTarget) return true;
        // 2. Contém (Ex: 'GALPÃO G2' contém 'G2')
        if (normalizedAllowed.includes(normalizedTarget) || normalizedTarget.includes(normalizedAllowed)) return true;
        // 3. Casos Específicos (Mapeamento manual se necessário)
        if (normalizedAllowed.includes('SP-IP') && normalizedTarget.includes('ITAPEVI')) return true;
        if (normalizedAllowed.includes('PAVUNA') && normalizedTarget.includes('PAVUNA')) return true;
        if (normalizedAllowed.includes('MERITI') && normalizedTarget.includes('MERITI')) return true;
        if (normalizedAllowed.includes('4 ELOS') && normalizedTarget.includes('ELOS')) return true;
        
        return false;
    });
};

const Dashboard: React.FC<DashboardProps> = ({ data, thirdPartyWorkers = [], onSetWarehouseStatus, currentUser }) => {
  const { cameras, accessPoints, documents } = data;
  const [copied, setCopied] = useState(false);
  const [localTickets, setLocalTickets] = useState<{ [key: string]: string }>({});
  const [selectedChartDate, setSelectedChartDate] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const userRole = currentUser?.role;
  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';

  useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
  }, []);

  const visibleCameras = useMemo(() => {
      if (isManager && currentUser?.allowedWarehouses) {
          return cameras.filter(c => hasWarehousePermission(currentUser.allowedWarehouses, c.warehouse));
      }
      return cameras;
  }, [cameras, isManager, currentUser]);

  const visibleAccessPoints = useMemo(() => {
      if (isManager && currentUser?.allowedWarehouses) {
          return accessPoints.filter(a => hasWarehousePermission(currentUser.allowedWarehouses, a.warehouse));
      }
      return accessPoints;
  }, [accessPoints, isManager, currentUser]);


  const { totalCameras, camerasOnline, camerasOffline, availability } = useMemo(() => {
      const total = visibleCameras.length;
      const online = visibleCameras.filter(c => c.status === 'ONLINE').length;
      const offline = visibleCameras.filter(c => c.status === 'OFFLINE').length;
      const avail = total > 0 ? ((online / total) * 100).toFixed(1) : '0.0';
      return { totalCameras: total, camerasOnline: online, camerasOffline: offline, availability: avail };
  }, [visibleCameras]);

  const availabilityNum = parseFloat(availability);

  const { totalAccess, accessOnline, accessOffline } = useMemo(() => {
      const total = visibleAccessPoints.length;
      const online = visibleAccessPoints.filter(a => a.status === 'ONLINE').length;
      const offline = visibleAccessPoints.filter(a => a.status === 'OFFLINE').length;
      return { totalAccess: total, accessOnline: online, accessOffline: offline };
  }, [visibleAccessPoints]);
  
  const { totalPeopleCount, uniqueThirdPartyCount, latestDate, filteredWorkers } = useMemo(() => {
      let filtered = thirdPartyWorkers;
      if (isManager && currentUser?.allowedWarehouses) {
          filtered = thirdPartyWorkers.filter(w => hasWarehousePermission(currentUser.allowedWarehouses, w.unit));
      }

      const availableDates = Array.from(new Set(filtered.map(w => w.date))).filter(d => d && d !== 'N/A').sort().reverse();
      const mostRecentDate = availableDates.length > 0 ? availableDates[0] : null;
      const currentDayWorkers = mostRecentDate ? filtered.filter(w => w.date === mostRecentDate) : [];
      const getUniquePresenceKey = (w: ProcessedWorker) => `${w.unit}-${w.name.toUpperCase()}-${w.company}`;
      const totalUniquePresences = new Set(currentDayWorkers.map(w => getUniquePresenceKey(w))).size;
      const thirdPartyOnly = currentDayWorkers.filter(w => VALID_THIRD_PARTY_COMPANIES.includes(w.company));
      const tpCount = new Set(thirdPartyOnly.map(w => getUniquePresenceKey(w))).size;

      return { totalPeopleCount: totalUniquePresences, uniqueThirdPartyCount: tpCount, latestDate: mostRecentDate, filteredWorkers: filtered };
  }, [thirdPartyWorkers, isManager, currentUser]);

  const availableChartDates = useMemo(() => {
      const dates = new Set(filteredWorkers.map(w => w.date));
      return Array.from(dates).sort().reverse().filter(d => d && d !== 'N/A');
  }, [filteredWorkers]);

  useEffect(() => {
      if (!selectedChartDate && availableChartDates.length > 0) {
          setSelectedChartDate(availableChartDates[0]);
      }
  }, [availableChartDates, selectedChartDate]);

  const hourlyData = useMemo(() => {
        const counts = new Array(24).fill(0);
        filteredWorkers.forEach(w => {
            if (w.date !== selectedChartDate) return;
            if (w.time && w.time.includes(':')) {
                const hour = parseInt(w.time.split(':')[0], 10);
                if (!isNaN(hour) && hour >= 0 && hour < 24) counts[hour]++;
            }
        });
        return counts.map((count, hour) => ({ hour: `${hour.toString().padStart(2, '0')}:00`, acessos: count }));
  }, [filteredWorkers, selectedChartDate]);

  const { systemState, systemColor } = useMemo(() => {
      let state = 'CRÍTICO';
      let color = 'text-rose-600 dark:text-rose-500';
      if (availabilityNum >= 95) { state = 'ÓTIMO'; color = 'text-emerald-500 dark:text-emerald-400'; }
      else if (availabilityNum >= 70) { state = 'NORMAL'; color = 'text-blue-500 dark:text-blue-400'; }
      else if (availabilityNum >= 40) { state = 'REGULAR'; color = 'text-amber-500 dark:text-amber-400'; }
      return { systemState: state, systemColor: color };
  }, [availabilityNum]);

  const pieData = useMemo(() => [
    { name: 'Online', value: camerasOnline, color: '#10b981' }, 
    { name: 'Offline', value: camerasOffline, color: '#f43f5e' }, 
  ], [camerasOnline, camerasOffline]);

  const moduleList = useMemo(() => {
      const stats = visibleCameras.reduce((acc: any, curr) => {
        const mod = curr.module || 'Geral';
        if (!acc[mod]) acc[mod] = { name: mod, online: 0, offline: 0, total: 0 };
        if (curr.status === 'ONLINE') acc[mod].online++;
        else acc[mod].offline++;
        acc[mod].total++;
        return acc;
      }, {});
      return Object.values(stats).sort((a: any, b: any) => b.offline - a.offline);
  }, [visibleCameras]);

  const responsibleList = useMemo(() => {
      const stats = visibleCameras.reduce((acc: any, curr) => {
        const resp = curr.responsible || 'Sem Resp.';
        if (!acc[resp]) acc[resp] = { name: resp, offline: 0, total: 0 };
        acc[resp].total++;
        if (curr.status === 'OFFLINE') acc[resp].offline++;
        return acc;
      }, {});
      return Object.values(stats).sort((a: any, b: any) => {
          if (b.offline !== a.offline) return b.offline - a.offline;
          return a.name.localeCompare(b.name);
      });
  }, [visibleCameras]);

  const warehouseList = useMemo(() => {
      const stats = visibleCameras.reduce((acc: any, curr) => {
        const wh = curr.warehouse || 'Geral';
        if (!acc[wh]) acc[wh] = { name: wh, online: 0, offline: 0, total: 0 };
        if (curr.status === 'ONLINE') acc[wh].online++;
        else acc[wh].offline++;
        acc[wh].total++;
        return acc;
      }, {});
      return Object.values(stats).sort((a: any, b: any) => b.offline - a.offline);
  }, [visibleCameras]);

  const offlineCameras = useMemo(() => {
      const getPriority = (location: string) => {
        const criticalKeywords = ['DOCA', 'PORTARIA', 'SERVIDOR', 'ACESSO', 'ENTRADA'];
        const locUpper = location.toUpperCase();
        if (criticalKeywords.some(k => locUpper.includes(k))) return 'CRÍTICO';
        return 'MODERADO';
      };
      return visibleCameras.filter(c => c.status === 'OFFLINE').map(c => ({ ...c, priority: getPriority(c.location) })).sort((a, b) => a.priority === 'CRÍTICO' ? -1 : 1);
  }, [visibleCameras]);

  const expiringDocuments = useMemo(() => {
      return (documents || []).map(doc => {
          const today = new Date();
          const expDate = new Date(doc.expirationDate);
          const diffTime = expDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          let status: 'VALID' | 'WARNING' | 'EXPIRED' = 'VALID';
          if (diffDays < 0) status = 'EXPIRED'; else if (diffDays <= 30) status = 'WARNING';
          return { ...doc, diffDays, status };
      }).filter(d => d.status !== 'VALID').sort((a, b) => a.diffDays - b.diffDays);
  }, [documents]);

  const handleTicketChange = (uuid: string, value: string) => setLocalTickets(prev => ({ ...prev, [uuid]: value }));
  const handleSaveTicket = async (uuid: string) => {
      const ticketValue = localTickets[uuid];
      if (ticketValue !== undefined) {
          await monitoringService.updateCameraTicket(uuid, ticketValue, cameras);
          setLocalTickets(prev => { const newState = { ...prev }; delete newState[uuid]; return newState; });
          alert("Chamado salvo!");
      }
  };
  const handleResolveTicket = async (uuid: string) => {
      if (window.confirm("Marcar como ONLINE?")) {
          await monitoringService.resolveCameraIssue(uuid, cameras);
          setLocalTickets(prev => { const newState = { ...prev }; delete newState[uuid]; return newState; });
      }
  };

  const handleWarehouseBulkAction = (warehouseName: string) => {
      if (onSetWarehouseStatus && isAdmin) {
          if (window.confirm(`Ligar todas as câmeras de "${warehouseName}"?`)) onSetWarehouseStatus(warehouseName, 'ONLINE');
      }
  };

  const whatsAppMessage = useMemo(() => {
    let msg = `*RELATÓRIO DE MONITORAMENTO*\n📅 ${new Date().toLocaleDateString('pt-BR')} - ${new Date().toLocaleTimeString('pt-BR')}\n\n📊 *Status Geral: ${systemState}*\n`;
    if (totalCameras > 0) msg += `📹 *CÂMERAS*\n   Total: ${totalCameras} | 🟢 On: ${camerasOnline} | 🔴 Off: ${camerasOffline}\n   📉 Disponibilidade: ${availability}%\n`;
    if (totalAccess > 0) msg += `🚪 *ACESSOS*\n   Total: ${totalAccess} | 🟢 On: ${accessOnline} | 🔴 Off: ${accessOffline}\n`;
    if (totalPeopleCount > 0) msg += `👷 *PESSOAS*\n   Total Presente: ${totalPeopleCount} (Terceiros: ${uniqueThirdPartyCount})\n`;
    msg += `\n`;
    if (offlineCameras.length > 0) {
      msg += `❗ *CÂMERAS OFFLINE (${camerasOffline}):*\n`;
      offlineCameras.forEach(c => {
        const ticket = c.ticket || localTickets[c.uuid]; 
        const ticketStr = ticket ? ` [Chamado: ${ticket}]` : '';
        msg += `❌ *${c.name}*${ticketStr}\n   📍 ${c.location}\n`;
      });
    }
    return msg;
  }, [systemState, totalCameras, camerasOnline, camerasOffline, availability, totalAccess, accessOnline, accessOffline, totalPeopleCount, uniqueThirdPartyCount, offlineCameras, localTickets]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(whatsAppMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [whatsAppMessage]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      
      {isManager && (
          <div className="bg-slate-900 p-4 sm:p-6 rounded-xl border border-purple-500/30 mb-2 flex flex-col md:flex-row justify-between items-center shadow-lg shadow-purple-900/10 relative overflow-hidden animate-fade-in gap-4">
              <div className="absolute top-0 left-0 w-1 sm:w-1.5 h-full bg-purple-500"></div>
              <div className="w-full md:w-auto text-center md:text-left">
                  <h2 className="text-white font-bold text-lg sm:text-xl flex items-center justify-center md:justify-start gap-2">
                      <Shield className="text-purple-500 fill-purple-500/20" size={24} />
                      Painel do Gestor
                  </h2>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-slate-400 text-xs sm:text-sm mt-1">
                      <Warehouse size={16} className="text-purple-400" />
                      <span className="font-medium text-slate-300 truncate max-w-[200px] sm:max-w-none">
                          {currentUser?.allowedWarehouses && currentUser.allowedWarehouses.length > 0 ? currentUser.allowedWarehouses.join(', ') : 'Sem Unidade'}
                      </span>
                  </div>
              </div>
              <div className="text-center md:text-right bg-slate-950/50 p-3 rounded-lg border border-slate-800 min-w-full sm:min-w-[200px]">
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-widest flex items-center justify-center md:justify-end gap-2">
                      <Clock size={24} className="text-purple-500 animate-pulse" />
                      {currentTime.toLocaleTimeString('pt-BR')}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                      {currentTime.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
              </div>
          </div>
      )}

      {/* 1. Header Summary - Optimized for Mobile Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 animate-fade-in">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg flex flex-col justify-between">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Câmeras</p>
            <div className="flex justify-between items-end mt-2">
                <span className="text-3xl font-bold text-slate-800 dark:text-white">{totalCameras}</span>
                <Video className="text-slate-400 dark:text-slate-700 mb-1" size={24} />
            </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg flex flex-col justify-between">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Online</p>
            <div className="flex justify-between items-end mt-2">
                <span className="text-3xl font-bold text-emerald-500 dark:text-emerald-400">{camerasOnline}</span>
                {totalCameras > 0 && <div className="h-1.5 flex-1 mx-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-2 hidden sm:block"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(camerasOnline/totalCameras)*100}%` }}></div></div>}
            </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg flex flex-col justify-between relative overflow-hidden">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Offline</p>
            <div className="flex justify-between items-end mt-2">
                <span className={`text-3xl font-bold ${camerasOffline > 0 ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`}>{camerasOffline}</span>
                <WifiOff className={`text-slate-300 dark:text-slate-700 ${camerasOffline > 0 ? 'animate-pulse text-rose-500' : ''}`} size={24} />
            </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg flex flex-col justify-between group">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Presentes Agora</p>
            <div className="flex items-center gap-4 mt-2">
                <div className="flex flex-col"><span className="text-2xl font-black text-slate-800 dark:text-white leading-none">{totalPeopleCount}</span><span className="text-[9px] text-slate-500 font-bold">TOTAL</span></div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
                <div className="flex flex-col"><span className="text-2xl font-black text-blue-600 dark:text-blue-500 leading-none">{uniqueThirdPartyCount}</span><span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase">Parceiros</span></div>
            </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg flex flex-col justify-between sm:col-span-2 md:col-span-1">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Disponibilidade</p>
            <div className="flex justify-between items-end mt-2">
                <span className={`text-xl font-bold ${systemColor} truncate mr-2`}>{systemState}</span>
                <span className="text-2xl font-bold text-blue-500">{availability}%</span>
            </div>
        </div>
      </div>
      
      {totalAccess > 0 && (
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 animate-fade-in">
             <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg flex items-center justify-between">
                 <div><p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Acessos Total</p><span className="text-2xl font-bold text-slate-800 dark:text-white">{totalAccess}</span></div>
                 <DoorClosed className="text-slate-400 dark:text-slate-700" size={24} />
             </div>
             <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg flex items-center justify-between">
                 <div><p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Online</p><span className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">{accessOnline}</span></div>
                 <ShieldCheck className="text-emerald-500/50" size={24} />
             </div>
             <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg flex items-center justify-between">
                 <div><p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Offline</p><span className={`text-2xl font-bold ${accessOffline > 0 ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`}>{accessOffline}</span></div>
                 <AlertTriangle className={`${accessOffline > 0 ? 'text-rose-500' : 'text-slate-400 dark:text-slate-700'}`} size={24} />
             </div>
         </div>
      )}

      {/* Fluxo de Acessos Chart - Optimized Height for Mobile */}
      <div className="animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
                    <h3 className="text-sm sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Clock size={20} className="text-blue-500" /> Fluxo de Acessos
                    </h3>
                    <div className="relative w-full sm:w-auto">
                        <select value={selectedChartDate} onChange={(e) => setSelectedChartDate(e.target.value)} className="w-full pl-3 pr-8 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-700 dark:text-slate-300 appearance-none cursor-pointer" disabled={availableChartDates.length === 0}>
                            {availableChartDates.length > 0 ? availableChartDates.map(date => (<option key={date} value={date}>{date.split('-').reverse().join('/')}</option>)) : <option value="">Sem dados</option>}
                        </select>
                        <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                    </div>
                </div>
                <div className="h-[200px] sm:h-[250px] w-full">
                    {filteredWorkers.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourlyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '8px', fontSize: '10px' }} cursor={{ fill: '#334155', opacity: 0.1 }} />
                                <Bar dataKey="acessos" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full text-slate-500 italic text-xs">Sem registros.</div>}
                </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            {expiringDocuments.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-4 sm:p-5 rounded-xl shadow-lg flex flex-col">
                    <h3 className="text-amber-600 dark:text-amber-400 font-bold text-sm mb-3 flex items-center gap-2"><AlertTriangle size={18} /> Validade Órgãos Públicos</h3>
                    <div className="space-y-2">
                        {expiringDocuments.map(doc => (
                            <div key={doc.uuid} className="bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                <div className="overflow-hidden mr-2">
                                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{doc.name}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{doc.organ}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${doc.status === 'EXPIRED' ? 'bg-rose-500 text-white' : 'bg-yellow-500 text-black'}`}>{doc.status === 'EXPIRED' ? 'VENCIDO' : `${doc.diffDays}d`}</div>
                                    <p className="text-[9px] text-slate-500 mt-1">{new Date(doc.expirationDate).toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!isManager && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-xl shadow-lg flex flex-col max-h-[400px]">
                    <h3 className="text-amber-600 dark:text-amber-400 font-bold text-sm mb-3 flex items-center gap-2"><Ticket size={18} /> Chamados Offline</h3>
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
                        {offlineCameras.length === 0 ? <div className="text-center py-6 text-slate-500 text-xs italic"><ShieldCheck size={24} className="mx-auto mb-2 opacity-50" />Tudo operando!</div> : 
                            offlineCameras.map(cam => {
                                const currentValue = localTickets[cam.uuid] !== undefined ? localTickets[cam.uuid] : (cam.ticket || '');
                                const isDirty = (localTickets[cam.uuid] !== undefined) && (localTickets[cam.uuid] !== (cam.ticket || ''));
                                return (
                                    <div key={cam.uuid} className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                                        <div className="flex justify-between items-start mb-2"><div className="overflow-hidden"><p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{cam.name}</p><p className="text-[9px] text-slate-500 truncate">{cam.location}</p></div><button onClick={() => handleResolveTicket(cam.uuid)} className="text-emerald-500 p-1 hover:bg-emerald-500/10 rounded"><CheckCircle size={16} /></button></div>
                                        <div className="flex items-center gap-2"><input type="text" placeholder="Nº Chamado..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-[10px] text-slate-800 dark:text-slate-200 focus:outline-none" value={currentValue} onChange={(e) => handleTicketChange(cam.uuid, e.target.value)} />{isDirty && <button onClick={() => handleSaveTicket(cam.uuid)} className="text-blue-500 p-1"><Save size={16} /></button>}</div>
                                    </div>
                                );
                            })
                        }
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-xl shadow-lg flex flex-col h-full max-h-[350px]">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-emerald-500 dark:text-emerald-400 font-bold text-sm flex items-center gap-2"><MessageSquare size={18} /> Relatório WhatsApp</h3>
                    <button onClick={copyToClipboard} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold uppercase">{copied ? 'OK' : 'Copiar'}</button>
                </div>
                <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 overflow-y-auto text-[10px] font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{whatsAppMessage}</div>
            </div>
        </div>

        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-lg relative min-h-[250px]">
                 <h3 className="text-slate-800 dark:text-slate-200 font-bold text-sm mb-2 flex items-center gap-2"><PieChartIcon size={18} className="text-blue-500" /> Status da Rede</h3>
                <div className="h-[200px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value" stroke="none">{pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '8px', fontSize: '10px' }} /><Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} /></PieChart></ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center -mt-3 pointer-events-none"><span className="text-2xl font-bold text-slate-800 dark:text-white block">{totalCameras}</span><span className="text-[8px] text-slate-500 uppercase tracking-widest">Total</span></div>
                </div>
            </div>

            {camerasOffline > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/30 rounded-xl shadow-lg overflow-hidden">
                    <div className="bg-rose-50 dark:bg-rose-950/20 p-4 border-b border-rose-100 dark:border-rose-900/20 flex justify-between items-center"><h3 className="text-rose-500 dark:text-rose-400 font-bold text-sm flex items-center gap-2"><ShieldAlert size={18} /> Câmeras Offline</h3></div>
                    <div className="overflow-x-auto max-h-[300px] custom-scrollbar">
                        <table className="w-full text-left text-xs"><thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 text-[10px] uppercase sticky top-0 z-10"><tr><th className="p-3">Nível</th><th className="p-3">Nome</th><th className="p-3">Resp.</th></tr></thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
                                {offlineCameras.map((cam, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50"><td className="p-3"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${cam.priority === 'CRÍTICO' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>{cam.priority}</span></td><td className="p-3 font-bold truncate max-w-[100px]">{cam.name}</td><td className="p-3 text-[10px] truncate max-w-[80px]">{cam.responsible}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-xl shadow-lg flex flex-col">
                    <h3 className="text-slate-800 dark:text-slate-200 font-bold text-sm mb-4 flex items-center gap-2"><Warehouse size={18} className="text-indigo-500" /> Por Galpão</h3>
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                        {warehouseList.map((wh: any, idx) => {
                            const isGreen = wh.offline === 0;
                            return (
                                <div key={idx} className="p-3 rounded bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                                    <div className="flex justify-between items-center overflow-hidden"><span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate mr-2" title={wh.name}>{wh.name}</span><span className={`text-[10px] font-bold ${isGreen ? 'text-emerald-500' : 'text-rose-500'}`}>{wh.online}/{wh.total} ON</span></div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden"><div className={`h-full ${isGreen ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${(wh.online / wh.total) * 100}%` }}></div></div>
                                    {!isGreen && isAdmin && onSetWarehouseStatus && <button onClick={() => handleWarehouseBulkAction(wh.name)} className="mt-1 w-full py-1.5 bg-emerald-600/10 text-emerald-600 text-[9px] font-bold uppercase rounded border border-emerald-600/20">Ligar Todas</button>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-xl shadow-lg">
                    <h3 className="text-slate-800 dark:text-slate-200 font-bold text-sm mb-4 flex items-center gap-2"><Box size={18} className="text-blue-500" /> Análise Módulos</h3>
                    <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                        {moduleList.length > 0 ? moduleList.map((mod: any, idx) => {
                            const isGreen = mod.offline === 0;
                            return (
                                <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/40 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors">
                                    <div className="flex items-center gap-2 overflow-hidden"><div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isGreen ? 'bg-emerald-500' : mod.offline <= 2 ? 'bg-amber-500' : 'bg-rose-500'}`}></div><span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">{mod.name}</span></div>
                                    <span className={`text-[10px] font-bold ${isGreen ? 'text-emerald-500' : 'text-rose-500'} shrink-0`}>{isGreen ? '100%' : `${mod.offline} OFF`}</span>
                                </div>
                            )
                        }) : <p className="text-slate-500 text-[10px] italic">Sem dados.</p>}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-xl shadow-lg sm:col-span-2">
                    <h3 className="text-slate-800 dark:text-slate-200 font-bold text-sm mb-4 flex items-center gap-2"><Users size={18} className="text-slate-400" /> Status Responsáveis</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                        {responsibleList.map((resp: any, idx) => {
                            const hasPending = resp.offline > 0;
                            return (
                                <div key={idx} className="flex justify-between items-center p-2.5 rounded bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 overflow-hidden"><div className="flex flex-col overflow-hidden mr-2"><span className="text-[11px] text-slate-700 dark:text-slate-300 font-bold truncate">{resp.name}</span><span className="text-[9px] text-slate-500">{resp.total} total</span></div>{hasPending ? <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-500 text-[9px] font-black border border-rose-500/20">{resp.offline} OFF</span> : <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/10 text-emerald-500 text-[9px] font-black border border-emerald-500/20">OK</span>}</div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Dashboard);
