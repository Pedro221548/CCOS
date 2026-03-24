
import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Signal, AlertTriangle, Clock, Shield, Warehouse, Video, BellRing, DoorClosed, Users, Crown, TrendingUp, Activity } from 'lucide-react';
import { User } from '../../types';

interface StatsGridProps {
    stats: any;
    totalAccess: number;
    accessOnline: number;
    accessOffline: number;
    totalPeopleCount: number;
    uniqueThirdPartyCount: number;
    topUnitForDate: { name: string; count: number };
    systemState: string;
    systemColor: string;
    availabilityNum: number;
    offlineDevicesCount: number;
    isManager: boolean;
    currentUser: User | null;
}

const StatsGrid: React.FC<StatsGridProps> = ({
    stats,
    totalAccess,
    accessOnline,
    accessOffline,
    totalPeopleCount,
    uniqueThirdPartyCount,
    topUnitForDate,
    systemState,
    systemColor,
    availabilityNum,
    offlineDevicesCount,
    isManager,
    currentUser
}) => {
    return (
        <div className="space-y-6">
            {/* System Status Top Bar - More compact and elegant */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                        <Zap size={20} className={availabilityNum > 90 ? 'animate-pulse' : ''} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saúde</p>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-black truncate ${systemColor}`}>{systemState}</span>
                            <span className="text-[10px] font-bold text-slate-400">{stats.availVideo}%</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                        <Signal size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Conectividade</p>
                        <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Estável</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                        <AlertTriangle size={20} className={offlineDevicesCount > 0 ? 'animate-bounce' : ''} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Incidentes</p>
                        <p className="text-sm font-black text-slate-800 dark:text-white">{offlineDevicesCount}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Atualização</p>
                        <p className="text-sm font-black text-slate-800 dark:text-white">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
            </div>

            {isManager && (
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-center shadow-xl relative overflow-hidden gap-4 group">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>
                    
                    <div className="relative z-10 flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                            <Shield className="text-purple-400" size={28} />
                        </div>
                        <div>
                            <h2 className="text-white font-black text-xl tracking-tight flex items-center gap-2">
                                Painel do Gestor
                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[9px] rounded-full font-black uppercase tracking-widest border border-purple-500/30">Premium</span>
                            </h2>
                            <div className="flex items-center gap-2 text-slate-400 text-xs mt-1">
                                <Warehouse size={14} className="text-purple-400" />
                                <span className="font-bold text-slate-400">
                                    {currentUser?.allowedWarehouses && currentUser.allowedWarehouses.length > 0 ? currentUser.allowedWarehouses.join(' • ') : 'Sem Unidade Atribuída'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 relative z-10">
                        <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl min-w-[100px] text-center">
                            <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-0.5">Unidades</p>
                            <p className="text-lg font-black text-white">{currentUser?.allowedWarehouses?.length || 0}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl min-w-[100px] text-center">
                            <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-0.5">Status</p>
                            <p className="text-lg font-black text-emerald-500 uppercase">Ativo</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Bento Grid KPIs - More balanced and clean */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm hover:border-blue-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Video size={20} />
                        </div>
                        <div className="text-right">
                            <p className="text-slate-400 text-[9px] uppercase font-black tracking-widest">Câmeras</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-none mt-1">{stats.totalVideo}</h3>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold mb-2">
                        <span className="text-emerald-500">{stats.onlineVideo} Online</span>
                        <span className="text-rose-500">{stats.offlineVideo} Offline</span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${stats.availVideo}%` }}
                            className="h-full bg-blue-500"
                        />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm hover:border-amber-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <BellRing size={20} />
                        </div>
                        <div className="text-right">
                            <p className="text-slate-400 text-[9px] uppercase font-black tracking-widest">Alarmes</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-none mt-1">{stats.totalAlarm}</h3>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-emerald-500">{stats.onlineAlarm} Ativos</span>
                        <span className="text-rose-500">{stats.offlineAlarm} Falhas</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm hover:border-indigo-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                            <DoorClosed size={20} />
                        </div>
                        <div className="text-right">
                            <p className="text-slate-400 text-[9px] uppercase font-black tracking-widest">Acessos</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-none mt-1">{totalAccess}</h3>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-emerald-500">{accessOnline} Online</span>
                        <span className="text-rose-500">{accessOffline} Offline</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm hover:border-emerald-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <Users size={20} />
                        </div>
                        <div className="text-right">
                            <p className="text-slate-400 text-[9px] uppercase font-black tracking-widest">Pessoas</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-none mt-1">{totalPeopleCount}</h3>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-blue-500">{uniqueThirdPartyCount} Terceiros</span>
                        <span className="text-slate-400">Total Hoje</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default StatsGrid;
