
import React, { useState, useMemo } from 'react';
import { Filter, Search, Users, MapPin, Clock, Calendar, BarChart3, PieChart, Crown, TrendingUp, ArrowRight } from 'lucide-react';
import { ProcessedWorker, User } from '../types';
import { WAREHOUSE_LIST } from '../constants';

const VALID_COMPANIES = ['B11', 'FORMA', 'MJM', 'MPI', 'MULT', 'PRAYLOG', 'PRIMUS', 'SUPERA LOG', 'BSB'];

const ThirdPartyStatus: React.FC<{workers: ProcessedWorker[], currentUser: User}> = ({ workers = [], currentUser }) => {
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedUnit, setSelectedUnit] = useState<string>('ALL');

    const availableDates = useMemo(() => Array.from(new Set(workers.map(w => w.date))).filter(d => d).sort().reverse(), [workers]);
    if (!selectedDate && availableDates.length > 0) setSelectedDate(availableDates[0]);

    const { stats, globalTotal, topUnit } = useMemo(() => {
        const filtered = workers.filter(w => {
            if (!VALID_COMPANIES.includes(w.company)) return false;
            if (selectedDate && w.date !== selectedDate) return false;
            if (selectedUnit !== 'ALL' && w.unit !== selectedUnit) return false;
            return true;
        });

        const statsMap: any = {};
        WAREHOUSE_LIST.forEach(u => statsMap[u] = { id: u, total: 0, workers: [] });

        filtered.forEach(w => {
            if (statsMap[w.unit]) {
                statsMap[w.unit].total++;
                statsMap[w.unit].workers.push(w);
            }
        });

        const sorted = Object.values(statsMap).sort((a:any, b:any) => b.total - a.total);
        return { stats: sorted, globalTotal: filtered.length, topUnit: sorted[0] };
    }, [workers, selectedDate, selectedUnit]);

    return (
        <div className="space-y-12">
            <div className="glass-panel rounded-[3rem] p-12 flex flex-col md:flex-row justify-between items-center gap-10">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-5 uppercase italic tracking-tighter">
                        <div className="w-2 h-10 bg-amber-500 rounded-full"></div>
                        Fluxo Terceirizado
                    </h2>
                </div>
                <div className="flex gap-4">
                    <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-black/40 border border-white/5 rounded-2xl px-6 py-3 text-xs font-black text-white uppercase tracking-widest outline-none">
                        {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)} className="bg-black/40 border border-white/5 rounded-2xl px-6 py-3 text-xs font-black text-white uppercase tracking-widest outline-none">
                        <option value="ALL">Todas Unidades</option>
                        {WAREHOUSE_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                <div className="glass-panel rounded-[3rem] p-12 flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-all"></div>
                    <Users size={40} className="text-blue-500 mb-6" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">Presença Total</span>
                    <h4 className="text-6xl font-black text-white tracking-tighter">{globalTotal}</h4>
                </div>
                
                {stats.slice(0, 3).map((unit:any, i) => (
                    <div key={i} className="glass-panel rounded-[3rem] p-12 flex flex-col justify-between group hover:scale-[1.02] transition-all duration-500">
                        <div className="flex justify-between items-start">
                            <MapPin size={24} className="text-emerald-500" />
                            <span className="text-4xl font-black text-white/20 group-hover:text-emerald-500/40 transition-colors font-mono">{i+1}</span>
                        </div>
                        <div className="mt-10">
                            <h5 className="text-sm font-black text-white uppercase truncate tracking-tight">{unit.id}</h5>
                            <div className="flex items-end justify-between mt-4">
                                <span className="text-3xl font-black text-emerald-500">{unit.total}</span>
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Acessos</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ThirdPartyStatus;
