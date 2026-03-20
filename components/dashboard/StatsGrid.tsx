
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
            {/* System Status Top Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Zap size={24} className={availabilityNum > 90 ? 'animate-pulse' : ''} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saúde do Sistema</p>
                        <div className="flex items-center gap-2">
                            <span className={`text-lg font-black ${systemColor}`}>{systemState}</span>
                            <span className="text-xs font-bold text-slate-400">{stats.availVideo}%</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Signal size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Conectividade</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white">ESTÁVEL</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                        <AlertTriangle size={24} className={offlineDevicesCount > 0 ? 'animate-bounce' : ''} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Incidentes Ativos</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white">{offlineDevicesCount}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Última Atualização</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
            </div>

            {isManager && (
                <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 p-6 rounded-2xl border border-purple-500/30 flex flex-col md:flex-row justify-between items-center shadow-2xl relative overflow-hidden animate-fade-in gap-4 group">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full group-hover:bg-purple-500/20 transition-all duration-700"></div>
                    
                    <div className="relative z-10 flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30 shadow-inner">
                            <Shield className="text-purple-400 fill-purple-500/20" size={32} />
                        </div>
                        <div>
                            <h2 className="text-white font-black text-2xl tracking-tight flex items-center gap-2">
                                Painel do Gestor
                                <span className="px-2 py-0.5 bg-purple-500 text-[10px] rounded-full text-white font-black uppercase tracking-widest">Premium</span>
                            </h2>
                            <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                                <Warehouse size={16} className="text-purple-400" />
                                <span className="font-bold text-slate-300">
                                    {currentUser?.allowedWarehouses && currentUser.allowedWarehouses.length > 0 ? currentUser.allowedWarehouses.join(' • ') : 'Sem Unidade Atribuída'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 relative z-10">
                        <div className="bg-black/40 backdrop-blur-md border border-white/5 p-3 rounded-xl min-w-[120px] text-center">
                            <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Unidades</p>
                            <p className="text-xl font-black text-white">{currentUser?.allowedWarehouses?.length || 0}</p>
                        </div>
                        <div className="bg-black/40 backdrop-blur-md border border-white/5 p-3 rounded-xl min-w-[120px] text-center">
                            <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Status</p>
                            <p className="text-xl font-black text-emerald-500 uppercase">Ativo</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Bento Grid KPIs - Simplified and Elegant */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
                
                {/* Câmeras */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest">Câmeras</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white mt-1">{stats.totalVideo}</h3>
                        </div>
                        <Video size={20} className="text-blue-500 opacity-50" />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[10px] font-bold">
                        <span className="text-emerald-500">{stats.onlineVideo} Online</span>
                        <span className="text-rose-500">{stats.offlineVideo} Offline</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${stats.availVideo}%` }}
                            className="h-full bg-blue-500"
                        />
                    </div>
                </div>

                {/* Alarmes */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group border-l-4 border-l-amber-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest">Alarmes</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white mt-1">{stats.totalAlarm}</h3>
                        </div>
                        <BellRing size={20} className="text-amber-500 opacity-50" />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[10px] font-bold">
                        <span className="text-emerald-500">{stats.onlineAlarm} Ativos</span>
                        <span className="text-rose-500">{stats.offlineAlarm} Falhas</span>
                    </div>
                </div>

                {/* Acessos */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group border-l-4 border-l-indigo-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest">Acessos</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white mt-1">{totalAccess}</h3>
                        </div>
                        <DoorClosed size={20} className="text-indigo-500 opacity-50" />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[10px] font-bold">
                        <span className="text-emerald-500">{accessOnline} Online</span>
                        <span className="text-rose-500">{accessOffline} Offline</span>
                    </div>
                </div>

                {/* Presença */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group border-l-4 border-l-emerald-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest">Pessoas</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white mt-1">{totalPeopleCount}</h3>
                        </div>
                        <Users size={20} className="text-emerald-500 opacity-50" />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[10px] font-bold">
                        <span className="text-blue-500">{uniqueThirdPartyCount} Terceiros</span>
                        <span className="text-slate-400">Total Hoje</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default StatsGrid;
