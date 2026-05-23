
import React, { useState, useMemo } from 'react';
import { Filter, Search, X, Users, Briefcase, MapPin, Clock, ChevronDown, ChevronUp, Calendar, BarChart3, PieChart, Crown, TrendingUp } from 'lucide-react';
import { ProcessedWorker, User, ThirdPartyPayment } from '../types';
import { WAREHOUSE_LIST } from '../constants';

const VALID_COMPANIES = ['B11', 'MULT', 'MPI', 'FORMA', 'SUPERA LOG', 'MJM', 'PRIMUS', 'PRAYLOG', 'GMILL', 'BSB'];

const VALID_UNITS = WAREHOUSE_LIST.map(id => ({ id, keywords: [] }));

interface UnitStats {
    id: string;
    total: number;
    byCompany: { [key: string]: number };
    workers: ProcessedWorker[];
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

interface ThirdPartyStatusProps {
    workers?: ProcessedWorker[];
    paymentRecords?: ThirdPartyPayment[];
    currentUser?: User;
}

const ThirdPartyStatus: React.FC<ThirdPartyStatusProps> = ({ workers = [], paymentRecords = [], currentUser }) => {
    const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const availableDates = useMemo(() => {
        const datesSet = new Set<string>();
        workers.forEach(w => {
            if (w.date && w.date !== 'N/A') datesSet.add(w.date);
        });
        return Array.from(datesSet).sort().reverse();
    }, [workers]);

    if (!selectedDate && availableDates.length > 0) setSelectedDate(availableDates[0]);

    const allowedWarehouses = useMemo(() => {
        if (!currentUser) return [];
        if (currentUser.role === 'admin' || currentUser.role === 'viewer') return WAREHOUSE_LIST; 
        return currentUser.allowedWarehouses || [];
    }, [currentUser]);

    const { stats, globalTotal, companyStats, topUnit } = useMemo(() => {
        // 1. Criar dicionário do Financeiro para cruzamento (Nome -> Empresa)
        const financeMap: { [name: string]: string } = {};
        paymentRecords?.forEach(p => {
            const nameKey = p.workerName.trim().toUpperCase();
            const company = (p.company || '').trim().toUpperCase();
            // Só mapeia se a empresa for conhecida e não for um placeholder genérico
            if (company && company !== 'N/A' && company !== 'TERCEIRIZADO' && company !== 'UNDEFINED') {
                financeMap[nameKey] = company;
            }
        });

        // 2. Filtrar e Identificar Empresas
        const validatedWorkers = workers.filter(w => {
            // Filtros básicos de interface
            if (currentUser?.role === 'manager' && !hasWarehousePermission(currentUser.allowedWarehouses, w.unit)) return false;
            if (selectedDate && w.date !== 'N/A' && w.date !== selectedDate) return false;
            if (selectedUnit !== 'ALL' && w.unit !== selectedUnit) return false;

            // Lógica de Identificação de Empresa
            let identifiedCompany = (w.company || '').trim().toUpperCase();
            if (identifiedCompany === 'MULT ALTA DIARISTA') identifiedCompany = 'MULT';
            if (identifiedCompany === 'B11 ALTA DIARISTA') identifiedCompany = 'B11';
            
            // Se estiver vazio na planilha de acesso, tenta buscar no financeiro pelo nome exato
            if (!identifiedCompany || identifiedCompany === 'NÃO IDENTIFICADO') {
                const nameKey = w.name.trim().toUpperCase();
                if (financeMap[nameKey]) {
                    identifiedCompany = financeMap[nameKey];
                    if (identifiedCompany === 'MULT ALTA DIARISTA') identifiedCompany = 'MULT';
                    if (identifiedCompany === 'B11 ALTA DIARISTA') identifiedCompany = 'B11';
                }
            }

            // CRÍTICO: Se após o cruzamento ainda não tivermos uma empresa válida, 
            // ou se a empresa não estiver na lista oficial, EXCLUÍMOS do painel de status.
            if (!identifiedCompany || identifiedCompany === '' || !VALID_COMPANIES.includes(identifiedCompany)) {
                return false;
            }

            // Atualiza a empresa do objeto em memória para refletir no agrupamento
            w.company = identifiedCompany;
            return true;
        });

        const statsMap: { [key: string]: UnitStats } = {};
        const companyCountMap: { [key: string]: number } = {};
        const uniqueWorkerSet = new Set<string>(); 
        let total = 0;
        
        // Inicializar mapas
        VALID_UNITS.forEach(u => {
            if (currentUser?.role === 'manager' && !hasWarehousePermission(allowedWarehouses, u.id)) return;
            statsMap[u.id] = { id: u.id, total: 0, byCompany: {}, workers: [] };
        });

        VALID_COMPANIES.forEach(c => companyCountMap[c] = 0);

        // Agregação dos dados validados
        validatedWorkers.forEach(w => {
            // Evitar duplicidade de contagem para o mesmo colaborador no mesmo dia/unidade/empresa
            const uniqueKey = `${w.date}-${w.unit}-${w.name.trim().toUpperCase()}-${w.company}`;
            if (!uniqueWorkerSet.has(uniqueKey)) {
                uniqueWorkerSet.add(uniqueKey);
                
                if (statsMap[w.unit]) {
                    statsMap[w.unit].total++;
                    statsMap[w.unit].byCompany[w.company] = (statsMap[w.unit].byCompany[w.company] || 0) + 1;
                    statsMap[w.unit].workers.push(w);
                }

                if (companyCountMap[w.company] !== undefined) {
                    companyCountMap[w.company]++;
                }
                
                total++;
            }
        });

        const sortedStats = Object.values(statsMap)
            .filter(u => (selectedUnit === 'ALL' || u.id === selectedUnit) && u.total > 0)
            .sort((a, b) => b.total - a.total);

        return {
            stats: sortedStats,
            globalTotal: total,
            companyStats: Object.entries(companyCountMap).sort((a, b) => b[1] - a[1]).filter(c => c[1] > 0),
            topUnit: sortedStats.length > 0 ? sortedStats[0] : null
        };

    }, [workers, paymentRecords, selectedDate, selectedUnit, currentUser, allowedWarehouses]);

    const getDetailTableWorkers = (unitId: string) => {
        const unit = stats.find(s => s.id === unitId);
        if (!unit) return [];
        return unit.workers.filter(w => {
            return w.name.toLowerCase().includes(searchTerm.toLowerCase());
        });
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12 max-w-7xl mx-auto p-4 md:p-6">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Users className="text-amber-500" />
                            Status dos Terceirizados
                        </h2>
                        <p className="text-slate-400 text-sm mt-1 font-medium italic">
                            Dados filtrados: apenas registros com empresa confirmada via Planilha ou Financeiro.
                        </p>
                    </div>
                    
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
                                <option value="ALL">
                                    {currentUser?.role === 'manager' ? 'Meus Galpões' : 'Todas Unidades'}
                                </option>
                                {WAREHOUSE_LIST.filter(u => hasWarehousePermission(allowedWarehouses, u)).map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                        </div>
                    </div>
                </div>
            </div>

            {globalTotal === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-xl text-center">
                    <Briefcase size={48} className="text-slate-600 mb-4 opacity-50" />
                    <h3 className="text-slate-300 font-bold text-lg uppercase tracking-widest">Sem Dados Confirmados</h3>
                    <p className="text-slate-500 text-sm max-w-md mt-2">Nenhum colaborador com empresa identificada foi encontrado para os filtros selecionados.</p>
                </div>
            ) : (
                <>
                    {/* KPIs Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
                        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-5 text-white shadow-lg flex flex-col justify-center items-center">
                            <div className="p-2 bg-white/10 rounded-full mb-2">
                                <Users size={24} className="text-white" />
                            </div>
                            <h3 className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mb-1 text-center">Total Permitido</h3>
                            <span className="text-4xl font-black tracking-tight">{globalTotal}</span>
                        </div>

                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 text-white shadow-lg flex flex-col justify-center items-center relative overflow-hidden group">
                            <div className="absolute -right-2 -top-2 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <Crown size={80} />
                            </div>
                            <div className="p-2 bg-white/10 rounded-full mb-2 relative z-10">
                                <TrendingUp size={24} className="text-white" />
                            </div>
                            <h3 className="text-[10px] font-bold text-amber-100 uppercase tracking-widest mb-1 text-center relative z-10">Maior Fluxo</h3>
                            <span className="text-xl font-black tracking-tight text-center truncate w-full px-2 relative z-10">
                                {topUnit ? topUnit.id : '---'}
                            </span>
                            <div className="mt-2 flex items-center gap-1.5 relative z-10 bg-black/20 px-3 py-0.5 rounded-full">
                                <span className="text-[13px] font-black">{topUnit ? topUnit.total : 0}</span>
                                <span className="text-[9px] font-bold uppercase opacity-80">Acessos</span>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg lg:col-span-1 flex flex-col h-full min-h-[160px]">
                            <h3 className="text-slate-200 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 mb-3">
                                <BarChart3 size={14} className="text-emerald-500" />
                                Top 5 Unidades
                            </h3>
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2 max-h-[100px]">
                                {stats.slice(0, 5).map(s => (
                                    <div key={s.id}>
                                        <div className="flex justify-between items-center text-[10px] mb-1">
                                            <span className="text-slate-400 font-medium truncate max-w-[120px]">{s.id}</span>
                                            <span className="text-white font-bold">{s.total}</span>
                                        </div>
                                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                                style={{ width: `${(s.total / (globalTotal || 1)) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg lg:col-span-1 flex flex-col h-full min-h-[160px]">
                            <h3 className="text-slate-200 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 mb-3">
                                <PieChart size={14} className="text-amber-500" />
                                Top Empresas
                            </h3>
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2 max-h-[100px]">
                                {companyStats.slice(0, 3).map(([company, count]) => (
                                    <div key={company} className="flex items-center justify-between p-1.5 rounded bg-slate-800/50">
                                        <span className="text-[10px] text-slate-300 font-bold truncate max-w-[110px]">{company}</span>
                                        <span className="text-[10px] font-black text-white bg-slate-700 px-1.5 py-0.5 rounded">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input type="text" className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm shadow-sm transition-all" placeholder="Buscar por nome nos registros validados..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {stats.map((unit) => (
                            <div key={unit.id} className={`bg-slate-900 border rounded-xl overflow-hidden shadow-lg flex flex-col hover:border-slate-700 transition-colors ${topUnit?.id === unit.id ? 'border-amber-500/30' : 'border-slate-800'}`}>
                                <div className={`p-5 border-b flex justify-between items-center ${topUnit?.id === unit.id ? 'bg-amber-500/5 border-amber-500/20' : 'bg-slate-950/30 border-slate-800'}`}>
                                    <h3 className="font-bold text-white text-base flex items-center gap-2 truncate pr-2" title={unit.id}>
                                        <MapPin size={16} className={topUnit?.id === unit.id ? 'text-amber-500' : 'text-emerald-500'} />
                                        {unit.id}
                                    </h3>
                                    <span className={`px-2 py-1 rounded text-xs font-black border whitespace-nowrap ${topUnit?.id === unit.id ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-blue-600/20 text-blue-400 border-blue-600/30'}`}>
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
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => setExpandedUnit(expandedUnit === unit.id ? null : unit.id)} 
                                    className={`w-full py-3 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2
                                        ${expandedUnit === unit.id ? 'bg-slate-800 text-white' : 'bg-slate-950 text-slate-500 hover:text-slate-300 hover:bg-slate-900'}
                                    `}
                                >
                                    {expandedUnit === unit.id ? 'Fechar' : 'Listar Pessoas'} 
                                    {expandedUnit === unit.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                </button>
                            </div>
                        ))}
                    </div>

                    {expandedUnit && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl animate-fade-in scroll-mt-6">
                            <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Briefcase className="text-blue-500" /> {expandedUnit}</h3>
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
                                            <th className="p-4">Local</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800 text-slate-300">
                                        {getDetailTableWorkers(expandedUnit).map((worker) => (
                                            <tr key={worker.id} className="hover:bg-slate-800/50 transition-colors">
                                                <td className="p-4 font-mono text-slate-500 text-xs">{worker.date !== 'N/A' ? worker.date.split('-').reverse().join('/') : '-'}</td>
                                                <td className="p-4 font-medium text-white">{worker.name}</td>
                                                <td className="p-4"><span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300">{worker.company}</span></td>
                                                <td className="p-4 font-mono text-emerald-400 flex items-center gap-2"><Clock size={14}/> {worker.time}</td>
                                                <td className="p-4 text-slate-400 text-xs">{worker.accessPoint}</td>
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
