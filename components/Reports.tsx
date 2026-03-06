import React, { useState, useMemo } from 'react';
import { X, Search, User, Calendar, Briefcase, Warehouse, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { ThirdPartyPayment, ProcessedWorker } from '../types';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface ReportsProps {
    isOpen: boolean;
    onClose: () => void;
    payments: ThirdPartyPayment[];
    workers: ProcessedWorker[];
}

const Reports: React.FC<ReportsProps> = ({ isOpen, onClose, payments, workers }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Agrupar dados por trabalhador para facilitar a busca e exibição de relatórios individuais
    const workerSummaries = useMemo(() => {
        const summaries: { [name: string]: { 
            name: string; 
            company: string; 
            totalPayments: number; 
            totalDays: number; 
            lastPresence: string;
            units: Set<string>;
            paymentHistory: ThirdPartyPayment[];
            accessHistory: ProcessedWorker[];
        } } = {};

        payments.forEach(p => {
            const nameKey = p.workerName.toUpperCase().trim();
            if (!summaries[nameKey]) {
                summaries[nameKey] = {
                    name: p.workerName,
                    company: p.company,
                    totalPayments: 0,
                    totalDays: 0,
                    lastPresence: p.date,
                    units: new Set(),
                    paymentHistory: [],
                    accessHistory: []
                };
            }

            const s = summaries[nameKey];
            s.totalPayments += p.value || 0;
            s.totalDays += 1;
            s.units.add(p.unit);
            s.paymentHistory.push(p);
            
            if (new Date(p.date) > new Date(s.lastPresence)) {
                s.lastPresence = p.date;
            }
        });

        // Adicionar histórico de acessos (Entradas/Saídas)
        workers.forEach(w => {
            const nameKey = w.name.toUpperCase().trim();
            if (summaries[nameKey]) {
                const type = w.eventType.toUpperCase();
                if (type === 'ENTRADA' || type === 'SAÍDA' || type === 'SAIDA') {
                    summaries[nameKey].accessHistory.push(w);
                }
            }
        });

        // Ordenar históricos por data/hora decrescente
        Object.values(summaries).forEach(s => {
            s.paymentHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            s.accessHistory.sort((a, b) => {
                const dateTimeA = new Date(`${a.date}T${a.time}`).getTime();
                const dateTimeB = new Date(`${b.date}T${b.time}`).getTime();
                return dateTimeB - dateTimeA;
            });
        });

        return summaries;
    }, [payments, workers]);

    const filteredResults = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const term = searchTerm.toUpperCase().trim();
        return Object.values(workerSummaries).filter(s => 
            s.name.toUpperCase().includes(term) || 
            s.company.toUpperCase().includes(term)
        );
    }, [workerSummaries, searchTerm]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
            {/* Overlay */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative w-[95%] md:w-full max-w-2xl bg-slate-950 border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col h-full max-h-[90vh] md:max-h-[85vh] rounded-3xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 shrink-0">
                            <TrendingUp size={20} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm md:text-lg font-black text-white uppercase tracking-tighter italic truncate">Relatórios Individuais</h3>
                            <p className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate">Consulta rápida por colaborador</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-6 border-b border-slate-800">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                            type="text"
                            placeholder="Digite o nome do colaborador..."
                            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-amber-500 outline-none transition-all font-bold uppercase"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {searchTerm.trim() === '' ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30 py-20">
                            <User size={64} className="text-slate-700" />
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Aguardando pesquisa...</p>
                        </div>
                    ) : filteredResults.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30 py-20">
                            <Search size={64} className="text-slate-700" />
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Nenhum colaborador encontrado</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredResults.map(worker => (
                                <div key={worker.name} className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden animate-fade-in flex flex-col h-fit">
                                    <div className="p-5 border-b border-slate-800 bg-slate-900/80">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shrink-0">
                                                <User size={24} />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-black text-white uppercase truncate">{worker.name}</h4>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-1 truncate">
                                                    <Briefcase size={10} /> {worker.company}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5">
                                        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/50">
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Galpões Atuados</p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {Array.from(worker.units).map(u => (
                                                    <span key={u} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[8px] font-black text-slate-400 uppercase">
                                                        {u}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-5 pb-5 mt-auto">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                                            <span>Fluxo de Acesso Recente</span>
                                            <span className="text-slate-700 font-mono">Última: {worker.lastPresence.split('-').reverse().join('/')}</span>
                                        </p>
                                        <div className="space-y-1.5">
                                            {worker.accessHistory.map((h, i) => (
                                                <div key={i} className="flex items-center justify-between p-2 bg-slate-950/30 rounded-xl border border-slate-800/30 text-[9px]">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={10} className="text-slate-600" />
                                                        <span className="font-bold text-slate-400">{h.date.split('-').reverse().join('/')}</span>
                                                        <span className="text-emerald-500 font-black">{h.time}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-600 font-bold uppercase truncate max-w-[60px]">{h.unit}</span>
                                                        {h.eventType.toUpperCase().includes('ENTRADA') ? (
                                                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black text-[8px] uppercase">
                                                                <ArrowDownLeft size={8} /> Ent
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 font-black text-[8px] uppercase">
                                                                <ArrowUpRight size={8} /> Sai
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {worker.accessHistory.length === 0 && (
                                                <p className="text-[9px] text-slate-600 italic text-center py-2 uppercase font-bold">Sem registros de acesso</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reports;
