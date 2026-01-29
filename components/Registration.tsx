
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, TeamWorker, AttendanceRoster } from '../types';
import { 
    Users, UserPlus, Calendar, ShieldCheck, FileText, Camera as CameraIcon, 
    Upload, X, CheckCircle2, AlertTriangle, Shield, Smartphone, 
    Lock, LayoutGrid, Warehouse, Building2, ChevronRight, Filter, Search, RotateCcw, Trash2, File, CheckSquare, Square, ClipboardCheck, Download, Eye, EyeOff, Loader2 as LoaderIcon, Copy, ImageIcon, Check, Briefcase, Sparkles, Eraser
} from 'lucide-react';
import { ref, push, onValue, set, remove, update, get } from 'firebase/database';
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
        return normalizedAllowed === normalizedTarget || normalizedAllowed.includes(normalizedTarget) || normalizedTarget.includes(normalizedAllowed);
    });
};

const Registration: React.FC<RegistrationProps> = ({ currentUser }) => {
    const isManager = currentUser.role === 'manager';
    const isAdmin = currentUser.role === 'admin';
    const isProvider = currentUser.role === 'provider';

    const [activeTab, setActiveTab] = useState<'roster' | 'team' | 'admin_view'>(isProvider ? 'roster' : 'admin_view');
    const [workers, setWorkers] = useState<TeamWorker[]>([]);
    const [dailyRoster, setDailyRoster] = useState<AttendanceRoster[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('TODOS');
    
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set());
    const [selectedRosterIds, setSelectedRosterIds] = useState<Set<string>>(new Set());
    const [targetUnit, setTargetUnit] = useState<string>(WAREHOUSE_LIST[0]);

    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isPurging, setIsPurging] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [documentData, setDocumentData] = useState<{ url: string, name: string } | null>(null);
    const [formData, setFormData] = useState({ name: '', cpf: '' });

    const photoInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyPassword, setVerifyPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [targetWorker, setTargetWorker] = useState<TeamWorker | null>(null);
    const [batchDownloadMode, setBatchDownloadMode] = useState(false);
    const [errorVerify, setErrorVerify] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [deleteConfig, setDeleteConfig] = useState<{ id: string | string[], type: 'roster' | 'worker', name: string } | null>(null);

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
                setDailyRoster(list);
            } else setDailyRoster([]);
        });

        return () => { unsubWorkers(); unsubRoster(); };
    }, [currentUser.uid, isProvider]);

    // Função para excluir permanentemente registros sem empresa identificada
    const handlePurgeInvalidRecords = async () => {
        if (!window.confirm("ATENÇÃO: Esta ação irá excluir permanentemente do banco de dados todos os cadastros e escalas que estão sem empresa parceira identificada. Deseja continuar?")) {
            return;
        }

        setIsPurging(true);
        try {
            const updates: any = {};
            let count = 0;

            // 1. Verificar Coleção de Escalas
            dailyRoster.forEach(r => {
                const name = (r.companyName || '').trim().toUpperCase();
                if (!name || name === 'NÃO IDENTIFICADO' || name === 'UNDEFINED') {
                    updates[`monitoramento/attendance_roster/${r.id}`] = null;
                    count++;
                }
            });

            // 2. Verificar Coleção de Trabalhadores
            workers.forEach(w => {
                const name = (w.companyName || '').trim().toUpperCase();
                if (!name || name === 'NÃO IDENTIFICADO' || name === 'UNDEFINED') {
                    updates[`monitoramento/service_workers/${w.id}`] = null;
                    count++;
                }
            });

            if (count > 0) {
                await update(ref(db), updates);
                alert(`Sucesso! ${count} registros inválidos foram excluídos permanentemente.`);
            } else {
                alert("Nenhum registro inválido foi encontrado para exclusão.");
            }
        } catch (e) {
            console.error(e);
            alert("Erro ao realizar a limpeza do banco de dados.");
        } finally {
            setIsPurging(false);
        }
    };

    const handleSaveWorker = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!photoPreview) { alert("A foto de perfil é obrigatória."); return; }
        if (!documentData) { alert("O documento (PDF ou Imagem) é obrigatório."); return; }
        
        if (!validateCPF(formData.cpf)) {
            alert("O CPF informado é inválido.");
            return;
        }
        
        setIsSaving(true);
        try {
            const finalCompanyName = (currentUser.companyName || currentUser.name || "PRESTADOR").trim().toUpperCase();
            
            const newWorkerRef = push(ref(db, 'monitoramento/service_workers'));
            await set(newWorkerRef, {
                name: formData.name.toUpperCase(),
                cpf: formData.cpf.replace(/[^\d]+/g, ''), 
                companyId: currentUser.uid,
                companyName: finalCompanyName,
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

    const toggleRosterSelection = (id: string) => {
        const newSet = new Set(selectedRosterIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedRosterIds(newSet);
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
                companyName: (worker.companyName || currentUser.companyName || currentUser.name || "EMPRESA").trim().toUpperCase(),
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

    const confirmedTodayRaw = useMemo(() => {
        let list = dailyRoster.filter(r => r.date === selectedDate);
        
        if (isProvider) {
            const providerCompany = (currentUser.companyName || currentUser.name || 'EMPRESA').trim().toUpperCase();
            const myWorkerIds = new Set(workers.map(w => w.id));

            list = list.filter(r => {
                const entryCompany = (r.companyName || '').trim().toUpperCase();
                return entryCompany === providerCompany || myWorkerIds.has(r.workerId);
            });
        } else if (isManager) {
            list = list.filter(r => hasWarehousePermission(currentUser.allowedWarehouses, r.unit));
        }
        return list;
    }, [dailyRoster, selectedDate, isProvider, isManager, currentUser, workers]);

    const companyStats = useMemo(() => {
        const stats: { [key: string]: number } = {};

        confirmedTodayRaw.forEach(r => {
            let name = (r.companyName || 'NÃO IDENTIFICADO').trim().toUpperCase();
            if (name === 'NÃO IDENTIFICADO' && isProvider) {
                name = (currentUser.companyName || currentUser.name || 'N/A').toUpperCase();
            }
            stats[name] = (stats[name] || 0) + 1;
        });

        return Object.keys(stats).sort().map(name => ({
            name,
            count: stats[name]
        }));
    }, [confirmedTodayRaw, isProvider, currentUser]);

    const confirmedTodayFiltered = useMemo(() => {
        if (selectedCompanyFilter === 'TODOS') return confirmedTodayRaw;
        return confirmedTodayRaw.filter(r => {
            let name = (r.companyName || 'NÃO IDENTIFICADO').trim().toUpperCase();
            if (name === 'NÃO IDENTIFICADO' && isProvider) {
                name = (currentUser.companyName || currentUser.name || 'N/A').toUpperCase();
            }
            return name === selectedCompanyFilter;
        });
    }, [confirmedTodayRaw, selectedCompanyFilter, isProvider, currentUser]);

    // Verifica se existem registros "Não Identificados" no contexto atual para exibir o botão de limpeza
    const hasInvalidRecords = useMemo(() => {
        if (!isAdmin && !isManager) return false;
        return dailyRoster.some(r => !r.companyName || r.companyName.trim().toUpperCase() === 'NÃO IDENTIFICADO') ||
               workers.some(w => !w.companyName || w.companyName.trim().toUpperCase() === 'NÃO IDENTIFICADO');
    }, [dailyRoster, workers, isAdmin, isManager]);

    const handleSelectAllRoster = () => {
        if (selectedRosterIds.size === confirmedTodayFiltered.length) {
            setSelectedRosterIds(new Set());
        } else {
            setSelectedRosterIds(new Set(confirmedTodayFiltered.map(r => r.id)));
        }
    };

    const handleBatchDeleteRoster = () => {
        if (selectedRosterIds.size === 0) return;
        setDeleteConfig({
            id: Array.from(selectedRosterIds),
            type: 'roster',
            name: `${selectedRosterIds.size} REGISTROS SELECIONADOS`
        });
    };

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
            if (Array.isArray(deleteConfig.id)) {
                const promises = deleteConfig.id.map(id => remove(ref(db, `monitoramento/attendance_roster/${id}`)));
                await Promise.all(promises);
                setSelectedRosterIds(new Set());
            } else {
                const path = deleteConfig.type === 'roster' 
                    ? `monitoramento/attendance_roster/${deleteConfig.id}` 
                    : `monitoramento/service_workers/${deleteConfig.id}`;
                await remove(ref(db, path));
            }
            setDeleteConfig(null);
        } catch (e) { alert("Erro ao excluir."); }
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in pb-20 px-4 sm:px-0">
            {/* Header Proeminente */}
            <div className="bg-[#1a1f2e] border border-slate-800 rounded-[28px] p-10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-8 z-10">
                    <div className="p-6 bg-slate-900 border border-slate-700 rounded-3xl shadow-inner group transition-transform hover:scale-105">
                        <Shield className="text-amber-500 fill-amber-500/10" size={44} strokeWidth={1.2} />
                    </div>
                    <div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none mb-3">CONTROLE DE ACESSO</h2>
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-bold uppercase tracking-widest">
                             <Briefcase size={14} className="text-slate-600" /> 
                             EMPRESA: <span className="text-slate-300">{isProvider ? (currentUser.companyName || currentUser.name || 'N/A') : 'CCOS MASTER'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4 z-10">
                    {isProvider && (
                        <div className="flex gap-3">
                            <button onClick={() => setActiveTab(activeTab === 'team' ? 'roster' : 'team')} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all border border-slate-700">
                                {activeTab === 'team' ? 'VER ESCALA DIÁRIA' : 'MINHA EQUIPE (CADASTROS)'}
                            </button>
                            <button onClick={() => setShowAddModal(true)} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-blue-900/40 flex items-center gap-2">
                                <UserPlus size={18} /> NOVO CADASTRO
                            </button>
                        </div>
                    )}
                    {/* Botão de Limpeza para Administradores */}
                    {hasInvalidRecords && (
                        <button 
                            onClick={handlePurgeInvalidRecords}
                            disabled={isPurging}
                            className="px-6 py-4 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border border-rose-600/30 flex items-center gap-3 shadow-lg shadow-rose-900/10"
                        >
                            {isPurging ? <LoaderIcon className="animate-spin" size={16} /> : <Eraser size={16} />}
                            LIMPAR DADOS INVÁLIDOS
                        </button>
                    )}
                    <div className="px-6 py-3 bg-[#eab308]/10 border border-[#eab308]/20 rounded-2xl text-[#eab308] font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                        MÓDULO OPERACIONAL
                    </div>
                </div>
            </div>

            {activeTab === 'team' && isProvider ? (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500 border border-blue-500/20">
                                <Users size={28} />
                            </div>
                            <div>
                                <h3 className="text-white font-black uppercase text-base tracking-widest">ESCALA OPERACIONAL</h3>
                                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">{selectedWorkerIds.size} COLABORADORES SELECIONADOS</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                            <div className="relative w-full sm:w-72">
                                <select 
                                    value={targetUnit}
                                    onChange={(e) => setTargetUnit(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs text-white font-bold uppercase outline-none focus:border-blue-500 appearance-none cursor-pointer"
                                >
                                    {WAREHOUSE_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                                <Warehouse className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={18} />
                            </div>
                            <button 
                                onClick={handleBatchAddToRoster}
                                disabled={selectedWorkerIds.size === 0}
                                className="w-full sm:w-auto px-10 py-4 bg-[#10b981] hover:bg-[#059669] disabled:opacity-30 disabled:grayscale text-white font-black rounded-2xl uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/30"
                            >
                                <ClipboardCheck size={22} /> CONFIRMAR ESCALA HOJE
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {workers.map(w => {
                            const isSelected = selectedWorkerIds.has(w.id);
                            return (
                                <div key={w.id} onClick={() => toggleWorkerSelection(w.id)} className={`relative cursor-pointer bg-slate-950 border rounded-[32px] p-6 transition-all group overflow-hidden ${isSelected ? 'border-blue-500 bg-blue-500/5 shadow-2xl shadow-blue-900/20' : 'border-slate-800 hover:border-slate-700'}`}>
                                    <div className="flex items-center gap-5 relative z-10">
                                        <div className="relative shrink-0">
                                            <img src={w.photoUrl} className="w-16 h-16 rounded-[20px] object-cover border-2 border-slate-800" />
                                            <div className={`absolute -top-2 -left-2 p-1.5 rounded-xl border shadow-lg transition-all ${isSelected ? 'bg-blue-600 border-blue-400 scale-110' : 'bg-slate-800 border-slate-700'}`}>
                                                {isSelected ? <CheckSquare size={18} className="text-white" /> : <Square size={18} className="text-slate-600" />}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-black uppercase text-xs truncate leading-tight tracking-tight">{w.name}</p>
                                            <div className="flex flex-col gap-1 mt-2">
                                                <p className="text-[10px] text-slate-600 font-mono font-bold tracking-widest">{w.cpf}</p>
                                                <div className={`inline-block w-fit px-2 py-0.5 rounded text-[8px] font-black uppercase border tracking-widest ${w.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                                    {w.status === 'approved' ? 'CADASTRADO' : 'PENDENTE'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); startDownloadProcess(w.id); }} className="p-2 text-slate-800 hover:text-blue-500 transition-all"><Download size={20} /></button>
                                        </div>
                                    </div>
                                    {isSelected && <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full"></div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <>
                    {/* Filtros e Stats da Roster */}
                    <div className="bg-slate-900 border border-slate-800 rounded-[28px] p-6 shadow-xl flex flex-col md:flex-row items-center gap-8 animate-fade-in">
                        <div className="bg-slate-950 p-2 rounded-2xl border border-slate-800 flex items-center gap-5 flex-1 w-full md:w-auto pr-8">
                            <div className="p-4 bg-amber-500/10 rounded-xl text-amber-500">
                                <Calendar size={26} />
                            </div>
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent border-none text-white font-black text-base uppercase outline-none flex-1 [color-scheme:dark] cursor-pointer" 
                            />
                        </div>
                        <div className="flex items-center gap-16 px-6">
                            <div className="text-center md:text-right">
                                <span className="block text-[11px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2">ESCALADOS HOJE</span>
                                <span className="block text-5xl font-black text-amber-500 tabular-nums leading-none">{confirmedTodayRaw.length}</span>
                            </div>
                            {!isProvider && !isManager && (
                                <>
                                    <div className="h-12 w-px bg-slate-800"></div>
                                    <div className="text-center md:text-right">
                                        <span className="block text-[11px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2">EMPRESAS ATIVAS</span>
                                        <span className="block text-5xl font-black text-blue-500 tabular-nums leading-none">{companyStats.length}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {!isProvider && (
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
                            <div className="flex items-center bg-[#0d1117] p-1.5 rounded-2xl border border-slate-800 shadow-inner">
                                <button 
                                    onClick={() => setSelectedCompanyFilter('TODOS')}
                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center gap-2
                                        ${selectedCompanyFilter === 'TODOS' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent'}
                                    `}
                                >
                                    <LayoutGrid size={14} /> TODOS
                                </button>
                                <div className="w-px h-4 bg-slate-800 mx-2"></div>
                                {companyStats.map(item => (
                                    <button 
                                        key={item.name}
                                        onClick={() => setSelectedCompanyFilter(item.name)}
                                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center gap-2 whitespace-nowrap border
                                            ${selectedCompanyFilter === item.name 
                                                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-xl' 
                                                : 'text-slate-500 hover:text-slate-300 border-transparent'}
                                        `}
                                    >
                                        {item.name} <span className="opacity-50 text-[9px] font-mono">({item.count})</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tabela Principal */}
                    <div className="bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl overflow-hidden min-h-[500px]">
                        <div className="p-6 border-b border-slate-800/40 flex flex-wrap justify-end gap-4 bg-slate-950/20">
                            {selectedRosterIds.size > 0 && (
                                <button onClick={handleBatchDeleteRoster} className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-lg shadow-rose-900/30 animate-fade-in">
                                    <Trash2 size={18} /> APAGAR SELECIONADOS ({selectedRosterIds.size})
                                </button>
                            )}
                            {(isAdmin || isManager) && (
                                <button onClick={startBatchPhotoDownload} className="bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-600 hover:text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-lg"><ImageIcon size={18} /> BAIXAR FOTOS (JPG)</button>
                            )}
                            <button onClick={handleCopyAllVisible} className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 border shadow-lg ${copySuccess ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white'}`}>{copySuccess ? <CheckCircle2 size={18} /> : <Copy size={18} />} {copySuccess ? 'COPIADO!' : 'COPIAR LISTA (NOME/CPF)'}</button>
                        </div>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="bg-[#05070a] text-slate-500 text-[11px] font-black uppercase tracking-[0.25em] border-b border-slate-800">
                                    <tr>
                                        <th className="p-8 w-16">
                                            <button onClick={handleSelectAllRoster} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                                                {selectedRosterIds.size === confirmedTodayFiltered.length && confirmedTodayFiltered.length > 0 ? (
                                                    <CheckSquare size={20} className="text-blue-500" />
                                                ) : (
                                                    <Square size={20} className="text-slate-600" />
                                                )}
                                            </button>
                                        </th>
                                        <th className="p-8">IDENTIFICAÇÃO COLABORADOR</th>
                                        <th className="p-8">EMPRESA PARCEIRA</th>
                                        <th className="p-8">UNIDADE ALVO</th>
                                        <th className="p-8">AUDITORIA</th>
                                        <th className="p-8 text-right">AÇÕES</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/40">
                                    {confirmedTodayFiltered.length === 0 ? (
                                        <tr><td colSpan={6} className="p-32 text-center text-slate-600 font-bold uppercase tracking-widest text-sm">Nenhum registro escalado nesta data.</td></tr>
                                    ) : confirmedTodayFiltered.map(roster => {
                                        const worker = workers.find(w => w.id === roster.workerId);
                                        const isApproved = worker?.status === 'approved';
                                        const isSelected = selectedRosterIds.has(roster.id);
                                        
                                        const displayCompany = (
                                            roster.companyName || 
                                            worker?.companyName || 
                                            (isProvider ? (currentUser.companyName || currentUser.name) : null) || 
                                            'NÃO IDENTIFICADO'
                                        ).trim().toUpperCase();

                                        return (
                                            <tr key={roster.id} className={`transition-all group border-l-4 ${isSelected ? 'bg-blue-600/[0.03] border-l-blue-500' : isApproved ? 'bg-emerald-500/[0.01] border-l-emerald-500' : 'hover:bg-slate-800/20 border-l-transparent'}`}>
                                                <td className="p-8">
                                                    <button onClick={() => toggleRosterSelection(roster.id)} className="p-2 rounded-lg transition-colors">
                                                        {isSelected ? (
                                                            <CheckSquare size={20} className="text-blue-500" />
                                                        ) : (
                                                            <Square size={20} className="text-slate-700 group-hover:text-slate-500" />
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="p-8">
                                                    <div className="flex items-center gap-5">
                                                        <div className="relative shrink-0">
                                                            <img src={worker?.photoUrl || `https://ui-avatars.com/api/?name=${roster.workerName}&background=1e293b&color=475569`} className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-800 shadow-2xl" alt="" />
                                                            <div className={`absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full border-4 border-[#0d1117] shadow-lg ${isApproved ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-white block uppercase text-base tracking-tight leading-none mb-1.5">{roster.workerName}</span>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[11px] font-mono text-slate-500 font-bold tracking-[0.2em]">{worker?.cpf ? worker.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : '-'}</span>
                                                                {isApproved && <span className="text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded font-black uppercase tracking-tighter shadow-sm">LIBERADO</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-8">
                                                    <div className={`inline-flex items-center gap-3 px-4 py-2 border rounded-2xl text-[11px] font-black uppercase tracking-widest ${displayCompany === 'NÃO IDENTIFICADO' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse' : 'bg-blue-600/10 text-blue-500 border-blue-500/20'}`}>
                                                        <Building2 size={14} /> {displayCompany}
                                                    </div>
                                                </td>
                                                <td className="p-8"><div className="flex items-center gap-3 text-slate-400 font-black uppercase text-xs tracking-widest"><Warehouse size={16} className="text-slate-700" /> {roster.unit}</div></td>
                                                <td className="p-8"><button onClick={() => startDownloadProcess(roster.workerId)} className="flex items-center gap-3 text-slate-500 hover:text-amber-500 transition-all text-[11px] font-black uppercase tracking-[0.15em] group/btn"><div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 group-hover/btn:border-amber-500/50 transition-all shadow-inner"><Download size={18} /></div>BAIXAR DOCUMENTOS</button></td>
                                                <td className="p-8">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button onClick={() => setDeleteConfig({ id: roster.id, type: 'roster', name: roster.workerName })} className="p-3 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-600/20 rounded-2xl transition-all shadow-lg" title="Remover da escala"><Trash2 size={18} /></button>
                                                        {isApproved ? (
                                                            <div className="bg-emerald-500/10 border border-emerald-500/20 px-8 py-3 rounded-2xl text-[11px] font-black uppercase text-emerald-500 flex items-center gap-3 shadow-xl shadow-emerald-900/10 animate-fade-in"><CheckCircle2 size={18} className="text-emerald-400" /> LIBERADO PARA ACESSO</div>
                                                        ) : (
                                                            (isAdmin || isManager) ? (
                                                                <button onClick={() => handleApproveWorker(roster.workerId, roster.id)} disabled={actionLoading === roster.id} className="bg-[#10b981]/10 hover:bg-[#10b981] text-[#10b981] hover:text-white border border-[#10b981]/20 px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] transition-all active:scale-95 flex items-center gap-3 shadow-xl shadow-emerald-900/10 group/lib">{actionLoading === roster.id ? <LoaderIcon className="animate-spin" size={18} /> : <><CheckCircle2 size={18} className="group-hover:lib:scale-110 transition-transform" /> LIBERAR</>}</button>
                                                            ) : (
                                                                <div className="bg-amber-500/5 border border-amber-500/20 px-8 py-3 rounded-2xl text-[11px] font-black uppercase text-amber-500 flex items-center gap-3 italic tracking-widest opacity-70">AGUARDANDO AUDITORIA</div>
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

            {/* MODALS */}
            {showVerifyModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
                    <div className="bg-[#0f172a] border border-slate-700 rounded-[40px] p-12 shadow-2xl max-w-sm w-full relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
                        <div className="flex flex-col items-center text-center mb-10">
                            <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center border border-blue-600/20 mb-6 shadow-inner"><Lock className="text-blue-500" size={36} /></div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Verificar Identidade</h3>
                            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-3 leading-relaxed">{batchDownloadMode ? <>Confirme sua senha para baixar <br/><span className="text-emerald-500">{confirmedTodayFiltered.length} fotos de colaboradores</span></> : <>Digite sua senha para baixar o documento de <br/><span className="text-white">{targetWorker?.name}</span></>}</p>
                        </div>
                        <form onSubmit={handleVerifyAndAction} className="space-y-8">
                            <div className="relative group">
                                <Lock className={`absolute left-5 top-1/2 -translate-y-1/2 size={20} ${errorVerify ? 'text-rose-500' : 'text-slate-600 group-focus-within:text-blue-500'}`} />
                                <input autoFocus type={showPassword ? "text" : "password"} value={verifyPassword} onChange={e => setVerifyPassword(e.target.value)} className={`w-full bg-slate-950 border rounded-3xl pl-14 pr-14 py-5 text-white outline-none transition-all font-black tracking-[0.3em] text-center text-sm ${errorVerify ? 'border-rose-500' : 'border-slate-800 focus:border-blue-500'}`} placeholder="SENHA" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                            </div>
                            {errorVerify && <p className="text-rose-500 text-[11px] font-black uppercase text-center animate-pulse tracking-widest">{errorVerify}</p>}
                            <div className="flex gap-4"><button type="button" onClick={() => { setShowVerifyModal(false); setTargetWorker(null); setBatchDownloadMode(false); }} className="flex-1 py-5 bg-slate-800 text-white rounded-3xl font-black uppercase text-xs tracking-widest transition-all border border-slate-700">CANCELAR</button><button type="submit" disabled={verifying || !verifyPassword} className="flex-1 py-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-900/40 transition-all flex items-center justify-center gap-3">{verifying ? <LoaderIcon className="animate-spin" size={18} /> : <><Download size={18} /> CONFIRMAR</>}</button></div>
                        </form>
                    </div>
                </div>
            )}

            {deleteConfig && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-[40px] p-12 shadow-2xl max-sm w-full text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-600"></div>
                        <div className="w-24 h-24 bg-rose-600/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-rose-600/20 shadow-inner"><AlertTriangle className="text-rose-600" size={48} /></div>
                        <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter italic">Confirmar Exclusão?</h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed mb-10">Deseja realmente remover {Array.isArray(deleteConfig.id) ? deleteConfig.name : <>o registro de <span className="text-rose-500 font-black">{deleteConfig.name}</span></>}?</p>
                        <div className="flex gap-4"><button onClick={() => setDeleteConfig(null)} className="flex-1 py-5 bg-slate-800 text-white rounded-3xl font-black uppercase text-[11px] tracking-widest transition-all border border-slate-700">CANCELAR</button><button onClick={confirmDeleteAction} className="flex-1 py-5 bg-rose-600 text-white rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-rose-900/40 transition-all active:scale-95">SIM, EXCLUIR</button></div>
                    </div>
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in overflow-y-auto">
                    <div className="bg-[#0f172a] border border-slate-700 rounded-[40px] shadow-2xl w-full max-w-xl my-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
                        <div className="p-12">
                            <div className="flex justify-between items-start mb-10">
                                <div><h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">NOVO REGISTRO</h3><p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-3">EMPRESA: {currentUser.companyName || currentUser.name || 'N/A'}</p></div>
                                <button onClick={() => setShowAddModal(false)} className="p-3 bg-slate-800 hover:bg-rose-600 text-white rounded-full transition-all border border-slate-700 shadow-lg"><X size={24}/></button>
                            </div>
                            <form onSubmit={handleSaveWorker} className="space-y-8">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">FOTO PERFIL</label>
                                        <div className="aspect-square bg-slate-950 border-2 border-dashed border-slate-800 rounded-[40px] overflow-hidden flex items-center justify-center relative group shadow-inner">
                                            {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover p-3 rounded-[36px]" alt="" /> : <CameraIcon size={44} className="text-slate-800" />}
                                            <input 
                                              type="file" 
                                              accept="image/*" 
                                              className="hidden" 
                                              ref={photoInputRef}
                                              onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const r = new FileReader();
                                                    r.onload = ev => setPhotoPreview(ev.target?.result as string);
                                                    r.readAsDataURL(file);
                                                }
                                              }} 
                                            />
                                            <button type="button" onClick={() => photoInputRef.current?.click()} className="absolute bottom-5 right-5 p-4 bg-blue-600 text-white rounded-3xl shadow-2xl hover:scale-110 transition-transform"><CameraIcon size={20} /></button>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">DOCUMENTO (PDF/IMG)</label>
                                        <div className="aspect-square bg-slate-950 border-2 border-dashed border-slate-800 rounded-[40px] overflow-hidden flex items-center justify-center relative group shadow-inner">
                                            {documentData ? (
                                                <div className="p-6 text-center">
                                                    <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20"><File className="text-blue-500" size={32} /></div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-full px-4">{documentData.name}</p>
                                                </div>
                                            ) : <FileText size={44} className="text-slate-800" />}
                                            <input 
                                              type="file" 
                                              accept=".pdf,image/*" 
                                              className="hidden" 
                                              ref={docInputRef}
                                              onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const r = new FileReader();
                                                    r.onload = ev => setDocumentData({ url: ev.target?.result as string, name: file.name });
                                                    r.readAsDataURL(file);
                                                }
                                              }} 
                                            />
                                            <button type="button" onClick={() => docInputRef.current?.click()} className="absolute bottom-5 right-5 p-4 bg-emerald-600 text-white rounded-3xl shadow-2xl hover:scale-110 transition-transform"><Upload size={20} /></button>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">NOME COMPLETO</label>
                                        <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-3xl px-8 py-5 text-white font-black uppercase placeholder-slate-900 outline-none focus:border-blue-500 shadow-inner" placeholder="DIGITE O NOME..." />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">CPF (SÓ NÚMEROS)</label>
                                        <input required value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-950 border border-slate-800 rounded-3xl px-8 py-5 text-white font-mono placeholder-slate-900 outline-none focus:border-blue-500 shadow-inner" placeholder="000.000.000-00" maxLength={11} />
                                    </div>
                                </div>
                                <button type="submit" disabled={isSaving} className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-3xl uppercase tracking-[0.3em] text-xs shadow-2xl active:scale-[0.98] transition-all disabled:opacity-30">
                                    {isSaving ? <LoaderIcon className="animate-spin mx-auto" size={24} /> : 'CONCLUIR E ENVIAR'}
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
