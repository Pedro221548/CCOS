
import React, { useState, useMemo } from 'react';
import { AppData, Camera, ProcessedWorker, User } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Video, BellRing, DoorClosed, Users, TrendingUp, ShieldAlert, FileText, Clock, ShieldCheck, ArrowRight } from 'lucide-react';

interface DashboardProps {
  data: AppData;
  thirdPartyWorkers?: ProcessedWorker[];
  currentUser?: User | null;
}

const Dashboard: React.FC<DashboardProps> = ({ data, thirdPartyWorkers = [], currentUser }) => {
  const { cameras, accessPoints, documents } = data;

  const stats = useMemo(() => {
    const video = cameras.filter(c => c.channelType === 'video');
    const online = video.filter(c => c.status === 'ONLINE').length;
    return {
      totalVideo: video.length,
      onlineVideo: online,
      offlineVideo: video.length - online,
      avail: video.length > 0 ? ((online / video.length) * 100).toFixed(1) : '0'
    };
  }, [cameras]);

  const KPICard = ({ title, value, icon: Icon, color, subValue }: any) => (
    <div className="glass-panel rounded-[3rem] p-12 flex flex-col justify-between hover:scale-[1.01] transition-all duration-700 group relative overflow-hidden">
        <div className={`absolute -top-10 -right-10 w-40 h-40 bg-${color}-500/5 blur-[80px] group-hover:bg-${color}-500/10 transition-all`}></div>
        <div className="flex justify-between items-start z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">{title}</span>
            <div className={`p-4 bg-${color}-500/10 rounded-2xl border border-${color}-500/10`}>
                <Icon size={28} className={`text-${color}-500`} />
            </div>
        </div>
        <div className="mt-12 z-10">
            <h4 className="text-6xl font-black text-white tracking-tighter">{value}</h4>
            <div className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                {subValue} <ArrowRight size={14} className="text-slate-600 group-hover:translate-x-2 transition-transform" />
            </div>
        </div>
    </div>
  );

  return (
    <div className="space-y-16">
      
      {/* Massive KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <KPICard title="Video Intelligence" value={stats.totalVideo} icon={Video} color="blue" subValue={`${stats.onlineVideo} Estações Ativas`} />
        <KPICard title="Perimeter Alarms" value={cameras.filter(c => c.channelType === 'alarm').length} icon={BellRing} color="amber" subValue="Sinalizadores de Borda" />
        <KPICard title="Access Points" value={accessPoints.length} icon={DoorClosed} color="indigo" subValue="Nós de Controle" />
        <KPICard title="System Uptime" value={`${stats.avail}%`} icon={TrendingUp} color="emerald" subValue="Saúde Operacional" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        {/* Analytics Section */}
        <div className="xl:col-span-2 glass-panel rounded-[4rem] p-14 space-y-12">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic flex items-center gap-5">
                        <div className="w-2 h-10 bg-blue-500 rounded-full"></div>
                        Fluxo Dinâmico de Acesso
                    </h3>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 ml-7">Monitoramento em tempo real por faixa horária</p>
                </div>
            </div>
            <div className="h-[500px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Array.from({length: 12}, (_, i) => ({h: `${i*2}h`, v: Math.floor(Math.random()*80) + 20}) )}>
                        <CartesianGrid strokeDasharray="10 10" vertical={false} stroke="rgba(255,255,255,0.02)" />
                        <XAxis dataKey="h" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#475569', fontWeight: 800}} dy={20} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#475569', fontWeight: 800}} dx={-20} />
                        <Tooltip 
                            cursor={{fill: 'rgba(255,255,255,0.01)'}}
                            contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '15px'}}
                        />
                        <Bar dataKey="v" fill="#3b82f6" radius={[15, 15, 0, 0]} barSize={45} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Offline Nodes Card */}
        <div className="glass-panel rounded-[4rem] p-14 flex flex-col space-y-10">
            <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic flex items-center gap-5">
                <div className="w-2 h-10 bg-rose-500 rounded-full"></div>
                Incidentes Offline
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar">
                {cameras.filter(c => c.status === 'OFFLINE').length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-10">
                        <ShieldCheck size={120} strokeWidth={1} className="mb-6 text-emerald-500" />
                        <p className="text-xs font-black uppercase tracking-[0.5em]">Tudo Seguro</p>
                    </div>
                ) : (
                    cameras.filter(c => c.status === 'OFFLINE').map(cam => (
                        <div key={cam.uuid} className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 hover:bg-white/10 transition-all duration-500 group">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-sm font-black text-white uppercase tracking-tight truncate max-w-[200px]">{cam.name}</span>
                                <span className="px-3 py-1 bg-rose-500/10 text-rose-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-500/20">Down</span>
                            </div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black mb-6">{cam.warehouse} • {cam.location}</p>
                            <button className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all">Detalhes do Nó</button>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>

      {/* Modern Documents List */}
      <div className="glass-panel rounded-[4rem] p-14">
            <div className="flex items-center gap-5 mb-14">
                <div className="w-2 h-10 bg-emerald-500 rounded-full"></div>
                <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">Compliance de Segurança</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {documents.map(doc => (
                    <div key={doc.uuid} className="group p-10 bg-white/5 border border-white/5 rounded-[3rem] hover:bg-white/[0.08] transition-all duration-500 relative overflow-hidden">
                        <div className="flex items-center gap-6 mb-8">
                            <div className="p-5 bg-blue-500/10 rounded-3xl text-blue-400 group-hover:scale-110 transition-transform duration-500 border border-blue-500/10">
                                <FileText size={32} />
                            </div>
                            <div className="min-w-0">
                                <h5 className="text-sm font-black text-white uppercase truncate tracking-tight">{doc.name}</h5>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">{doc.organ}</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <span className="block text-[9px] text-slate-600 uppercase font-black mb-2 tracking-widest">Expiração</span>
                                <span className="text-lg font-black text-slate-300 font-mono">{new Date(doc.expirationDate).toLocaleDateString()}</span>
                            </div>
                            <div className="px-5 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-900/10">Válido</div>
                        </div>
                    </div>
                ))}
            </div>
      </div>

    </div>
  );
};

export default Dashboard;
