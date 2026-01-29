
import React, { useState, useEffect, useMemo } from 'react';
import { User, ServiceWorker, AttendanceRoster } from '../types';
import { 
    Users, UserPlus, Calendar, ShieldCheck, FileText, Camera as CameraIcon, 
    Upload, X, CheckCircle2, AlertTriangle, Shield, Smartphone, 
    Lock, LayoutGrid, Warehouse, Building2, ChevronRight, Filter, Search, RotateCcw, Trash2, File, CheckSquare, Square, ClipboardCheck, Download, Eye, EyeOff, Loader2 as LoaderIcon, Copy, ImageIcon, Check
} from 'lucide-react';
import { ref, push, onValue, set, remove, update } from 'firebase/database';
import { auth, db } from '../services/firebase';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { WAREHOUSE_LIST } from '../constants';

interface RegistrationProps {
  currentUser: User;
}

// Função de Validação de CPF (Algoritmo Oficial)
const validateCPF = (cpf: string) => {
    const cleanCPF = cpf.replace(/[^\d]+/g, '');
    if (cleanCPF.length !== 11 || !!cleanCPF.match(/(\d)\1{10}/)) return false;
    let add = 0;
    for (let i = 0; i < 9; i++) add += parseInt(cleanCPF.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cleanCPF.charAt(9))) return false;
    add = 0;
    for (let i = 0; i < 10; i++) add += parseInt(cleanCPF.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cleanCPF.charAt(10))) return false;
    return true;
};

const hasWarehousePermission = (allowedList: string[] | undefined, targetWarehouse: string) => {
    if (!allowedList || allowedList.length === 0) return false;
    const normalizedTarget = (targetWarehouse || '').toUpperCase();
    return allowedList.some(allowed => {
        const normalizedAllowed = allowed.toUpperCase();
        if (normalizedAllowed === normalizedTarget) return true;
        if (normalizedAllowed.includes(normalizedTarget) || normalizedTarget.includes(normalizedAllowed)) return true;
        return false;
    });
};

const Registration: React.FC<RegistrationProps> = ({ currentUser }) => {
    const isManager = currentUser.role === 'manager';
    const isAdmin = currentUser.role === 'admin';
    const isProvider = currentUser.role === 'provider';

    const [activeTab, setActiveTab] = useState<'roster' | 'team' | 'admin_view'>(isProvider ? 'roster' : 'admin_view');
    const [workers, setWorkers] = useState<ServiceWorker[]>([]);
    const [dailyRoster, setDailyRoster] = useState<AttendanceRoster[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('TODOS');
    
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set());
    const [targetUnit, setTargetUnit] = useState<string>(WAREHOUSE_LIST[0]);

    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [documentData, setDocumentData] = useState<{ url: string, name: string } | null>(null);
    const [formData, setFormData] = useState({ name: '', cpf: '' });

    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyPassword, setVerifyPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [targetWorker, setTargetWorker] = useState<ServiceWorker | null>(null);
    const [batchDownloadMode, setBatchDownloadMode] = useState(false);
    const [errorVerify, setErrorVerify] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [deleteConfig, setDeleteConfig] = useState<{ id: string, type: 'roster' | 'worker', name: string } | null>(null);

    useEffect(() => {
        const workersRef = ref(db, 'monitoramento/service_workers');
        const unsubWorkers = onValue(workersRef, (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                let list = Object.keys(data).map(k => ({ id: k, ...data[k] }));
                if (isProvider) {
                    list = list.filter(w => w.companyId === currentUser.uid);
                }
                setWorkers(list);
            } else setWorkers([]);
        });

        const rosterRef = ref(db, 'monitoramento/attendance_roster');
        const unsubRoster = onValue(rosterRef, (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                let list = Object.keys(data).map(k => ({ id: k, ...data[k] }));
                // O filtro real para Gestores e Fornecedores é feito no useMemo confirmadoTodayRaw
                setDailyRoster(list);
            } else setDailyRoster([]);
        });

        return () => { unsubWorkers(); unsubRoster(); };
    }, [currentUser.uid, currentUser.companyName, isProvider]);

    const handleSaveWorker = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!photoPreview) { alert("A foto de perfil é obrigatória."); return; }
        if (!documentData) { alert("O documento (PDF ou Imagem) é obrigatório."); return; }
        
        if (!validateCPF(formData.cpf)) {
            alert("O CPF informado é inválido. Por favor, verifique os números digitados.");
            return;
        }
        
        setIsSaving(true);
        try {
            const finalCompanyName = currentUser.companyName || "NÃO IDENTIFICADO";
            const newWorkerRef = push(ref(db, 'monitoramento/service_workers'));
            await set(newWorkerRef, {
                name: formData.name.toUpperCase(),
                cpf: formData.cpf.replace(/[^\d]+/g, ''), 
                companyId: currentUser.uid,
                companyName: finalCompanyName.toUpperCase(),
                photoUrl: photoPreview,
                documentUrl: documentData.url,
                status: 'pending',
                createdAt: new Date().toISOString()
            });
            setShowAddModal(false);
            setPhotoPreview(null);
            setDocumentData(null);
            setFormData({ name: '', cpf: '' });
        } catch (e) { alert("Erro ao salvar."); } finally { setIsSaving(false); }
    };

    const handleApproveWorker = async (workerId: string, rosterId: string) => {
        setActionLoading(rosterId);
        try {
            await update(ref(db, `monitoramento/service_workers/${workerId}`), {
                status: 'approved'
            });
            await update(ref(db, `monitoramento/attendance_roster/${rosterId}`), {
                checkedIn: true
            });
        } catch (e) {
            alert("Erro ao liberar colaborador.");
        } finally {
            setActionLoading(null);
        }
    };

    const toggleWorkerSelection = (id: string) => {
        const newSet = new Set(selectedWorkerIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedWorkerIds(newSet);
    };

    const handleBatchAddToRoster = async () => {
        if (selectedWorkerIds.size === 0) return;
        
        const promises = Array.from(selectedWorkerIds).map(workerId => {
            const worker = workers.find(w => w.id === workerId);
            if (!worker) return Promise.resolve();

            const alreadyIn = dailyRoster.some(r => r.workerId === workerId && r.date === selectedDate);
            if (alreadyIn) return Promise.resolve();

            const rosterRef = push(ref(db, 'monitoramento/attendance_roster'));
            return set(rosterRef, {
                date: selectedDate,
                workerId: worker.id,
                workerName: worker.name,
                companyName: worker.companyName,
                unit: targetUnit,
                checkedIn: false
            });
        });

        try {
            await Promise.all(promises);
            setSelectedWorkerIds(new Set());
            setActiveTab('roster');
        } catch (e) {
            alert("Erro ao escalar equipe.");
        }
    };

    // LÓGICA CRÍTICA DE VISIBILIDADE:
    const confirmedTodayRaw = useMemo(() => {
        let list = dailyRoster.filter(r => r.date === selectedDate);
        
        if (isProvider) {
            // Fornecedor vê apenas registros da sua própria empresa
            list = list.filter(r => r.companyName === currentUser.companyName);
        } else if (isManager) {
            // Gestor vê registros apenas das unidades que ele tem permissão
            list = list.filter(r => hasWarehousePermission(currentUser.allowedWarehouses, r.unit));
        }
        // Admin vê tudo
        
        return list;
    }, [dailyRoster, selectedDate, isProvider, isManager, currentUser.companyName, currentUser.allowedWarehouses]);

    const activeCompanies = useMemo(() => {
        const companies = new Set<string>();
        confirmedTodayRaw.forEach(r => { if (r.companyName) companies.add(r.companyName.toUpperCase()); });
        return Array.from(companies).sort();
    }, [confirmedTodayRaw]);

    const confirmedTodayFiltered = useMemo(() => {
        if (selectedCompanyFilter === 'TODOS' || isProvider) return confirmedTodayRaw;
        return confirmedTodayRaw.filter(r => r.companyName.toUpperCase() === selectedCompanyFilter);
    }, [confirmedTodayRaw, selectedCompanyFilter, isProvider]);

    const handleCopyAllVisible = () => {
        if (confirmedTodayFiltered.length === 0) return;
        const textToCopy = confirmedTodayFiltered.map(roster => {
            const worker = workers.find(w => w.id === roster.workerId);
            const cpfFormatted = worker?.cpf ? worker.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : 'CPF NÃO LOCALIZADO';
            return `${roster.workerName} - ${cpfFormatted}`;
        }).join('\n');
        navigator.clipboard.writeText(textToCopy);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const startDownloadProcess = (workerId: string) => {
        const worker = workers.find(w => w.id === workerId);
        if (worker) {
            setTargetWorker(worker);
            setBatchDownloadMode(false);
            setShowVerifyModal(true);
            setVerifyPassword('');
            setErrorVerify('');
        }
    };

    const startBatchPhotoDownload = () => {
        if (confirmedTodayFiltered.length === 0) return;
        setBatchDownloadMode(true);
        setTargetWorker(null);
        setShowVerifyModal(true);
        setVerifyPassword('');
        setErrorVerify('');
    };

    const handleVerifyAndAction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) return;
        setVerifying(true);
        setErrorVerify('');
        try {
            const credential = EmailAuthProvider.credential(auth.currentUser.email!, verifyPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);
            if (batchDownloadMode) {
                for (const roster of confirmedTodayFiltered) {
                    const worker = workers.find(w => w.id === roster.workerId);
                    if (worker?.photoUrl) {
                        await triggerFileDownload(worker.photoUrl, `FOTO_${worker.name.replace(/\s+/g, '_')}.jpg`);
                        await new Promise(r => setTimeout(r, 400));
                    }
                }
            } else if (targetWorker) {
                const fileUrl = targetWorker.documentUrl;
                if (!fileUrl) throw new Error("Documento não encontrado.");
                let ext = 'pdf';
                if (fileUrl.includes('data:image/png')) ext = 'png';
                else if (fileUrl.includes('data:image/jpeg')) ext = 'jpg';
                await triggerFileDownload(fileUrl, `DOCUMENTO_${targetWorker.name.replace(/\s+/g, '_')}.${ext}`);
            }
            setShowVerifyModal(false);
            setTargetWorker(null);
            setBatchDownloadMode(false);
        } catch (err: any) { setErrorVerify("Senha incorreta."); } finally { setVerifying(false); }
    };

    const triggerFileDownload = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        } catch (e) { console.error("Erro no download"); }
    };

    const confirmDeleteAction = async () => {
        if (!deleteConfig) return;
        try {
            const path = deleteConfig.type === 'roster' 
                ? `monitoramento/attendance_roster/${deleteConfig.id}` 
                : `monitoramento/service_workers/${deleteConfig.id}`;
            await remove(ref(db, path));
            setDeleteConfig(null);
        } catch (e) { alert("Erro ao excluir."); }
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in pb-20 px-4 sm:px-0">
            <div className="bg-[#0f172a] border border-slate-800 rounded-[24px] p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-6 z-10">
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl shadow-inner">
                        <Shield className="text-amber-500" size={36} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Controle de Acesso</h2>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                             <Lock size={12} className="text-slate-600" /> {isProvider ? `Empresa: ${currentUser.companyName || 'N/A'}` : isManager ? 'Gestão de Unidades Permitidas' : 'Gestão Centralizada Global'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4 z-10">
                    {isProvider && (
                        <div className="flex gap-2">
                            <button onClick={() => setActiveTab(activeTab === 'team' ? 'roster' : 'team')} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-all">
                                {activeTab === 'team' ? 'Ver Escala Diária' : 'Minha Equipe (Cadastros)'}
                            </button>
                            <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-blue-900/40 flex items-center gap-2">
                                <UserPlus size={18} /> Novo Cadastro
                            </button>
                        </div>
                    )}
                    <div className="px-6 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-amber-500 font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                        {isProvider ? 'Módulo Fornecedor' : isManager ? 'Visão Gestor' : 'Painel Administrativo'}
                    </div>
                </div>
            </div>

            {activeTab === 'team' && isProvider ? (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-[24px] p-6 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                                <Users size={24} />
                            </div>
                            <div>
                                <h3 className="text-white font-black uppercase text-sm">Escala Operacional</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedWorkerIds.size} colaboradores selecionados</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                            <div className="relative w-full sm:w-64">
                                <select 
                                    value={targetUnit}
                                    onChange={(e) => setTargetUnit(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white font-bold uppercase outline-none focus:border-blue-500 appearance-none cursor-pointer"
                                >
                                    {WAREHOUSE_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                                <Warehouse className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={16} />
                            </div>
                            <button 
                                onClick={handleBatchAddToRoster}
                                disabled={selectedWorkerIds.size === 0}
                                className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:grayscale text-white font-black rounded-xl uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/20"
                            >
                                <ClipboardCheck size={20} /> Confirmar Escala Hoje
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {workers.map(w => {
                            const isSelected = selectedWorkerIds.has(w.id);
                            return (
                                <div key={w.id} onClick={() => toggleWorkerSelection(w.id)} className={`relative cursor-pointer bg-slate-950 border rounded-[28px] p-5 transition-all group overflow-hidden ${isSelected ? 'border-blue-500 bg-blue-500/5 shadow-xl shadow-blue-900/20' : 'border-slate-800 hover:border-slate-700'}`}>
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="relative">
                                            <img src={w.photoUrl} className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-800" />
                                            <div className={`absolute -top-2 -left-2 p-1 rounded-lg border shadow-lg transition-all ${isSelected ? 'bg-blue-600 border-blue-400 scale-110' : 'bg-slate-800 border-slate-700'}`}>
                                                {isSelected ? <CheckSquare size={16} className="text-white" /> : <Square size={16} className="text-slate-600" />}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col gap-1">
                                                <p className="text-white font-black uppercase text-xs truncate leading-tight">{w.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[9px] text-slate-600 font-mono font-bold">{w.cpf}</p>
                                                    <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase border tracking-widest ${w.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                                        {w.status === 'approved' ? 'CADASTRADO' : 'PENDENTE'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); startDownloadProcess(w.id); }} className="p-2 text-slate-800 hover:text-blue-500 transition-all"><Download size={18} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfig({ id: w.id, type: 'worker', name: w.name }); }} className="p-2 text-slate-800 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                    {isSelected && <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-3xl rounded-full"></div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <>
                    <div className="bg-slate-900 border border-slate-800 rounded-[20px] p-5 shadow-xl flex flex-col md:flex-row items-center gap-6 animate-fade-in">
                        <div className="bg-slate-950 p-2 rounded-2xl border border-slate-800 flex items-center gap-4 flex-1 w-full md:w-auto pr-6">
                            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                                <Calendar size={22} />
                            </div>
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent border-none text-white font-black text-sm uppercase outline-none flex-1 [color-scheme:dark] cursor-pointer font-bold" 
                            />
                        </div>
                        <div className="flex items-center gap-12 px-4">
                            <div className="text-center md:text-right">
                                <span className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Escalados Hoje</span>
                                <span className="block text-4xl font-black text-amber-500 tabular-nums">{confirmedTodayRaw.length}</span>
                            </div>
                            {!isProvider && !isManager && (
                                <>
                                    <div className="h-10 w-px bg-slate-800"></div>
                                    <div className="text-center md:text-right">
                                        <span className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Empresas Ativas</span>
                                        <span className="block text-4xl font-black text-blue-500 tabular-nums">{activeCompanies.length}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {!isProvider && (
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
                            <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
                                <button 
                                    onClick={() => setSelectedCompanyFilter('TODOS')}
                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2
                                        ${selectedCompanyFilter === 'TODOS' ? 'bg-slate-800 text-white shadow-lg border border-slate-700' : 'text-slate-600 hover:text-slate-400'}
                                    `}
                                >
                                    <LayoutGrid size={14} /> TODOS
                                </button>
                                <div className="w-px h-4 bg-slate-800 mx-2"></div>
                                {activeCompanies.map(company => {
                                    const count = confirmedTodayRaw.filter(r => r.companyName.toUpperCase() === company).length;
                                    return (
                                        <button 
                                            key={company}
                                            onClick={() => setSelectedCompanyFilter(company)}
                                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap
                                                ${selectedCompanyFilter === company 
                                                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-xl' 
                                                    : 'text-slate-600 hover:text-slate-400 border border-transparent'}
                                            `}
                                        >
                                            {company} <span className="opacity-50 text-[9px] font-mono">({count})</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-900 border border-slate-800 rounded-[24px] shadow-2xl overflow-hidden min-h-[400px]">
                        <div className="p-4 border-b border-slate-800/40 flex justify-end gap-3">
                            {(isAdmin || isManager) && (
                                <button onClick={startBatchPhotoDownload} className="bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-600 hover:text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg"><ImageIcon size={16} /> Baixar Fotos (JPG)</button>
                            )}
                            <button onClick={handleCopyAllVisible} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border shadow-lg ${copySuccess ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white'}`}>{copySuccess ? <CheckCircle2 size={16} /> : <Copy size={16} />} {copySuccess ? 'Copiado!' : 'Copiar Lista (Nome/CPF)'}</button>
                        </div>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-800">
                                    <tr>
                                        <th className="p-6">Identificação Colaborador</th>
                                        <th className="p-6">Empresa Parceira</th>
                                        <th className="p-6">Unidade Alvo</th>
                                        <th className="p-6">Auditoria</th>
                                        <th className="p-6 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/40">
                                    {confirmedTodayFiltered.length === 0 ? (
                                        <tr><td colSpan={5} className="p-20 text-center text-slate-600 italic">Nenhum registro escalado nesta data.</td></tr>
                                    ) : confirmedTodayFiltered.map(roster => {
                                        const worker = workers.find(w => w.id === roster.workerId);
                                        const isApproved = worker?.status === 'approved';
                                        return (
                                            <tr key={roster.id} className={`transition-all group border-l-2 ${isApproved ? 'bg-emerald-500/[0.02] border-l-emerald-500' : 'hover:bg-slate-800/20 border-l-transparent'}`}>
                                                <td className="p-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative">
                                                            <img src={worker?.photoUrl || `https://ui-avatars.com/api/?name=${roster.workerName}&background=1e293b&color=475569`} className="w-12 h-12 rounded-xl object-cover border-2 border-slate-800 shadow-xl" alt="" />
                                                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 shadow-lg ${isApproved ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-white block uppercase text-sm tracking-tight">{roster.workerName}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-mono text-slate-600 font-bold tracking-widest">{worker?.cpf ? worker.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : '-'}</span>
                                                                {isApproved && <span className="text-[8px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1 rounded font-black uppercase tracking-tighter">OK</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6"><div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 text-blue-500 border border-blue-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest"><Building2 size={12} /> {roster.companyName}</div></td>
                                                <td className="p-6"><div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[11px] tracking-tight"><Warehouse size={14} className="text-slate-700" /> {roster.unit}</div></td>
                                                <td className="p-6"><button onClick={() => startDownloadProcess(roster.workerId)} className="flex items-center gap-2 text-slate-600 hover:text-amber-500 transition-all text-[10px] font-black uppercase tracking-widest group/btn"><div className="p-2 rounded-lg bg-slate-950 border border-slate-800 group-hover/btn:border-amber-500/50 transition-all"><Download size={16} /></div>Baixar Documentos</button></td>
                                                <td className="p-6">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => setDeleteConfig({ id: roster.id, type: 'roster', name: roster.workerName })} className="p-2.5 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-600/20 rounded-xl transition-all shadow-lg"><Trash2 size={16} /></button>
                                                        {isApproved ? (
                                                            <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase text-emerald-500 flex items-center gap-2 shadow-lg shadow-emerald-900/10 animate-fade-in"><CheckCircle2 size={16} className="text-emerald-400" /> Liberado para Acesso</div>
                                                        ) : (
                                                            (isAdmin || isManager) ? (
                                                                <button onClick={() => handleApproveWorker(roster.workerId, roster.id)} disabled={actionLoading === roster.id} className="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white border border-emerald-500/20 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-emerald-900/10 group/lib">{actionLoading === roster.id ? <LoaderIcon className="animate-spin" size={16} /> : <><CheckCircle2 size={16} className="group-hover:lib:scale-110 transition-transform" /> Liberar</>}</button>
                                                            ) : (
                                                                <div className="bg-amber-500/5 border border-amber-500/20 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase text-amber-500 flex items-center gap-2 italic">Aguardando Auditoria</div>
                                                            )
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* MODALS (Sem alterações lógicas) */}
            {showVerifyModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
                    <div className="bg-[#0f172a] border border-slate-700 rounded-[32px] p-10 shadow-2xl max-sm w-full relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center border border-blue-600/20 mb-4"><Lock className="text-blue-500" size={32} /></div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Verificar Identidade</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">{batchDownloadMode ? <>Confirme sua senha para baixar <br/><span className="text-emerald-500">{confirmedTodayFiltered.length} fotos de colaboradores</span></> : <>Digite sua senha para baixar o documento de <br/><span className="text-white">{targetWorker?.name}</span></>}</p>
                        </div>
                        <form onSubmit={handleVerifyAndAction} className="space-y-6">
                            <div className="relative group">
                                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 size={18} ${errorVerify ? 'text-rose-500' : 'text-slate-600 group-focus-within:text-blue-500'}`} />
                                <input autoFocus type={showPassword ? "text" : "password"} value={verifyPassword} onChange={e => setVerifyPassword(e.target.value)} className={`w-full bg-slate-950 border rounded-2xl pl-12 pr-12 py-4 text-white outline-none transition-all font-bold tracking-widest ${errorVerify ? 'border-rose-500' : 'border-slate-800 focus:border-blue-500'}`} placeholder="SENHA" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                            </div>
                            {errorVerify && <p className="text-rose-500 text-[10px] font-black uppercase text-center animate-pulse">{errorVerify}</p>}
                            <div className="flex gap-4"><button type="button" onClick={() => { setShowVerifyModal(false); setTargetWorker(null); setBatchDownloadMode(false); }} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">Cancelar</button><button type="submit" disabled={verifying || !verifyPassword} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-blue-900/40 transition-all flex items-center justify-center gap-2">{verifying ? <LoaderIcon className="animate-spin" size={16} /> : <><Download size={16} /> Confirmar</>}</button></div>
                        </form>
                    </div>
                </div>
            )}

            {deleteConfig && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-[32px] p-10 shadow-2xl max-sm w-full text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-600"></div>
                        <div className="w-20 h-20 bg-rose-600/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20"><AlertTriangle className="text-rose-600" size={40} /></div>
                        <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter italic">Confirmar Exclusão?</h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed mb-8">Deseja realmente remover o registro de <br/><span className="text-rose-500 font-black">{deleteConfig.name}</span>?</p>
                        <div className="flex gap-4"><button onClick={() => setDeleteConfig(null)} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">Cancelar</button><button onClick={confirmDeleteAction} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-rose-900/40 transition-all active:scale-95">Sim, Excluir</button></div>
                    </div>
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto">
                    <div className="bg-[#0f172a] border border-slate-700 rounded-[32px] shadow-2xl w-full max-w-lg my-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
                        <div className="p-10">
                            <div className="flex justify-between items-start mb-8">
                                <div><h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Novo Registro</h3><p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Empresa: {currentUser.companyName}</p></div>
                                <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-800 hover:bg-rose-600 text-white rounded-full transition-all"><X size={20}/></button>
                            </div>
                            <form onSubmit={handleSaveWorker} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Foto Perfil</label>
                                        <div className="aspect-square bg-slate-950 border-2 border-dashed border-slate-800 rounded-[32px] overflow-hidden flex items-center justify-center relative group">
                                            {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover p-2 rounded-[28px]" alt="" /> : <CameraIcon size={32} className="text-slate-800" />}
                                            <input type="file" accept="image/*" className="hidden" id="photo-up" onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const r = new FileReader();
                                                    r.onload = ev => setPhotoPreview(ev.target?.result as string);
                                                    r.readAsDataURL(file);
                                                }
                                            }} />
                                            <button type="button" onClick={() => document.getElementById('photo-up')?.click()} className="absolute bottom-3 right-3 p-2.5 bg-blue-600 text-white rounded-full shadow-xl hover:scale-110 transition-transform"><CameraIcon size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Documento (PDF/IMG)</label>
                                        <div className="aspect-square bg-slate-950 border-2 border-dashed border-slate-800 rounded-[32px] overflow-hidden flex items-center justify-center relative group">
                                            {documentData ? (
                                                <div className="p-4 text-center">
                                                    <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-2"><File className="text-blue-500" size={24} /></div>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-full px-2">{documentData.name}</p>
                                                </div>
                                            ) : <FileText size={32} className="text-slate-800" />}
                                            <input type="file" accept=".pdf,image/*" className="hidden" id="doc-up" onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const r = new FileReader();
                                                    r.onload = ev => setDocumentData({ url: ev.target?.result as string, name: file.name });
                                                    r.readAsDataURL(file);
                                                }
                                            }} />
                                            <button type="button" onClick={() => document.getElementById('doc-up')?.click()} className="absolute bottom-3 right-3 p-2.5 bg-emerald-600 text-white rounded-full shadow-xl hover:scale-110 transition-transform"><Upload size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-black uppercase placeholder-slate-800 outline-none focus:border-blue-500" placeholder="NOME COMPLETO" />
                                    <input required value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-mono placeholder-slate-800 outline-none focus:border-blue-500" placeholder="CPF (SÓ NÚMEROS)" maxLength={11} />
                                </div>
                                <button type="submit" disabled={isSaving} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase tracking-widest shadow-2xl active:scale-[0.98] transition-all disabled:opacity-30">
                                    {isSaving ? <LoaderIcon className="animate-spin mx-auto" /> : 'CONCLUIR E ENVIAR'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Registration;
