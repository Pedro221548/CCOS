
import React, { useState, useMemo, useEffect } from 'react';
import { User, ProcessedWorker } from '../types';
import { WAREHOUSE_LIST } from '../constants';
import { Activity, Clock, Filter, X, AlertCircle } from 'lucide-react';

interface HeatmapProps {
    thirdPartyWorkers: ProcessedWorker[];
    currentUser: User;
}

const Heatmap: React.FC<HeatmapProps> = ({ thirdPartyWorkers, currentUser }) => {
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
    const [heatmapModalData, setHeatmapModalData] = useState<{ day: string, hour: number, people: ProcessedWorker[] } | null>(null);

    // --- PERMISSIONS ---
    const allowedWarehouses = useMemo(() => {
        if (currentUser.role === 'manager') return currentUser.allowedWarehouses || [];
        return WAREHOUSE_LIST; // Admin/Viewer sees all
    }, [currentUser]);

    useEffect(() => {
        if (selectedWarehouse !== 'ALL' && !allowedWarehouses.includes(selectedWarehouse)) {
            setSelectedWarehouse('ALL');
        }
    }, [allowedWarehouses, selectedWarehouse]);

    // --- DATA FILTERING ---
    const filteredWorkers = useMemo(() => {
        let subset = thirdPartyWorkers;
        if (currentUser.role === 'manager') {
            if (!allowedWarehouses || allowedWarehouses.length === 0) return [];
            subset = subset.filter(w => allowedWarehouses.includes(w.unit));
        }
        if (selectedWarehouse !== 'ALL') {
            subset = subset.filter(w => w.unit === selectedWarehouse);
        }
        return subset;
    }, [thirdPartyWorkers, selectedWarehouse, currentUser, allowedWarehouses]);

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
            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="text-emerald-500" />
                        Mapa de Calor
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Visualize a intensidade de acessos por dia e horário.
                    </p>
                </div>
                
                <div className="relative z-20">
                    <select 
                        value={selectedWarehouse} 
                        onChange={(e) => setSelectedWarehouse(e.target.value)} 
                        className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer min-w-[200px]"
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
            </div>

            {/* Empty State / Permissions Check */}
            {currentUser.role === 'manager' && allowedWarehouses.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
                    <AlertCircle className="mx-auto text-amber-500 mb-4" size={48} />
                    <h3 className="text-xl font-bold text-white">Nenhum Galpão Associado</h3>
                    <p className="text-slate-400 mt-2">Sem permissões para visualizar dados.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-lg">
                    <div className="animate-fade-in overflow-x-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Clock size={20} className="text-emerald-500" />
                                Grade Semanal
                            </h3>
                            <span className="text-xs text-slate-500 italic">Clique em uma célula para ver detalhes</span>
                        </div>
                        
                        <div className="min-w-[600px]">
                            {/* Header: Days of Week */}
                            <div className="grid grid-cols-[50px_repeat(7,1fr)] gap-1 mb-2 border-b border-slate-700 pb-2">
                                <div className="text-xs font-bold text-slate-500 text-center flex items-end justify-center">Hora</div>
                                {daysOfWeek.map(day => (
                                    <div key={day} className="text-xs font-bold text-center text-slate-400 uppercase tracking-wide">{day}</div>
                                ))}
                            </div>

                            {/* Body: Hours (Rows) -> Days (Cols) */}
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
                                                title={`${count} acessos às ${hour}h`}
                                            >
                                                {count > 0 ? count : ''}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL */}
            {heatmapModalData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Clock size={18} className="text-emerald-500" />
                                    {heatmapModalData.day}, {heatmapModalData.hour}h:00 - {heatmapModalData.hour}h:59
                                </h3>
                                <p className="text-xs text-slate-400">{heatmapModalData.people.length} acessos registrados</p>
                            </div>
                            <button onClick={() => setHeatmapModalData(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                            {heatmapModalData.people.map(p => (
                                <div key={p.id} className="bg-slate-800/50 p-3 rounded border border-slate-700 flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-bold text-slate-200">{p.name}</p>
                                        <p className="text-[10px] text-slate-500">{p.company} • {p.unit}</p>
                                    </div>
                                    <div className="text-emerald-400 font-mono text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded">
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
