
import React, { useState, useMemo } from 'react';
import { Filter, Search, X, Users, Briefcase, MapPin, Clock, ChevronDown, ChevronUp, Calendar, BarChart3, PieChart } from 'lucide-react';
import { ProcessedWorker, User } from '../types';
import { WAREHOUSE_LIST } from '../constants';

const VALID_COMPANIES = ['B11', 'MULT', 'MPI', 'FORMA', 'SUPERA LOG', 'MJM', 'PRIMUS', 'PRAYLOG'];

// Use WAREHOUSE_LIST from constants for IDs
const VALID_UNITS = WAREHOUSE_LIST.map(id => ({ id, keywords: [] }));

interface UnitStats {
    id: string;
    total: number;
    byCompany: { [key: string]: number };
    workers: ProcessedWorker[];
}

interface ThirdPartyStatusProps {
    workers?: ProcessedWorker[];
    currentUser?: User; // Pass user to check permissions
}

const ThirdPartyStatus: React.FC<ThirdPartyStatusProps> = ({ workers = [], currentUser }) => {
    const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
    const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const availableDates = useMemo(() => {
        const datesSet = new Set<string>();
        workers.forEach(w => {
            if (w.date && w.date !== 'N/A') datesSet.add(w.date);
        });
        return Array.from(datesSet).sort().reverse();
    }, [workers]);

    if (!selectedDate && availableDates.length > 0) setSelectedDate(availableDates[0]);

    // Permissions Logic
    const allowedWarehouses = useMemo(() => {
        if (!currentUser) return [];
        if (currentUser.role === 'admin' || currentUser.role === 'viewer') return WAREHOUSE_LIST; 
        return currentUser.allowedWarehouses || [];
    }, [currentUser]);

    const { stats, globalTotal, companyStats } = useMemo(() => {
        const filtered = workers.filter(w => {
            // Permission Filter
            if (currentUser?.role === 'manager' && !allowedWarehouses.includes(w.unit)) return false;

            // *** STICT FILTER: Only show specified Third Party Companies ***
            // Isso garante que funcionários internos (G2, etc) não apareçam aqui, apenas as empresas da lista.
            if (!VALID_COMPANIES.includes(w.company)) return false;

            if (selectedDate && w.date !== 'N/A' && w.date !== selectedDate) return false;
            if (selectedUnit !== 'ALL' && w.unit !== selectedUnit) return false;
            return true;
        });

        const statsMap: { [key: string]: UnitStats } = {};
        const companyCountMap: { [key: string]: number } = {};
        const uniqueWorkerSet = new Set<string>(); 
        let total = 0;
        
        // Init allowed units only
        VALID_UNITS.forEach(u => {
            if (currentUser?.role === 'manager' && !allowedWarehouses.includes(u.id)) return;
            statsMap[u.id] = { id: u.id, total: 0, byCompany: {}, workers: [] };
            VALID_COMPANIES.forEach(c => statsMap[u.id].byCompany[c] = 0);
        });

        // Init company map
        VALID_COMPANIES.forEach(c => companyCountMap[c] = 0);

        filtered.forEach(w => {
            const uniqueKey = `${w.date}-${w.unit}-${w.name.trim().toUpperCase()}-${w.company}`;
            if (!uniqueWorkerSet.has(uniqueKey)) {
                uniqueWorkerSet.add(uniqueKey);
                
                // Add to Unit Stats
                if (statsMap[w.unit]) {
                    statsMap[w.unit].total++;
                    statsMap[w.unit].byCompany[w.company] = (statsMap[w.unit].byCompany[w.company] || 0) + 1;
                    statsMap[w.unit].workers.push(w);
                }

                // Add to Company Stats
                if (companyCountMap[w.company] !== undefined) {
                    companyCountMap[w.company]++;
                }
                
                total++;
            }
        });

        return {
            stats: Object.values(statsMap).filter(u => selectedUnit === 'ALL' || u.id === selectedUnit).sort((a, b) => b.total - a.total),
            globalTotal: total,
            companyStats: Object.entries(companyCountMap).sort((a, b) => b[1] - a[1]).filter(c => c[1] > 0)
        };

    }, [workers, selectedDate, selectedUnit, currentUser, allowedWarehouses]);

    const getDetailTableWorkers = (unitStats: UnitStats) => {
        return unitStats.workers.filter(w => {
            const matchesCompany = selectedCompany === 'ALL' || w.company === selectedCompany;
            const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCompany && matchesSearch;
        });
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12 max-w-7xl mx-auto p-4 md:p-6">
            
            {/* Header & Filters */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Users className="text-amber-500" />
                            Status dos Terceirizados
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Controle exclusivo de empresas parceiras ({VALID_COMPANIES.length} empresas monitoradas).
                        </p>
                    </div>
                    
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                         <div className="relative">
                            <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full sm:w-auto pl-3 pr-8 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-blue-500 appearance-none cursor-pointer min-w-[160px]" disabled={availableDates.length === 0}>
                                <option value="">Todas Datas</option>
                                {availableDates.map(d => <option key={d} value={d}>{d.split('-').reverse().join('/')}</option>)}
                            </select>
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                        </div>
                        <div className="relative">
                            <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className="w-full sm:w-auto pl-3 pr-8 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-blue-500 appearance-none cursor-pointer min-w-[150px]">
                                <option value="ALL">Todas Unidades</option>
                                {VALID_UNITS.filter(u => currentUser?.role !== 'manager' || allowedWarehouses.includes(u.id)).map(u => <option key={u.id} value={u.id}>{u.id}</option>)}
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                        </div>
                    </div>
                </div>
            </div>

            {workers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-xl text-center">
                    <Briefcase size={48} className="text-slate-600 mb-4" />
                    <h3 className="text-slate-300 font-bold text-lg">Nenhum dado carregado</h3>
                    <p className="text-slate-500 text-sm max-w-md mt-2">Vá até a aba <strong>Fonte de Dados</strong> para carregar a planilha.</p>
                </div>
            ) : (
                <>
                    {/* NEW SUMMARY DASHBOARD */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 animate-fade-in">
                        {/* 1. Total Card */}
                        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 text-white shadow-lg flex flex-col justify-center items-center lg:col-span-1">
                            <div className="p-3 bg-white/10 rounded-full mb-3">
                                <Users size={32} className="text-white" />
                            </div>
                            <h3 className="text-sm font-bold text-blue-100 uppercase tracking-wider mb-1">Total de Terceiros</h3>
                            <span className="text-5xl font-black tracking-tight">{globalTotal}</span>
                            <span className="text-xs text-blue-200 mt-2 bg-black/20 px-2 py-1 rounded">Presentes Agora</span>
                        </div>

                        {/* 2. Warehouse Breakdown */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg lg:col-span-2 flex flex-col">
                            <h3 className="text-slate-200 font-bold text-sm uppercase flex items-center gap-2 mb-4">
                                <BarChart3 size={16} className="text-emerald-500" />
                                Distribuição por Galpão
                            </h3>
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 max-h-[200px]">
                                {stats.filter(s => s.total > 0).map(s => (
                                    <div key={s.id} className="group">
                                        <div className="flex justify-between items-center text-xs mb-1">
                                            <span className="text-slate-300 font-medium truncate pr-2">{s.id}</span>
                                            <span className="text-white font-bold">{s.total}</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                                style={{ width: `${(s.total / globalTotal) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                                {globalTotal === 0 && <p className="text-slate-500 text-xs italic">Sem dados para exibir.</p>}
                            </div>
                        </div>

                        {/* 3. Company Breakdown */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg lg:col-span-1 flex flex-col">
                            <h3 className="text-slate-200 font-bold text-sm uppercase flex items-center gap-2 mb-4">
                                <PieChart size={16} className="text-amber-500" />
                                Top Empresas
                            </h3>
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 max-h-[200px]">
                                {companyStats.map(([company, count], idx) => (
                                    <div key={company} className="flex items-center justify-between p-2 rounded bg-slate-800/50 border border-slate-700/50">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                                                {idx + 1}
                                            </div>
                                            <span className="text-xs text-slate-300 font-medium truncate">{company}</span>
                                        </div>
                                        <span className="text-xs font-bold text-white bg-slate-700 px-1.5 py-0.5 rounded">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* DETAILED SEARCH BAR */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input type="text" className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm shadow-sm" placeholder="Pesquisar terceirizado por nome em todas as unidades..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    {/* DETAIL CARDS GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {stats.map((unit) => (
                            <div key={unit.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col hover:border-slate-700 transition-colors">
                                <div className="p-5 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center">
                                    <h3 className="font-bold text-white text-base flex items-center gap-2 truncate pr-2" title={unit.id}>
                                        <MapPin size={16} className="text-emerald-500 shrink-0" />
                                        {unit.id}
                                    </h3>
                                    <span className="px-2 py-1 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded text-xs font-bold whitespace-nowrap">
                                        {unit.total}
                                    </span>
                                </div>
                                
                                <div className="p-5 flex-1">
                                    <div className="space-y-3">
                                        {Object.entries(unit.byCompany)
                                            .filter(([_, count]) => (count as number) > 0)
                                            .sort((a, b) => (b[1] as number) - (a[1] as number))
                                            .map(([company, count]) => (
                                                <div key={company} className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-400 font-medium">{company}</span>
                                                    <span className="text-slate-200 font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                                        {count as number}
                                                    </span>
                                                </div>
                                            ))
                                        }
                                        {unit.total === 0 && <p className="text-slate-600 text-xs italic text-center py-4">Nenhum terceiro registrado.</p>}
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => setExpandedUnit(expandedUnit === unit.id ? null : unit.id)} 
                                    className={`w-full py-3 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2
                                        ${expandedUnit === unit.id ? 'bg-slate-800 text-white' : 'bg-slate-950 text-slate-500 hover:text-slate-300 hover:bg-slate-900'}
                                    `}
                                >
                                    {expandedUnit === unit.id ? 'Ocultar Lista' : 'Ver Lista Nominal'} 
                                    {expandedUnit === unit.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* EXPANDED DETAILS PANEL */}
                    {expandedUnit && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl animate-fade-in scroll-mt-6" id="details-section">
                            <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Briefcase className="text-blue-500" /> Detalhes: {expandedUnit}</h3>
                                <button onClick={() => setExpandedUnit(null)} className="text-slate-500 hover:text-white"><X size={20}/></button>
                            </div>
                            <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-950 text-slate-400 text-xs uppercase sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="p-4">Data</th>
                                            <th className="p-4">Nome</th>
                                            <th className="p-4">Empresa</th>
                                            <th className="p-4">Chegada</th>
                                            <th className="p-4">Ponto de Acesso</th>
                                            <th className="p-4">Evento</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800 text-slate-300">
                                        {getDetailTableWorkers(stats.find(s => s.id === expandedUnit)!).map((worker) => (
                                            <tr key={worker.id} className="hover:bg-slate-800/50 transition-colors">
                                                <td className="p-4 font-mono text-slate-500 text-xs">{worker.date !== 'N/A' ? worker.date.split('-').reverse().join('/') : '-'}</td>
                                                <td className="p-4 font-medium text-white">{worker.name}</td>
                                                <td className="p-4"><span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300">{worker.company}</span></td>
                                                <td className="p-4 font-mono text-emerald-400 flex items-center gap-2"><Clock size={14}/> {worker.time}</td>
                                                <td className="p-4 text-slate-400 text-xs">{worker.accessPoint}</td>
                                                <td className="p-4 text-xs">{worker.eventType.includes('DESBLOQUEIO') ? <span className="text-blue-400">Desbloqueio Facial</span> : <span className="text-emerald-500">Entrada</span>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ThirdPartyStatus;
