import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Filter, Calendar, Users, Warehouse, X, ListChecks, ChevronRight, LayoutGrid, Download, CalendarRange, RotateCcw, Briefcase, TrendingUp } from 'lucide-react';
import { ThirdPartyPayment, User, ProcessedWorker } from '../types';
import { WAREHOUSE_LIST } from '../constants';
import Reports from './Reports';

interface PaymentsProps {
    payments: ThirdPartyPayment[];
    workers: ProcessedWorker[];
    currentUser: User;
}

// Estrutura para os dados do trabalhador no Pivot
interface WorkerPivotData {
    workerName: string;
    company: string;
    presence: { [date: string]: number };
}

// Sub-componente para gerenciar a tabela de cada galpão com scroll duplo
const UnitPivotTable: React.FC<{
    unitName: string;
    workers: { [workerKey: string]: WorkerPivotData };
    sortedDates: string[];
    onExport: (name: string, data: { [workerKey: string]: WorkerPivotData }) => void;
    startDate: string;
    endDate: string;
}> = ({ unitName, workers, sortedDates, onExport, startDate, endDate }) => {
    const topScrollRef = useRef<HTMLDivElement>(null);
    const bottomScrollRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<HTMLTableElement>(null);
    const [tableWidth, setTableWidth] = useState(0);

    // Sincroniza a largura da barra superior com a largura real da tabela
    useEffect(() => {
        if (tableRef.current) {
            setTableWidth(tableRef.current.scrollWidth);
        }
    }, [workers, sortedDates]);

    // Função de sincronização de scroll
    const syncScroll = (source: 'top' | 'bottom') => {
        const top = topScrollRef.current;
        const bottom = bottomScrollRef.current;
        if (!top || !bottom) return;

        if (source === 'top') {
            bottom.scrollLeft = top.scrollLeft;
        } else {
            top.scrollLeft = bottom.scrollLeft;
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl mb-8">
            {/* Header do Galpão */}
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-6">
                    <h3 className="text-sm font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-3">
                        <Warehouse size={18} />
                        {unitName}
                    </h3>
                    <button 
                        onClick={() => onExport(unitName, workers)}
                        className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white border border-emerald-600/20 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest active:scale-95"
                    >
                        <Download size={14} /> Extrair Planilha
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    {startDate && endDate && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-lg border border-slate-700 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                            <CalendarRange size={12} className="text-emerald-500" />
                            Período: {startDate.split('-').reverse().join('/')} ~ {endDate.split('-').reverse().join('/')}
                        </div>
                    )}
                    <span className="text-[10px] font-black bg-slate-900 text-slate-500 px-3 py-1.5 rounded-full border border-slate-800">
                        {Object.keys(workers).length} COLABORADORES
                    </span>
                </div>
            </div>

            {/* BARRA DE ROLAGEM SUPERIOR (GHOST SCROLLBAR) */}
            <div 
                ref={topScrollRef}
                onScroll={() => syncScroll('top')}
                className="overflow-x-auto custom-scrollbar bg-slate-950/20 border-b border-slate-800/50"
                style={{ minHeight: '12px' }}
            >
                <div style={{ width: `${tableWidth}px`, height: '1px' }}></div>
            </div>

            {/* CONTAINER DA TABELA (BARRA DE ROLAGEM INFERIOR NATIVA) */}
            <div 
                ref={bottomScrollRef}
                onScroll={() => syncScroll('bottom')}
                className="overflow-x-auto custom-scrollbar"
            >
                <table ref={tableRef} className="w-full text-left border-collapse min-w-max">
                    <thead className="bg-slate-950/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                        <tr>
                            <th className="p-4 min-w-[250px] sticky left-0 bg-slate-950 z-10 border-r border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">Nome</th>
                            {sortedDates.map(date => (
                                <th key={date} className="p-4 text-center border-r border-slate-800/50 min-w-[100px]">
                                    {date.split('-').reverse().join('/')}
                                </th>
                            ))}
                            <th className="p-4 text-center bg-slate-950 sticky right-0 z-10 border-l border-slate-800 text-emerald-500 min-w-[120px] shadow-[-2px_0_5px_rgba(0,0,0,0.3)]">Total Geral</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {/* 
                           Fix: Explicitly cast untypedData to WorkerPivotData to avoid 'unknown' type errors during iteration.
                        */}
                        {Object.entries(workers).map(([workerKey, untypedData]) => {
                            const data = untypedData as WorkerPivotData;
                            const totalPresence = Object.values(data.presence).reduce((a: number, b: number) => a + b, 0);
                            return (
                                <tr key={workerKey} className="hover:bg-slate-800/30 transition-colors group">
                                    <td className="p-4 sticky left-0 bg-slate-900 group-hover:bg-slate-800 border-r border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-200 text-xs uppercase">{data.workerName}</span>
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter flex items-center gap-1 mt-0.5">
                                                <Briefcase size={10} className="text-slate-600" />
                                                {data.company}
                                            </span>
                                        </div>
                                    </td>
                                    {sortedDates.map(date => (
                                        <td key={date} className="p-4 text-center border-r border-slate-800/20 font-mono text-slate-400">
                                            {data.presence[date] || ''}
                                        </td>
                                    ))}
                                    <td className="p-4 text-center font-black text-emerald-400 bg-slate-900 group-hover:bg-slate-800 sticky right-0 border-l border-slate-800 shadow-[-2px_0_5px_rgba(0,0,0,0.3)]">
                                        {totalPresence}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const hasWarehousePermission = (allowedList: string[] | undefined, targetWarehouse: string) => {
    if (!allowedList || allowedList.length === 0) return false;
    const normalizedTarget = (targetWarehouse || '').toUpperCase();
    return allowedList.some(allowed => {
        const normalizedAllowed = allowed.toUpperCase();
        return normalizedAllowed === normalizedTarget || normalizedAllowed.includes(normalizedTarget) || normalizedTarget.includes(normalizedAllowed);
    });
};

const Payments: React.FC<PaymentsProps> = ({ payments, workers, currentUser }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [warehouseFilter, setWarehouseFilter] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isReportsOpen, setIsReportsOpen] = useState(false);

    const allowedWarehouses = useMemo(() => {
        if (currentUser.role === 'admin') return WAREHOUSE_LIST;
        return currentUser.allowedWarehouses || [];
    }, [currentUser]);

    // Filtragem baseada em permissão, busca e PERÍODO
    const filteredBase = useMemo(() => {
        return payments.filter(p => {
            const matchesSearch = p.workerName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesWarehouse = warehouseFilter === 'ALL' || p.unit === warehouseFilter;
            const hasPerm = currentUser.role === 'admin' || hasWarehousePermission(allowedWarehouses, p.unit);
            
            // Filtro de Período
            let matchesDate = true;
            if (startDate && p.date < startDate) matchesDate = false;
            if (endDate && p.date > endDate) matchesDate = false;

            return matchesSearch && matchesWarehouse && hasPerm && matchesDate;
        });
    }, [payments, searchTerm, warehouseFilter, currentUser, allowedWarehouses, startDate, endDate]);

    // Lógica Pivot: Agrupar por Galpão -> Por Pessoa (Nome + Empresa) -> Datas
    const pivotData = useMemo(() => {
        const units: { [unit: string]: { [workerKey: string]: WorkerPivotData } } = {};
        const allDates = new Set<string>();

        filteredBase.forEach(p => {
            if (!units[p.unit]) units[p.unit] = {};
            
            const workerKey = `${p.workerName.toUpperCase()}|${p.company.toUpperCase()}`;
            
            if (!units[p.unit][workerKey]) {
                units[p.unit][workerKey] = {
                    workerName: p.workerName,
                    company: p.company,
                    presence: {}
                };
            }
            
            units[p.unit][workerKey].presence[p.date] = (units[p.unit][workerKey].presence[p.date] || 0) + 1;
            allDates.add(p.date);
        });

        const sortedDates = Array.from(allDates).sort();

        return { units, sortedDates };
    }, [filteredBase]);

    const handleExportExcel = (unitName: string, workers: { [workerKey: string]: WorkerPivotData }) => {
        if (!window.XLSX) {
            alert("Biblioteca de exportação não carregada.");
            return;
        }

        const dataToExport = Object.entries(workers).map(([_, data]) => {
            const row: any = { 
                "Nome": data.workerName.toUpperCase(),
                "Empresa": data.company.toUpperCase()
            };
            pivotData.sortedDates.forEach(date => {
                const formattedDate = date.split('-').reverse().join('/');
                row[formattedDate] = data.presence[date] || "";
            });
            row["Total Geral"] = Object.values(data.presence).reduce((a: number, b: number) => a + b, 0);
            return row;
        });

        const ws = window.XLSX.utils.json_to_sheet(dataToExport);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Frequência");
        
        const fileName = `Frequencia_${unitName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`;
        window.XLSX.writeFile(wb, fileName);
    };

    const clearDateFilters = () => {
        setStartDate('');
        setEndDate('');
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12 max-w-full mx-auto p-4 md:p-6">
            {/* Cabeçalho */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <ListChecks className="text-emerald-500" size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter italic">Central de Frequência</h2>
                        <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1">
                            Controle nominal de diárias e presença de terceiros
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full xl:w-auto">
                    <button 
                        onClick={() => setIsReportsOpen(true)}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-900/20 transition-all active:scale-95 uppercase text-[10px] tracking-widest whitespace-nowrap"
                    >
                        <TrendingUp size={16} /> Relatórios
                    </button>

                    {/* Filtro de Período */}
                    <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 shadow-inner min-w-fit">
                        <div className="relative flex-1 min-w-[120px]">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <input 
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full pl-8 pr-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-[10px] text-slate-200 focus:border-emerald-500 outline-none font-bold [color-scheme:dark]"
                                title="Data Inicial"
                            />
                        </div>
                        <span className="text-slate-600 font-black text-[10px] px-1">ATÉ</span>
                        <div className="relative flex-1 min-w-[120px]">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <input 
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full pl-8 pr-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-[10px] text-slate-200 focus:border-emerald-500 outline-none font-bold [color-scheme:dark]"
                                title="Data Final"
                            />
                        </div>
                        {(startDate || endDate) && (
                            <button 
                                onClick={clearDateFilters}
                                className="p-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
                                title="Limpar Datas"
                            >
                                <RotateCcw size={14} />
                            </button>
                        )}
                    </div>

                    <div className="relative flex-1 lg:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                            type="text"
                            placeholder="Buscar colaborador..."
                            className="w-full lg:w-64 pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:border-emerald-500 outline-none transition-all font-bold uppercase"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative flex-1 lg:flex-none">
                        <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <select 
                            className="w-full lg:w-56 pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-300 focus:border-emerald-500 outline-none appearance-none cursor-pointer font-bold uppercase"
                            value={warehouseFilter}
                            onChange={(e) => setWarehouseFilter(e.target.value)}
                        >
                            <option value="ALL">Todos os Galpões</option>
                            {WAREHOUSE_LIST.filter(w => currentUser.role === 'admin' || hasWarehousePermission(allowedWarehouses, w)).map(w => (
                                <option key={w} value={w}>{w}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Listagem Estilo Pivot por Unidade */}
            {Object.keys(pivotData.units).length === 0 ? (
                <div className="py-20 text-center bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-2xl">
                    <Users size={48} className="mx-auto mb-4 text-slate-700" />
                    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Nenhum dado de frequência encontrado no período</p>
                </div>
            ) : (
                Object.entries(pivotData.units).map(([unitName, untypedWorkers]) => (
                    <UnitPivotTable 
                        key={unitName}
                        unitName={unitName}
                        workers={untypedWorkers as any}
                        sortedDates={pivotData.sortedDates}
                        onExport={handleExportExcel}
                        startDate={startDate}
                        endDate={endDate}
                    />
                ))
            )}

            <Reports 
                isOpen={isReportsOpen} 
                onClose={() => setIsReportsOpen(false)} 
                payments={payments} 
                workers={workers}
            />
        </div>
    );
};

export default Payments;
