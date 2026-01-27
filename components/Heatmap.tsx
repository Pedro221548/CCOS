
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, ProcessedWorker } from '../types';
import { WAREHOUSE_LIST } from '../constants';
import { Activity, Clock, Filter, X, AlertCircle, DoorClosed, CheckSquare, Square, ChevronDown } from 'lucide-react';

interface HeatmapProps {
    thirdPartyWorkers: ProcessedWorker[];
    currentUser: User;
}

const Heatmap: React.FC<HeatmapProps> = ({ thirdPartyWorkers, currentUser }) => {
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
    const [selectedAccessPoints, setSelectedAccessPoints] = useState<string[]>([]);
    const [showAPDropdown, setShowAPDropdown] = useState(false);
    const [heatmapModalData, setHeatmapModalData] = useState<{ day: string, hour: number, people: ProcessedWorker[] } | null>(null);
    
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowAPDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- PERMISSÕES ---
    const allowedWarehouses = useMemo(() => {
        if (currentUser.role === 'manager') return currentUser.allowedWarehouses || [];
        return WAREHOUSE_LIST;
    }, [currentUser]);

    // Lista dinâmica de Pontos de Acesso baseada no Galpão
    const availableAccessPoints = useMemo(() => {
        const set = new Set<string>();
        thirdPartyWorkers.forEach(w => {
            if (selectedWarehouse === 'ALL' || w.unit === selectedWarehouse) {
                if (w.accessPoint) set.add(w.accessPoint);
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

    // --- DATA FILTERING ---
    const filteredWorkers = useMemo(() => {
        let subset = thirdPartyWorkers;
        
        // 1. Filtro de Permissão
        if (currentUser.role === 'manager') {
            if (!allowedWarehouses || allowedWarehouses.length === 0) return [];
            subset = subset.filter(w => allowedWarehouses.includes(w.unit));
        }

        // 2. Filtro de Galpão
        if (selectedWarehouse !== 'ALL') {
            subset = subset.filter(w => w.unit === selectedWarehouse);
        }

        // 3. Filtro de Pontos de Acesso (Múltiplos)
        if (selectedAccessPoints.length > 0) {
            subset = subset.filter(w => selectedAccessPoints.includes(w.accessPoint));
        }

        return subset;
    }, [thirdPartyWorkers, selectedWarehouse, selectedAccessPoints, currentUser, allowedWarehouses]);

    // --- ANALYTICS: HEATMAP (Day x Hour) ---
    const heatmapData = useMemo(() => {
        const grid: ProcessedWorker[][][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => []));
        filteredWorkers.forEach(w => {
            if (w.date && w.time) {
                let dateObj: Date | null = null;
                if (w.date.includes('-')) dateObj = new Date(w.date + 'T12:00:00'); 
                if (dateObj && !isNaN(dateObj.getTime())) {
                    const day = dateObj.getDay(); 
                    const hour = parseInt(w.time.split(':')[0], 10);
                    if (hour >= 0 && hour < 24) {
                        grid[day][hour].push(w);
                    }
                }
            }
        });
        return grid;
    }, [filteredWorkers]);

    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const hoursOfDay = Array.from({ length: 24 }, (_, i) => i);

    const getHeatmapColor = (count: number) => {
        if (count === 0) return 'bg-slate-100 dark:bg-slate-800/50';
        if (count < 5) return 'bg-emerald-200 dark:bg-emerald-900/30';
        if (count < 15) return 'bg-emerald-400 dark:bg-emerald-700/50';
        if (count < 30) return 'bg-emerald-500 dark:bg-emerald-600';
        return 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20';
    };

    const handleHeatmapClick = (dayIdx: number, hour: number) => {
        const people = heatmapData[dayIdx][hour];
        if (people.length > 0) {
            setHeatmapModalData({
                day: daysOfWeek[dayIdx],
                hour,
                people
            });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12 max-w-7xl mx-auto p-4 md:p-6">
            {/* Header com Filtros */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 relative z-30">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="text-emerald-500" />
                        Mapa de Calor
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Densidade de acessos por dia, horário e portas selecionadas.
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                    {/* Filtro Galpão */}
                    <div className="relative w-full sm:w-64">
                        <select 
                            value={selectedWarehouse} 
                            onChange={(e) => setSelectedWarehouse(e.target.value)} 
                            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                        >
                            <option value="ALL">
                                {currentUser.role === 'manager' ? 'Meus Galpões Permitidos' : 'Todos os Galpões'}
                            </option>
                            {allowedWarehouses.map(wh => (
                                <option key={wh} value={wh}>{wh}</option>
                            ))}
                        </select>
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                    </div>

                    {/* Multi-Filtro Ponto de Acesso */}
                    <div className="relative w-full sm:w-72" ref={dropdownRef}>
                        <button 
                            onClick={() => setShowAPDropdown(!showAPDropdown)}
                            className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm text-left flex items-center justify-between hover:border-emerald-500 transition-colors"
                        >
                            <div className="flex items-center gap-2 truncate">
                                <DoorClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                {selectedAccessPoints.length === 0 ? (
                                    <span className="text-slate-500">Todas as Portas</span>
                                ) : (
                                    <span className="text-emerald-400 font-bold">{selectedAccessPoints.length} Portas Selecionadas</span>
                                )}
                            </div>
                            <ChevronDown size={16} className={`text-slate-500 transition-transform ${showAPDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showAPDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 max-h-[300px] overflow-y-auto z-50 custom-scrollbar animate-fade-in">
                                <div 
                                    className="flex items-center gap-2 p-2 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors border-b border-slate-800 mb-2"
                                    onClick={toggleAllAccessPoints}
                                >
                                    {selectedAccessPoints.length === availableAccessPoints.length ? (
                                        <CheckSquare size={16} className="text-emerald-500" />
                                    ) : (
                                        <Square size={16} className="text-slate-600" />
                                    )}
                                    <span className="text-xs font-black text-white uppercase tracking-widest">Selecionar Tudo</span>
                                </div>
                                
                                {availableAccessPoints.map(ap => (
                                    <div 
                                        key={ap} 
                                        className="flex items-center gap-2 p-2 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                                        onClick={() => toggleAccessPoint(ap)}
                                    >
                                        {selectedAccessPoints.includes(ap) ? (
                                            <CheckSquare size={16} className="text-emerald-500" />
                                        ) : (
                                            <Square size={16} className="text-slate-600" />
                                        )}
                                        <span className="text-xs text-slate-300 truncate">{ap}</span>
                                    </div>
                                ))}

                                {availableAccessPoints.length === 0 && (
                                    <div className="p-4 text-center text-slate-600 text-[10px] uppercase font-bold">Sem portas disponíveis</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Empty State / Permissions Check */}
            {currentUser.role === 'manager' && allowedWarehouses.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
                    <AlertCircle className="mx-auto text-amber-500 mb-4" size={48} />
                    <h3 className="text-xl font-bold text-white">Nenhum Galpão Associado</h3>
                    <p className="text-slate-400 mt-2">Sem permissões para visualizar dados.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-lg relative z-10">
                    <div className="animate-fade-in overflow-x-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Clock size={20} className="text-emerald-500" />
                                Grade Semanal de Intensidade
                            </h3>
                            <div className="flex items-center gap-4">
                                {selectedAccessPoints.length > 0 && (
                                    <button 
                                        onClick={() => setSelectedAccessPoints([])}
                                        className="text-[10px] text-rose-500 font-bold uppercase hover:text-rose-400 underline underline-offset-4"
                                    >
                                        Limpar Filtro de Portas
                                    </button>
                                )}
                                <span className="text-xs text-slate-500 italic">Clique em uma célula para detalhes</span>
                            </div>
                        </div>
                        
                        <div className="min-w-[600px]">
                            {/* Header: Dias da Semana */}
                            <div className="grid grid-cols-[50px_repeat(7,1fr)] gap-1 mb-2 border-b border-slate-700 pb-2">
                                <div className="text-xs font-bold text-slate-500 text-center flex items-end justify-center">Hora</div>
                                {daysOfWeek.map(day => (
                                    <div key={day} className="text-xs font-bold text-center text-slate-400 uppercase tracking-wide">{day}</div>
                                ))}
                            </div>

                            {/* Body: Horas (Linhas) -> Dias (Colunas) */}
                            {hoursOfDay.map((hour) => (
                                <div key={hour} className="grid grid-cols-[50px_repeat(7,1fr)] gap-1 mb-1 items-center hover:bg-slate-800/30 rounded px-1">
                                    <div className="text-[10px] font-bold text-slate-500 text-center">{hour}h</div>
                                    {daysOfWeek.map((_, dayIdx) => {
                                        const count = heatmapData[dayIdx][hour].length;
                                        return (
                                            <div 
                                                key={`${dayIdx}-${hour}`}
                                                onClick={() => handleHeatmapClick(dayIdx, hour)}
                                                className={`h-8 rounded-md cursor-pointer transition-all hover:scale-105 hover:z-10 flex items-center justify-center text-[10px] font-bold border border-transparent hover:border-slate-500 ${getHeatmapColor(count)}`}
                                                title={`${count} acessos às ${hour}h em ${daysOfWeek[dayIdx]}`}
                                            >
                                                {count > 0 ? count : ''}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Legenda */}
                    <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-6 justify-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Intensidade:</span>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-slate-100 dark:bg-slate-800"></div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Nulo</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-emerald-200 dark:bg-emerald-900/30"></div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Baixo</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-emerald-400 dark:bg-emerald-700/50"></div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Médio</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-emerald-500 dark:bg-emerald-600"></div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Alto</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-emerald-600 dark:bg-emerald-500 shadow-sm shadow-emerald-500/20"></div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Crítico</span>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE DETALHES POR CÉLULA */}
            {heatmapModalData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Clock size={18} className="text-emerald-500" />
                                    {heatmapModalData.day}, {heatmapModalData.hour}h:00 - {heatmapModalData.hour}h:59
                                </h3>
                                <p className="text-xs text-slate-400">{heatmapModalData.people.length} acessos filtrados</p>
                            </div>
                            <button onClick={() => setHeatmapModalData(null)} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                            {heatmapModalData.people.map(p => (
                                <div key={p.id} className="bg-slate-800/50 p-3 rounded border border-slate-700 flex justify-between items-center group hover:border-emerald-500/30 transition-colors">
                                    <div>
                                        <p className="text-sm font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{p.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">{p.company}</span>
                                            <span className="text-[10px] text-slate-600">•</span>
                                            <span className="text-[10px] text-slate-500 font-bold truncate max-w-[150px]">{p.accessPoint}</span>
                                        </div>
                                    </div>
                                    <div className="text-emerald-400 font-mono text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                                        {p.time}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Heatmap;
