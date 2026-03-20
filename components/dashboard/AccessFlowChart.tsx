
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Warehouse, DoorClosed, ChevronDown, CheckSquare, Square, Calendar, X } from 'lucide-react';

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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-xl animate-fade-in relative z-20">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-8">
                <div>
                    <h3 className="text-slate-800 dark:text-white font-black text-xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
                            <Clock size={20} />
                        </div>
                        Fluxo de Acessos
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1 ml-13">Análise de tráfego por hora</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {!isManager && (isAdmin || isViewer) && (
                        <div className="relative flex-1 min-w-[180px] sm:flex-none">
                            <select 
                                value={selectedWarehouseChart} 
                                onChange={(e) => setSelectedWarehouseChart(e.target.value)}
                                className="w-full sm:w-48 pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 appearance-none cursor-pointer transition-all"
                            >
                                <option value="ALL">Todos Galpões</option>
                                {WAREHOUSE_LIST.map(wh => (
                                    <option key={wh} value={wh}>{wh}</option>
                                ))}
                            </select>
                            <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                    )}

                    {/* Multi-Filtro Ponto de Acesso no Gráfico */}
                    <div className="relative flex-1 min-w-[220px] sm:flex-none" ref={apDropdownRef}>
                        <button 
                            onClick={() => setShowAPDropdown(!showAPDropdown)}
                            className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 text-xs font-bold text-left flex items-center justify-between hover:border-purple-500 transition-all focus:ring-2 focus:ring-purple-500/20"
                        >
                            <div className="flex items-center gap-2 truncate">
                                <DoorClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                {selectedAccessPointsChart.length === 0 ? (
                                    <span className="text-slate-500">Todas as Portas</span>
                                ) : (
                                    <span className="text-purple-500 font-black">{selectedAccessPointsChart.length} Portas</span>
                                )}
                            </div>
                            <ChevronDown size={16} className={`text-slate-500 transition-transform ${showAPDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showAPDropdown && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-full right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 min-w-[280px] max-w-[400px] max-h-[350px] overflow-y-auto z-[100] custom-scrollbar ring-1 ring-white/10"
                                >
                                    <div 
                                        className="flex items-center gap-3 p-3 hover:bg-purple-500/10 rounded-xl cursor-pointer transition-all border-b border-slate-800 mb-2 group"
                                        onClick={toggleAllAPsChart}
                                    >
                                        {selectedAccessPointsChart.length === availableAccessPointsChart.length ? (
                                            <CheckSquare size={18} className="text-purple-500" />
                                        ) : (
                                            <Square size={18} className="text-slate-600 group-hover:text-slate-400" />
                                        )}
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Selecionar Tudo</span>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        {availableAccessPointsChart.map(ap => (
                                            <div 
                                                key={ap} 
                                                className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${selectedAccessPointsChart.includes(ap) ? 'bg-purple-500/10' : 'hover:bg-slate-800'}`}
                                                onClick={() => toggleAPChart(ap)}
                                            >
                                                <div className="shrink-0">
                                                    {selectedAccessPointsChart.includes(ap) ? (
                                                        <CheckSquare size={18} className="text-purple-500" />
                                                    ) : (
                                                        <Square size={18} className="text-slate-600" />
                                                    )}
                                                </div>
                                                <span className={`text-[11px] font-bold ${selectedAccessPointsChart.includes(ap) ? 'text-white' : 'text-slate-400'} truncate`}>
                                                    {ap}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {availableAccessPointsChart.length === 0 && (
                                        <div className="p-8 text-center">
                                            <DoorClosed className="mx-auto text-slate-700 mb-2" size={32} />
                                            <p className="text-slate-600 text-[10px] uppercase font-black tracking-widest">Sem portas disponíveis</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="relative flex-1 min-w-[160px] sm:flex-none">
                        <select 
                            value={selectedChartDate} 
                            onChange={(e) => setSelectedChartDate(e.target.value)}
                            className="w-full sm:w-48 pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 appearance-none cursor-pointer transition-all"
                        >
                            {availableChartDates.map(date => (
                                <option key={date} value={date}>{date.split('-').reverse().join('/')}</option>
                            ))}
                        </select>
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                    
                    {selectedAccessPointsChart.length > 0 && (
                        <button 
                            onClick={() => setSelectedAccessPointsChart([])}
                            className="p-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-rose-500/20"
                            title="Limpar filtros de porta"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            <div className="h-[350px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyData}>
                        <defs>
                            <linearGradient id="colorAcessos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                        <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                        <Tooltip 
                            cursor={{ stroke: '#8b5cf6', strokeWidth: 2 }}
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ color: '#a78bfa', fontWeight: 'bold' }}
                        />
                        <Area type="monotone" dataKey="acessos" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorAcessos)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default AccessFlowChart;
