
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AppData, Camera, ProcessedWorker, Status, User } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Video, WifiOff, Users, Box, AlertTriangle, MessageSquare, Copy, ShieldAlert, DoorClosed, ShieldCheck, PieChart as PieChartIcon, Ticket, Shield, FileText, Calendar, Briefcase, Save, CheckCircle, Warehouse, Power, Clock, Activity, BellRing } from 'lucide-react';
import { monitoringService } from '../services/monitoring';

interface DashboardProps {
  data: AppData;
  thirdPartyWorkers?: ProcessedWorker[];
  onSetWarehouseStatus?: (warehouse: string, status: Status) => void;
  currentUser?: User | null;
}

const VALID_THIRD_PARTY_COMPANIES = ['B11', 'MULT', 'MPI', 'FORMA', 'SUPERA LOG', 'MJM', 'PRIMUS', 'PRAYLOG'];

const hasWarehousePermission = (allowedList: string[] | undefined, targetWarehouse: string) => {
    if (!allowedList || allowedList.length === 0) return false;
    const normalizedTarget = (targetWarehouse || '').toUpperCase();
    return allowedList.some(allowed => {
        const normalizedAllowed = allowed.toUpperCase();
        if (normalizedAllowed === normalizedTarget) return true;
        if (normalizedAllowed.includes(normalizedTarget) || normalizedTarget.includes(normalizedAllowed)) return true;
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

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';

  useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
  }, []);

  const visibleDevices = useMemo(() => {
      if (isManager && currentUser?.allowedWarehouses) {
          return cameras.filter(c => hasWarehousePermission(currentUser.allowedWarehouses, c.warehouse));
      }
      return cameras;
  }, [cameras, isManager, currentUser]);

  // FILTRAGEM POR TIPO
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
  
  const { totalPeopleCount, uniqueThirdPartyCount, filteredWorkers } = useMemo(() => {
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
      return { totalPeopleCount: totalUniquePresences, uniqueThirdPartyCount: tpCount, filteredWorkers: filtered };
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
        const ticket = c.ticket || localTickets[c.uuid]; 
        const ticketStr = ticket ? ` [Chamado: ${ticket}]` : '';
        const typeStr = c.channelType === 'alarm' ? '[ALARME]' : '[CÂMERA]';
        msg += `❌ ${typeStr} *${c.name}*${ticketStr}\n   📍 ${c.location}\n`;
      });
    }
    return msg;
  }, [systemState, stats, totalAccess, accessOnline, accessOffline, totalPeopleCount, uniqueThirdPartyCount, offlineDevices, localTickets]);

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
              </div>
          </div>
      )}

      {/* Grid Principal de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 animate-fade-in">
        
        {/* Card Câmeras */}
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

        {/* Card Alarmes */}
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

        {/* Card Acessos */}
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

        {/* Card Pessoas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg flex flex-col justify-between group">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Presença Nominal</p>
            <div className="flex items-center gap-4 mt-2">
                <div className="flex flex-col"><span className="text-2xl font-black text-slate-800 dark:text-white leading-none">{totalPeopleCount}</span><span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Total</span></div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
                <div className="flex flex-col"><span className="text-2xl font-black text-blue-600 dark:text-blue-500 leading-none">{uniqueThirdPartyCount}</span><span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-tighter">Parceiros</span></div>
            </div>
        </div>

        {/* Disponibilidade */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg flex flex-col justify-between sm:col-span-2 md:col-span-1">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Disponibilidade Vídeo</p>
            <div className="flex justify-between items-end mt-2">
                <span className={`text-xl font-bold ${systemColor} truncate mr-2`}>{systemState}</span>
                <span className="text-2xl font-bold text-blue-500">{stats.availVideo}%</span>
            </div>
        </div>
      </div>

      {/* Gráfico de Acessos */}
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

      {/* Relatórios e Incidentes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            {!isManager && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-xl shadow-lg flex flex-col max-h-[400px]">
                    <h3 className="text-amber-600 dark:text-amber-400 font-bold text-sm mb-3 flex items-center gap-2"><Ticket size={18} /> Chamados Offline</h3>
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
                        {offlineDevices.length === 0 ? <div className="text-center py-6 text-slate-500 text-xs italic"><ShieldCheck size={24} className="mx-auto mb-2 opacity-50" />Tudo operando!</div> : 
                            offlineDevices.map(cam => {
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
                 <h3 className="text-slate-800 dark:text-slate-200 font-bold text-sm mb-2 flex items-center gap-2"><PieChartIcon size={18} className="text-blue-500" /> Rede Vídeo</h3>
                <div className="h-[200px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value" stroke="none">{pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '8px', fontSize: '10px' }} /><Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} /></PieChart></ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center -mt-3 pointer-events-none"><span className="text-2xl font-bold text-slate-800 dark:text-white block">{stats.totalVideo}</span><span className="text-[8px] text-slate-500 uppercase tracking-widest">Câmeras</span></div>
                </div>
            </div>

            {offlineDevices.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/30 rounded-xl shadow-lg overflow-hidden">
                    <div className="bg-rose-50 dark:bg-rose-950/20 p-4 border-b border-rose-100 dark:border-rose-900/20 flex justify-between items-center"><h3 className="text-rose-500 dark:text-rose-400 font-bold text-sm flex items-center gap-2"><ShieldAlert size={18} /> Dispositivos Offline</h3></div>
                    <div className="overflow-x-auto max-h-[300px] custom-scrollbar">
                        <table className="w-full text-left text-xs"><thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 text-[10px] uppercase font-bold sticky top-0 z-10"><tr><th className="p-3">Tipo</th><th className="p-3">Nome</th><th className="p-3">Unidade</th><th className="p-3">Nível</th></tr></thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
                                {offlineDevices.map((cam, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="p-3"><span className="text-[9px] font-black uppercase text-slate-500">{cam.channelType === 'alarm' ? 'Alarme' : 'Vídeo'}</span></td>
                                        <td className="p-3 font-bold truncate max-w-[120px]">{cam.name}</td>
                                        <td className="p-3 text-[10px] truncate max-w-[100px]">{cam.warehouse}</td>
                                        <td className="p-3"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${cam.priority === 'CRÍTICO' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>{cam.priority}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(Dashboard);
