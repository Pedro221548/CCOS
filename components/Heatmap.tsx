
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, ProcessedWorker } from '../types';
import { WAREHOUSE_LIST } from '../constants';
import { Activity, Clock, Filter, X, DoorClosed, CheckSquare, Square, ChevronDown, Calendar, RotateCcw } from 'lucide-react';

interface HeatmapProps {
    thirdPartyWorkers: ProcessedWorker[];
    currentUser: User;
}

const Heatmap: React.FC<HeatmapProps> = ({ thirdPartyWorkers, currentUser }) => {
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
    const [selectedAccessPoints, setSelectedAccessPoints] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [showAPDropdown, setShowAPDropdown] = useState(false);
    const [heatmapModalData, setHeatmapModalData] = useState<{ day: string, hour: number, people: ProcessedWorker[] } | null>(null);
    
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowAPDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const allowedWarehouses = useMemo(() => {
        if (currentUser.role === 'manager') return currentUser.allowedWarehouses || [];
        return WAREHOUSE_LIST;
    }, [currentUser]);

    const availableAccessPoints = useMemo(() => {
        const set = new Set<string>();
        thirdPartyWorkers.forEach(w => {
            if (selectedWarehouse === 'ALL' || w.unit === selectedWarehouse) {
                if (w.accessPoint) set.add(w.accessPoint);
            }
        });
        return Array.from(set).sort();
    }, [thirdPartyWorkers, selectedWarehouse]);

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

    const filteredWorkers = useMemo(() => {
        let subset = thirdPartyWorkers;
        if (currentUser.role === 'manager') {
            if (!allowedWarehouses || allowedWarehouses.length === 0) return [];
            subset = subset.filter(w => allowedWarehouses.includes(w.unit));
        }
        if (selectedWarehouse !== 'ALL') subset = subset.filter(w => w.unit === selectedWarehouse);
        if (selectedAccessPoints.length > 0) subset = subset.filter(w => selectedAccessPoints.includes(w.accessPoint));
        if (startDate) subset = subset.filter(w => w.date >= startDate);
        if (endDate) subset = subset.filter(w => w.date <= endDate);
        return subset;
    }, [thirdPartyWorkers, selectedWarehouse, selectedAccessPoints, startDate, endDate, currentUser, allowedWarehouses]);

    const heatmapData = useMemo(() => {
        const grid: ProcessedWorker[][][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => []));
        filteredWorkers.forEach(w => {
            if (w.date && w.time) {
                const [year, month, day] = w.date.split('-').map(Number);
                const dateObj = new Date(year, month - 1, day);
                if (dateObj && !isNaN(dateObj.getTime())) {
                    const dayOfWeek = dateObj.getDay(); 
                    const hour = parseInt(w.time.split(':')[0], 10);
                    if (hour >= 0 && hour < 24) grid[dayOfWeek][hour].push(w);
                }
            }
        });
        return grid;
    }, [filteredWorkers]);

    const daysOfWeek = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    const hoursOfDay = Array.from({ length: 24 }, (_, i) => i);

    const getHeatmapColor = (count: number) => {
        if (count === 0) return 'bg-slate-100 dark:bg-slate-800/20';
        if (count < 5) return 'bg-emerald-200 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400';
        if (count < 15) return 'bg-emerald-400 dark:bg-emerald-700/40 text-white';
        if (count < 30) return 'bg-emerald-500 dark:bg-emerald-600 text-white';
        return 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20';
    };

    const handleHeatmapClick = (dayIdx: number, hour: number) => {
        const people = heatmapData[dayIdx][hour];
        if (people.length > 0) {
            setHeatmapModalData({ day: daysOfWeek[dayIdx], hour, people });
        }
    };

    return (
        <div className="space-y-4 animate-fade-in pb-12 max-w-7xl mx-auto px-1 md:px-6">
            {/* Seção de Filtros - Otimizada e Compacta */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-lg space-y-4 relative z-30">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg shrink-0">
                        <Activity className="text-emerald-500" size={20} />
                    </div>
                    <div>
                        <h2 className="text-base md:text-xl font-bold text-white leading-tight">Mapa de Calor</h2>
                        <p className="text-slate-500 text-[9px] md:text-xs uppercase font-bold tracking-wider">Densidade de acessos por período</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                    {/* Período Compacto */}
                    <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                        <div className="relative flex-1">
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-transparent text-[10px] text-slate-200 font-bold outline-none [color-scheme:dark]" />
                        </div>
                        <span className="text-slate-700 font-black text-[8px]">~</span>
                        <div className="relative flex-1">
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-transparent text-[10px] text-slate-200 font-bold outline-none [color-scheme:dark]" />
                        </div>
                    </div>

                    {/* Unidade */}
                    <div className="relative">
                        <select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)} className="w-full pl-8 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-[10px] font-bold uppercase focus:border-emerald-500 appearance-none cursor-pointer">
                            <option value="ALL">Todos Galpões</option>
                            {allowedWarehouses.map(wh => <option key={wh} value={wh}>{wh}</option>)}
                        </select>
                        <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" size={12} />
                    </div>

                    {/* Portas */}
                    <div className="relative" ref={dropdownRef}>
                        <button onClick={() => setShowAPDropdown(!showAPDropdown)} className="w-full pl-8 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-[10px] font-bold uppercase text-left flex items-center justify-between">
                            <span className="truncate">
                                {selectedAccessPoints.length === 0 ? <span className="text-slate-500 text-[9px]">Todas as Portas</span> : `${selectedAccessPoints.length} Portas`}
                            </span>
                            <ChevronDown size={12} className={`text-slate-600 transition-transform ${showAPDropdown ? 'rotate-180' : ''}`} />
                            <DoorClosed className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" size={12} />
                        </button>
                        {showAPDropdown && (
                            <div className="absolute top-full right-0 mt-1 bg-[#0d1117] border border-slate-700 rounded-xl shadow-2xl p-1.5 w-full min-w-[240px] max-h-[250px] overflow-y-auto z-[60] custom-scrollbar animate-fade-in">
                                <div onClick={toggleAllAccessPoints} className="flex items-center gap-2.5 p-2 hover:bg-emerald-500/10 rounded-lg cursor-pointer border-b border-slate-800 mb-1">
                                    {selectedAccessPoints.length === availableAccessPoints.length && availableAccessPoints.length > 0 ? <CheckSquare size={14} className="text-emerald-500" /> : <Square size={14} className="text-slate-600" />}
                                    <span className="text-[9px] font-black text-white uppercase">Selecionar Tudo</span>
                                </div>
                                {availableAccessPoints.map(ap => (
                                    <div key={ap} onClick={() => toggleAccessPoint(ap)} className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${selectedAccessPoints.includes(ap) ? 'bg-emerald-500/5' : 'hover:bg-slate-800'}`}>
                                        {selectedAccessPoints.includes(ap) ? <CheckSquare size={14} className="text-emerald-500" /> : <Square size={14} className="text-slate-600" />}
                                        <span className="text-[9px] font-bold text-slate-300 truncate">{ap}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Reset */}
                    <button onClick={() => { setSelectedWarehouse('ALL'); setSelectedAccessPoints([]); setStartDate(''); setEndDate(''); }} className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-700">
                        <RotateCcw size={12} /> Limpar
                    </button>
                </div>
            </div>

            {/* Heatmap Grid - Redimensionado para Celular */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 md:p-6 shadow-lg overflow-hidden flex flex-col">
                <div className="flex flex-row justify-between items-center mb-4 px-1">
                    <h3 className="text-xs md:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Clock size={16} className="text-emerald-500" />
                        Grade Semanal
                    </h3>
                    <span className="text-[8px] text-slate-500 italic uppercase font-bold">Clique para detalhes</span>
                </div>
                
                <div className="overflow-x-auto no-scrollbar">
                    <div className="min-w-[480px] md:min-w-full">
                        {/* Header: Dias (Abbreviated for small screens) */}
                        <div className="grid grid-cols-[40px_repeat(7,1fr)] gap-0.5 mb-1.5">
                            <div className="text-[8px] font-black text-slate-500 text-center flex items-end justify-center pb-1">H</div>
                            {daysOfWeek.map(day => (
                                <div key={day} className="text-[8px] font-black text-center text-slate-400 uppercase tracking-tighter pb-1 border-b dark:border-slate-800">{day}</div>
                            ))}
                        </div>

                        {/* Body: Horas (Compact cells) */}
                        <div className="space-y-0.5">
                            {hoursOfDay.map((hour) => (
                                <div key={hour} className="grid grid-cols-[40px_repeat(7,1fr)] gap-0.5 items-center">
                                    <div className="text-[8px] font-black text-slate-500 text-center">{hour.toString().padStart(2, '0')}h</div>
                                    {daysOfWeek.map((_, dayIdx) => {
                                        const count = heatmapData[dayIdx][hour].length;
                                        return (
                                            <div 
                                                key={`${dayIdx}-${hour}`}
                                                onClick={() => handleHeatmapClick(dayIdx, hour)}
                                                className={`h-6 md:h-8 rounded-sm cursor-pointer transition-all active:scale-95 flex items-center justify-center text-[9px] font-bold border border-transparent ${getHeatmapColor(count)}`}
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
                
                {/* Legenda Compacta Inferior */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 justify-center">
                    {[
                        { label: 'BAIXO', color: 'bg-emerald-200 dark:bg-emerald-900/30' },
                        { label: 'ALTO', color: 'bg-emerald-400 dark:bg-emerald-700/60' },
                        { label: 'CRÍTICO', color: 'bg-emerald-600 dark:bg-emerald-500' }
                    ].map(item => (
                        <div key={item.label} className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                            <span className="text-[7px] text-slate-500 font-black uppercase tracking-tighter">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal de Detalhes - Mobile Responsive */}
            {heatmapModalData && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                    <div className="bg-slate-900 border-t md:border border-slate-700 rounded-t-[32px] md:rounded-2xl shadow-2xl w-full max-w-md max-h-[75vh] flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                            <div>
                                <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={14} className="text-emerald-500" />
                                    {heatmapModalData.day} • {heatmapModalData.hour}:00h
                                </h3>
                                <p className="text-[9px] text-slate-500 font-bold uppercase">{heatmapModalData.people.length} ACESSOS REGISTRADOS</p>
                            </div>
                            <button onClick={() => setHeatmapModalData(null)} className="p-2 bg-slate-800 hover:bg-rose-600 text-white rounded-full transition-all"><X size={16} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-[#05070a]">
                            {heatmapModalData.people.map(p => (
                                <div key={p.id} className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                                    <div className="min-w-0 flex-1 pr-3">
                                        <p className="text-[11px] font-black text-slate-200 uppercase truncate">{p.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[8px] text-emerald-500 font-black uppercase tracking-tighter shrink-0">{p.company}</span>
                                            <span className="text-[8px] text-slate-500 font-bold truncate">• {p.accessPoint}</span>
                                        </div>
                                    </div>
                                    <div className="bg-emerald-500/10 px-2 py-1 rounded text-emerald-400 font-mono text-[9px] font-black">
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
