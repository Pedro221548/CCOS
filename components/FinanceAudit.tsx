
import React, { useState, useMemo } from 'react';
import { ProcessedWorker, ThirdPartyPayment, User } from '../types';
import { AlertTriangle, CheckCircle2, Search, Calendar, User as UserIcon, Building2, ArrowRight, Filter, Download, Clock } from 'lucide-react';

interface FinanceAuditProps {
    workers: ProcessedWorker[];
    payments: ThirdPartyPayment[];
    currentUser: User;
}

const FinanceAudit: React.FC<FinanceAuditProps> = ({ workers, payments, currentUser }) => {
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');

    const auditData = useMemo(() => {
        // Group workers by date and name to identify presence
        const presenceMap = new Map<string, ProcessedWorker[]>();
        workers.forEach(w => {
            const key = `${w.date}_${w.name.toLowerCase().trim()}`;
            if (!presenceMap.has(key)) {
                presenceMap.set(key, []);
            }
            presenceMap.get(key)?.push(w);
        });

        // Group payments by date and name
        const paymentMap = new Map<string, ThirdPartyPayment[]>();
        payments.forEach(p => {
            const key = `${p.date}_${p.workerName.toLowerCase().trim()}`;
            if (!paymentMap.has(key)) {
                paymentMap.set(key, []);
            }
            paymentMap.get(key)?.push(p);
        });

        const missing: { worker: ProcessedWorker; date: string; status: 'missing' | 'partial' }[] = [];
        const found: { worker: ProcessedWorker; payment: ThirdPartyPayment; date: string }[] = [];

        // We only care about unique worker-date pairs for the audit
        const uniquePresences = new Map<string, ProcessedWorker>();
        workers.forEach(w => {
            const key = `${w.date}_${w.name.toLowerCase().trim()}`;
            if (!uniquePresences.has(key)) {
                uniquePresences.set(key, w);
            }
        });

        uniquePresences.forEach((worker, key) => {
            const [date] = key.split('_');
            if (paymentMap.has(key)) {
                found.push({ worker, payment: paymentMap.get(key)![0], date });
            } else {
                missing.push({ worker, date, status: 'missing' });
            }
        });

        return { missing, found };
    }, [workers, payments]);

    const filteredMissing = useMemo(() => {
        return auditData.missing.filter(m => {
            const matchesDate = !selectedDate || m.date === selectedDate;
            const matchesSearch = !searchTerm || 
                m.worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.worker.company.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesDate && matchesSearch;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [auditData.missing, selectedDate, searchTerm]);

    const stats = useMemo(() => {
        const totalPresence = auditData.missing.length + auditData.found.length;
        const totalMissing = auditData.missing.length;
        const percentage = totalPresence > 0 ? ((totalPresence - totalMissing) / totalPresence * 100).toFixed(1) : '100';
        return { totalPresence, totalMissing, percentage };
    }, [auditData]);

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pendências Totais</p>
                        <p className="text-2xl font-black text-white">{stats.totalMissing}</p>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                        <UserIcon size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Presenças Registradas</p>
                        <p className="text-2xl font-black text-white">{stats.totalPresence}</p>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Conformidade</p>
                        <p className="text-2xl font-black text-white">{stats.percentage}%</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                        type="text"
                        placeholder="Buscar por nome ou empresa..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-amber-500 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Calendar className="text-slate-500" size={18} />
                    <input 
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-amber-500 outline-none transition-all"
                    />
                </div>
                <button className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all" title="Limpar Filtros" onClick={() => { setSelectedDate(''); setSearchTerm(''); }}>
                    <Filter size={18} />
                </button>
            </div>

            {/* Results */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle className="text-amber-500" size={16} />
                        Divergências Encontradas ({filteredMissing.length})
                    </h3>
                    <button className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5 hover:text-amber-400 transition-colors">
                        <Download size={14} /> Exportar PDF
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950/30 border-b border-slate-800">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Colaborador</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Empresa / Unidade</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data Presença</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status Financeiro</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {filteredMissing.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-40">
                                            <CheckCircle2 size={48} className="text-emerald-500" />
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhuma divergência encontrada para os filtros aplicados</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredMissing.map((item, idx) => (
                                    <tr key={`${item.worker.id}-${item.date}-${idx}`} className="hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-amber-500/20 group-hover:text-amber-500 transition-colors">
                                                    <UserIcon size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{item.worker.name}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono">{item.worker.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                                    <Building2 size={12} className="text-slate-500" />
                                                    {item.worker.company}
                                                </span>
                                                <span className="text-[10px] text-slate-500 uppercase tracking-tighter">{item.worker.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <Calendar size={14} className="text-slate-500" />
                                                <span className="text-sm font-mono">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest">
                                                <AlertTriangle size={12} /> Não Localizado
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-slate-500 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all" title="Ver Detalhes do Fluxo">
                                                <ArrowRight size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-6 flex gap-4">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500 h-fit">
                    <Clock size={20} />
                </div>
                <div>
                    <h4 className="text-blue-400 font-bold text-sm mb-1 uppercase tracking-wider">Como funciona a auditoria?</h4>
                    <p className="text-blue-300/70 text-xs leading-relaxed">
                        O sistema cruza automaticamente os registros de entrada/saída (Gestão de Fluxo) com os lançamentos de pagamentos importados (Financeiro). 
                        Se um colaborador possui registro de acesso em um determinado dia, mas não há um lançamento financeiro correspondente para essa mesma data e nome, ele aparecerá nesta lista como uma pendência.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FinanceAudit;
