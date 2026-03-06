
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, TeamWorker, AttendanceRoster } from '../types';
import { 
    Users, UserPlus, Calendar, ShieldCheck, FileText, Camera as CameraIcon, 
    Upload, X, CheckCircle2, AlertTriangle, Shield, Smartphone, 
    Lock, LayoutGrid, Warehouse, Building2, ChevronRight, Filter, Search, RotateCcw, Trash2, File, CheckSquare, Square, ClipboardCheck, Download, Eye, EyeOff, Loader2, Copy, ImageIcon, Check, Briefcase, Sparkles, Eraser, Image, Clock, Mail, ChevronDown, Info, FolderDown
} from 'lucide-react';
import { ref, push, onValue, set, remove, update, get, query, orderByChild, equalTo } from 'firebase/database';
import { auth, db } from '../services/firebase';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { WAREHOUSE_LIST } from '../constants';
import Legal from './Legal';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface RegistrationProps {
  currentUser: User;
}

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
    const [lgpdConsent, setLgpdConsent] = useState(false);
    const [showLegal, setShowLegal] = useState<any>(null);
    const [isPurging, setIsPurging] = useState(false);
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
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
    const [requestedDownloadType, setRequestedDownloadType] = useState<'photo' | 'document' | 'batch_photo' | 'batch_zip' | null>(null);
    const [errorVerify, setErrorVerify] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);
    const [copyEmailSuccess, setCopyEmailSuccess] = useState(false);
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

    const handlePurgeInvalidRecords = async () => {
        if (!window.confirm("ATENÇÃO: Esta ação irá excluir permanentemente do banco de dados todos os cadastros e escalas que estão sem empresa parceira identificada. Deseja continuar?")) {
            return;
        }

        setIsPurging(true);
        try {
            const updates: any = {};
            let count = 0;

            dailyRoster.forEach(r => {
                const name = (r.companyName || '').trim().toUpperCase();
                if (!name || name === 'NÃO IDENTIFICADO' || name === 'UNDEFINED') {
                    updates[`monitoramento/attendance_roster/${r.id}`] = null;
                    count++;
                }
            });

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
        if (!lgpdConsent) { alert("Você precisa aceitar os termos de uso de dados (LGPD) para prosseguir."); return; }
        
        const cleanCPF = formData.cpf.replace(/[^\d]+/g, '');
        if (!validateCPF(cleanCPF)) {
            alert("O CPF informado é inválido.");
            return;
        }
        
        setIsSaving(true);
        try {
            const workersQuery = query(ref(db, 'monitoramento/service_workers'), orderByChild('cpf'), equalTo(cleanCPF));
            const snapshot = await get(workersQuery);
            
            if (snapshot.exists()) {
                alert("ERRO: Este CPF já está cadastrado no sistema. Não é permitido duplicidade de colaboradores.");
                setIsSaving(false);
                return;
            }

            const finalCompanyName = (currentUser.companyName || currentUser.name || "PRESTADOR").trim().toUpperCase();
            
            const newWorkerRef = push(ref(db, 'monitoramento/service_workers'));
            await set(newWorkerRef, {
                name: formData.name.toUpperCase(),
                cpf: cleanCPF, 
                companyId: currentUser.uid,
                companyName: finalCompanyName,
                photoUrl: photoPreview,
                documentUrl: documentData.url,
                status: 'pending',
                lgpdAccepted: true,
                lgpdTimestamp: new Date().toISOString(),
                createdAt: new Date().toISOString()
            });
            setShowAddModal(false);
            setPhotoPreview(null);
            setDocumentData(null);
            setLgpdConsent(false);
            setFormData({ name: '', cpf: '' });
        } catch (e) { 
            alert("Erro ao salvar cadastro."); 
        } finally { 
            setIsSaving(false); 
        }
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
        
        const now = new Date().toISOString();
        const finalCompanyName = (currentUser.companyName || currentUser.name || "EMPRESA").trim().toUpperCase();

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
                companyName: finalCompanyName,
                unit: targetUnit,
                checkedIn: false,
                confirmedAt: now
            });
        });

        try {
            await Promise.all(promises);

            const usersSnap = await get(ref(db, 'users'));
            if (usersSnap.exists()) {
                const allUsers = usersSnap.val();
                const notifPromises: Promise<any>[] = [];
                
                Object.keys(allUsers).forEach(uid => {
                    const u = allUsers[uid];
                    const isAdminUser = u.role === 'admin';
                    const isManagerOfUnit = u.role === 'manager' && hasWarehousePermission(u.allowedWarehouses, targetUnit);

                    if (isAdminUser || isManagerOfUnit) {
                        const notifRef = push(ref(db, `notifications/${uid}`));
                        notifPromises.push(set(notifRef, {
                            recipientId: uid,
                            senderId: currentUser.uid,
                            senderName: finalCompanyName,
                            message: `Nova lista de escala enviada por ${finalCompanyName} (${targetUnit})`,
                            type: 'alert',
                            timestamp: now,
                            read: false,
                            linkTo: 'registration'
                        }));
                    }
                });
                await Promise.all(notifPromises);
            }

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

    const hasInvalidRecords = useMemo(() => {
        if (!isAdmin && !isManager) return false;
        return dailyRoster.some(r => !r.companyName || r.companyName.trim().toUpperCase() === 'NÃO IDENTIFICADO') ||
               workers.some(w => !w.companyName || w.companyName.trim().toUpperCase() === 'NÃO IDENTIFICADO');
    }, [dailyRoster, workers, isAdmin, isManager]);

    const inactiveWorkers = useMemo(() => {
        if (!isProvider) return [];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        return workers.filter(w => {
            const workerRosters = dailyRoster.filter(r => r.workerId === w.id);
            if (workerRosters.length === 0) {
                // If never rostered, check if created more than 30 days ago
                return w.createdAt && w.createdAt < thirtyDaysAgoStr;
            }
            // Find the most recent roster date
            const lastRosterDate = workerRosters.reduce((latest, r) => r.date > latest ? r.date : latest, '');
            return lastRosterDate < thirtyDaysAgoStr;
        });
    }, [workers, dailyRoster, isProvider]);

    const activeWorkers = useMemo(() => {
        if (!isProvider) return workers;
        const inactiveIds = new Set(inactiveWorkers.map(w => w.id));
        return workers.filter(w => !inactiveIds.has(w.id));
    }, [workers, inactiveWorkers, isProvider]);

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

    const handleCopyEmailTemplate = () => {
        if (confirmedTodayFiltered.length === 0) {
            alert("Nenhum colaborador escalado para copiar.");
            return;
        }

        const company = (currentUser.companyName || currentUser.name || 'EMPRESA').trim().toUpperCase();
        const formattedDate = selectedDate.split('-').reverse().join('/');

        const header = `Segue dados dos funcionários ${company} para liberação, com entrada no período diurno em ${formattedDate}:\n\n`;

        const list = confirmedTodayFiltered.map(roster => {
            const worker = workers.find(w => w.id === roster.workerId);
            const cpfFormatted = worker?.cpf ? worker.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : 'CPF NÃO LOCALIZADO';
            return `${roster.workerName} - ${cpfFormatted}`;
        }).join('\n');

        navigator.clipboard.writeText(header + list);
        setCopyEmailSuccess(true);
        setTimeout(() => setCopyEmailSuccess(false), 2000);
    };

    const startDownloadProcess = (workerId: string, type: 'photo' | 'document') => {
        const worker = workers.find(w => w.id === workerId);
        if (worker) {
            setTargetWorker(worker);
            setRequestedDownloadType(type);
            setShowVerifyModal(true);
            setVerifyPassword('');
            setErrorVerify('');
        }
    };

    const startBatchPhotoDownload = () => {
        if (confirmedTodayFiltered.length === 0) return;
        setRequestedDownloadType('batch_photo');
        setTargetWorker(null);
        setShowVerifyModal(true);
        setVerifyPassword('');
        setErrorVerify('');
    };

    const startBatchZipDownload = () => {
        if (confirmedTodayFiltered.length === 0) return;
        setRequestedDownloadType('batch_zip');
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
            
            if (requestedDownloadType === 'batch_photo') {
                setIsBatchProcessing(true);
                setShowVerifyModal(false);
                for (const roster of confirmedTodayFiltered) {
                    const worker = workers.find(w => w.id === roster.workerId);
                    if (worker?.photoUrl) {
                        await triggerFileDownload(worker.photoUrl, `FOTO_${worker.name.replace(/\s+/g, '_')}.jpg`);
                        await new Promise(r => setTimeout(r, 600)); 
                    }
                }
                setIsBatchProcessing(false);
            } else if (requestedDownloadType === 'batch_zip') {
                setIsBatchProcessing(true);
                setShowVerifyModal(false);
                
                const zip = new JSZip();
                const fotosFolder = zip.folder("fotos");
                const docsFolder = zip.folder("documentos");
                
                for (const roster of confirmedTodayFiltered) {
                    const worker = workers.find(w => w.id === roster.workerId);
                    if (worker) {
                        const safeName = worker.name.replace(/\s+/g, '_');
                        if (worker.photoUrl && fotosFolder) {
                            try {
                                const response = await fetch(worker.photoUrl);
                                const blob = await response.blob();
                                fotosFolder.file(`FOTO_${safeName}.jpg`, blob);
                            } catch (e) {
                                console.error("Erro ao baixar foto", e);
                            }
                        }
                        if (worker.documentUrl && docsFolder) {
                            try {
                                const response = await fetch(worker.documentUrl);
                                const blob = await response.blob();
                                let ext = 'pdf';
                                if (worker.documentUrl.includes('data:image/png')) ext = 'png';
                                else if (worker.documentUrl.includes('data:image/jpeg')) ext = 'jpg';
                                docsFolder.file(`DOC_${safeName}.${ext}`, blob);
                            } catch (e) {
                                console.error("Erro ao baixar documento", e);
                            }
                        }
                    }
                }
                
                const content = await zip.generateAsync({ type: "blob" });
                saveAs(content, `Arquivos_${selectedDate}.zip`);
                setIsBatchProcessing(false);
            } else if (targetWorker) {
                if (requestedDownloadType === 'photo') {
                    if (!targetWorker.photoUrl) throw new Error("Foto não encontrada.");
                    await triggerFileDownload(targetWorker.photoUrl, `FOTO_${targetWorker.name.replace(/\s+/g, '_')}.jpg`);
                } else if (requestedDownloadType === 'document') {
                    const fileUrl = targetWorker.documentUrl;
                    if (!fileUrl) throw new Error("Documento não encontrado.");
                    let ext = 'pdf';
                    if (fileUrl.includes('data:image/png')) ext = 'png';
                    else if (fileUrl.includes('data:image/jpeg')) ext = 'jpg';
                    await triggerFileDownload(fileUrl, `DOCUMENTO_${targetWorker.name.replace(/\s+/g, '_')}.${ext}`);
                }
                setShowVerifyModal(false);
            }
            setTargetWorker(null);
            setRequestedDownloadType(null);
        } catch (err: any) { 
            setErrorVerify("Senha incorreta."); 
        } finally { 
            setVerifying(false); 
        }
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
        <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-6 animate-fade-in pb-20 px-2 sm:px-0">
            {showLegal && <Legal type={showLegal} onClose={() => setShowLegal(null)} />}
            
            <div className="bg-[#1a1f2e] border border-slate-800 rounded-[20px] md:rounded-[28px] p-5 md:p-10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
                <div className="flex items-center gap-4 md:gap-8 z-10 w-full md:w-auto">
                    <div className="p-3 md:p-6 bg-slate-900 border border-slate-700 rounded-2xl md:rounded-3xl shadow-inner shrink-0">
                        <Shield className="text-amber-500 fill-amber-500/10 w-8 h-8 md:w-11 md:h-11" strokeWidth={1.2} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-xl md:text-4xl font-black text-white uppercase tracking-tighter italic leading-none mb-1 md:mb-3">CONTROLE DE ACESSO</h2>
                        <div className="flex items-center gap-2 text-slate-500 text-[10px] md:text-sm font-bold uppercase tracking-widest truncate">
                             <Briefcase size={12} className="text-slate-600 shrink-0" /> 
                             <span className="truncate">EMPRESA: <span className="text-slate-300">{isProvider ? (currentUser.companyName || currentUser.name || 'N/A') : 'CCOS MASTER'}</span></span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 z-10 w-full md:w-auto">
                    {isProvider && (
                        <div className="grid grid-cols-1 sm:flex gap-2">
                            <button onClick={() => setActiveTab(activeTab === 'team' ? 'roster' : 'team')} className="px-4 md:px-8 py-3 md:py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest transition-all border border-slate-700">
                                {activeTab === 'team' ? 'VER ESCALA DIÁRIA' : 'MINHA EQUIPE'}
                            </button>
                            <button onClick={() => setShowAddModal(true)} className="px-4 md:px-8 py-3 md:py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest transition-all shadow-xl shadow-blue-900/40 flex items-center justify-center gap-2">
                                <UserPlus size={16} /> NOVO CADASTRO
                            </button>
                        </div>
                    )}
                    {hasInvalidRecords && (
                        <button 
                            onClick={handlePurgeInvalidRecords}
                            disabled={isPurging}
                            className="px-4 py-3 md:py-4 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-xl md:rounded-2xl font-black uppercase text-[9px] md:text-[10px] tracking-widest transition-all border border-rose-600/30 flex items-center justify-center gap-2"
                        >
                            {isPurging ? <Loader2 className="animate-spin" size={14} /> : <Eraser size={14} />}
                            LIMPAR DADOS INVÁLIDOS
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'team' && isProvider ? (
                <div className="space-y-4 md:space-y-6 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-[20px] md:rounded-[32px] p-5 md:p-8 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8">
                        <div className="flex items-center gap-4 md:gap-5 w-full md:w-auto">
                            <div className="p-3 md:p-4 bg-blue-500/10 rounded-xl md:rounded-2xl text-blue-500 border border-blue-500/20">
                                <Users size={24} className="md:w-7 md:h-7" />
                            </div>
                            <div>
                                <h3 className="text-white font-black uppercase text-sm md:text-base tracking-widest">MINHA EQUIPE</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-0.5">{selectedWorkerIds.size} SELECIONADOS</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                            <div className="relative w-full sm:w-64">
                                <select 
                                    value={targetUnit}
                                    onChange={(e) => setTargetUnit(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl md:rounded-2xl px-5 py-3 md:py-4 text-[10px] md:text-xs text-white font-bold uppercase outline-none focus:border-blue-500 appearance-none cursor-pointer"
                                >
                                    {WAREHOUSE_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                                <Warehouse className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={16} />
                            </div>
                            <button 
                                onClick={handleBatchAddToRoster}
                                disabled={selectedWorkerIds.size === 0}
                                className="px-6 md:px-10 py-3 md:py-4 bg-[#10b981] hover:bg-[#059669] disabled:opacity-30 disabled:grayscale text-white font-black rounded-xl md:rounded-2xl uppercase text-[10px] md:text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/30"
                            >
                                <ClipboardCheck size={18} /> CONFIRMAR ESCALA
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                        {inactiveWorkers.length > 0 && (
                            <div className="col-span-full mb-4">
                                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-start gap-4">
                                    <div className="p-2 bg-rose-500/20 rounded-xl">
                                        <AlertTriangle className="text-rose-500 w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-rose-500 font-black uppercase text-sm tracking-widest mb-1">Atenção: Cadastros Inativos</h4>
                                        <p className="text-slate-400 text-xs leading-relaxed">
                                            Os funcionários abaixo não são escalados há mais de 30 dias. Recomendamos a exclusão destes cadastros para manter sua lista atualizada e organizada.
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 mt-4">
                                    {inactiveWorkers.map(w => {
                                        const isSelected = selectedWorkerIds.has(w.id);
                                        return (
                                            <div key={w.id} onClick={() => toggleWorkerSelection(w.id)} className={`relative cursor-pointer bg-slate-950 border rounded-[20px] md:rounded-[32px] p-4 md:p-6 transition-all group overflow-hidden ${isSelected ? 'border-rose-500 bg-rose-500/5 shadow-2xl shadow-rose-900/20' : 'border-rose-500/30 hover:border-rose-500/50'}`}>
                                                <div className="absolute top-0 right-0 bg-rose-500 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">Inativo &gt; 30 dias</div>
                                                <div className="flex items-center gap-4 md:gap-5 relative z-10 mt-2">
                                                    <div className="relative shrink-0">
                                                        <img src={w.photoUrl} className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[20px] object-cover border-2 border-slate-800" />
                                                        <div className={`absolute -top-1.5 -left-1.5 p-1 rounded-lg border shadow-lg transition-all ${isSelected ? 'bg-rose-600 border-rose-400 scale-110' : 'bg-slate-800 border-slate-700'}`}>
                                                            {isSelected ? <CheckSquare size={14} className="text-white" /> : <Square size={14} className="text-slate-600" />}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-white font-black uppercase text-[11px] md:text-sm tracking-widest truncate">{w.name}</h4>
                                                        <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5 md:mt-1 truncate">CPF: {w.cpf}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        
                        {activeWorkers.map(w => {
                            const isSelected = selectedWorkerIds.has(w.id);
                            return (
                                <div key={w.id} onClick={() => toggleWorkerSelection(w.id)} className={`relative cursor-pointer bg-slate-950 border rounded-[20px] md:rounded-[32px] p-4 md:p-6 transition-all group overflow-hidden ${isSelected ? 'border-blue-500 bg-blue-500/5 shadow-2xl shadow-blue-900/20' : 'border-slate-800 hover:border-slate-700'}`}>
                                    <div className="flex items-center gap-4 md:gap-5 relative z-10">
                                        <div className="relative shrink-0">
                                            <img src={w.photoUrl} className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[20px] object-cover border-2 border-slate-800" />
                                            <div className={`absolute -top-1.5 -left-1.5 p-1 rounded-lg border shadow-lg transition-all ${isSelected ? 'bg-blue-600 border-blue-400 scale-110' : 'bg-slate-800 border-slate-700'}`}>
                                                {isSelected ? <CheckSquare size={14} className="text-white" /> : <Square size={14} className="text-slate-600" />}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-black uppercase text-[11px] md:text-xs truncate leading-tight tracking-tight">{w.name}</p>
                                            <div className="flex flex-col gap-1 mt-1.5">
                                                <p className="text-[9px] text-slate-600 font-mono font-bold tracking-widest">{w.cpf}</p>
                                                <div className={`inline-block w-fit px-2 py-0.5 rounded text-[7px] md:text-[8px] font-black uppercase border tracking-widest ${w.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                                    {w.status === 'approved' ? 'CADASTRADO' : 'PENDENTE'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); startDownloadProcess(w.id, 'document'); }} className="p-1.5 text-slate-500 hover:text-blue-500 transition-all"><Download size={16} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfig({ id: w.id, type: 'worker', name: w.name }); }} className="p-1.5 text-slate-500 hover:text-rose-500 transition-all"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <>
                    <div className="bg-slate-900 border border-slate-800 rounded-[20px] md:rounded-[28px] p-4 md:p-6 shadow-xl flex flex-col lg:flex-row items-center gap-4 md:gap-8 animate-fade-in">
                        <div className="bg-slate-950 p-1.5 md:p-2 rounded-xl md:rounded-2xl border border-slate-800 flex items-center gap-3 md:gap-5 flex-1 w-full lg:w-auto pr-4 md:pr-8">
                            <div className="p-3 md:p-4 bg-amber-500/10 rounded-lg md:rounded-xl text-amber-500 shrink-0">
                                <Calendar size={20} className="md:w-7 md:h-7" />
                            </div>
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent border-none text-white font-black text-sm md:text-base uppercase outline-none flex-1 [color-scheme:dark] cursor-pointer" 
                            />
                        </div>
                        <div className="flex items-center justify-around md:justify-end gap-6 md:gap-16 px-2 md:px-6 w-full lg:w-auto">
                            <div className="text-center md:text-right">
                                <span className="block text-[8px] md:text-[11px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1 md:mb-2">ESCALADOS</span>
                                <span className="block text-3xl md:text-5xl font-black text-amber-500 tabular-nums leading-none">{confirmedTodayRaw.length}</span>
                            </div>
                            <div className="h-8 md:h-12 w-px bg-slate-800"></div>
                            {!isProvider && !isManager && (
                                <div className="text-center md:text-right">
                                    <span className="block text-[8px] md:text-[11px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1 md:mb-2">EMPRESAS</span>
                                    <span className="block text-3xl md:text-5xl font-black text-blue-500 tabular-nums leading-none">{companyStats.length}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {!isProvider && companyStats.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                            <div className="flex items-center bg-[#0d1117] p-1 rounded-xl border border-slate-800 shadow-inner min-w-max">
                                <button 
                                    onClick={() => setSelectedCompanyFilter('TODOS')}
                                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] transition-all flex items-center gap-1.5
                                        ${selectedCompanyFilter === 'TODOS' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent'}
                                    `}
                                >
                                    <LayoutGrid size={12} /> TODOS
                                </button>
                                {companyStats.map(item => (
                                    <button 
                                        key={item.name}
                                        onClick={() => setSelectedCompanyFilter(item.name)}
                                        className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] transition-all flex items-center gap-1.5 whitespace-nowrap border
                                            ${selectedCompanyFilter === item.name 
                                                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40' 
                                                : 'text-slate-500 hover:text-slate-300 border-transparent'}
                                        `}
                                    >
                                        {item.name} <span className="opacity-50 text-[8px] font-mono">({item.count})</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-900 border border-slate-800 rounded-[20px] md:rounded-[32px] shadow-2xl overflow-hidden min-h-[400px]">
                        <div className="p-3 md:p-6 border-b border-slate-800/40 bg-slate-950/20 flex flex-col sm:flex-row justify-end gap-2 md:gap-4">
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                {selectedRosterIds.size > 0 && (
                                    <button onClick={handleBatchDeleteRoster} className="flex-1 sm:flex-none bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg">
                                        <Trash2 size={14} /> APAGAR ({selectedRosterIds.size})
                                    </button>
                                )}
                                
                                {isProvider && (
                                    <button 
                                        onClick={handleCopyEmailTemplate} 
                                        className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border shadow-lg ${copyEmailSuccess ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-emerald-500 hover:text-white'}`}
                                    >
                                        {copyEmailSuccess ? <CheckCircle2 size={14} /> : <Mail size={14} />}
                                        E-MAIL
                                    </button>
                                )}
                                {isProvider && (
                                    <button 
                                        onClick={startBatchZipDownload} 
                                        disabled={isBatchProcessing || confirmedTodayFiltered.length === 0}
                                        className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl border
                                            ${isBatchProcessing ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/40 opacity-70 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500'}
                                        `}
                                    >
                                        {isBatchProcessing ? <Loader2 className="animate-spin" size={14} /> : <FolderDown size={14} />}
                                        BAIXAR TUDO
                                    </button>
                                )}
                                <button 
                                    onClick={startBatchPhotoDownload} 
                                    disabled={isBatchProcessing || confirmedTodayFiltered.length === 0}
                                    className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl border
                                        ${isBatchProcessing ? 'bg-amber-600/20 text-amber-500 border-amber-500/40 opacity-70 cursor-not-allowed' : 'bg-[#eab308] hover:bg-[#ca8a04] text-slate-950 border-[#ca8a04]'}
                                    `}
                                >
                                    {isBatchProcessing ? <Loader2 className="animate-spin" size={14} /> : <ImageIcon size={14} />}
                                    FOTOS
                                </button>
                                <button onClick={handleCopyAllVisible} className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border shadow-lg ${copySuccess ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white'}`}>{copySuccess ? <CheckCircle2 size={14} /> : <Copy size={14} />} {copySuccess ? 'COPIADO!' : 'LISTA'}</button>
                            </div>
                        </div>

                        <div className="md:hidden p-4 space-y-4">
                            {confirmedTodayFiltered.length === 0 ? (
                                <div className="p-20 text-center text-slate-600 font-bold uppercase tracking-widest text-[10px]">Vazio</div>
                            ) : confirmedTodayFiltered.map(roster => {
                                const worker = workers.find(w => w.id === roster.workerId);
                                const isApproved = worker?.status === 'approved';
                                const isSelected = selectedRosterIds.has(roster.id);
                                
                                return (
                                    <div key={roster.id} className={`bg-slate-950/50 border rounded-2xl p-4 transition-all relative overflow-hidden ${isSelected ? 'border-blue-500 bg-blue-500/5' : isApproved ? 'border-emerald-500/20' : 'border-slate-800'}`}>
                                        <div className="flex items-start gap-4">
                                            <div className="relative shrink-0" onClick={() => toggleRosterSelection(roster.id)}>
                                                <img src={worker?.photoUrl || `https://ui-avatars.com/api/?name=${roster.workerName}&background=1e293b&color=475569`} className="w-16 h-16 rounded-xl object-cover border border-slate-800" />
                                                <div className={`absolute -top-2 -left-2 p-1.5 rounded-lg border shadow-lg ${isSelected ? 'bg-blue-600 border-blue-400' : 'bg-slate-800 border-slate-700'}`}>
                                                    {isSelected ? <CheckSquare size={14} className="text-white" /> : <Square size={14} className="text-slate-600" />}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-black text-white block uppercase text-[11px] tracking-tight truncate pr-2">{roster.workerName}</span>
                                                    <span className={`shrink-0 px-2 py-0.5 rounded text-[7px] font-black uppercase border tracking-tighter ${isApproved ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                                        {isApproved ? 'LIBERADO' : 'AGUARDANDO'}
                                                    </span>
                                                </div>
                                                <p className="text-[9px] font-mono text-slate-500 font-bold tracking-widest mt-1">{worker?.cpf ? worker.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : '-'}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <div className="flex items-center gap-1 text-[8px] font-black text-blue-500 uppercase bg-blue-500/5 border border-blue-500/10 px-2 py-0.5 rounded">
                                                        <Building2 size={10} /> {roster.companyName}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[8px] font-black text-slate-500 uppercase bg-slate-800/50 border border-slate-800 px-2 py-0.5 rounded">
                                                        <Warehouse size={10} /> {roster.unit}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/50">
                                            <button onClick={() => startDownloadProcess(roster.workerId, 'photo')} className="flex items-center justify-center gap-2 py-2 bg-slate-900 border border-slate-800 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest active:bg-slate-800">
                                                <Image size={12} /> FOTO
                                            </button>
                                            <button onClick={() => startDownloadProcess(roster.workerId, 'document')} className="flex items-center justify-center gap-2 py-2 bg-slate-900 border border-slate-800 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest active:bg-slate-800">
                                                <Download size={12} /> DOCS
                                            </button>
                                        </div>

                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => setDeleteConfig({ id: roster.id, type: 'roster', name: roster.workerName })} className="p-2.5 bg-rose-600/10 text-rose-500 border border-rose-600/20 rounded-lg active:bg-rose-600 active:text-white transition-all">
                                                <Trash2 size={14} />
                                            </button>
                                            {!isApproved && (isAdmin || isManager) ? (
                                                <button onClick={() => handleApproveWorker(roster.workerId, roster.id)} disabled={actionLoading === roster.id} className="flex-1 bg-emerald-600 text-white font-black rounded-lg text-[9px] uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-2">
                                                    {actionLoading === roster.id ? <Loader2 className="animate-spin" size={14} /> : <><CheckCircle2 size={14} /> LIBERAR ACESSO</>}
                                                </button>
                                            ) : isApproved && (
                                                <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-black text-[9px] uppercase flex items-center justify-center gap-2 rounded-lg">
                                                    <CheckCircle2 size={12} /> CADASTRADO
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="hidden md:block overflow-x-auto custom-scrollbar">
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
                                        <th className="p-8">IDENTIFICAÇÃO</th>
                                        <th className="p-8">EMPRESA</th>
                                        <th className="p-8">UNIDADE</th>
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
                                                                {isApproved && <span className="text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded font-black uppercase tracking-tighter shadow-sm">CADASTRADO</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-8">
                                                    <div className={`inline-flex items-center gap-3 px-4 py-2 border rounded-2xl text-[11px] font-black uppercase tracking-widest bg-blue-600/10 text-blue-500 border-blue-500/20`}>
                                                        <Building2 size={14} /> {roster.companyName}
                                                    </div>
                                                </td>
                                                <td className="p-8"><div className="flex items-center gap-3 text-slate-400 font-black uppercase text-xs tracking-widest"><Warehouse size={16} className="text-slate-700" /> {roster.unit}</div></td>
                                                <td className="p-8">
                                                    <div className="flex flex-col gap-3">
                                                        {roster.confirmedAt && (
                                                            <div className="flex items-center gap-2 text-slate-500 bg-slate-950/50 p-2 rounded-xl border border-slate-800/50 w-fit mb-1">
                                                                <Clock size={12} className="text-amber-500" />
                                                                <span className="text-[10px] font-mono font-bold uppercase tracking-tighter">
                                                                    {new Date(roster.confirmedAt).toLocaleDateString('pt-BR')} {new Date(roster.confirmedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col gap-2">
                                                            <button onClick={() => startDownloadProcess(roster.workerId, 'photo')} className="flex items-center gap-3 text-slate-500 hover:text-amber-500 transition-all text-[10px] font-black uppercase tracking-[0.1em] group/btn">
                                                                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 group-hover/btn:border-amber-500/50 transition-all shadow-inner"><Image size={14} /></div>
                                                                Baixar Foto
                                                            </button>
                                                            <button onClick={() => startDownloadProcess(roster.workerId, 'document')} className="flex items-center gap-3 text-slate-500 hover:text-amber-500 transition-all text-[10px] font-black uppercase tracking-[0.1em] group/btn">
                                                                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 group-hover/btn:border-amber-500/50 transition-all shadow-inner"><Download size={14} /></div>
                                                                Documentos
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-8">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button onClick={() => setDeleteConfig({ id: roster.id, type: 'roster', name: roster.workerName })} className="p-3 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-600/20 rounded-2xl transition-all shadow-lg" title="Remover da escala"><Trash2 size={18} /></button>
                                                        {isApproved ? (
                                                            <div className="bg-emerald-500/10 border border-emerald-500/20 px-8 py-3 rounded-2xl text-[11px] font-black uppercase text-emerald-500 flex items-center gap-3 shadow-xl shadow-emerald-900/10 animate-fade-in"><CheckCircle2 size={18} className="text-emerald-400" /> LIBERADO PARA ACESSO</div>
                                                        ) : (
                                                            (isAdmin || isManager) ? (
                                                                <button onClick={() => handleApproveWorker(roster.workerId, roster.id)} disabled={actionLoading === roster.id} className="bg-[#10b981]/10 hover:bg-[#10b981] text-[#10b981] hover:text-white border border-[#10b981]/20 px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] transition-all active:scale-95 flex items-center gap-3 shadow-xl shadow-emerald-900/10 group/lib">{actionLoading === roster.id ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle2 size={18} className="group-hover:lib:scale-110 transition-transform" /> LIBERAR</>}</button>
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

            {showVerifyModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
                    <div className="bg-[#0f172a] border border-slate-700 rounded-[32px] md:rounded-[40px] p-8 md:p-12 shadow-2xl max-w-sm w-full relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
                        <div className="flex flex-col items-center text-center mb-8 md:mb-10">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-600/10 rounded-full flex items-center justify-center border border-blue-600/20 mb-6 shadow-inner"><Lock className="text-blue-500" size={32} /></div>
                            <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter italic">Verificar Identidade</h3>
                            <p className="text-slate-400 text-[10px] md:text-[11px] font-bold uppercase tracking-widest mt-3 leading-relaxed">
                                {requestedDownloadType === 'batch_photo' ? 
                                    <>Confirme sua senha para baixar <br/><span className="text-emerald-500">{confirmedTodayFiltered.length} fotos</span></> : 
                                 requestedDownloadType === 'batch_zip' ?
                                    <>Confirme sua senha para baixar <br/><span className="text-indigo-500">{confirmedTodayFiltered.length} cadastros completos</span></> :
                                    <>Digite sua senha para baixar o arquivo de <br/><span className="text-white">{targetWorker?.name}</span></>}
                            </p>
                        </div>
                        <form onSubmit={handleVerifyAndAction} className="space-y-6 md:space-y-8">
                            <div className="relative group">
                                <Lock className={`absolute left-5 top-1/2 -translate-y-1/2 size={18} ${errorVerify ? 'text-rose-500' : 'text-slate-600 group-focus-within:text-blue-500'}`} />
                                <input autoFocus type={showPassword ? "text" : "password"} value={verifyPassword} onChange={e => setVerifyPassword(e.target.value)} className={`w-full bg-slate-950 border rounded-2xl md:rounded-3xl pl-12 md:pl-14 pr-12 md:pr-14 py-4 md:py-5 text-white outline-none transition-all font-black tracking-[0.3em] text-center text-sm ${errorVerify ? 'border-rose-500' : 'border-slate-800 focus:border-blue-500'}`} placeholder="SENHA" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                            </div>
                            {errorVerify && <p className="text-rose-500 text-[10px] font-black uppercase text-center animate-pulse tracking-widest">{errorVerify}</p>}
                            <div className="flex gap-3"><button type="button" onClick={() => { setShowVerifyModal(false); setTargetWorker(null); setRequestedDownloadType(null); }} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border border-slate-700">VOLTAR</button><button type="submit" disabled={verifying || !verifyPassword} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-blue-900/40 transition-all flex items-center justify-center gap-2">{verifying ? <Loader2 className="animate-spin" size={16} /> : <><Download size={16} /> CONFIRMAR</>}</button></div>
                        </form>
                    </div>
                </div>
            )}

            {deleteConfig && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-[32px] p-8 md:p-12 shadow-2xl max-sm w-full text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-600"></div>
                        <div className="w-20 h-20 bg-rose-600/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-600/20 shadow-inner"><AlertTriangle className="text-rose-600" size={40} /></div>
                        <h3 className="text-xl md:text-2xl font-black text-white mb-2 uppercase tracking-tighter italic">Confirmar Exclusão?</h3>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed mb-8 md:mb-10">Deseja realmente remover {Array.isArray(deleteConfig.id) ? deleteConfig.name : <>o registro de <span className="text-rose-500 font-black">{deleteConfig.name}</span></>}?</p>
                        <div className="flex gap-3 md:gap-4"><button onClick={() => setDeleteConfig(null)} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl md:rounded-3xl font-black uppercase text-[10px] tracking-widest transition-all border border-slate-700">CANCELAR</button><button onClick={confirmDeleteAction} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl md:rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-rose-900/40 transition-all active:scale-95">SIM, EXCLUIR</button></div>
                    </div>
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in overflow-y-auto">
                    <div className="bg-[#0f172a] border border-slate-700 rounded-[32px] md:rounded-[40px] shadow-2xl w-full max-w-xl my-4 md:my-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
                        <div className="p-6 md:p-12">
                            <div className="flex justify-between items-start mb-6 md:mb-10">
                                <div><h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter italic">NOVO REGISTRO</h3><p className="text-slate-500 text-[9px] md:text-[11px] font-bold uppercase tracking-widest mt-2 md:mt-3">EMPRESA: {currentUser.companyName || currentUser.name || 'N/A'}</p></div>
                                <button onClick={() => setShowAddModal(false)} className="p-2.5 bg-slate-800 hover:bg-rose-600 text-white rounded-full transition-all border border-slate-700 shadow-lg"><X size={20}/></button>
                            </div>
                            <form onSubmit={handleSaveWorker} className="space-y-6 md:space-y-8">
                                <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">FOTO PERFIL</label>
                                        <div className="aspect-square bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl md:rounded-[40px] overflow-hidden flex items-center justify-center relative group shadow-inner">
                                            {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover p-2 md:p-3 rounded-[24px] md:rounded-[36px]" alt="" /> : <CameraIcon size={32} className="text-slate-800" />}
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
                                            <button type="button" onClick={() => photoInputRef.current?.click()} className="absolute bottom-3 right-3 p-3 bg-blue-600 text-white rounded-xl md:rounded-2xl shadow-2xl hover:scale-110 transition-transform"><CameraIcon size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">DOCUMENTO</label>
                                        <div className="aspect-square bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl md:rounded-[40px] overflow-hidden flex items-center justify-center relative group shadow-inner">
                                            {documentData ? (
                                                <div className="p-3 text-center">
                                                    <div className="w-10 h-10 md:w-16 md:h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-blue-500/20"><File className="text-blue-500" size={24} /></div>
                                                    <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase truncate max-w-full px-2">{documentData.name}</p>
                                                </div>
                                            ) : <FileText size={32} className="text-slate-800" />}
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
                                            <button type="button" onClick={() => docInputRef.current?.click()} className="absolute bottom-3 right-3 p-3 bg-emerald-600 text-white rounded-xl md:rounded-2xl shadow-2xl hover:scale-110 transition-transform"><Upload size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">NOME COMPLETO</label>
                                        <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl md:rounded-2xl px-6 py-4 md:py-5 text-white font-black uppercase text-xs md:text-sm placeholder-slate-900 outline-none focus:border-blue-500 shadow-inner" placeholder="DIGITE O NOME..." />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">CPF (SÓ NÚMEROS)</label>
                                        <input required value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-950 border border-slate-800 rounded-xl md:rounded-2xl px-6 py-4 md:py-5 text-white font-mono text-xs md:text-sm placeholder-slate-900 outline-none focus:border-blue-500 shadow-inner" placeholder="000.000.000-00" maxLength={11} />
                                    </div>
                                    <div className="pt-2">
                                        <label className="flex items-start gap-3 cursor-pointer group bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-blue-500/50 transition-all">
                                            <input type="checkbox" checked={lgpdConsent} onChange={e => setLgpdConsent(e.target.checked)} className="mt-1 w-5 h-5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 focus:ring-offset-0" />
                                            <span className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                                Eu aceito os <button type="button" onClick={() => setShowLegal('terms')} className="text-blue-500 hover:underline">Termos de Uso</button> e a <button type="button" onClick={() => setShowLegal('privacy')} className="text-blue-500 hover:underline">Política de Privacidade</button>. Estou ciente de que meus dados biométricos e documentos serão tratados conforme a LGPD para fins de segurança.
                                            </span>
                                        </label>
                                    </div>
                                </div>
                                <button type="submit" disabled={isSaving} className="w-full py-5 md:py-6 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl md:rounded-3xl uppercase tracking-[0.3em] text-[10px] md:text-xs shadow-2xl active:scale-[0.98] transition-all disabled:opacity-30">
                                    {isSaving ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'CONCLUIR E ENVIAR'}
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
