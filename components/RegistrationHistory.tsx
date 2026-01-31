
import React, { useState, useEffect, useMemo } from 'react';
import { User, TeamWorker, AttendanceRoster } from '../types';
import { 
    History, Calendar, Search, Building2, User as UserIcon, 
    ChevronDown, ChevronUp, Download, FileSpreadsheet, 
    Filter, Clock, CheckCircle2, Warehouse, Shield, Loader2
} from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { db } from '../services/firebase';

interface RegistrationHistoryProps {
  currentUser: User;
}

// Helper para checagem rigorosa de permissão de unidade
const hasWarehousePermission = (allowedList: string[] | undefined, targetWarehouse: string) => {
    if (!allowedList || allowedList.length === 0) return false;
    const normalizedTarget = (targetWarehouse || '').toUpperCase();
    return allowedList.some(allowed => {
        const normalizedAllowed = allowed.toUpperCase();
        return normalizedAllowed === normalizedTarget || normalizedAllowed.includes(normalizedTarget) || normalizedTarget.includes(normalizedAllowed);
    });
};

const RegistrationHistory: React.FC<RegistrationHistoryProps> = ({ currentUser }) => {
    const [rosterHistory, setRosterHistory] = useState<AttendanceRoster[]>([]);
    const [workers, setWorkers] = useState<TeamWorker[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedDate, setExpandedDate] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const isProvider = currentUser.role === 'provider';
    const isManager = currentUser.role === 'manager';

    useEffect(() => {
        const rosterRef = ref(db, 'monitoramento/attendance_roster');
        const unsubRoster = onValue(rosterRef, (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                let list = Object.keys(data).map(k => ({ id: k, ...data[k] }));
                
                // --- SEGURANÇA POR PERFIL ---
                if (isProvider) {
                    const myCompany = (currentUser.companyName || currentUser.name || '').toUpperCase();
                    list = list.filter(r => (r.companyName || '').toUpperCase() === myCompany);
                }
                
                if (isManager) {
                    list = list.filter(r => hasWarehousePermission(currentUser.allowedWarehouses, r.unit));
                }
                
                setRosterHistory(list.sort((a, b) => b.date.localeCompare(a.date)));
            } else setRosterHistory([]);
            setLoading(false);
        });

        const workersRef = ref(db, 'monitoramento/service_workers');
        onValue(workersRef, (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                setWorkers(Object.keys(data).map(k => ({ id: k, ...data[k] })));
            }
        });

        return () => unsubRoster();
    }, [currentUser, isProvider, isManager]);

    // Agrupamento por Data -> Empresa
    const groupedHistory = useMemo(() => {
        const groups: { [date: string]: { [company: string]: AttendanceRoster[] } } = {};
        
        const filtered = rosterHistory.filter(r => 
            r.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.unit.toLowerCase().includes(searchTerm.toLowerCase())
        );

        filtered.forEach(r => {
            if (!groups[r.date]) groups[r.date] = {};
            if (!groups[r.date][r.companyName]) groups[r.date][r.companyName] = [];
            groups[r.date][r.companyName].push(r);
        });

        return groups;
    }, [rosterHistory, searchTerm]);

    const sortedDates = useMemo(() => Object.keys(groupedHistory).sort((a, b) => b.localeCompare(a)), [groupedHistory]);

    const handleExportExcel = () => {
        if (!window.XLSX) return alert("Erro ao carregar biblioteca de exportação.");
        
        const dataToExport = rosterHistory.map(r => {
            const worker = workers.find(w => w.id === r.workerId);
            return {
                "DATA ESCALA": r.date.split('-').reverse().join('/'),
                "COLABORADOR": r.workerName,
                "CPF": worker?.cpf || 'NÃO LOCALIZADO',
                "EMPRESA": r.companyName,
                "UNIDADE ALVO": r.unit,
                "STATUS": r.checkedIn ? 'AUDITADO/LIBERADO' : 'AGUARDANDO',
                "CONFIRMADO EM": r.confirmedAt ? new Date(r.confirmedAt).toLocaleString('pt-BR') : 'N/A'
            };
        });

        const ws = window.XLSX.utils.json_to_sheet(dataToExport);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Histórico_Escalas");
        window.XLSX.writeFile(wb, `Historico_Escalas_CCOS_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-6 animate-fade-in pb-20 px-2 md:px-0">
            {/* Header Responsivo */}
            <div className="bg-[#111827] border border-slate-800 rounded-[20px] md:rounded-[28px] p-5 md:p-8 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
                <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
                    <div className="p-3 md:p-4 bg-amber-500/10 rounded-xl md:rounded-2xl border border-amber-500/20 text-amber-500 shrink-0">
                        <History size={24} className="md:w-8 md:h-8" />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter italic leading-none mb-1 md:mb-2">Histórico</h2>
                        <p className="text-slate-500 text-[9px] md:text-xs font-bold uppercase tracking-widest">
                            {isProvider ? 'Suas escalas passadas' : isManager ? 'Monitoramento de suas unidades' : 'Consulta retroativa de fluxos'}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar nome ou empresa..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:border-amber-500 outline-none transition-all placeholder-slate-700"
                        />
                    </div>
                    <button 
                        onClick={handleExportExcel}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl"
                    >
                        <FileSpreadsheet size={16} /> EXPORTAR
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="py-32 flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-amber-500" size={40} />
                    <span className="text-slate-500 font-black uppercase text-[10px] tracking-[0.3em]">Sincronizando...</span>
                </div>
            ) : sortedDates.length === 0 ? (
                <div className="py-32 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-[30px]">
                    <History size={48} className="text-slate-800 mx-auto mb-4" />
                    <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px]">Nenhum registro encontrado.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sortedDates.map(date => (
                        <div key={date} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all">
                            <button 
                                onClick={() => setExpandedDate(expandedDate === date ? null : date)}
                                className="w-full p-4 md:p-6 flex justify-between items-center bg-slate-950/40 hover:bg-slate-950/60 transition-colors"
                            >
                                <div className="flex items-center gap-4 md:gap-6">
                                    <div className="p-2.5 md:p-3 bg-blue-600/10 rounded-xl text-blue-500 border border-blue-500/20">
                                        <Calendar size={18} className="md:w-5 md:h-5" />
                                    </div>
                                    <div className="text-left">
                                        <span className="block text-lg md:text-xl font-black text-white italic tracking-tighter">{date.split('-').reverse().join(' / ')}</span>
                                        <span className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                            {Object.keys(groupedHistory[date]).length} EMPRESAS • {Object.values(groupedHistory[date]).reduce((acc: number, curr) => acc + (curr as any[]).length, 0)} INTEGRANTES
                                        </span>
                                    </div>
                                </div>
                                {expandedDate === date ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                            </button>

                            {expandedDate === date && (
                                <div className="p-3 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 animate-fade-in">
                                    {Object.entries(groupedHistory[date]).map(([company, untypedRoster]) => {
                                        const roster = untypedRoster as any[];
                                        return (
                                            <div key={company} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 md:p-6 hover:border-slate-700 transition-all flex flex-col">
                                                <div className="flex justify-between items-center mb-4 md:mb-6 border-b border-slate-800/50 pb-3 md:pb-4">
                                                    <div className="flex items-center gap-2 md:gap-3">
                                                        <Building2 size={16} className="text-blue-500 md:w-[18px]" />
                                                        <h4 className="font-black text-white text-xs md:text-sm uppercase tracking-tight truncate max-w-[150px] md:max-w-none">{company}</h4>
                                                    </div>
                                                    <span className="px-2 py-0.5 bg-slate-900 rounded-full text-[8px] md:text-[10px] font-black text-slate-500 border border-slate-800">{roster.length} MEMBROS</span>
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    {roster.map((item: any) => {
                                                        const worker = workers.find(w => w.id === item.workerId);
                                                        return (
                                                            <div key={item.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800/40 hover:bg-slate-800/40 transition-colors">
                                                                <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                                                                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 text-[10px] font-black shrink-0">
                                                                        {item.workerName.charAt(0)}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-[11px] font-black text-white uppercase leading-none mb-1 truncate">{item.workerName}</p>
                                                                        <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                                                            <span className="text-[9px] font-mono text-slate-600 font-bold tracking-tighter md:tracking-widest">
                                                                                {worker?.cpf ? worker.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : '-'}
                                                                            </span>
                                                                            <div className="flex items-center gap-1 text-slate-600">
                                                                                <Warehouse size={10} />
                                                                                <span className="text-[8px] font-black uppercase tracking-tighter">{item.unit}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                                                                    {item.checkedIn ? (
                                                                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black text-[7px] md:text-[8px] uppercase tracking-tighter">AUDITADO</span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-black text-[7px] md:text-[8px] uppercase tracking-tighter">AGUARDANDO</span>
                                                                    )}
                                                                    {item.confirmedAt && (
                                                                        <div className="flex items-center gap-1 text-[7px] md:text-[8px] font-mono text-slate-700 font-bold uppercase">
                                                                            <Clock size={8} /> {new Date(item.confirmedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RegistrationHistory;
