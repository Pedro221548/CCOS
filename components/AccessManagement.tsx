
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { User, ProcessedWorker, AccessPoint } from '../types';
import { WAREHOUSE_LIST } from '../constants';
import { Users, Filter, Search, Activity, ChevronDown, ChevronUp, AlertCircle, Calendar, FileText, MessageCircle, Mail, X, ArrowUpRight, ArrowDownLeft, GripHorizontal, DoorClosed, Clock, Hourglass, RotateCcw, Briefcase } from 'lucide-react';
import Checkbox from './ui/Checkbox';

interface AccessManagementProps {
    accessPoints: AccessPoint[];
    thirdPartyWorkers: ProcessedWorker[];
    currentUser: User;
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

const AccessManagement: React.FC<AccessManagementProps> = ({ accessPoints, thirdPartyWorkers, currentUser }) => {
    const [activeTab, setActiveTab] = useState<'history' | 'report'>('history');
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
    const [selectedAccessPoints, setSelectedAccessPoints] = useState<string[]>([]);
    const [showAPDropdown, setShowAPDropdown] = useState(false);
    const [peopleSearch, setPeopleSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    const [expandedPersonKey, setExpandedPersonKey] = useState<string | null>(null);
    const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [generatedMessage, setGeneratedMessage] = useState('');
    const [stayDuration, setStayDuration] = useState<string | null>(null);

    // Estados para Arraste e Responsividade
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isDragging, setIsDragging] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [rel, setRel] = useState({ x: 0, y: 0 }); 
    const dragBoxRef = useRef<HTMLDivElement>(null);
    const apDropdownRef = useRef<HTMLDivElement>(null);

    const isAuthorizedForReport = currentUser.role === 'admin' || currentUser.role === 'manager';

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (apDropdownRef.current && !apDropdownRef.current.contains(event.target as Node)) {
                setShowAPDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Monitorar tamanho da tela
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

    // Resetar seleção de portas ao mudar o galpão
    useEffect(() => {
        setSelectedAccessPoints([]);
        setShowAPDropdown(false);
    }, [selectedWarehouse]);

    const toggleAccessPoint = (ap: string) => {
        setSelectedAccessPoints(prev => 
            prev.includes(ap) ? prev.filter(item => item !== ap) : [...prev, ap]
        );
    };

    const toggleAllAccessPoints = () => {
        if (selectedAccessPoints.length === availableAccessPoints.length) {
            setSelectedAccessPoints([]);
        } else {
            setSelectedAccessPoints([...availableAccessPoints]);
        }
    };

    const clearDateFilters = () => {
        setStartDate('');
        setEndDate('');
    };

    // Lógica de cálculo de Duração/Permanência
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

        const totalMinutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;

        return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
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
            msg += `👤 Colaborador: *${first.name}*\n`;
            msg += `🏢 Empresa: ${first.company}\n`;
            msg += `📍 Unidade: ${first.unit}\n\n`;
        }

        selectedRecords.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`).getTime();
            const dateB = new Date(`${b.date}T${b.time}`).getTime();
            return dateA - dateB;
        }).forEach(r => {
            const dateStr = r.date.split('-').reverse().join('/');
            msg += `• ${r.eventType}: ${dateStr} às ${r.time} (${r.accessPoint})\n`;
        });

        if (duration) {
            msg += `\n⏱️ *Tempo de Permanência: ${duration}*`;
        }

        setGeneratedMessage(msg.trim());
    }, [selectedIds, thirdPartyWorkers]);

    // Posicionamento inicial Desktop
    useEffect(() => {
        if (!isMobile && selectedIds.size > 0 && pos.x === 0 && pos.y === 0) {
            setPos({ 
                x: window.innerWidth / 2 - 350, 
                y: window.innerHeight - 450 
            });
        }
    }, [selectedIds.size, pos.x, pos.y, isMobile]);

    const filteredWorkers = useMemo(() => {
        let subset = thirdPartyWorkers;
        if (currentUser.role === 'manager') {
            subset = subset.filter(w => hasWarehousePermission(currentUser.allowedWarehouses, w.unit));
        }
        if (selectedWarehouse !== 'ALL') {
            subset = subset.filter(w => w.unit === selectedWarehouse);
        }
        if (selectedAccessPoints.length > 0) {
            subset = subset.filter(w => selectedAccessPoints.includes(w.accessPoint));
        }
        
        // Filtro de Período
        if (startDate) {
            subset = subset.filter(w => w.date >= startDate);
        }
        if (endDate) {
            subset = subset.filter(w => w.date <= endDate);
        }

        return subset;
    }, [thirdPartyWorkers, selectedWarehouse, selectedAccessPoints, startDate, endDate, currentUser]);

    const groupedByCompany = useMemo(() => {
        const companyGroups: { [company: string]: { [personKey: string]: { id: string, name: string, company: string, history: ProcessedWorker[] } } } = {};
        
        filteredWorkers.forEach(w => {
            const company = (w.company || 'Terceiros').trim() || 'Terceiros';
            if (!companyGroups[company]) {
                companyGroups[company] = {};
            }
            
            const personKey = w.name.trim().toUpperCase();
            if (!companyGroups[company][personKey]) {
                companyGroups[company][personKey] = { 
                    id: `${personKey}|${company.toUpperCase()}`, 
                    name: w.name, 
                    company: company, 
                    history: [] 
                };
            }
            companyGroups[company][personKey].history.push(w);
        });

        return Object.entries(companyGroups).map(([company, peopleMap]) => {
            const people = Object.values(peopleMap).map(p => {
                p.history.sort((a, b) => {
                    const tA = `${a.date} ${a.time}`;
                    const tB = `${b.date} ${b.time}`;
                    return tB.localeCompare(tA);
                });
                return p;
            }).sort((a, b) => a.name.localeCompare(b.name));
            
            return { company, people };
        }).sort((a, b) => {
            if (a.company === 'Terceiros') return 1;
            if (b.company === 'Terceiros') return -1;
            return a.company.localeCompare(b.company);
        });
    }, [filteredWorkers]);

    const toggleCompanyExpand = (company: string) => {
        const newSet = new Set(expandedCompanies);
        if (newSet.has(company)) newSet.delete(company);
        else newSet.add(company);
        setExpandedCompanies(newSet);
    };

    const togglePersonExpand = (key: string) => {
        setExpandedPersonKey(prev => prev === key ? null : key);
    };

    const handleSelectRecord = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

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
        setRel({
            x: e.pageX - pos.x,
            y: e.pageY - pos.y
        });
        e.stopPropagation();
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging || isMobile) return;
            setPos({ x: e.pageX - rel.x, y: e.pageY - rel.y });
        };
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

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedMessage);
        alert("Mensagem copiada para o WhatsApp!");
    };

    const sendEmail = () => {
        window.open(`mailto:?subject=${encodeURIComponent("Relatório de Permanência de Acesso")}&body=${encodeURIComponent(generatedMessage)}`);
    };

    const getFlowBadge = (type: string) => {
        const t = type.toUpperCase();
        if (t === 'ENTRADA') return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black text-[9px] uppercase tracking-widest">
                <ArrowDownLeft size={10} /> Entrada
            </span>
        );
        if (t === 'SAÍDA' || t === 'SAIDA') return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 font-black text-[9px] uppercase tracking-widest">
                <ArrowUpRight size={10} /> Saída
            </span>
        );
        return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-black text-[9px] uppercase tracking-widest">{type}</span>;
    };

    return (
        <div className="space-y-6 animate-fade-in pb-24 max-w-7xl mx-auto p-4 md:p-6 relative">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 shadow-lg flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="text-purple-500" />
                        Gestão de Acessos
                    </h2>
                    <p className="text-slate-400 text-xs md:text-sm mt-1">
                        Histórico detalhado de fluxo de pessoas. Use o modo Relatório para calcular permanência.
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 items-center w-full lg:w-auto">
                    {isAuthorizedForReport && (
                        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 w-full sm:w-auto">
                            <button 
                                onClick={() => setActiveTab('history')}
                                className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                Histórico
                            </button>
                            <button 
                                onClick={() => setActiveTab('report')}
                                className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'report' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                <FileText size={14} /> Relatórios
                            </button>
                        </div>
                    )}

                    <div className="relative z-20 w-full sm:w-auto">
                        <select 
                            value={selectedWarehouse} 
                            onChange={(e) => setSelectedWarehouse(e.target.value)} 
                            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-purple-500 appearance-none cursor-pointer min-w-full sm:min-w-[200px]"
                        >
                            <option value="ALL">
                                {currentUser.role === 'manager' ? 'Todos os meus galpões' : 'Todos os Galpões'}
                            </option>
                            {allowedWarehouses.map(wh => (
                                <option key={wh} value={wh}>{wh}</option>
                            ))}
                        </select>
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-lg min-h-[500px] overflow-visible">
                {currentUser.role === 'manager' && (!currentUser.allowedWarehouses || currentUser.allowedWarehouses.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <AlertCircle size={48} className="text-amber-500 mb-4" />
                        <h3 className="text-lg font-bold text-white">Sem Acesso</h3>
                        <p className="text-slate-400 max-w-xs">Nenhuma unidade foi vinculada ao seu perfil.</p>
                    </div>
                ) : (
                    <div className="animate-fade-in space-y-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tighter">
                                <Users size={20} className="text-amber-500" />
                                {activeTab === 'report' ? 'Selecione entradas e saídas' : 'Histórico por Pessoa'}
                            </h3>
                            
                            <div className="flex flex-wrap lg:flex-nowrap gap-3 w-full md:w-auto items-center">
                                {/* Filtro de Período - NOVO */}
                                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner w-full sm:w-auto">
                                    <div className="relative flex-1 sm:flex-none">
                                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                        <input 
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full sm:w-auto pl-8 pr-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] text-slate-700 dark:text-slate-200 focus:border-purple-500 outline-none font-bold [color-scheme:light] dark:[color-scheme:dark]"
                                            title="Data Inicial"
                                        />
                                    </div>
                                    <span className="text-slate-400 font-black text-[10px] w-full sm:w-auto text-center sm:text-left">ATÉ</span>
                                    <div className="relative flex-1 sm:flex-none">
                                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                        <input 
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full sm:w-auto pl-8 pr-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] text-slate-700 dark:text-slate-200 focus:border-purple-500 outline-none font-bold [color-scheme:light] dark:[color-scheme:dark]"
                                            title="Data Final"
                                        />
                                    </div>
                                    {(startDate || endDate) && (
                                        <button 
                                            onClick={clearDateFilters}
                                            className="p-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all ml-auto sm:ml-0"
                                            title="Limpar Datas"
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                    )}
                                </div>

                                {/* FILTRO MULTI-SELEÇÃO DE PORTAS */}
                                <div className="relative z-[50] w-full sm:w-auto" ref={apDropdownRef}>
                                    <button 
                                        onClick={() => setShowAPDropdown(!showAPDropdown)}
                                        className="w-full xl:w-64 pl-10 pr-10 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 text-xs font-bold text-left flex items-center justify-between hover:border-purple-500 transition-all shadow-sm"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <DoorClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500" size={16} />
                                            {selectedAccessPoints.length === 0 ? (
                                                <span className="text-slate-500 italic">Portas</span>
                                            ) : (
                                                <span className="text-purple-500">{selectedAccessPoints.length} Sel.</span>
                                            )}
                                        </div>
                                        <ChevronDown size={16} className={`text-slate-500 transition-transform duration-300 ${showAPDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showAPDropdown && (
                                        <div className="absolute top-full right-0 mt-3 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 w-[90vw] sm:min-w-[350px] sm:max-w-[450px] max-h-[450px] overflow-y-auto z-[100] custom-scrollbar animate-fade-in ring-4 ring-black/30">
                                            <div 
                                                className="flex items-center gap-3 p-3 hover:bg-purple-500/10 rounded-xl cursor-pointer transition-all border-b border-slate-800 mb-2 group"
                                                onClick={toggleAllAccessPoints}
                                            >
                                                <Checkbox 
                                                    checked={selectedAccessPoints.length === availableAccessPoints.length && availableAccessPoints.length > 0}
                                                    onChange={toggleAllAccessPoints}
                                                />
                                                <span className="text-[11px] font-black text-white uppercase tracking-widest">Selecionar / Limpar Tudo</span>
                                            </div>
                                            
                                            <div className="space-y-1">
                                                {availableAccessPoints.map(ap => (
                                                    <div 
                                                        key={ap} 
                                                        className={`grid grid-cols-[28px_1fr] items-center gap-2 p-3 rounded-xl cursor-pointer transition-all ${selectedAccessPoints.includes(ap) ? 'bg-purple-500/10 border-purple-500/20' : 'hover:bg-slate-800 border-transparent'} border`}
                                                        onClick={() => toggleAccessPoint(ap)}
                                                    >
                                                        <div className="shrink-0">
                                                            <Checkbox 
                                                                checked={selectedAccessPoints.includes(ap)}
                                                                onChange={() => toggleAccessPoint(ap)}
                                                            />
                                                        </div>
                                                        <span className={`text-[11px] font-bold leading-tight ${selectedAccessPoints.includes(ap) ? 'text-white' : 'text-slate-400'} truncate`}>
                                                            {ap}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            {availableAccessPoints.length === 0 && (
                                                <div className="p-12 text-center">
                                                    <DoorClosed className="mx-auto text-slate-700 mb-2 opacity-50" size={48} />
                                                    <p className="text-slate-600 text-[10px] uppercase font-black tracking-widest">Sem portas neste galpão</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                    <input 
                                        type="text" 
                                        value={peopleSearch}
                                        onChange={(e) => setPeopleSearch(e.target.value)}
                                        placeholder="Buscar nome..." 
                                        className="w-full sm:w-auto pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* LISTA DE GRUPOS E PESSOAS */}
                        <div className="space-y-4 pt-2">
                            {groupedByCompany
                                .filter(group => {
                                    if (!peopleSearch.trim()) return true;
                                    const term = peopleSearch.toLowerCase();
                                    return group.company.toLowerCase().includes(term) || 
                                           group.people.some(p => p.name.toLowerCase().includes(term));
                                })
                                .map((group) => {
                                    const isGroupExpanded = expandedCompanies.has(group.company) || peopleSearch.trim() !== '';
                                    const filteredPeople = group.people.filter(p => 
                                        p.name.toLowerCase().includes(peopleSearch.toLowerCase())
                                    );

                                    if (filteredPeople.length === 0 && peopleSearch.trim() !== '') return null;

                                    return (
                                        <div key={group.company} className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-all">
                                            {/* Cabeçalho do Grupo */}
                                            <button 
                                                onClick={() => toggleCompanyExpand(group.company)}
                                                className="w-full p-4 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-transparent data-[expanded=true]:border-slate-200 dark:data-[expanded=true]:border-slate-800"
                                                data-expanded={isGroupExpanded}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                                                        group.company === 'Terceiros' 
                                                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' 
                                                            : 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                                                    }`}>
                                                        <Briefcase size={20} />
                                                    </div>
                                                    <div className="text-left">
                                                        <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest">{group.company}</h4>
                                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">{filteredPeople.length} Colaboradores</p>
                                                    </div>
                                                </div>
                                                <div className={`p-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 transition-transform duration-300 ${isGroupExpanded ? 'rotate-180' : ''}`}>
                                                    <ChevronDown size={16} />
                                                </div>
                                            </button>

                                            {/* Lista de Pessoas no Grupo */}
                                            {isGroupExpanded && (
                                                <div className="p-3 space-y-2 bg-white dark:bg-slate-950/20">
                                                    {filteredPeople.map((person) => {
                                                        const allPersonIds = person.history.map(h => h.id);
                                                        const isAllSelected = allPersonIds.length > 0 && allPersonIds.every(id => selectedIds.has(id));
                                                        const isPartialSelected = allPersonIds.some(id => selectedIds.has(id)) && !isAllSelected;

                                                        return (
                                                            <div key={person.id} className={`border rounded-xl overflow-hidden transition-all duration-300 ${activeTab === 'report' && (isAllSelected || isPartialSelected) ? 'border-purple-500/50 bg-purple-500/5' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20'}`}>
                                                                <div 
                                                                    className="p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                                    onClick={(e) => {
                                                                        if ((e.target as HTMLElement).closest('.selection-checkbox')) return;
                                                                        togglePersonExpand(person.id);
                                                                    }}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        {activeTab === 'report' && (
                                                                            <div className="selection-checkbox" onClick={(e) => e.stopPropagation()}>
                                                                                <Checkbox 
                                                                                    checked={isAllSelected}
                                                                                    indeterminate={isPartialSelected}
                                                                                    onChange={() => handleSelectPersonGroup(person.history)}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-500 font-black text-xs">
                                                                            {person.name.charAt(0)}
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="font-bold text-slate-900 dark:text-white uppercase text-[12px] tracking-tight">{person.name}</h4>
                                                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{person.company}</p>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="flex items-center gap-4 mt-2 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                                                                        <div className="text-right">
                                                                            <span className="block text-[8px] text-slate-500 font-black uppercase tracking-tighter leading-none">Registros</span>
                                                                            <span className="block font-mono font-black text-emerald-500 text-sm leading-none">{person.history.length}</span>
                                                                        </div>
                                                                        {expandedPersonKey === person.id ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
                                                                    </div>
                                                                </div>

                                                                {expandedPersonKey === person.id && (
                                                                    <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-4 animate-fade-in">
                                                                        <div className="overflow-x-auto">
                                                                            <table className="w-full text-left text-[11px]">
                                                                                <thead className="text-slate-400 font-black uppercase text-[9px] tracking-widest border-b border-slate-200 dark:border-slate-800">
                                                                                    <tr>
                                                                                        {activeTab === 'report' && <th className="pb-2 w-7"></th>}
                                                                                        <th className="pb-2">Data</th>
                                                                                        <th className="pb-2">Horário</th>
                                                                                        <th className="pb-2">Unidade</th>
                                                                                        <th className="pb-2">Ponto de Acesso</th>
                                                                                        <th className="pb-2">Ação</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                                                                    {person.history.map((record) => {
                                                                                        const isSelected = selectedIds.has(record.id);
                                                                                        return (
                                                                                            <tr 
                                                                                                key={record.id} 
                                                                                                className={`transition-colors cursor-pointer ${isSelected && activeTab === 'report' ? 'bg-purple-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
                                                                                                onClick={() => activeTab === 'report' && handleSelectRecord(record.id)}
                                                                                            >
                                                                                                {activeTab === 'report' && (
                                                                                                    <td className="py-2">
                                                                                                        <Checkbox 
                                                                                                            checked={isSelected}
                                                                                                            onChange={() => handleSelectRecord(record.id)}
                                                                                                        />
                                                                                                    </td>
                                                                                                )}
                                                                                                <td className="py-2 font-mono text-slate-500 font-bold">
                                                                                                    {record.date !== 'N/A' ? record.date.split('-').reverse().join('/') : '-'}
                                                                                                </td>
                                                                                                <td className="py-2 font-mono text-emerald-500 font-black">
                                                                                                    {record.time}
                                                                                                </td>
                                                                                                <td className="py-2 text-slate-700 dark:text-slate-300 font-black uppercase text-[9px] tracking-tight">
                                                                                                    {record.unit}
                                                                                                </td>
                                                                                                <td className="py-2 text-slate-500 font-bold text-[9px]">
                                                                                                    {record.accessPoint}
                                                                                                </td>
                                                                                                <td className="py-2">
                                                                                                    {getFlowBadge(record.eventType)}
                                                                                                </td>
                                                                                            </tr>
                                                                                        );
                                                                                    })}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                )}
            </div>

            {/* JANELA FLUTUANTE DE RELATÓRIO COM DURAÇÃO */}
            {activeTab === 'report' && selectedIds.size > 0 && (
                <div 
                    ref={dragBoxRef}
                    style={!isMobile ? { 
                        position: 'fixed', 
                        left: `${pos.x}px`, 
                        top: `${pos.y}px`, 
                        zIndex: 200,
                        touchAction: 'none'
                    } : {
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        zIndex: 300,
                        touchAction: 'none'
                    }}
                    className={`bg-slate-900 border-2 border-purple-500 shadow-2xl overflow-hidden backdrop-blur-md transition-transform duration-200 select-none
                        ${!isMobile ? 'w-[90vw] md:w-[700px] rounded-2xl' : 'w-full rounded-none border-t-0 border-x-0'}
                        ${!isMobile && isDragging ? 'scale-[1.02] shadow-purple-500/30' : 'scale-100'}
                    `}
                >
                    {/* Cabeçalho */}
                    <div 
                        onMouseDown={onMouseDown}
                        className={`bg-slate-950/90 p-4 border-b border-slate-800 flex justify-between items-center 
                            ${!isMobile ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
                        `}
                    >
                        <div className="flex items-center gap-3">
                            {!isMobile && (
                                <div className="p-2 bg-purple-500/20 rounded-lg">
                                    <GripHorizontal size={18} className="text-purple-400" />
                                </div>
                            )}
                            <div className="flex flex-col">
                                <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                    <FileText size={14} className="text-purple-500" /> 
                                    Relatório de Permanência
                                </h3>
                                <span className="text-[9px] text-slate-500 font-bold uppercase">{selectedIds.size} acessos selecionados</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setSelectedIds(new Set())} 
                            className="p-2 bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white rounded-lg transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-4 md:p-6 flex flex-col gap-5">
                        {/* Card de Duração em Destaque */}
                        {stayDuration && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between animate-fade-in shadow-inner">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg">
                                        <Hourglass size={24} className="animate-spin-slow" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest leading-none mb-1">Permanência Estimada</p>
                                        <p className="text-2xl font-black text-emerald-400 leading-none">{stayDuration}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="px-3 py-1 bg-emerald-500 text-slate-950 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                                        Cálculo Ativo
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="relative">
                            <textarea 
                                value={generatedMessage}
                                onChange={(e) => setGeneratedMessage(e.target.value)}
                                className="w-full h-[120px] md:h-[150px] bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs md:text-sm text-slate-300 focus:border-purple-500 focus:outline-none resize-none font-mono leading-relaxed custom-scrollbar shadow-inner"
                            />
                            <div className="absolute bottom-2 right-2 p-1.5 bg-slate-900/80 rounded-md border border-slate-800">
                                <Clock size={14} className="text-slate-600" />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button 
                                onClick={copyToClipboard}
                                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[11px] tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/40 transition-all active:scale-95"
                            >
                                <MessageCircle size={20} /> Copiar WhatsApp
                            </button>
                            <button 
                                onClick={sendEmail}
                                className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[11px] tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-blue-900/40 transition-all active:scale-95"
                            >
                                <Mail size={20} /> Enviar E-mail
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccessManagement;
