
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AppData, Camera, ProcessedWorker, Status, User } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Video, WifiOff, Users, Box, AlertTriangle, MessageSquare, Copy, ShieldAlert, DoorClosed, ShieldCheck, PieChart as PieChartIcon, Ticket, Shield, FileText, Calendar, Briefcase, Save, CheckCircle, Warehouse, Power, Clock, Activity, BellRing, Info, Loader2, Crown, TrendingUp, Building2, History, Edit2, X } from 'lucide-react';
import { monitoringService } from '../services/monitoring';
import { WAREHOUSE_LIST } from '../constants';

interface DashboardProps {
  data: AppData;
  thirdPartyWorkers?: ProcessedWorker[];
  onSetWarehouseStatus?: (warehouse: string, status: Status) => void;
  currentUser?: User | null;
}

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

const Dashboard: React.FC<DashboardProps> = ({ data, thirdPartyWorkers = [], onSetWarehouseStatus, currentUser }) => {
  const { cameras, accessPoints, documents, shiftNotes = [] } = data;
  const [copied, setCopied] = useState(false);
  
  // States para o novo Modal Unificado
  const [selectedCamForInfo, setSelectedCamForInfo] = useState<Camera | null>(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [localTicket, setLocalTicket] = useState('');
  const [localObs, setLocalObs] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const [selectedChartDate, setSelectedChartDate] = useState<string>('');
  const [selectedWarehouseChart, setSelectedWarehouseChart] = useState<string>('ALL');

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const isViewer = currentUser?.role === 'viewer';
  
  const canEditOfflineInfo = isAdmin || isViewer;

  const visibleDevices = useMemo(() => {
      if (isManager && currentUser?.allowedWarehouses) {
          return cameras.filter(c => hasWarehousePermission(currentUser.allowedWarehouses, c.warehouse));
      }
      return cameras;
  }, [cameras, isManager, currentUser]);

  const { videoDevices, alarmDevices } = useMemo(() => {
      return {
          videoDevices: visibleDevices.filter(d => d.channelType === 'video'),
          alarmDevices: visibleDevices.filter(d => d.channelType === 'alarm')
      };
  }, [visibleDevices]);

  const stats = useMemo(() => {
      const onlineVideo = videoDevices.filter(c => c.status === 'ONLINE').length;
      const offlineVideo = videoDevices.filter(c => c.status === 'OFFLINE').length;
      const availVideo = videoDevices.length > 0 ? ((onlineVideo / videoDevices.length) * 100).toFixed(1) : '0.0';
      const onlineAlarm = alarmDevices.filter(c => c.status === 'ONLINE').length;
      const offlineAlarm = alarmDevices.filter(c => c.status === 'OFFLINE').length;

      return { 
          totalVideo: videoDevices.length, onlineVideo, offlineVideo, availVideo,
          totalAlarm: alarmDevices.length, onlineAlarm, offlineAlarm
      };
  }, [videoDevices, alarmDevices]);

  const availabilityNum = parseFloat(stats.availVideo);

  const { totalAccess, accessOnline, accessOffline } = useMemo(() => {
      let subset = accessPoints;
      if (isManager && currentUser?.allowedWarehouses) {
          subset = accessPoints.filter(a => hasWarehousePermission(currentUser.allowedWarehouses, a.warehouse));
      }
      const total = subset.length;
      const online = subset.filter(a => a.status === 'ONLINE').length;
      const offline = subset.filter(a => a.status === 'OFFLINE').length;
      return { totalAccess: total, accessOnline: online, accessOffline: offline };
  }, [accessPoints, isManager, currentUser]);
  
  const { totalPeopleCount, uniqueThirdPartyCount, filteredWorkers, topUnitForDate } = useMemo(() => {
      let filtered = thirdPartyWorkers;
      if (isManager && currentUser?.allowedWarehouses) {
          filtered = thirdPartyWorkers.filter(w => hasWarehousePermission(currentUser.allowedWarehouses, w.unit));
      }
      const availableDates = Array.from(new Set(filtered.map(w => w.date))).filter(d => d && d !== 'N/A').sort().reverse();
      const mostRecentDate = availableDates.length > 0 ? availableDates[0] : null;
      const targetDate = selectedChartDate || mostRecentDate;
      const currentDayWorkers = targetDate ? filtered.filter(w => w.date === targetDate) : [];
      const getUniquePresenceKey = (w: ProcessedWorker) => `${w.unit}-${w.name.toUpperCase()}-${w.company}`;
      const totalUniquePresences = new Set(currentDayWorkers.map(w => getUniquePresenceKey(w))).size;
      const thirdPartyOnly = currentDayWorkers.filter(w => (['B11', 'MULT', 'MPI', 'FORMA', 'SUPERA LOG', 'MJM', 'PRIMUS', 'PRAYLOG']).includes(w.company));
      const tpCount = new Set(thirdPartyOnly.map(w => getUniquePresenceKey(w))).size;
      const unitCounts: { [key: string]: number } = {};
      currentDayWorkers.forEach(w => { unitCounts[w.unit] = (unitCounts[w.unit] || 0) + 1; });
      let maxCount = 0;
      let leadUnit = '---';
      Object.entries(unitCounts).forEach(([u, count]) => {
          if (count > maxCount) { maxCount = count; leadUnit = u; }
      });
      return { totalPeopleCount: totalUniquePresences, uniqueThirdPartyCount: tpCount, filteredWorkers: filtered, topUnitForDate: { name: leadUnit, count: maxCount } };
  }, [thirdPartyWorkers, isManager, currentUser, selectedChartDate]);

  const availableChartDates = useMemo(() => {
      const dates = new Set(filteredWorkers.map(w => w.date));
      return Array.from(dates).sort().reverse().filter(d => d && d !== 'N/A');
  }, [filteredWorkers]);

  useEffect(() => {
      if (!selectedChartDate && availableChartDates.length > 0) setSelectedChartDate(availableChartDates[0]);
  }, [availableChartDates, selectedChartDate]);

  const hourlyData = useMemo(() => {
        const counts = new Array(24).fill(0);
        filteredWorkers.forEach(w => {
            if (w.date !== selectedChartDate) return;
            if (selectedWarehouseChart !== 'ALL' && w.unit !== selectedWarehouseChart) return;
            if (w.time && w.time.includes(':')) {
                const hour = parseInt(w.time.split(':')[0], 10);
                if (!isNaN(hour) && hour >= 0 && hour < 24) counts[hour]++;
            }
        });
        return counts.map((count, hour) => ({ hour: `${hour.toString().padStart(2, '0')}:00`, acessos: count }));
  }, [filteredWorkers, selectedChartDate, selectedWarehouseChart]);

  const { systemState, systemColor } = useMemo(() => {
      let state = 'CRÍTICO';
      let color = 'text-rose-600 dark:text-rose-500';
      if (availabilityNum >= 95) { state = 'ÓTIMO'; color = 'text-emerald-500 dark:text-emerald-400'; }
      else if (availabilityNum >= 70) { state = 'NORMAL'; color = 'text-blue-500 dark:text-blue-400'; }
      else if (availabilityNum >= 40) { state = 'REGULAR'; color = 'text-amber-500 dark:text-amber-400'; }
      return { systemState: state, systemColor: color };
  }, [availabilityNum]);

  const pieData = useMemo(() => [
    { name: 'Online', value: stats.onlineVideo, color: '#10b981' }, 
    { name: 'Offline', value: stats.offlineVideo, color: '#f43f5e' }, 
  ], [stats.onlineVideo, stats.offlineVideo]);

  const offlineDevices = useMemo(() => {
      const getPriority = (location: string) => {
        const criticalKeywords = ['DOCA', 'PORTARIA', 'SERVIDOR', 'ACESSO', 'ENTRADA'];
        const locUpper = location.toUpperCase();
        if (criticalKeywords.some(k => locUpper.includes(k))) return 'CRÍTICO';
        return 'MODERADO';
      };
      return visibleDevices.filter(c => c.status === 'OFFLINE').map(c => ({ ...c, priority: getPriority(c.location) })).sort((a, b) => a.priority === 'CRÍTICO' ? -1 : 1);
  }, [visibleDevices]);

  const sortedShiftNotes = useMemo(() => {
      return [...shiftNotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [shiftNotes]);

  // Handlers para o novo Modal
  const openInfoModal = (cam: Camera, editMode: boolean = false) => {
      setSelectedCamForInfo(cam);
      setLocalTicket(cam.ticket || '');
      setLocalObs(cam.observation || '');
      setIsEditingModal(editMode);
  };

  const closeInfoModal = () => {
      setSelectedCamForInfo(null);
      setIsEditingModal(false);
  };

  const handleSaveInfo = async () => {
      if (!selectedCamForInfo) return;
      setSavingId(selectedCamForInfo.uuid);
      try {
          await monitoringService.updateCameraTicket(selectedCamForInfo.uuid, localTicket, cameras);
          await monitoringService.updateCameraObservation(selectedCamForInfo.uuid, localObs, cameras);
          closeInfoModal();
      } catch (e) {
          alert("Erro ao salvar.");
      } finally {
          setSavingId(null);
      }
  };

  const handleResolveIssue = async (uuid: string) => {
      if (window.confirm("Marcar dispositivo como ONLINE? Isso limpará chamado e observação.")) {
          await monitoringService.resolveCameraIssue(uuid, cameras);
          if (selectedCamForInfo?.uuid === uuid) closeInfoModal();
      }
  };

  const getDocStatus = (expirationDate: string) => {
      const today = new Date();
      const exp = new Date(expirationDate);
      const diffTime = exp.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return { label: 'EXPIRADO', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
      if (diffDays <= 30) return { label: 'ALERTA', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
      return { label: 'VÁLIDO', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
  };

  const whatsAppMessage = useMemo(() => {
    let msg = `*RELATÓRIO DE MONITORAMENTO*\n📅 ${new Date().toLocaleDateString('pt-BR')} - ${new Date().toLocaleTimeString('pt-BR')}\n\n📊 *Status Geral: ${systemState}*\n`;
    if (stats.totalVideo > 0) msg += `📹 *CÂMERAS*\n   Total: ${stats.totalVideo} | 🟢 On: ${stats.onlineVideo} | 🔴 Off: ${stats.offlineVideo}\n   📉 Disponibilidade: ${stats.availVideo}%\n`;
    if (stats.totalAlarm > 0) msg += `🚨 *ALARMES*\n   Total: ${stats.totalAlarm} | 🟢 On: ${stats.onlineAlarm} | 🔴 Off: ${stats.offlineAlarm}\n`;
    if (totalAccess > 0) msg += `🚪 *ACESSOS*\n   Total: ${totalAccess} | 🟢 On: ${accessOnline} | 🔴 Off: ${accessOffline}\n`;
    if (totalPeopleCount > 0) msg += `👷 *PESSOAS*\n   Total Presente: ${totalPeopleCount} (Terceiros: ${uniqueThirdPartyCount})\n`;
    msg += `\n`;
    if (offlineDevices.length > 0) {
      msg += `❗ *OCORRÊNCIAS OFFLINE (${stats.offlineVideo + stats.offlineAlarm}):*\n`;
      offlineDevices.forEach(c => {
        const ticketStr = c.ticket ? ` [Chamado: ${c.ticket}]` : '';
        const obsStr = c.observation ? `\n   📝 Obs: ${c.observation}` : '';
        const typeStr = c.channelType === 'alarm' ? '[ALARME]' : '[CÂMERA]';
        msg += `❌ ${typeStr} *${c.name}*${ticketStr}\n   📍 ${c.location}${obsStr}\n`;
      });
    }
    return msg;
  }, [systemState, stats, totalAccess, accessOnline, accessOffline, totalPeopleCount, uniqueThirdPartyCount, offlineDevices]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(whatsAppMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [whatsAppMessage]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      
      {/* Clock Display removed from Dashboard as it's now in the header */}

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
          </div>
      )}

      {/* KPIs Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${isManager ? 'lg:grid-cols-4' : 'lg:grid-cols-6'} gap-3 sm:gap-4 animate-fade-in`}>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg flex flex-col justify-between">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Câmeras de Vídeo</p>
            <div className="flex justify-between items-end mt-2">
                <span className="text-3xl font-bold text-slate-800 dark:text-white">{stats.totalVideo}</span>
                <Video className="text-blue-500" size={24} />
            </div>
            <div className="mt-2 text-[9px] font-bold flex gap-2">
                <span className="text-emerald-500">ON: {stats.onlineVideo}</span>
                <span className="text-rose-500">OFF: {stats.offlineVideo}</span>
            </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg flex flex-col justify-between">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Canais de Alarme</p>
            <div className="flex justify-between items-end mt-2">
                <span className="text-3xl font-bold text-slate-800 dark:text-white">{stats.totalAlarm}</span>
                <BellRing className="text-amber-500" size={24} />
            </div>
            <div className="mt-2 text-[9px] font-bold flex gap-2">
                <span className="text-emerald-500">ON: {stats.onlineAlarm}</span>
                <span className="text-rose-500">OFF: {stats.offlineAlarm}</span>
            </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg flex flex-col justify-between relative overflow-hidden">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Pontos de Acesso</p>
            <div className="flex justify-between items-end mt-2">
                <span className="text-3xl font-bold text-slate-800 dark:text-white">{totalAccess}</span>
                <DoorClosed className="text-indigo-500" size={24} />
            </div>
            <div className="mt-2 text-[9px] font-bold flex gap-2">
                <span className="text-emerald-500">ON: {accessOnline}</span>
                <span className="text-rose-500">OFF: {accessOffline}</span>
            </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg flex flex-col justify-between group">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Presença Nominal</p>
            <div className="flex items-center gap-4 mt-2">
                <div className="flex flex-col"><span className="text-2xl font-black text-slate-800 dark:text-white leading-none">{totalPeopleCount}</span><span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Total</span></div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
                <div className="flex flex-col"><span className="text-2xl font-black text-blue-600 dark:text-blue-500 leading-none">{uniqueThirdPartyCount}</span><span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-tighter">Parceiros</span></div>
            </div>
        </div>

        {/* Hidden for Managers based on specific request */}
        {!isManager && (
            <>
                <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/30 p-4 rounded-xl shadow-lg flex flex-col justify-between group relative overflow-hidden">
                    <div className="absolute -right-2 -top-2 opacity-5 group-hover:scale-110 transition-transform">
                        <Crown size={60} className="text-amber-500" />
                    </div>
                    <p className="text-amber-600 dark:text-amber-500 text-[10px] uppercase font-black tracking-wider flex items-center gap-1.5">
                        <Crown size={12} /> Líder de Fluxo
                    </p>
                    <div className="mt-2">
                        <span className="text-lg font-black text-slate-800 dark:text-white leading-tight block truncate uppercase tracking-tighter" title={topUnitForDate.name}>
                            {topUnitForDate.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1 text-amber-600 dark:text-amber-400">
                            <TrendingUp size={14} />
                            <span className="text-sm font-mono font-bold">{topUnitForDate.count}</span>
                            <span className="text-[9px] font-bold uppercase opacity-70">Acessos</span>
                        </div>
                    </div>
                    <div className="mt-2 text-[8px] text-slate-400 font-bold uppercase tracking-tighter">
                        Ref: {selectedChartDate ? selectedChartDate.split('-').reverse().join('/') : '-'}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg flex flex-col justify-between">
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Disponibilidade Vídeo</p>
                    <div className="flex justify-between items-end mt-2">
                        <span className={`text-xl font-bold ${systemColor} truncate mr-2`}>{systemState}</span>
                        <span className="text-2xl font-bold text-blue-500">{stats.availVideo}%</span>
                    </div>
                </div>
            </>
        )}
      </div>

      {/* Fluxo de Acessos Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-lg animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-slate-800 dark:text-white font-bold text-lg flex items-center gap-2">
                  <Clock className="text-blue-500" />
                  Fluxo de Acessos
              </h3>
              
              {/* Chart Controls - Hidden for Managers as per request */}
              {!isManager && (
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      {(isAdmin || isViewer) && (
                          <div className="relative w-full sm:w-auto">
                              <select 
                                  value={selectedWarehouseChart} 
                                  onChange={(e) => setSelectedWarehouseChart(e.target.value)}
                                  className="w-full sm:w-48 pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
                              >
                                  <option value="ALL">Todos Galpões</option>
                                  {WAREHOUSE_LIST.map(wh => (
                                      <option key={wh} value={wh}>{wh}</option>
                                  ))}
                              </select>
                              <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                          </div>
                      )}

                      <div className="relative w-full sm:w-auto">
                          <select 
                              value={selectedChartDate} 
                              onChange={(e) => setSelectedChartDate(e.target.value)}
                              className="w-full sm:w-48 pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
                          >
                              {availableChartDates.map(date => (
                                  <option key={date} value={date}>{date.split('-').reverse().join('/')}</option>
                              ))}
                          </select>
                          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                      </div>
                  </div>
              )}
          </div>

          <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                      <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip 
                          cursor={{ fill: '#3b82f610' }}
                          contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                          itemStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="acessos" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
              </ResponsiveContainer>
          </div>
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-800/50 flex items-center gap-3">
              <Info size={16} className="text-blue-500 shrink-0" />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed italic">
                  O gráfico reflete a intensidade de acessos na data de <span className="font-bold text-blue-500">{selectedChartDate.split('-').reverse().join('/')}</span>. 
                  {selectedWarehouseChart !== 'ALL' ? (
                      <> Visualizando dados exclusivos da unidade <span className="font-bold text-purple-500">{selectedWarehouseChart}</span>.</>
                  ) : (
                      <> A unidade com maior carga detectada no dia foi <span className="font-bold text-amber-500">{topUnitForDate.name}</span>.</>
                  )}
              </p>
          </div>
      </div>

      {/* Câmeras Offline Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-900/40 p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-slate-800 dark:text-white font-bold text-sm flex items-center gap-2">
                        <ShieldAlert size={18} className="text-rose-500" /> 
                        Câmeras Offline
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={copyToClipboard} className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white rounded-lg text-[10px] font-black uppercase border border-emerald-500/20 transition-all">
                            {copied ? 'Copiado!' : 'Relatório WhatsApp'}
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                    {offlineDevices.length === 0 ? (
                        <div className="p-20 text-center flex flex-col items-center gap-3">
                            <ShieldCheck size={48} className="text-emerald-500 opacity-20" />
                            <p className="text-slate-500 italic text-sm">Nenhum incidente ativo. Todos os dispositivos estão online.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 text-[10px] uppercase font-bold sticky top-0 z-10 border-b dark:border-slate-800">
                                <tr>
                                    <th className="p-3">Dispositivo / Nome</th>
                                    <th className="p-3 text-center">Informações</th>
                                    <th className="p-3">Tempo Offline</th>
                                    <th className="p-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
                                {offlineDevices.map((cam) => {
                                    const hasInfo = !!(cam.ticket || cam.observation);
                                    return (
                                        <tr key={cam.uuid} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                            <td className="p-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 dark:text-white">{cam.name}</span>
                                                    <span className="text-[9px] uppercase text-slate-500 font-black tracking-tighter">{cam.warehouse} • {cam.location}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <button 
                                                    onClick={() => openInfoModal(cam, false)}
                                                    className={`p-2 rounded-lg transition-all ${hasInfo ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white border border-blue-500/20' : 'text-slate-600 cursor-not-allowed'}`}
                                                    title={hasInfo ? "Ver detalhes do chamado" : "Sem informações registradas"}
                                                    disabled={!hasInfo}
                                                >
                                                    <Info size={18} />
                                                </button>
                                            </td>
                                            <td className="p-3 font-mono text-amber-500 font-bold whitespace-nowrap">
                                                {cam.lastLog || '-'}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex justify-center gap-2">
                                                    {canEditOfflineInfo && (
                                                        <>
                                                            <button 
                                                                onClick={() => openInfoModal(cam, true)}
                                                                className="p-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-slate-950 rounded-lg border border-amber-500/20 transition-all"
                                                                title="Editar informações"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleResolveIssue(cam.uuid)} 
                                                                className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg border border-emerald-500/20 transition-all" 
                                                                title="Marcar como Online"
                                                            >
                                                                <CheckCircle size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            
            {/* DOCUMENTOS MONITORADOS */}
            <div className="bg-[#0d1117] border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-fade-in">
                <div className="p-4 border-b border-slate-800 bg-slate-900/40">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <ShieldAlert size={16} className="text-blue-500" />
                        Documentos Monitorados
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    {documents.length === 0 ? (
                        <div className="p-12 text-center text-slate-600 text-xs italic">Nenhum documento cadastrado.</div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-950 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                                <tr>
                                    <th className="p-4">Documento</th>
                                    <th className="p-4">Órgão</th>
                                    <th className="p-4">Validade</th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {documents.map(doc => {
                                    const status = getDocStatus(doc.expirationDate);
                                    return (
                                        <tr key={doc.uuid} className="hover:bg-slate-800/20 transition-colors group">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                                        <FileText size={18} />
                                                    </div>
                                                    <span className="font-bold text-slate-200 uppercase">{doc.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[11px]">
                                                    <Building2 size={14} className="text-slate-600" />
                                                    {doc.organ}
                                                </div>
                                            </td>
                                            <td className="p-4 font-mono text-[11px] text-slate-300 font-bold">
                                                {new Date(doc.expirationDate).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded text-[10px] font-black border tracking-wider ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>

        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            {/* Relatório de Plantão Preview - Hidden for Managers as requested */}
            {!isManager && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-lg flex flex-col h-[350px]">
                    <h3 className="text-slate-800 dark:text-slate-200 font-bold text-sm mb-3 flex items-center gap-2">
                        <History size={18} className="text-amber-500" /> 
                        Plantão Recente
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                        {sortedShiftNotes.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 italic text-xs">
                                <History size={24} className="opacity-20 mb-2" />
                                Nenhum registro recente.
                            </div>
                        ) : (
                            sortedShiftNotes.slice(0, 10).map(note => (
                                <div key={note.id} className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800/50 space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-amber-500 uppercase truncate max-w-[120px]">{note.author}</span>
                                        <span className="text-[9px] text-slate-500 font-mono">{new Date(note.createdAt).toLocaleDateString('pt-BR')} {new Date(note.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Rede Video Chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-lg relative h-[350px]">
                 <h3 className="text-slate-800 dark:text-slate-200 font-bold text-sm mb-2 flex items-center gap-2"><PieChartIcon size={18} className="text-blue-500" /> Rede Vídeo</h3>
                <div className="h-[250px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value" stroke="none">{pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '8px', fontSize: '10px' }} /><Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} /></PieChart></ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center -mt-3 pointer-events-none"><span className="text-2xl font-bold text-slate-800 dark:text-white block">{stats.totalVideo}</span><span className="text-[8px] text-slate-500 uppercase tracking-widest">Câmeras</span></div>
                </div>
            </div>
        </div>
      </div>

      {/* MODAL UNIFICADO DE INFORMAÇÕES / CHAMADO */}
      {selectedCamForInfo && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-in-right">
                  <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                      <div className="flex flex-col">
                        <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                            {isEditingModal ? <Edit2 size={14} className="text-amber-500" /> : <Info size={14} className="text-blue-500" />}
                            {isEditingModal ? 'Registrar Chamado' : 'Detalhes do Incidente'}
                        </h3>
                        <span className="text-[9px] text-slate-500 font-bold uppercase">{selectedCamForInfo.name}</span>
                      </div>
                      <button onClick={closeInfoModal} className="text-slate-500 hover:text-white"><X size={20}/></button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                      <div className="space-y-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nº do Chamado</label>
                              {isEditingModal ? (
                                  <input 
                                      type="text" 
                                      value={localTicket}
                                      onChange={e => setLocalTicket(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-amber-500 outline-none transition-all font-mono"
                                      placeholder="Ex: TKT-12345"
                                  />
                              ) : (
                                  <div className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-blue-400 font-mono font-bold">
                                      {selectedCamForInfo.ticket || 'Não registrado'}
                                  </div>
                              )}
                          </div>

                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Observação / Justificativa</label>
                              {isEditingModal ? (
                                  <textarea 
                                      rows={4}
                                      value={localObs}
                                      onChange={e => setLocalObs(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-amber-500 outline-none transition-all resize-none italic"
                                      placeholder="Descreva o motivo da queda ou status da manutenção..."
                                  />
                              ) : (
                                  <div className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 italic leading-relaxed min-h-[80px]">
                                      {selectedCamForInfo.observation || 'Nenhuma observação registrada.'}
                                  </div>
                              )}
                          </div>

                          {!isEditingModal && (
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                      <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Localização</span>
                                      <span className="text-xs text-slate-300 font-bold uppercase">{selectedCamForInfo.location}</span>
                                  </div>
                                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                      <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Status Desde</span>
                                      <span className="text-xs text-amber-500 font-mono font-bold">{selectedCamForInfo.lastLog || '-'}</span>
                                  </div>
                              </div>
                          )}
                      </div>

                      <div className="flex gap-3">
                          {isEditingModal ? (
                              <>
                                <button onClick={closeInfoModal} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all">Cancelar</button>
                                <button 
                                    onClick={handleSaveInfo}
                                    disabled={!!savingId}
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                                >
                                    {savingId ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    Salvar Dados
                                </button>
                              </>
                          ) : (
                              <>
                                <button 
                                    onClick={() => handleResolveIssue(selectedCamForInfo.uuid)} 
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={14} /> Resolvido
                                </button>
                                <button 
                                    onClick={() => setIsEditingModal(true)}
                                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2"
                                >
                                    <Edit2 size={14} /> Editar Info
                                </button>
                              </>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default React.memo(Dashboard);
