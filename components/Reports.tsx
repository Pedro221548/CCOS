import React, { useState, useMemo } from 'react';
import { X, Search, User, Calendar, Briefcase, Warehouse, DollarSign, TrendingUp, Clock, ChevronDown, ChevronUp } from 'lucide-react';
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
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const toggleGroup = (group: string) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(group)) {
            newExpanded.delete(group);
        } else {
            newExpanded.add(group);
        }
        setExpandedGroups(newExpanded);
    };

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

        // Processar pagamentos
        payments.forEach(p => {
            const nameKey = p.workerName.toUpperCase().trim();
            if (!summaries[nameKey]) {
                summaries[nameKey] = {
                    name: p.workerName,
                    company: p.company || 'Terceiros',
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

        // Adicionar histórico de acessos (Entradas/Saídas) e incluir trabalhadores que não têm pagamentos
        workers.forEach(w => {
            const nameKey = w.name.toUpperCase().trim();
            if (!summaries[nameKey]) {
                summaries[nameKey] = {
                    name: w.name,
                    company: w.company || 'Terceiros',
                    totalPayments: 0,
                    totalDays: 0,
                    lastPresence: w.date,
                    units: new Set(),
                    paymentHistory: [],
                    accessHistory: []
                };
            }

            const s = summaries[nameKey];
            s.units.add(w.unit);
            const type = w.eventType.toUpperCase();
            if (type === 'ENTRADA' || type === 'SAÍDA' || type === 'SAIDA') {
                s.accessHistory.push(w);
            }
            
            if (new Date(w.date) > new Date(s.lastPresence)) {
                s.lastPresence = w.date;
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

    const groupedResults = useMemo(() => {
        const groups: { [company: string]: any[] } = {};
        
        Object.values(workerSummaries).forEach(worker => {
            const company = (worker.company || 'Terceiros').trim() || 'Terceiros';
            if (!groups[company]) {
                groups[company] = [];
            }
            groups[company].push(worker);
        });

        const term = searchTerm.toUpperCase().trim();
        if (!term) return groups;

        const filteredGroups: { [company: string]: any[] } = {};
        Object.entries(groups).forEach(([company, members]) => {
            const companyMatches = company.toUpperCase().includes(term);
            const matchingMembers = members.filter(m => m.name.toUpperCase().includes(term));
            
            if (companyMatches || matchingMembers.length > 0) {
                filteredGroups[company] = matchingMembers.length > 0 ? matchingMembers : members;
            }
        });

        return filteredGroups;
    }, [workerSummaries, searchTerm]);

    const sortedGroupNames = useMemo(() => {
        return Object.keys(groupedResults).sort((a, b) => {
            if (a === 'Terceiros') return 1;
            if (b === 'Terceiros') return -1;
            return a.localeCompare(b);
        });
    }, [groupedResults]);

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
                    {Object.keys(groupedResults).length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30 py-20">
                            <Search size={64} className="text-slate-700" />
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Nenhum grupo ou colaborador encontrado</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sortedGroupNames.map(company => {
                                const members = groupedResults[company];
                                const isExpanded = expandedGroups.has(company) || searchTerm.trim() !== '';
                                
                                return (
                                    <div key={company} className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden animate-fade-in">
                                        <button 
                                            onClick={() => toggleGroup(company)}
                                            className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-all border-b border-transparent data-[expanded=true]:border-slate-800 data-[expanded=true]:bg-slate-900/80"
                                            data-expanded={isExpanded}
                                        >
                                            <div className="flex items-center gap-4 text-left">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${
                                                    company === 'Terceiros' 
                                                        ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' 
                                                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                }`}>
                                                    <Briefcase size={24} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-sm md:text-base font-black text-white uppercase tracking-tight truncate">{company}</h4>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                        <User size={10} /> {members.length} Colaboradores
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`p-2 rounded-full bg-slate-800/50 text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                                <ChevronDown size={20} />
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 animate-in slide-in-from-top-2 duration-300 bg-slate-950/20">
                                                {members.map((worker: any) => (
                                                    <div key={worker.name} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden flex flex-col h-fit hover:shadow-lg hover:shadow-amber-500/5 transition-all group/card">
                                                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/30">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0 border border-slate-200 dark:border-slate-700 group-hover/card:scale-110 transition-transform">
                                                                    <User size={20} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h5 className="text-[13px] font-black text-slate-800 dark:text-white uppercase truncate tracking-tight">{worker.name}</h5>
                                                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                                        {Array.from(worker.units as Set<string>).slice(0, 2).map((u: string) => (
                                                                            <span key={u} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                                                                {u}
                                                                            </span>
                                                                        ))}
                                                                        {worker.units.size > 2 && <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">+{worker.units.size - 2}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="p-5">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Histórico de Acessos</span>
                                                                <div className="flex items-center gap-1.5 text-[9px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-full">
                                                                    <Clock size={10} />
                                                                    {worker.lastPresence.split('-').reverse().join('/')}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {worker.accessHistory.slice(0, 3).map((h: any, i: number) => (
                                                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800/50 text-[10px] group/row hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className={`w-1.5 h-1.5 rounded-full ${h.eventType.toUpperCase().includes('ENTRADA') ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                                            <span className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">{h.date.split('-').slice(1).reverse().join('/')}</span>
                                                                            <span className="text-slate-800 dark:text-slate-200 font-black">{h.time}</span>
                                                                        </div>
                                                                        <span className={`font-black uppercase tracking-widest text-[9px] ${h.eventType.toUpperCase().includes('ENTRADA') ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                            {h.eventType.toUpperCase().includes('ENTRADA') ? 'Entrada' : 'Saída'}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                                {worker.accessHistory.length === 0 && (
                                                                    <div className="flex flex-col items-center justify-center py-4 opacity-20">
                                                                        <Clock size={24} className="mb-2" />
                                                                        <p className="text-[9px] font-black uppercase tracking-widest">Sem registros</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reports;
