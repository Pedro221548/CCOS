
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Warehouse, DoorClosed, ChevronDown, Calendar, X } from 'lucide-react';
import Checkbox from '../ui/Checkbox';

interface AccessFlowChartProps {
    hourlyData: any[];
    selectedWarehouseChart: string;
    setSelectedWarehouseChart: (val: string) => void;
    selectedAccessPointsChart: string[];
    setSelectedAccessPointsChart: (val: string[] | ((prev: string[]) => string[])) => void;
    availableAccessPointsChart: string[];
    selectedChartDate: string;
    setSelectedChartDate: (val: string) => void;
    availableChartDates: string[];
    WAREHOUSE_LIST: string[];
    isManager: boolean;
    isAdmin: boolean;
    isViewer: boolean;
    showAPDropdown: boolean;
    setShowAPDropdown: (val: boolean) => void;
    apDropdownRef: React.RefObject<HTMLDivElement>;
}

const AccessFlowChart: React.FC<AccessFlowChartProps> = ({
    hourlyData,
    selectedWarehouseChart,
    setSelectedWarehouseChart,
    selectedAccessPointsChart,
    setSelectedAccessPointsChart,
    availableAccessPointsChart,
    selectedChartDate,
    setSelectedChartDate,
    availableChartDates,
    WAREHOUSE_LIST,
    isManager,
    isAdmin,
    isViewer,
    showAPDropdown,
    setShowAPDropdown,
    apDropdownRef
}) => {
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

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl relative z-20">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/10">
                            <Clock size={20} />
                        </div>
                        <div>
                            <h3 className="text-slate-800 dark:text-white font-black text-lg uppercase tracking-tight italic">
                                Fluxo de Acessos
                            </h3>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Monitoramento de tráfego por hora</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {!isManager && (isAdmin || isViewer) && (
                        <div className="relative flex-1 min-w-[150px] sm:flex-none">
                            <select 
                                value={selectedWarehouseChart} 
                                onChange={(e) => setSelectedWarehouseChart(e.target.value)}
                                className="w-full sm:w-44 pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 appearance-none cursor-pointer transition-all shadow-sm"
                            >
                                <option value="ALL">Todos Galpões</option>
                                {WAREHOUSE_LIST.map(wh => (
                                    <option key={wh} value={wh}>{wh}</option>
                                ))}
                            </select>
                            <Warehouse className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                        </div>
                    )}

                    {/* Multi-Filtro Ponto de Acesso no Gráfico */}
                    <div className="relative flex-1 min-w-[180px] sm:flex-none" ref={apDropdownRef}>
                        <button 
                            onClick={() => setShowAPDropdown(!showAPDropdown)}
                            className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest text-left flex items-center justify-between hover:border-purple-500 transition-all focus:ring-4 focus:ring-purple-500/10 shadow-sm"
                        >
                            <div className="flex items-center gap-2 truncate">
                                <DoorClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                {selectedAccessPointsChart.length === 0 ? (
                                    <span className="text-slate-400">Portas</span>
                                ) : (
                                    <span className="text-purple-500">{selectedAccessPointsChart.length} Portas</span>
                                )}
                            </div>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform ${showAPDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showAPDropdown && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 mt-3 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-2xl z-50 overflow-hidden"
                                >
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Selecionar Portas</span>
                                        <button 
                                            onClick={toggleAllAPsChart}
                                            className="text-[9px] font-black text-purple-500 uppercase tracking-widest hover:underline"
                                        >
                                            {selectedAccessPointsChart.length === availableAccessPointsChart.length ? 'Desmarcar Tudo' : 'Marcar Tudo'}
                                        </button>
                                    </div>
                                    
                                    <div className="max-h-64 overflow-y-auto p-2 custom-scrollbar">
                                        {availableAccessPointsChart.map(ap => (
                                            <button 
                                                key={ap}
                                                onClick={() => toggleAPChart(ap)}
                                                className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors group"
                                            >
                                                <div className="shrink-0">
                                                    <Checkbox 
                                                        checked={selectedAccessPointsChart.includes(ap)}
                                                        onChange={() => toggleAPChart(ap)}
                                                    />
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-tight transition-colors ${selectedAccessPointsChart.includes(ap) ? 'text-slate-800 dark:text-white' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                                    {ap}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="relative flex-1 min-w-[150px] sm:flex-none">
                        <select 
                            value={selectedChartDate} 
                            onChange={(e) => setSelectedChartDate(e.target.value)}
                            className="w-full sm:w-44 pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 appearance-none cursor-pointer transition-all shadow-sm"
                        >
                            {availableChartDates.map(date => (
                                <option key={date} value={date}>{date.split('-').reverse().join('/')}</option>
                            ))}
                        </select>
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                    
                    {selectedAccessPointsChart.length > 0 && (
                        <button 
                            onClick={() => setSelectedAccessPointsChart([])}
                            className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-rose-500/20"
                            title="Limpar filtros"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyData}>
                        <defs>
                            <linearGradient id="colorAcessos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.05} />
                        <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} />
                        <Tooltip 
                            cursor={{ stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '4 4' }}
                            contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)' }}
                            itemStyle={{ color: '#a78bfa', fontWeight: 'bold' }}
                        />
                        <Area type="monotone" dataKey="acessos" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorAcessos)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default AccessFlowChart;
