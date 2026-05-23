import React, { useState, useEffect } from 'react';
import { User, ThirdPartyRequest, TeamWorker } from '../types';
import { db } from '../services/firebase';
import { ref, onValue, push, set, update, serverTimestamp } from 'firebase/database';
import { Plus, Users, CalendarDays, Search, Building2, UserCircle, Phone, CheckCircle2, Clock, XCircle, FileText, DollarSign, Loader2 } from 'lucide-react';

// Common warehouses
const WAREHOUSE_LIST = ['G1', 'G2', 'G3/G4', 'G5', 'G6/G8', 'G7'];

interface Props {
    currentUser: User;
}

const ThirdPartyRequests: React.FC<Props> = ({ currentUser }) => {
    const [requests, setRequests] = useState<ThirdPartyRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    
    // Providers data
    const [providerCompanies, setProviderCompanies] = useState<string[]>([]);
    const [providerWorkers, setProviderWorkers] = useState<TeamWorker[]>([]);
    const [workersLoading, setWorkersLoading] = useState(false);
    
    // Form state
    const [supplierId, setSupplierId] = useState('');
    const [requestType, setRequestType] = useState<'quantity' | 'person'>('quantity');
    const [quantity, setQuantity] = useState<number | ''>('');
    const [selectedWorkers, setSelectedWorkers] = useState<TeamWorker[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [warehouse, setWarehouse] = useState('');
    const [requesterName, setRequesterName] = useState(currentUser.name || '');
    const [contactPhone, setContactPhone] = useState('');
    
    // For Provider
    const [evaluationCost, setEvaluationCost] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<ThirdPartyRequest | null>(null);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [confirmName, setConfirmName] = useState('');

    const isProvider = currentUser.role === 'provider';
    const providerCompany = (() => {
        if (!isProvider) return '';
        if (currentUser.email) return currentUser.email.split('@')[0].split('.')[0].toUpperCase();
        if (currentUser.companyName) return currentUser.companyName.toUpperCase();
        return '';
    })();

    const [activeTab, setActiveTab] = useState<'ativos' | 'historico'>('ativos');

    useEffect(() => {
        // Load requests
        const reqRef = ref(db, 'thirdPartySupplyRequests');
        const unsub = onValue(reqRef, (snap) => {
            const val = snap.val();
            if (val) {
                const list = Object.keys(val).map(key => ({
                    id: key,
                    ...val[key]
                })) as ThirdPartyRequest[];
                setRequests(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            } else {
                setRequests([]);
            }
            setLoading(false);
        });

        // Load providers
        const usersRef = ref(db, 'users');
        const unsubUsers = onValue(usersRef, (snap) => {
            const val = snap.val();
            if (val) {
                const companies = new Set<string>();
                Object.values(val).forEach((u: any) => {
                    if (u.role === 'provider') {
                        if (u.email) {
                            companies.add(u.email.split('@')[0].split('.')[0].toUpperCase());
                        } else if (u.companyName) {
                            companies.add(u.companyName.toUpperCase());
                        }
                    }
                });
                setProviderCompanies(Array.from(companies).sort());
            }
        });

        return () => {
            unsub();
            unsubUsers();
        };
    }, []);

    // Load workers when supplier changes and type is person
    useEffect(() => {
        if (requestType === 'person' && supplierId) {
            setWorkersLoading(true);
            const workersRef = ref(db, 'monitoramento/service_workers');
            const unsubWorkers = onValue(workersRef, (snap) => {
                const val = snap.val();
                if (val) {
                    const workersList = Object.keys(val).map(key => ({
                        id: key,
                        ...val[key]
                    })) as TeamWorker[];
                    
                    const filtered = workersList.filter(w => 
                        (w.companyName || w.companyId || '').toUpperCase() === supplierId.toUpperCase()
                    );
                    setProviderWorkers(filtered.sort((a, b) => a.name.localeCompare(b.name)));
                } else {
                    setProviderWorkers([]);
                }
                setWorkersLoading(false);
            });
            return () => unsubWorkers();
        } else {
            setProviderWorkers([]);
            setSelectedWorkers([]);
        }
    }, [supplierId, requestType]);

    const myRequests = isProvider 
        ? requests.filter(r => r.supplierId.toUpperCase() === providerCompany || !providerCompany) 
        : requests;

    const activeRequests = myRequests.filter(r => ['pending', 'evaluated'].includes(r.status));
    const historyRequests = myRequests.filter(r => ['confirmed', 'rejected', 'completed'].includes(r.status));
    
    const displayRequests = activeTab === 'ativos' ? activeRequests : historyRequests;

    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierId || !startDate || !endDate || !warehouse || !requesterName || !contactPhone) return;

        const newReq: any = {
            supplierId: supplierId.toUpperCase(),
            requestType,
            startDate,
            endDate,
            warehouse,
            requesterName,
            contactPhone,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        if (requestType === 'quantity') {
            newReq.quantity = Number(quantity);
        } else {
            if (selectedWorkers.length === 0) return alert("Selecione pelo menos um colaborador.");
            newReq.names = selectedWorkers.map(w => w.name);
        }

        const reqRef = ref(db, 'thirdPartySupplyRequests');
        const newRef = push(reqRef);
        await set(newRef, newReq);
        setShowNewModal(false);
        resetForm();
    };

    const resetForm = () => {
        setSupplierId('');
        setRequestType('quantity');
        setQuantity('');
        setSelectedWorkers([]);
        setStartDate('');
        setEndDate('');
        setWarehouse('');
        setContactPhone('');
        setEvaluationCost('');
    };

    const toggleWorker = (worker: TeamWorker) => {
        if (selectedWorkers.find(w => w.id === worker.id)) {
            setSelectedWorkers(selectedWorkers.filter(w => w.id !== worker.id));
        } else {
            setSelectedWorkers([...selectedWorkers, worker]);
        }
    };

    const handleEvaluate = async (req: ThirdPartyRequest) => {
        if (!evaluationCost) return;
        const reqRef = ref(db, `thirdPartySupplyRequests/${req.id}`);
        await update(reqRef, {
            status: 'evaluated',
            cost: Number(evaluationCost),
            evaluatedAt: new Date().toISOString()
        });
        
        // Simular envio de WhatsApp
        const text = `Sua solicitação de diaristas (${req.warehouse}) foi avaliada em R$ ${evaluationCost}. Por favor, confirme no sistema.`;
        const phone = req.contactPhone.replace(/\D/g, '');
        window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(text)}`, '_blank');
        
        // Criar notificação no sistema para os admins
        const notifRef = push(ref(db, 'notifications_all'));
        await set(notifRef, {
            recipientId: 'admin_group', // Padrão simplista
            message: `O fornecedor ${req.supplierId} avaliou a solicitação de ${req.warehouse} em R$ ${evaluationCost}. Aguardando sua confirmação.`,
            type: 'alert',
            timestamp: new Date().toISOString(),
            read: false,
            linkTo: 'requests'
        });

        setSelectedRequest(null);
        setEvaluationCost('');
    };

    const handleConfirm = async (req: ThirdPartyRequest) => {
        if (!confirmName || !confirmPassword) return alert("Preencha nome e senha de confirmação.");
        
        // Em um sistema real, validariamos a senha. Aqui vamos apenas simular.
        const reqRef = ref(db, `thirdPartySupplyRequests/${req.id}`);
        await update(reqRef, {
            status: 'confirmed',
            confirmedByProviderUser: confirmName,
            confirmedAt: new Date().toISOString()
        });
        setSelectedRequest(null);
        setConfirmName('');
        setConfirmPassword('');
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'evaluated': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'confirmed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    const getStatusText = (status: string) => {
        switch(status) {
            case 'pending': return 'Pendente';
            case 'evaluated': return 'Avaliado (Aguardando Confirmação)';
            case 'confirmed': return 'Confirmado';
            default: return status;
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-amber-500 w-8 h-8" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black uppercase text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Users className="text-amber-500" />
                        Solicitações de Terceiros
                    </h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Gerenciamento de solicitações e demandas</p>
                </div>
                {!isProvider && (
                    <button onClick={() => setShowNewModal(true)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2 shadow-lg shadow-amber-500/20">
                        <Plus size={16} /> Nova Solicitação
                    </button>
                )}
            </div>

            <div className="flex border-b border-slate-300 dark:border-slate-800/50 mb-6">
                <button 
                    onClick={() => setActiveTab('ativos')} 
                    className={`px-8 py-3 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'ativos' ? 'text-amber-600 dark:text-amber-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                    Em Andamento
                    {activeTab === 'ativos' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 dark:bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>}
                </button>
                <button 
                    onClick={() => setActiveTab('historico')} 
                    className={`px-8 py-3 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'historico' ? 'text-amber-600 dark:text-amber-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                    Histórico
                    {activeTab === 'historico' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 dark:bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayRequests.map(req => (
                    <div key={req.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                                {req.supplierId}
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${getStatusColor(req.status)}`}>
                                {getStatusText(req.status)}
                            </span>
                        </div>
                        
                        <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                <Building2 size={14} className="text-amber-500" />
                                <span className="text-xs font-bold">{req.warehouse}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                <CalendarDays size={14} className="text-blue-500" />
                                <span className="text-xs font-mono">{req.startDate.split('-').reverse().join('/')} até {req.endDate.split('-').reverse().join('/')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                <Users size={14} className="text-purple-500" />
                                <span className="text-xs font-bold">
                                    {req.requestType === 'quantity' ? `${req.quantity} Diaristas (Quantidade)` : `${req.names?.length || 0} Pessoas Nominais`}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                <UserCircle size={14} />
                                <span className="text-xs uppercase">{req.requesterName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                <Phone size={14} />
                                <span className="text-xs font-mono">{req.contactPhone}</span>
                            </div>
                            
                            {req.cost && (
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                                        <DollarSign size={18} />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Valor Avaliado</span>
                                            <span className="text-lg font-black tracking-tighter">R$ {req.cost.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {req.requestType === 'person' && req.names && req.names.length > 0 && (
                                <div className="mt-3">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lista de Nomes:</span>
                                    <div className="mt-1 flex gap-1 flex-wrap">
                                        {req.names.map((n, i) => (
                                            <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-300">{n}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ACESSO PRESTADOR: PENDENTE -> AVALIADO */}
                        {isProvider && req.status === 'pending' && (
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                                <button onClick={() => setSelectedRequest(selectedRequest?.id === req.id ? null : req)} className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                                    Avaliar & Enviar Valor
                                </button>
                                
                                {selectedRequest?.id === req.id && (
                                    <div className="mt-3 space-y-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Valor Total (R$)</label>
                                            <input type="number" value={evaluationCost} onChange={e => setEvaluationCost(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none" placeholder="Ex: 1500.00" />
                                        </div>
                                        <button onClick={() => handleEvaluate(req)} className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
                                            Confirmar Valor
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ACESSO SOLICITANTE: AVALIADO -> CONFIRMADO */}
                        {!isProvider && req.status === 'evaluated' && (
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                                <button onClick={() => setSelectedRequest(selectedRequest?.id === req.id ? null : req)} className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-500 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                                    Verificar e Confirmar
                                </button>

                                {selectedRequest?.id === req.id && (
                                    <div className="mt-3 space-y-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Seu Nome</label>
                                            <input type="text" value={confirmName} onChange={e => setConfirmName(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none" placeholder="Digite seu nome" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Senha (Assinatura Eletrônica)</label>
                                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none" placeholder="Sua senha" />
                                        </div>
                                        <button onClick={() => handleConfirm(req)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors shadow-lg shadow-emerald-500/20">
                                            Assinar & Confirmar Solicitação
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {req.status === 'confirmed' && req.confirmedByProviderUser && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Assinado por</span>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-500" /> {req.confirmedByProviderUser}</span>
                            </div>
                        )}
                    </div>
                ))}
                {displayRequests.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner text-slate-400">
                        <FileText size={48} className="opacity-20 mb-4" />
                        <p className="text-sm font-bold uppercase tracking-widest">Nenhuma solicitação encontrada.</p>
                    </div>
                )}
            </div>

            {/* MODAL NOVA SOLICITAÇÃO */}
            {showNewModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
                    <div className="bg-white dark:bg-[#121212] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-slide-up">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                    <Plus className="text-amber-500" /> Nova Solicitação
                                </h3>
                                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Requisição de efetivo terceirizado</p>
                            </div>
                            <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreateRequest} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Terceirizada (Fornecedor)</label>
                                    <select required value={supplierId} onChange={e => {setSupplierId(e.target.value); setSelectedWorkers([]);}} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-amber-500 outline-none uppercase font-bold text-slate-700 dark:text-slate-200">
                                        <option value="">Selecione...</option>
                                        {providerCompanies.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Tipo de Solicitação</label>
                                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                                        <button type="button" onClick={() => setRequestType('quantity')} className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-colors ${requestType === 'quantity' ? 'bg-white dark:bg-slate-800 shadow text-amber-600 dark:text-amber-500' : 'text-slate-500'}`}>Quantidade</button>
                                        <button type="button" onClick={() => setRequestType('person')} className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-colors ${requestType === 'person' ? 'bg-white dark:bg-slate-800 shadow text-amber-600 dark:text-amber-500' : 'text-slate-500'}`}>Nominal</button>
                                    </div>
                                </div>

                                {requestType === 'quantity' ? (
                                    <div className="sm:col-span-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Quantidade de Diaristas</label>
                                        <input type="number" required min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-amber-500 outline-none text-slate-700 dark:text-slate-200" placeholder="Ex: 5" />
                                    </div>
                                ) : (
                                    <div className="sm:col-span-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex justify-between items-center">
                                            <span>Selecione os Colaboradores ({selectedWorkers.length} selecionados)</span>
                                        </label>
                                        {!supplierId ? (
                                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-600 dark:text-yellow-500 text-xs font-bold text-center">
                                                Selecione uma terceirizada primeiro.
                                            </div>
                                        ) : workersLoading ? (
                                            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-amber-500" /></div>
                                        ) : providerWorkers.length === 0 ? (
                                            <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl text-slate-500 text-xs text-center border border-slate-200 dark:border-slate-800">
                                                Nenhum colaborador encontrado para este fornecedor.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                {providerWorkers.map(worker => {
                                                    const isSelected = !!selectedWorkers.find(w => w.id === worker.id);
                                                    return (
                                                        <div 
                                                            key={worker.id}
                                                            onClick={() => toggleWorker(worker)}
                                                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-amber-500/30 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
                                                        >
                                                            <div className="relative">
                                                                {worker.photoUrl ? (
                                                                    <img src={worker.photoUrl} alt={worker.name} className="w-10 h-10 rounded-full object-cover" />
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                                                                        <UserCircle size={20} className="text-slate-400" />
                                                                    </div>
                                                                )}
                                                                {isSelected && (
                                                                    <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-0.5 border-2 border-white dark:border-slate-900">
                                                                        <CheckCircle2 size={12} className="text-white" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 overflow-hidden">
                                                                <p className={`text-xs font-bold truncate ${isSelected ? 'text-amber-600 dark:text-amber-500' : 'text-slate-700 dark:text-slate-200'}`}>{worker.name}</p>
                                                                <p className="text-[10px] text-slate-500 truncate font-mono">{worker.cpf}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Data Início</label>
                                    <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-amber-500 outline-none text-slate-700 dark:text-slate-200" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Data Fim</label>
                                    <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-amber-500 outline-none text-slate-700 dark:text-slate-200" />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Galpão / Unidade</label>
                                    <select required value={warehouse} onChange={e => setWarehouse(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-amber-500 outline-none text-slate-700 dark:text-slate-200">
                                        <option value="">Selecione...</option>
                                        {WAREHOUSE_LIST.map(w => <option key={w} value={w}>{w}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Nome do Solicitante</label>
                                    <input type="text" required value={requesterName} onChange={e => setRequesterName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-amber-500 outline-none text-slate-700 dark:text-slate-200" placeholder="Seu nome completo" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Telefone P/ Contato</label>
                                    <input type="tel" required value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-amber-500 outline-none text-slate-700 dark:text-slate-200" placeholder="(11) 99999-9999" />
                                </div>
                            </div>
                            
                            <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                                <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-4 text-xs font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 transition-colors">
                                    Enviar Solicitação ao Fornecedor
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThirdPartyRequests;
