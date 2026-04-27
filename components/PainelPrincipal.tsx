import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { AppData, Camera, AccessPoint, ProcessedWorker, Status, User } from '../types';
import { Shield, Warehouse, FileText, CheckCircle2 } from 'lucide-react';
import { monitoringService } from '../services/monitoring';
import { WAREHOUSE_LIST, RESPONSIBLE_WAREHOUSE_MAP } from '../constants';

// Sub-components
import StatsGrid from './dashboard/StatsGrid';
import AccessFlowChart from './dashboard/AccessFlowChart';
import OfflineDevicesSection from './dashboard/OfflineDevicesSection';
import DocumentMonitoring from './dashboard/DocumentMonitoring';
import ShiftNotes from './dashboard/ShiftNotes';
import PersonalSearch from './dashboard/PersonalSearch';
import IncidentModal from './dashboard/IncidentModal';

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

const PainelPrincipal: React.FC<DashboardProps> = ({ data, thirdPartyWorkers = [], onSetWarehouseStatus, currentUser }) => {
  const { cameras, accessPoints, documents, shiftNotes = [] } = data;
  const [copied, setCopied] = useState(false);
  
  const parseDate = (dateStr?: string) => {
      if (!dateStr) return null;
      const brMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
      if (brMatch) {
          return new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]), Number(brMatch[4] || 0), Number(brMatch[5] || 0), Number(brMatch[6] || 0));
      }
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
  };

  const normalizeWH = useCallback((val: string | undefined): string => {
      if (!val) return 'N/A';
      const v = val.toUpperCase().trim();
      if (v.includes('G2 - GALPÃO') || (v.includes('G2') && v.includes('GALPÃO')) || v === 'G2' || v.includes('- G2 -')) return 'GALPÃO G2';
      if (v.includes('G3 - GALPÃO') || (v.includes('G3') && v.includes('GALPÃO')) || v === 'G3' || v.includes('- G3 -')) return 'GALPÃO G3';
      if (v.includes('G5 - GALPÃO') || (v.includes('G5') && v.includes('GALPÃO')) || v === 'G5' || v.includes('- G5 -')) return 'GALPÃO G5';
      if (v.includes('IP - GALPÃO') || (v.includes('IP') && v.includes('GALPÃO')) || v === 'IP' || v.includes('- IP -') || v === 'SP' || v.includes('- SP -')) return 'GALPÃO SP';
      if (v.includes('4ELOS') && (v.includes('RJ') || v.includes('LOGÍSTICA'))) return 'GALPÃO 4 ELOS RJ';
      return val;
  }, []);

  const occurrenceStats = useMemo(() => {
      let all = (data.occurrenceImports || []).flatMap(imp => imp.occurrences || []);
      
      if (currentUser?.role === 'manager' && currentUser?.allowedWarehouses && currentUser.allowedWarehouses.length > 0) {
          all = all.filter(o => {
              // 1. Identify warehouse from text fields (prioritize this)
              const whCliente = normalizeWH(o.cliente);
              const whEmpresa = normalizeWH(o.empresa);
              const whTarefa = normalizeWH(o.tarefa);
              const whExplicit = o.armazem && o.armazem !== 'N/A' ? o.armazem : null;

              const detectedWH = (whExplicit || 
                                (whCliente !== o.cliente ? whCliente : null) || 
                                (whEmpresa !== o.empresa ? whEmpresa : null) ||
                                (whTarefa !== o.tarefa ? whTarefa : null));

              if (detectedWH && detectedWH !== 'N/A') {
                  return currentUser.allowedWarehouses?.includes(detectedWH);
              }

              // 2. Fallback to Responsible Map only if no warehouse detected in text
              const resp = o.responsaveis;
              if (resp) {
                  const names = resp.split(',').map(n => n.trim().toUpperCase());
                  return names.some(name => {
                      const mappedWH = RESPONSIBLE_WAREHOUSE_MAP[name];
                      return mappedWH && currentUser.allowedWarehouses?.includes(mappedWH);
                  });
              }

              return false;
          });
      }

      const count = all.length;
      if (count === 0) return { count: 0, range: '---' };
      const dates = all.map(o => parseDate(o.criadoEm)).filter(Boolean) as Date[];
      if (dates.length === 0) return { count, range: '---' };
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      const format = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      return { count, range: `${format(minDate)} até ${format(maxDate)}` };
  }, [data.occurrenceImports, currentUser, normalizeWH]);

  const requestStats = useMemo(() => {
      let all = (data.requestImports || []).flatMap(imp => imp.occurrences || []);

      if (currentUser?.role === 'manager' && currentUser?.allowedWarehouses && currentUser.allowedWarehouses.length > 0) {
          all = all.filter(o => {
              // 1. Identify warehouse from text fields (prioritize this)
              const whCliente = normalizeWH(o.cliente);
              const whEmpresa = normalizeWH(o.empresa);
              const whTarefa = normalizeWH(o.tarefa);
              const whExplicit = o.armazem && o.armazem !== 'N/A' ? o.armazem : null;

              const detectedWH = (whExplicit || 
                                (whCliente !== o.cliente ? whCliente : null) || 
                                (whEmpresa !== o.empresa ? whEmpresa : null) ||
                                (whTarefa !== o.tarefa ? whTarefa : null));

              if (detectedWH && detectedWH !== 'N/A') {
                  return currentUser.allowedWarehouses?.includes(detectedWH);
              }

              // 2. Fallback to Responsible Map only if no warehouse detected in text
              const resp = o.responsaveis;
              if (resp) {
                  const names = resp.split(',').map(n => n.trim().toUpperCase());
                  return names.some(name => {
                      const mappedWH = RESPONSIBLE_WAREHOUSE_MAP[name];
                      return mappedWH && currentUser.allowedWarehouses?.includes(mappedWH);
                  });
              }

              return false;
          });
      }

      const count = all.length;
      if (count === 0) return { count: 0, range: '---' };
      const dates = all.map(o => parseDate(o.criadoEm)).filter(Boolean) as Date[];
      if (dates.length === 0) return { count, range: '---' };
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      const format = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      return { count, range: `${format(minDate)} até ${format(maxDate)}` };
  }, [data.requestImports, currentUser, normalizeWH]);

  // States para o novo Modal Unificado
  const [selectedDeviceForInfo, setSelectedDeviceForInfo] = useState<Camera | AccessPoint | null>(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [localTicket, setLocalTicket] = useState('');
  const [localObs, setLocalObs] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  // Estados dos Filtros do Gráfico
  const [selectedChartDate, setSelectedChartDate] = useState<string>('');
  const [selectedWarehouseChart, setSelectedWarehouseChart] = useState<string>('ALL');
  const [selectedAccessPointsChart, setSelectedAccessPointsChart] = useState<string[]>([]);
  const [showAPDropdown, setShowAPDropdown] = useState(false);
  
  const apDropdownRef = useRef<HTMLDivElement>(null);

  // Estados para a Consulta de Acesso Pessoal
  const [personalSearch, setPersonalSearch] = useState('');
  const [selectedPersonKey, setSelectedPersonKey] = useState<string | null>(null);
  const [personalDateFilter, setPersonalDateFilter] = useState('');
  const [activeHubTab, setActiveHubTab] = useState<'incidents' | 'documents' | 'shift-notes'>('incidents');

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const isViewer = currentUser?.role === 'viewer';
  
  const canEditOfflineInfo = isAdmin || isViewer;

  // Fechar dropdown de portas ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (apDropdownRef.current && !apDropdownRef.current.contains(event.target as Node)) {
            setShowAPDropdown(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      const thirdPartyOnly = currentDayWorkers.filter(w => (['B11', 'MULT', 'MPI', 'FORMA', 'SUPERA LOG', 'MJM', 'PRIMUS', 'PRAYLOG', 'GMILL', 'BSB']).includes(w.company));
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

  // Lista de portas baseada no galpão selecionado no gráfico
  const availableAccessPointsChart = useMemo(() => {
    const set = new Set<string>();
    filteredWorkers.forEach(w => {
        if (w.date === selectedChartDate) {
            if (selectedWarehouseChart === 'ALL' || w.unit === selectedWarehouseChart) {
                if (w.accessPoint) set.add(w.accessPoint);
            }
        }
    });
    return Array.from(set).sort();
  }, [filteredWorkers, selectedWarehouseChart, selectedChartDate]);

  // Limpar portas ao mudar galpão
  useEffect(() => {
    setSelectedAccessPointsChart([]);
  }, [selectedWarehouseChart]);

  useEffect(() => {
      if (!selectedChartDate && availableChartDates.length > 0) setSelectedChartDate(availableChartDates[0]);
  }, [availableChartDates, selectedChartDate]);

  const hourlyData = useMemo(() => {
        const counts = new Array(24).fill(0);
        filteredWorkers.forEach(w => {
            if (w.date !== selectedChartDate) return;
            if (selectedWarehouseChart !== 'ALL' && w.unit !== selectedWarehouseChart) return;
            // Filtro por Portas (Multi-seleção)
            if (selectedAccessPointsChart.length > 0 && !selectedAccessPointsChart.includes(w.accessPoint)) return;

            if (w.time && w.time.includes(':')) {
                const hour = parseInt(w.time.split(':')[0], 10);
                if (!isNaN(hour) && hour >= 0 && hour < 24) counts[hour]++;
            }
        });
        return counts.map((count, hour) => ({ hour: `${hour.toString().padStart(2, '0')}:00`, acessos: count }));
  }, [filteredWorkers, selectedChartDate, selectedWarehouseChart, selectedAccessPointsChart]);

  const toggleAPChart = (ap: string) => {
    setSelectedAccessPointsChart(prev => 
        prev.includes(ap) ? prev.filter(item => item !== ap) : [...prev, ap]
    );
  };

  const toggleAllAPsChart = () => {
    if (selectedAccessPointsChart.length === availableAccessPointsChart.length) {
        setSelectedAccessPointsChart([]);
    } else {
        setSelectedAccessPointsChart([...availableAccessPointsChart]);
    }
  };

  const { systemState, systemColor } = useMemo(() => {
      let state = 'CRÍTICO';
      let color = 'text-rose-600 dark:text-rose-500';
      if (availabilityNum >= 95) { state = 'ÓTIMO'; color = 'text-emerald-500 dark:text-emerald-400'; }
      else if (availabilityNum >= 70) { state = 'NORMAL'; color = 'text-blue-500 dark:text-blue-400'; }
      else if (availabilityNum >= 40) { state = 'REGULAR'; color = 'text-amber-500 dark:text-amber-400'; }
      return { systemState: state, systemColor: color };
  }, [availabilityNum]);

  const offlineDevices = useMemo(() => {
      const getPriority = (location: string) => {
        const criticalKeywords = ['DOCA', 'PORTARIA', 'SERVIDOR', 'ACESSO', 'ENTRADA'];
        const locUpper = location.toUpperCase();
        if (criticalKeywords.some(k => locUpper.includes(k))) return 'CRÍTICO';
        return 'MODERADO';
      };
      return videoDevices.filter(c => c.status === 'OFFLINE').map(c => ({ ...c, priority: getPriority(c.location) })).sort((a, b) => a.priority === 'CRÍTICO' ? -1 : 1);
  }, [videoDevices]);

  const offlineAccessPoints = useMemo(() => {
      let subset = accessPoints;
      if (isManager && currentUser?.allowedWarehouses) {
          subset = accessPoints.filter(a => hasWarehousePermission(currentUser.allowedWarehouses, a.warehouse));
      }
      return subset.filter(a => a.status === 'OFFLINE').map(a => ({
          ...a,
          priority: 'MODERADO'
      })).sort((a, b) => a.name.localeCompare(b.name));
  }, [accessPoints, isManager, currentUser]);

  const sortedShiftNotes = useMemo(() => {
      return [...shiftNotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [shiftNotes]);

  // Lógica de Consulta Pessoal
  const uniquePeople = useMemo(() => {
      const map: { [key: string]: { name: string, company: string } } = {};
      thirdPartyWorkers.forEach(w => {
          const key = `${w.name.toUpperCase()}|${w.company.toUpperCase()}`;
          if (!map[key]) map[key] = { name: w.name, company: w.company };
      });
      return Object.entries(map).map(([key, val]) => ({ key, ...val }));
  }, [thirdPartyWorkers]);

  const personalSearchResults = useMemo(() => {
      if (personalSearch.length < 2) return [];
      return uniquePeople.filter(p => p.name.toLowerCase().includes(personalSearch.toLowerCase())).slice(0, 10);
  }, [uniquePeople, personalSearch]);

  const selectedPersonHistory = useMemo(() => {
      if (!selectedPersonKey) return [];
      const [name, company] = selectedPersonKey.split('|');
      let filtered = thirdPartyWorkers
        .filter(w => w.name.toUpperCase() === name && w.company.toUpperCase() === company);
      
      if (personalDateFilter) {
          filtered = filtered.filter(w => w.date === personalDateFilter);
      }

      return filtered.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time}`).getTime();
          const dateB = new Date(`${b.date}T${b.time}`).getTime();
          return dateB - dateA;
      });
  }, [thirdPartyWorkers, selectedPersonKey, personalDateFilter]);

  // Handlers para o novo Modal
  const openInfoModal = (device: Camera | AccessPoint, editMode: boolean = false) => {
      setSelectedDeviceForInfo(device);
      setLocalTicket(device.ticket || '');
      setLocalObs(device.observation || '');
      setIsEditingModal(editMode);
  };

  const closeInfoModal = () => {
      setSelectedDeviceForInfo(null);
      setIsEditingModal(false);
  };

  const handleSaveInfo = async () => {
      if (!selectedDeviceForInfo) return;
      setSavingId(selectedDeviceForInfo.uuid);
      try {
          const isCamera = 'channelType' in selectedDeviceForInfo;
          if (isCamera) {
              await monitoringService.updateCameraTicket(selectedDeviceForInfo.uuid, localTicket, cameras);
              await monitoringService.updateCameraObservation(selectedDeviceForInfo.uuid, localObs, cameras);
          } else {
              await monitoringService.updateAccessPointTicket(selectedDeviceForInfo.uuid, localTicket, accessPoints);
              await monitoringService.updateAccessPointObservation(selectedDeviceForInfo.uuid, localObs, accessPoints);
          }
          closeInfoModal();
      } catch (e) {
          alert("Erro ao salvar.");
      } finally {
          setSavingId(null);
      }
  };

  const handleResolveIssue = async (uuid: string) => {
      if (window.confirm("Marcar dispositivo como ONLINE? Isso limpará chamado e observação.")) {
          const isCamera = cameras.some(c => c.uuid === uuid);
          if (isCamera) {
              await monitoringService.resolveCameraIssue(uuid, cameras);
          } else {
              await monitoringService.resolveAccessPointIssue(uuid, accessPoints);
          }
          if (selectedDeviceForInfo?.uuid === uuid) closeInfoModal();
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
    msg += `📈 *RESUMO DE ATIVIDADES*\n`;
    msg += `   Ocorrências: ${occurrenceStats.count} (${occurrenceStats.range})\n`;
    msg += `   Requisições: ${requestStats.count} (${requestStats.range})\n\n`;
    
    if (stats.totalVideo > 0) msg += `📹 *CÂMERAS*\n   Total: ${stats.totalVideo} | 🟢 On: ${stats.onlineVideo} | 🔴 Off: ${stats.offlineVideo}\n   📉 Disponibilidade: ${stats.availVideo}%\n`;
    if (totalAccess > 0) msg += `🚪 *ACESSOS*\n   Total: ${totalAccess} | 🟢 On: ${accessOnline} | 🔴 Off: ${accessOffline}\n`;
    if (totalPeopleCount > 0) msg += `👷 *PESSOAS*\n   Total Presente: ${totalPeopleCount} (Terceiros: ${uniqueThirdPartyCount})\n`;
    msg += `\n`;
    if (offlineDevices.length > 0 || offlineAccessPoints.length > 0) {
      msg += `❗ *DISPOSITIVOS OFFLINE (${stats.offlineVideo + accessOffline}):*\n`;
      offlineDevices.forEach(c => {
        const ticketStr = c.ticket ? ` [Chamado: ${c.ticket}]` : '';
        const obsStr = c.observation ? `\n   📝 Obs: ${c.observation}` : '';
        msg += `❌ [CÂMERA] *${c.name}*${ticketStr}\n   📍 ${c.location}${obsStr}\n`;
      });
      offlineAccessPoints.forEach(ap => {
        msg += `❌ [ACESSO] *${ap.name}*\n   📍 ${ap.location}\n`;
      });
    }
    return msg;
  }, [systemState, stats, totalAccess, accessOnline, accessOffline, totalPeopleCount, uniqueThirdPartyCount, offlineDevices, offlineAccessPoints, occurrenceStats, requestStats]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(whatsAppMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [whatsAppMessage]);

  return (
    <div className="space-y-6 pb-8 max-w-[1600px] mx-auto">
      
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight italic">Painel Principal</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visão geral do ecossistema de segurança</p>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Sistema Operacional</span>
          </div>
      </div>
      
      {/* 1. Saúde do Sistema & KPIs Principais */}
      <StatsGrid 
        availabilityNum={availabilityNum}
        systemColor={systemColor}
        systemState={systemState}
        stats={stats}
        offlineDevicesCount={offlineDevices.length}
        accessOffline={accessOffline}
        totalPeopleCount={totalPeopleCount}
        uniqueThirdPartyCount={uniqueThirdPartyCount}
        topUnitForDate={topUnitForDate}
        totalAccess={totalAccess}
        accessOnline={accessOnline}
        isManager={isManager}
        currentUser={currentUser || null}
        occurrenceStats={occurrenceStats}
        requestStats={requestStats}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* COLUNA PRINCIPAL (9/12) */}
        <div className="xl:col-span-9 space-y-6">
          
          {/* 2. ANALYTICS: Gráfico de Fluxo */}
          <AccessFlowChart 
            hourlyData={hourlyData}
            selectedChartDate={selectedChartDate}
            setSelectedChartDate={setSelectedChartDate}
            availableChartDates={availableChartDates}
            selectedWarehouseChart={selectedWarehouseChart}
            setSelectedWarehouseChart={setSelectedWarehouseChart}
            selectedAccessPointsChart={selectedAccessPointsChart}
            setSelectedAccessPointsChart={setSelectedAccessPointsChart}
            availableAccessPointsChart={availableAccessPointsChart}
            WAREHOUSE_LIST={WAREHOUSE_LIST}
            showAPDropdown={showAPDropdown}
            setShowAPDropdown={setShowAPDropdown}
            apDropdownRef={apDropdownRef}
            isAdmin={isAdmin}
            isManager={isManager}
            isViewer={isViewer}
          />
          {/* 3. OPERATIONAL HUB: Abas de Monitoramento */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-xl overflow-hidden">
            <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/30 p-2">
                <button 
                    onClick={() => setActiveHubTab('incidents')}
                    className={`flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 rounded-[1.5rem] ${activeHubTab === 'incidents' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-lg shadow-blue-500/5 border border-slate-100 dark:border-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}`}
                >
                    <div className={`w-2 h-2 rounded-full ${offlineDevices.length > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                    Dispositivos Offline ({offlineDevices.length + offlineAccessPoints.length})
                </button>
                <button 
                    onClick={() => setActiveHubTab('documents')}
                    className={`flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 rounded-[1.5rem] ${activeHubTab === 'documents' ? 'bg-white dark:bg-slate-800 text-purple-600 shadow-lg shadow-purple-500/5 border border-slate-100 dark:border-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}`}
                >
                    <FileText size={14} />
                    Documentos
                </button>
                {!isManager && (
                    <button 
                        onClick={() => setActiveHubTab('shift-notes')}
                        className={`flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 rounded-[1.5rem] ${activeHubTab === 'shift-notes' ? 'bg-white dark:bg-slate-800 text-amber-600 shadow-lg shadow-amber-500/5 border border-slate-100 dark:border-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}`}
                    >
                        <CheckCircle2 size={14} />
                        Notas do Plantão
                    </button>
                )}
            </div>

            <div className="p-6">
                {activeHubTab === 'incidents' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <OfflineDevicesSection 
                            offlineDevices={offlineDevices}
                            offlineAccessPoints={offlineAccessPoints}
                            openInfoModal={openInfoModal}
                            handleResolveIssue={handleResolveIssue}
                            savingId={savingId}
                        />
                    </div>
                )}
                {activeHubTab === 'documents' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <DocumentMonitoring 
                            documents={documents}
                            getDocStatus={getDocStatus}
                        />
                    </div>
                )}
                {activeHubTab === 'shift-notes' && !isManager && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <ShiftNotes sortedShiftNotes={sortedShiftNotes} />
                    </div>
                )}
            </div>
          </div>
        </div>

            {/* SIDEBAR DE FERRAMENTAS (3/12) */}
            <div className="xl:col-span-3 space-y-6">
                <PersonalSearch 
                    personalSearch={personalSearch}
                    setPersonalSearch={setPersonalSearch}
                    personalSearchResults={personalSearchResults}
                    selectedPersonKey={selectedPersonKey}
                    setSelectedPersonKey={setSelectedPersonKey}
                    personalDateFilter={personalDateFilter}
                    setPersonalDateFilter={setPersonalDateFilter}
                    selectedPersonHistory={selectedPersonHistory}
                />

                {/* Card de Atalhos Rápidos ou Info Adicional */}
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
                    <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-1000 text-blue-500 rotate-12">
                        <Shield size={200} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                <FileText size={18} />
                            </div>
                            <h4 className="text-[11px] font-black uppercase tracking-widest">Relatório Operacional</h4>
                        </div>
                        <p className="text-[12px] text-slate-400 mb-8 leading-relaxed font-medium">Gere um resumo instantâneo de todas as ocorrências e status do sistema para compartilhamento rápido via WhatsApp.</p>
                        <button 
                            onClick={copyToClipboard}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 active:scale-95"
                        >
                            {copied ? (
                                <>
                                    <CheckCircle2 size={16} />
                                    Copiado com Sucesso!
                                </>
                            ) : (
                                <>
                                    <Shield size={16} />
                                    Gerar Relatório Agora
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Status do Sistema - Sidebar Widget */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
                    <div className="flex items-center justify-between mb-8">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Infraestrutura</h4>
                        <div className="flex items-center gap-1">
                            <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                            <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                            <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 group-hover:animate-ping"></div>
                                <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">Servidores Cloud</span>
                            </div>
                            <span className="text-[9px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full">Ativo</span>
                        </div>
                        <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 group-hover:animate-ping"></div>
                                <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">Banco de Dados</span>
                            </div>
                            <span className="text-[9px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full">Ativo</span>
                        </div>
                        <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 group-hover:animate-ping"></div>
                                <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">API Gateway</span>
                            </div>
                            <span className="text-[9px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full">Ativo</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

      {/* Modal Unificado */}
      <IncidentModal 
        selectedDeviceForInfo={selectedDeviceForInfo}
        closeInfoModal={closeInfoModal}
        localTicket={localTicket}
        setLocalTicket={setLocalTicket}
        localObs={localObs}
        setLocalObs={setLocalObs}
        isEditingModal={isEditingModal}
        handleSaveInfo={handleSaveInfo}
        handleResolveIssue={handleResolveIssue}
        savingId={savingId}
      />
    </div>
  );
};

export default React.memo(PainelPrincipal);
