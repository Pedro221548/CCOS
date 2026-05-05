
import React, { useState, useMemo } from 'react';
import { ProcessedWorker, ThirdPartyPayment, User } from '../types';
import { AlertTriangle, CheckCircle2, Search, Calendar, User as UserIcon, Building2, ArrowRight, Filter, Download, Clock, FileSpreadsheet } from 'lucide-react';

interface FinanceAuditProps {
    workers: ProcessedWorker[];
    payments: ThirdPartyPayment[];
    currentUser: User;
}

const FinanceAudit: React.FC<FinanceAuditProps> = ({ workers, payments, currentUser }) => {
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    // Sincronizar período inicial com dados reais
    React.useEffect(() => {
        const allDataDates = [...workers.map(w => w.date), ...payments.map(p => p.date)];
        if (allDataDates.length > 0) {
            const maxDateStr = allDataDates.reduce((max, d) => d > max ? d : max, '0000-00-00');
            
            if (maxDateStr !== '0000-00-00' && (!startDate || !endDate)) {
                const maxD = new Date(maxDateStr + 'T12:00:00');
                const startD = new Date(maxD);
                startD.setDate(maxD.getDate() - 14);
                
                setStartDate(startD.toISOString().split('T')[0]);
                setEndDate(maxDateStr);
            }
        }
    }, [workers, payments]);

    const auditData = useMemo(() => {
        // Names registered in finance
        const namesInFinance = new Set(payments.map(p => p.workerName.toLowerCase().trim()));

        // Filter workers: only those who have at least one payment record in the system
        const registeredWorkers = workers.filter(w => namesInFinance.has(w.name.toLowerCase().trim()));

        // Group workers by date and name to identify presence
        const presenceMap = new Map<string, ProcessedWorker[]>();
        registeredWorkers.forEach(w => {
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
        registeredWorkers.forEach(w => {
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
            const matchesDate = (!startDate || m.date >= startDate) && (!endDate || m.date <= endDate);
            const mComp = (m.worker.company || '').toUpperCase().trim();
            const normalizedComp = mComp === 'MULT ALTA DIARISTA' ? 'MULT' : mComp;

            const matchesSearch = !searchTerm || 
                m.worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                normalizedComp.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesDate && matchesSearch;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [auditData.missing, startDate, endDate, searchTerm]);

    const stats = useMemo(() => {
        const totalPresence = auditData.missing.length + auditData.found.length;
        const totalMissing = auditData.missing.length;
        const percentage = totalPresence > 0 ? ((totalPresence - totalMissing) / totalPresence * 100).toFixed(1) : '100';
        return { totalPresence, totalMissing, percentage };
    }, [auditData]);

    const handleExportExcel = () => {
        if (!window.XLSX) {
            alert("Biblioteca de exportação não carregada.");
            return;
        }

        const exportData = filteredMissing.map(item => ({
            'Colaborador': item.worker.name,
            'ID/CPF': item.worker.id,
            'Empresa': item.worker.company,
            'Unidade': item.worker.unit,
            'Data Presença': new Date(item.date).toLocaleDateString('pt-BR'),
            'Status Financeiro': 'Não Localizado'
        }));

        const ws = window.XLSX.utils.json_to_sheet(exportData);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Divergências Financeiras");
        
        const fileName = `Auditoria_Financeira_${startDate}_a_${endDate}.xlsx`;
        window.XLSX.writeFile(wb, fileName);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12 max-w-full mx-auto p-4 md:p-6">
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col lg:flex-row gap-4 items-center">
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
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">De:</span>
                        <input 
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:border-amber-500 outline-none transition-all w-full sm:w-auto"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Até:</span>
                        <input 
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:border-amber-500 outline-none transition-all w-full sm:w-auto"
                        />
                    </div>
                </div>
                <button className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all" title="Limpar Filtros" onClick={() => { setStartDate(''); setEndDate(''); setSearchTerm(''); }}>
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
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleExportExcel}
                            className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 hover:text-emerald-400 transition-colors"
                        >
                            <FileSpreadsheet size={14} /> Exportar Excel
                        </button>
                        <button className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5 hover:text-amber-400 transition-colors">
                            <Download size={14} /> Exportar PDF
                        </button>
                    </div>
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
