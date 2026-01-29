
import React, { useState, useEffect, useMemo } from 'react';
import { User, TeamWorker, AttendanceRoster } from '../types';
import { 
    History, Calendar, Search, Building2, User as UserIcon, 
    ChevronDown, ChevronUp, Download, FileSpreadsheet, 
    Filter, Clock, CheckCircle2, Warehouse, Shield
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
                
                // 1. Prestadores: Só vêem sua própria empresa
                if (isProvider) {
                    const myCompany = (currentUser.companyName || currentUser.name || '').toUpperCase();
                    list = list.filter(r => (r.companyName || '').toUpperCase() === myCompany);
                }
                
                // 2. Gestores: Só vêem os galpões que lhes foram atribuídos
                if (isManager) {
                    list = list.filter(r => hasWarehousePermission(currentUser.allowedWarehouses, r.unit));
                }
                
                // 3. Admin: Vê tudo (comportamento padrão)
                
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
        <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-[28px] p-8 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-500">
                        <History size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none mb-2">Histórico de Escalas</h2>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                            {isProvider ? 'Suas escalas passadas' : isManager ? 'Monitoramento histórico de suas unidades' : 'Consulta retroativa de fluxos confirmados'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar nome, empresa ou unidade..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white focus:border-amber-500 outline-none transition-all placeholder-slate-700"
                        />
                    </div>
                    <button 
                        onClick={handleExportExcel}
                        className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 shadow-xl shadow-emerald-900/20"
                    >
                        <FileSpreadsheet size={18} /> EXPORTAR
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="py-32 flex flex-col items-center gap-4">
                    <LoaderIcon className="animate-spin text-amber-500" size={48} />
                    <span className="text-slate-500 font-black uppercase text-[10px] tracking-[0.3em]">Sincronizando Histórico...</span>
                </div>
            ) : sortedDates.length === 0 ? (
                <div className="py-40 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-[40px]">
                    <History size={64} className="text-slate-800 mx-auto mb-6" />
                    <p className="text-slate-600 font-bold uppercase tracking-widest">Nenhum registro encontrado no histórico.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedDates.map(date => (
                        <div key={date} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg transition-all">
                            <button 
                                onClick={() => setExpandedDate(expandedDate === date ? null : date)}
                                className="w-full p-6 flex justify-between items-center bg-slate-950/40 hover:bg-slate-950/60 transition-colors"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="p-3 bg-blue-600/10 rounded-xl text-blue-500 border border-blue-500/20">
                                        <Calendar size={20} />
                                    </div>
                                    <div className="text-left">
                                        <span className="block text-xl font-black text-white italic tracking-tighter">{date.split('-').reverse().join(' / ')}</span>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                            {/* Fix: Explicitly typed 'acc' as number to avoid "Operator '+' cannot be applied to types 'unknown' and 'number'" */}
                                            {Object.keys(groupedHistory[date]).length} EMPRESAS • {Object.values(groupedHistory[date]).reduce((acc: number, curr) => acc + (curr as any[]).length, 0)} COLABORADORES
                                        </span>
                                    </div>
                                </div>
                                {expandedDate === date ? <ChevronUp size={24} className="text-slate-500" /> : <ChevronDown size={24} className="text-slate-500" />}
                            </button>

                            {expandedDate === date && (
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                                    {Object.entries(groupedHistory[date]).map(([company, untypedRoster]) => {
                                        const roster = untypedRoster as any[];
                                        return (
                                            <div key={company} className="bg-slate-950 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-all flex flex-col">
                                                <div className="flex justify-between items-center mb-6 border-b border-slate-800/50 pb-4">
                                                    <div className="flex items-center gap-3">
                                                        <Building2 size={18} className="text-blue-500" />
                                                        <h4 className="font-black text-white text-sm uppercase tracking-tight">{company}</h4>
                                                    </div>
                                                    <span className="px-3 py-1 bg-slate-900 rounded-full text-[10px] font-black text-slate-500 border border-slate-800">{roster.length} INTEGRANTES</span>
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    {roster.map((item: any) => {
                                                        const worker = workers.find(w => w.id === item.workerId);
                                                        return (
                                                            <div key={item.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-2xl border border-slate-800/40 group hover:bg-slate-800/40 transition-colors">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 text-xs font-black">
                                                                        {item.workerName.charAt(0)}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-black text-white uppercase leading-none mb-1">{item.workerName}</p>
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="text-[9px] font-mono text-slate-600 font-bold tracking-widest">{worker?.cpf ? worker.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : '-'}</span>
                                                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                                                <Warehouse size={10} />
                                                                                <span className="text-[9px] font-black uppercase tracking-tighter">{item.unit}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1.5">
                                                                    {item.checkedIn ? (
                                                                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black text-[8px] uppercase tracking-tighter">AUDITADO</span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-black text-[8px] uppercase tracking-tighter">AGUARDANDO</span>
                                                                    )}
                                                                    {item.confirmedAt && (
                                                                        <div className="flex items-center gap-1 text-[8px] font-mono text-slate-700 font-bold uppercase">
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

// Componente Loader auxiliar (interno)
const LoaderIcon = ({ className, size }: { className?: string, size?: number }) => (
    <div className={className} style={{ width: size, height: size }}>
        <svg className="animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

export default RegistrationHistory;
