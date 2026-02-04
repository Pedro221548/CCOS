import React, { useMemo, useState, useEffect, useRef } from 'react';
import { User, ProcessedWorker, AccessPoint } from '../types';
import { WAREHOUSE_LIST } from '../constants';
import { Users, Filter, Search, Activity, ChevronDown, ChevronUp, AlertCircle, Calendar, FileText, CheckSquare, Square, MessageCircle, Mail, X, ArrowUpRight, ArrowDownLeft, GripHorizontal, DoorClosed, Clock, Hourglass, RotateCcw, Footprints, ArrowRight, MapPin } from 'lucide-react';

interface AccessManagementProps {
    accessPoints: AccessPoint[];
    thirdPartyWorkers: ProcessedWorker[];
    currentUser: User;
}

const mapToLocalName = (apName: string): string => {
    const name = apName.toUpperCase();
    if (name.includes('G215LF') || name.includes('HOSPITTALAR')) return 'CF CM HOSPITTALAR';
    if (name.includes('G205LF') || name.includes('G210LF') || name.includes('CATRACA G2')) return 'MEZANINO G2';
    if (name.includes('G211LF') || name.includes('G202LF') || name.includes('TORNIQUETE G2')) return 'GALPÃO G2';
    if (name.includes('G204LF') || name.includes('RG SOLUÇÕES')) return 'SALA RG SOLUÇÕES';
    if (name.includes('G214LF') || name.includes('BIOCON 2')) return 'CF BIOCON DISTRIBUIDORA';
    if (name.includes('G216LF') || name.includes('DESCANSO')) return 'SALA DE DESCANSO';
    if (name.includes('G201LF') || name.includes('CF MERCO')) return 'CF MERCO';
    if (name.includes('G212LF') || name.includes('BIOCON 1')) return 'BIOCON IMPORTADORA 1';
    if (name.includes('G207LF') || name.includes('PRATI')) return 'CONTROLADO PRATI';
    if (name.includes('G206LF') || name.includes('CPD')) return 'SERVIDOR G2';
    if (name.includes('G213LF') || name.includes('MD D')) return 'CF MERCO';
    if (name.includes('G209LF') || name.includes('GAIOLA 1')) return 'MD B GAIOLA';
    if (name.includes('G208LF') || name.includes('ZYDUS DISTRIBUIDORA')) return 'ZYDUS DISTRIBUIDORA';
    if (name.includes('G203LF') || name.includes('ZYDUS IMPORTADORA')) return 'ZYDUS IMPORTADORA';
    if (name.includes('G217LF') || name.includes('PRESTIGE')) return 'MEZ PRESTIGE';
    return apName;
};

const formatMinutesFriendly = (totalMinutes: number): string => {
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const hourLabel = hours === 1 ? 'hora' : 'horas';
    return mins > 0 ? `${hours} ${hourLabel} e ${mins} min` : `${hours} ${hourLabel}`;
};

const hasWarehousePermission = (allowedList: string[] | undefined, targetWarehouse: string) => {
    if (!allowedList || allowedList.length === 0) return false;
    const normalizedTarget = (targetWarehouse || '').toUpperCase();
    return allowedList.some(allowed => {
        const normalizedAllowed = allowed.toUpperCase();
        return normalizedAllowed === normalizedTarget || normalizedAllowed.includes(normalizedTarget) || normalizedTarget.includes(normalizedAllowed);
    });
};

const AccessManagement: React.FC<AccessManagementProps> = ({ accessPoints, thirdPartyWorkers, currentUser }) => {
    const [activeTab, setActiveTab] = useState<'history' | 'report'>('history');
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
    const [selectedAccessPoints, setSelectedAccessPoints] = useState<string[]>([]);
    const [showAPDropdown, setShowAPDropdown] = useState(false);
    const [peopleSearch, setPeopleSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [expandedPersonKey, setExpandedPersonKey] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [generatedMessage, setGeneratedMessage] = useState('');
    const [stayDuration, setStayDuration] = useState<string | null>(null);
    const [tracePerson, setTracePerson] = useState<{ name: string, history: ProcessedWorker[] } | null>(null);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isDragging, setIsDragging] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [rel, setRel] = useState({ x: 0, y: 0 }); 
    const dragBoxRef = useRef<HTMLDivElement>(null);
    const apDropdownRef = useRef<HTMLDivElement>(null);

    const isAuthorizedForReport = currentUser.role === 'admin' || currentUser.role === 'manager';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (apDropdownRef.current && !apDropdownRef.current.contains(event.target as Node)) {
                setShowAPDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const allowedWarehouses = useMemo(() => {
        if (currentUser.role === 'admin') return WAREHOUSE_LIST;
        if (currentUser.role === 'manager') return currentUser.allowedWarehouses || [];
        return WAREHOUSE_LIST;
    }, [currentUser]);

    const availableAccessPoints = useMemo(() => {
        const set = new Set<string>();
        thirdPartyWorkers.forEach(w => {
            if (selectedWarehouse === 'ALL' || w.unit === selectedWarehouse) {
                if (w.accessPoint && w.accessPoint !== '-') set.add(w.accessPoint);
            }
        });
        return Array.from(set).sort();
    }, [thirdPartyWorkers, selectedWarehouse]);

    useEffect(() => {
        setSelectedAccessPoints([]);
        setShowAPDropdown(false);
    }, [selectedWarehouse]);

    const toggleAccessPoint = (ap: string) => {
        setSelectedAccessPoints(prev => prev.includes(ap) ? prev.filter(item => item !== ap) : [...prev, ap]);
    };

    const toggleAllAccessPoints = () => {
        if (selectedAccessPoints.length === availableAccessPoints.length) {
            setSelectedAccessPoints([]);
        } else {
            setSelectedAccessPoints([...availableAccessPoints]);
        }
    };

    const calculateDuration = (records: ProcessedWorker[]) => {
        if (records.length < 2) return null;
        const sorted = [...records].sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time.length === 5 ? a.time + ':00' : a.time}`).getTime();
            const dateB = new Date(`${b.date}T${b.time.length === 5 ? b.time + ':00' : b.time}`).getTime();
            return dateA - dateB;
        });
        const start = new Date(`${sorted[0].date}T${sorted[0].time.length === 5 ? sorted[0].time + ':00' : sorted[0].time}`);
        const end = new Date(`${sorted[sorted.length - 1].date}T${sorted[sorted.length - 1].time.length === 5 ? sorted[sorted.length - 1].time + ':00' : sorted[sorted.length - 1].time}`);
        const diffMs = end.getTime() - start.getTime();
        if (diffMs <= 0) return null;
        return formatMinutesFriendly(Math.floor(diffMs / 60000));
    };

    const getMinutesDiff = (prev: ProcessedWorker, curr: ProcessedWorker) => {
        const t1 = new Date(`${prev.date}T${prev.time.length === 5 ? prev.time + ':00' : prev.time}`).getTime();
        const t2 = new Date(`${curr.date}T${curr.time.length === 5 ? curr.time + ':00' : curr.time}`).getTime();
        return Math.floor(Math.abs(t2 - t1) / 60000);
    };

    useEffect(() => {
        if (selectedIds.size === 0) {
            setGeneratedMessage('');
            setStayDuration(null);
            return;
        }
        const selectedRecords = thirdPartyWorkers.filter(w => selectedIds.has(w.id));
        const duration = calculateDuration(selectedRecords);
        setStayDuration(duration);

        let msg = `*RELATÓRIO DE ACESSO - PERMANÊNCIA*\n`;
        const first = selectedRecords[0];
        if (first) {
            msg += `👤 Colaborador: *${first.name}*\n🏢 Empresa: ${first.company}\n📍 Unidade: ${first.unit}\n\n`;
        }
        selectedRecords.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`).getTime();
            const dateB = new Date(`${b.date}T${b.time}`).getTime();
            return dateA - dateB;
        }).forEach(r => {
            msg += `• ${r.eventType}: ${r.date.split('-').reverse().join('/')} às ${r.time} (${mapToLocalName(r.accessPoint)})\n`;
        });
        if (duration) msg += `\n⏱️ *Tempo de Permanência: ${duration}*`;
        setGeneratedMessage(msg.trim());
    }, [selectedIds, thirdPartyWorkers]);

    useEffect(() => {
        if (!isMobile && selectedIds.size > 0 && pos.x === 0 && pos.y === 0) {
            setPos({ x: window.innerWidth / 2 - 350, y: window.innerHeight - 450 });
        }
    }, [selectedIds.size, pos.x, pos.y, isMobile]);

    const filteredWorkers = useMemo(() => {
        let subset = thirdPartyWorkers;
        if (currentUser.role === 'manager') subset = subset.filter(w => hasWarehousePermission(currentUser.allowedWarehouses, w.unit));
        if (selectedWarehouse !== 'ALL') subset = subset.filter(w => w.unit === selectedWarehouse);
        if (selectedAccessPoints.length > 0) subset = subset.filter(w => selectedAccessPoints.includes(w.accessPoint));
        if (startDate) subset = subset.filter(w => w.date >= startDate);
        if (endDate) subset = subset.filter(w => w.date <= endDate);
        return subset;
    }, [thirdPartyWorkers, selectedWarehouse, selectedAccessPoints, startDate, endDate, currentUser]);

    const groupedPeople = useMemo(() => {
        const groups: { [key: string]: { id: string, name: string, company: string, history: ProcessedWorker[] } } = {};
        filteredWorkers.forEach(w => {
            const key = `${w.name.trim().toUpperCase()}|${w.company.trim().toUpperCase()}`;
            if (!groups[key]) groups[key] = { id: key, name: w.name, company: w.company, history: [] };
            groups[key].history.push(w);
        });
        return Object.values(groups).map(person => {
            person.history.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
            return person;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredWorkers]);

    const handleSelectPersonGroup = (personHistory: ProcessedWorker[]) => {
        const idsToToggle = personHistory.map(w => w.id);
        const allSelected = idsToToggle.every(id => selectedIds.has(id));
        const newSet = new Set(selectedIds);
        if (allSelected) idsToToggle.forEach(id => newSet.delete(id));
        else idsToToggle.forEach(id => newSet.add(id));
        setSelectedIds(newSet);
    };

    const onMouseDown = (e: React.MouseEvent) => {
        if (isMobile || e.button !== 0) return; 
        setIsDragging(true);
        setRel({ x: e.pageX - pos.x, y: e.pageY - pos.y });
        e.stopPropagation();
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => { if (isDragging && !isMobile) setPos({ x: e.pageX - rel.x, y: e.pageY - rel.y }); };
        const onMouseUp = () => setIsDragging(false);
        if (isDragging) {
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDragging, rel, isMobile]);

    const getFlowBadge = (type: string) => {
        const t = type.toUpperCase();
        if (t === 'ENTRADA') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black text-[9px] uppercase tracking-widest"><ArrowDownLeft size={10} /> Entrada</span>;
        if (t === 'SAÍDA' || t === 'SAIDA') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 font-black text-[9px] uppercase tracking-widest"><ArrowUpRight size={10} /> Saída</span>;
        return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-black text-[9px] uppercase tracking-widest">{type}</span>;
    };

    const getSortedTrace = (history: ProcessedWorker[]) => {
        return [...history].sort((a, b) => new Date(`${a.date}T${a.time.length === 5 ? a.time + ':00' : a.time}`).getTime() - new Date(`${b.date}T${b.time.length === 5 ? b.time + ':00' : b.time}`).getTime());
    };

    const handleEmailReport = () => {
        const subject = "Relatório de Permanência - ControlVision";
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(generatedMessage)}`;
        window.location.href = mailtoUrl;
    };

    return (
        <div className="space-y-4 md:space-y-6 animate-fade-in pb-24 max-w-7xl mx-auto p-2 md:p-6 relative">
            {/* Header Responsivo */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="w-full md:w-auto">
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="text-purple-500 shrink-0" size={24} />
                        Gestão de Acessos
                    </h2>
                    <p className="text-slate-400 text-[11px] md:text-sm mt-1">Histórico detalhado de fluxo de pessoas.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-center">
                    {isAuthorizedForReport && (
                        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
                            <button onClick={() => setActiveTab('history')} className={`flex-1 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>Histórico</button>
                            <button onClick={() => setActiveTab('report')} className={`flex-1 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'report' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}><FileText size={14} /> Relatórios</button>
                        </div>
                    )}
                    <div className="relative w-full sm:w-auto">
                        <select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)} className="w-full pl-9 pr-8 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs font-bold uppercase focus:outline-none focus:border-purple-500 appearance-none cursor-pointer">
                            <option value="ALL">{currentUser.role === 'manager' ? 'Meus Galpões' : 'Todos Galpões'}</option>
                            {allowedWarehouses.map(wh => <option key={wh} value={wh}>{wh}</option>)}
                        </select>
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                    </div>
                </div>
            </div>

            {/* Grid Principal */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-lg min-h-[500px]">
                <div className="flex flex-col space-y-4">
                    {/* Filtros Secundários */}
                    <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                            <Users size={18} className="text-amber-500" /> Histórico Nominal
                        </h3>
                        
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border dark:border-slate-800">
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-[10px] text-white font-bold uppercase outline-none px-2" />
                                <span className="text-[10px] font-black text-slate-600">ATÉ</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-[10px] text-white font-bold uppercase outline-none px-2" />
                            </div>
                            
                            <div className="relative z-40" ref={apDropdownRef}>
                                <button onClick={() => setShowAPDropdown(!showAPDropdown)} className="w-full sm:w-48 pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase text-left flex items-center justify-between">
                                    <span className="truncate">{selectedAccessPoints.length === 0 ? 'Portas' : `${selectedAccessPoints.length} Sel.`}</span>
                                    <ChevronDown size={14} className={`transition-transform ${showAPDropdown ? 'rotate-180' : ''}`} />
                                </button>
                                {showAPDropdown && (
                                    <div className="absolute top-full right-0 mt-2 bg-[#0d1117] border border-slate-700 rounded-2xl shadow-2xl p-2 w-[85vw] sm:w-[320px] max-h-[350px] overflow-y-auto z-[60] custom-scrollbar animate-fade-in">
                                        <div onClick={toggleAllAccessPoints} className="flex items-center gap-3 p-3 hover:bg-purple-500/10 rounded-xl cursor-pointer border-b border-slate-800 mb-2">
                                            {selectedAccessPoints.length === availableAccessPoints.length && availableAccessPoints.length > 0 ? <CheckSquare size={18} className="text-purple-500" /> : <Square size={18} className="text-slate-600" />}
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Todos</span>
                                        </div>
                                        {availableAccessPoints.map(ap => (
                                            <div key={ap} onClick={() => toggleAccessPoint(ap)} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${selectedAccessPoints.includes(ap) ? 'bg-purple-500/5' : 'hover:bg-slate-800'}`}>
                                                {selectedAccessPoints.includes(ap) ? <CheckSquare size={16} className="text-purple-500" /> : <Square size={16} className="text-slate-600" />}
                                                <span className="text-[10px] font-bold text-slate-300 truncate">{ap}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                <input type="text" value={peopleSearch} onChange={e => setPeopleSearch(e.target.value)} placeholder="Buscar nome..." className="w-full sm:w-auto pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-purple-500" />
                            </div>
                        </div>
                    </div>

                    {/* Lista de Pessoas */}
                    <div className="space-y-3 pt-2">
                        {groupedPeople.filter(p => p.name.toLowerCase().includes(peopleSearch.toLowerCase())).map((person) => {
                            const isAllSelected = person.history.every(h => selectedIds.has(h.id));
                            const isPartialSelected = person.history.some(h => selectedIds.has(h.id)) && !isAllSelected;
                            return (
                                <div key={person.id} className={`border rounded-2xl overflow-hidden transition-all ${activeTab === 'report' && (isAllSelected || isPartialSelected) ? 'border-purple-500/40 bg-purple-500/5' : 'dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40'}`}>
                                    <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60" onClick={() => setExpandedPersonKey(expandedPersonKey === person.id ? null : person.id)}>
                                        <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
                                            {activeTab === 'report' && (
                                                <button onClick={(e) => { e.stopPropagation(); handleSelectPersonGroup(person.history); }} className={`p-1.5 transition-colors ${isAllSelected || isPartialSelected ? 'text-purple-500' : 'text-slate-600'}`}>
                                                    {isAllSelected ? <CheckSquare size={22} /> : isPartialSelected ? <div className="relative"><Square size={22} /><div className="absolute inset-0 m-auto w-3 h-3 bg-purple-500 rounded-sm"></div></div> : <Square size={22} />}
                                                </button>
                                            )}
                                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-200 dark:bg-slate-800 border dark:border-slate-700 flex items-center justify-center text-slate-500 font-black text-xs md:text-sm">{person.name.charAt(0)}</div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-bold text-slate-900 dark:text-white uppercase text-[11px] md:text-sm truncate max-w-[180px] md:max-w-none">{person.name}</h4>
                                                <p className="text-[8px] md:text-[10px] text-slate-500 font-black uppercase tracking-widest">{person.company}</p>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); setTracePerson({ name: person.name, history: person.history }); }} className="p-2 bg-purple-500/10 hover:bg-purple-500 text-purple-500 hover:text-white rounded-lg transition-all"><Footprints size={16} /></button>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6 mt-3 sm:mt-0">
                                            <div className="text-right"><span className="block text-[8px] text-slate-500 font-black uppercase tracking-tighter">Eventos</span><span className="block font-mono font-black text-emerald-500 text-base leading-none">{person.history.length}</span></div>
                                            {expandedPersonKey === person.id ? <ChevronUp size={20} className="text-slate-500"/> : <ChevronDown size={20} className="text-slate-500"/>}
                                        </div>
                                    </div>

                                    {expandedPersonKey === person.id && (
                                        <div className="border-t dark:border-slate-800 bg-white dark:bg-slate-950/40 p-4 animate-fade-in overflow-x-auto">
                                            <table className="w-full text-left text-[11px]">
                                                <thead className="text-slate-500 font-black uppercase text-[9px] border-b dark:border-slate-800">
                                                    <tr>
                                                        {activeTab === 'report' && <th className="pb-3 w-8"></th>}
                                                        <th className="pb-3">Data/Hora</th>
                                                        <th className="pb-3">Ponto (Local)</th>
                                                        <th className="pb-3 text-right">Fluxo</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                                    {person.history.map((record) => (
                                                        <tr key={record.id} className={`cursor-pointer ${selectedIds.has(record.id) ? 'bg-purple-500/10' : ''}`} onClick={() => activeTab === 'report' && (selectedIds.has(record.id) ? selectedIds.delete(record.id) : selectedIds.add(record.id)) && setSelectedIds(new Set(selectedIds))}>
                                                            {activeTab === 'report' && <td className="py-3"><div className={`transition-opacity ${selectedIds.has(record.id) ? 'text-purple-500 opacity-100' : 'text-slate-700 opacity-30'}`}>{selectedIds.has(record.id) ? <CheckSquare size={16} /> : <Square size={16} />}</div></td>}
                                                            <td className="py-3 font-mono font-bold text-slate-400">{record.date.split('-').reverse().join('/')} <span className="text-emerald-500">{record.time}</span></td>
                                                            <td className="py-3 text-slate-300 font-bold">{mapToLocalName(record.accessPoint)}</td>
                                                            <td className="py-3 text-right">{getFlowBadge(record.eventType)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Modal Rastro - Responsivo */}
            {tracePerson && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                    <div className="bg-[#0d1117] border border-slate-700 rounded-[28px] sm:rounded-[40px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative">
                        <div className="p-5 sm:p-8 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center">
                            <div className="flex items-center gap-3 sm:gap-5">
                                <div className="p-3 sm:p-4 bg-purple-600/10 rounded-2xl text-purple-500"><Footprints size={24} /></div>
                                <div className="min-w-0">
                                    <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tighter truncate max-w-[150px] sm:max-w-none">{tracePerson.name}</h3>
                                    <p className="text-slate-500 text-[9px] font-bold uppercase mt-1">Rastro Cronológico</p>
                                </div>
                            </div>
                            <button onClick={() => setTracePerson(null)} className="p-2.5 bg-slate-800 hover:bg-rose-600 text-white rounded-full transition-all border border-slate-700 shadow-xl"><X size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 sm:p-10 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                            <div className="relative space-y-0">
                                <div className="absolute left-[14px] sm:left-[22px] top-4 bottom-4 w-0.5 bg-slate-800"></div>
                                {getSortedTrace(tracePerson.history).map((record, idx, array) => {
                                    const minutesBetween = array[idx + 1] ? getMinutesDiff(record, array[idx + 1]) : null;
                                    return (
                                        <div key={record.id} className="relative pl-10 sm:pl-16 pb-10 group animate-fade-in">
                                            <div className="absolute left-0 top-1.5 w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center z-10">
                                                <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-4 border-[#0d1117] shadow-xl ${record.eventType === 'ENTRADA' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                            </div>
                                            <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-4 sm:p-6 group-hover:border-purple-500/40 transition-all shadow-xl">
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                                    <div>
                                                        <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">{record.date.split('-').reverse().join('/')} às <span className="text-white">{record.time}</span></span>
                                                        <h4 className="text-white font-black uppercase text-sm italic flex items-center gap-2 mt-1"><MapPin size={12} className="text-purple-500" />{mapToLocalName(record.accessPoint)}</h4>
                                                    </div>
                                                    {getFlowBadge(record.eventType)}
                                                </div>
                                            </div>
                                            {! (idx === array.length - 1) && minutesBetween !== null && (
                                                <div className="absolute left-0 w-8 sm:w-12 h-20 -bottom-10 flex flex-col items-center justify-center">
                                                    <div className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg shadow-xl"><span className="text-[8px] font-black text-emerald-400 whitespace-nowrap">+{formatMinutesFriendly(minutesBetween)}</span></div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Janela de Relatório - Mobile Bottom Sheet / Desktop Floating */}
            {activeTab === 'report' && selectedIds.size > 0 && (
                <div 
                    ref={dragBoxRef} 
                    style={!isMobile ? { position: 'fixed', left: `${pos.x}px`, top: `${pos.y}px`, zIndex: 200, touchAction: 'none' } : { position: 'fixed', bottom: 0, left: 0, width: '100%', zIndex: 300, touchAction: 'none' }} 
                    className={`bg-[#0f172a] border-t-4 border-purple-600 md:border-2 md:border-purple-500 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] md:shadow-2xl overflow-hidden backdrop-blur-xl transition-all duration-300 animate-slide-up ${!isMobile ? 'w-[700px] rounded-3xl' : 'w-full rounded-t-[32px]'}`}
                >
                    <div onMouseDown={onMouseDown} className={`bg-slate-950/80 p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center ${!isMobile ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                        <div className="flex items-center gap-3">
                            {!isMobile && <GripHorizontal size={20} className="text-slate-600" />}
                            <div className="flex flex-col">
                                <h3 className="text-white font-black text-[11px] md:text-xs uppercase tracking-[0.2em] flex items-center gap-2"><FileText size={14} className="text-purple-500" /> Relatório Permanência</h3>
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{selectedIds.size} registros</span>
                            </div>
                        </div>
                        <button onClick={() => setSelectedIds(new Set())} className="p-2.5 bg-slate-800 hover:bg-rose-600 text-white rounded-full transition-all border border-slate-700"><X size={18} /></button>
                    </div>
                    <div className="p-5 sm:p-8 space-y-6">
                        {stayDuration && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg"><Hourglass size={24} className="animate-pulse" /></div>
                                    <div><p className="text-[9px] font-black text-emerald-500/70 uppercase tracking-[0.2em]">Estimativa de Permanência</p><p className="text-2xl font-black text-emerald-400 leading-none">{stayDuration}</p></div>
                                </div>
                            </div>
                        )}
                        <textarea value={generatedMessage} readOnly className="w-full h-[150px] bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 focus:outline-none resize-none font-mono leading-relaxed shadow-inner" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button onClick={() => { navigator.clipboard.writeText(generatedMessage); alert("Copiado!"); }} className="py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95"><MessageCircle size={20} /> WhatsApp</button>
                            <button onClick={handleEmailReport} className="py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95"><Mail size={20} /> E-mail</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccessManagement;