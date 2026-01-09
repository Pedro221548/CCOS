
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { ref, onValue, update, off, remove, push } from 'firebase/database';
import { EmailPendency, User } from '../types';
import { Mail, AlertCircle, CheckCircle2, ExternalLink, Clock, User as UserIcon, Check, Trash2, X, Plus, Loader2, Link as LinkIcon, Send } from 'lucide-react';

interface EmailPendenciesProps {
    currentUser: User;
}

const EmailPendencies: React.FC<EmailPendenciesProps> = ({ currentUser }) => {
    const [pendencies, setPendencies] = useState<EmailPendency[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    
    // Create Modal State
    const [showModal, setShowModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newPendency, setNewPendency] = useState({
        title: '',
        link: ''
    });

    const isAdmin = currentUser.role === 'admin';

    useEffect(() => {
        const pendenciesRef = ref(db, 'email_pendencies');
        const unsubscribe = onValue(pendenciesRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const list = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));
                // Sort: Pending first, then by date desc
                list.sort((a, b) => {
                    if (a.status === 'pendente' && b.status !== 'pendente') return -1;
                    if (a.status !== 'pendente' && b.status === 'pendente') return 1;
                    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                });
                setMessages(list);
            } else {
                setMessages([]);
            }
            setLoading(false);
        });

        // Helper to avoid duplicate state name conflict
        const setMessages = (l: EmailPendency[]) => setPendencies(l);

        return () => off(pendenciesRef);
    }, []);

    const handleCreatePendency = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPendency.title.trim()) return;

        setIsCreating(true);
        try {
            const pendenciesRef = ref(db, 'email_pendencies');
            await push(pendenciesRef, {
                title: newPendency.title.trim(),
                link: newPendency.link.trim(),
                status: 'pendente',
                createdBy: currentUser.name,
                timestamp: new Date().toISOString()
            });
            
            setShowModal(false);
            setNewPendency({ title: '', link: '' });
        } catch (error) {
            console.error(error);
            alert("Erro ao criar pendência.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleResolve = async (id: string) => {
        if (!window.confirm("Confirmar que esta pendência foi resolvida?")) return;
        
        try {
            await update(ref(db, `email_pendencies/${id}`), {
                status: 'resolvido',
                resolvedBy: currentUser.name,
                resolvedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error(error);
            alert("Erro ao atualizar pendência.");
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await remove(ref(db, `email_pendencies/${deleteId}`));
            setDeleteId(null);
        } catch (error) {
            console.error(error);
            alert("Erro ao excluir pendência.");
        }
    };

    const pendingCount = pendencies.filter(p => p.status === 'pendente').length;

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 animate-fade-in pb-12">
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Mail className="text-amber-500" />
                        Pendências de E-mail
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Acompanhamento de solicitações e e-mails críticos pendentes de resposta.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button 
                        onClick={() => setShowModal(true)}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                    >
                        <Plus size={18} /> Nova Pendência
                    </button>
                    <div className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg flex items-center gap-3">
                        <div className="text-right">
                            <span className="block text-[10px] text-slate-500 uppercase font-bold">Pendentes</span>
                            <span className="block text-xl font-bold text-amber-500 leading-none">{pendingCount}</span>
                        </div>
                        <AlertCircle className="text-amber-500/50" size={24} />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-amber-500" size={32} />
                    <span>Carregando pendências...</span>
                </div>
            ) : pendencies.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/50 border border-dashed border-slate-800 rounded-xl">
                    <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-500/50" />
                    <h3 className="text-white font-bold text-lg">Tudo limpo!</h3>
                    <p className="text-slate-500">Nenhuma pendência de e-mail registrada no momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {pendencies.map((item) => (
                        <div 
                            key={item.id} 
                            className={`relative overflow-hidden rounded-xl border transition-all duration-300 p-5 flex flex-col md:flex-row gap-4 group
                                ${item.status === 'pendente' 
                                    ? 'bg-slate-900 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)]' 
                                    : 'bg-slate-950/50 border-slate-800 opacity-60 hover:opacity-100'}
                            `}
                        >
                            {/* Status Stripe */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.status === 'pendente' ? 'bg-amber-500' : 'bg-emerald-500'}`} />

                            <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className={`font-bold text-lg ${item.status === 'pendente' ? 'text-white' : 'text-slate-400 line-through'}`}>
                                        {item.title}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {item.status === 'pendente' ? (
                                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-xs font-bold border border-amber-500/20 uppercase tracking-wider">
                                                Pendente
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20 uppercase tracking-wider flex items-center gap-1">
                                                <Check size={12} /> Resolvido
                                            </span>
                                        )}
                                        {isAdmin && (
                                            <button 
                                                onClick={() => setDeleteId(item.id)}
                                                className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-all opacity-0 group-hover:opacity-100"
                                                title="Excluir Pendência"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-4">
                                    <div className="flex items-center gap-1">
                                        <UserIcon size={12} />
                                        Criado por <span className="text-slate-300 font-medium">{item.createdBy}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock size={12} />
                                        {new Date(item.timestamp).toLocaleString('pt-BR')}
                                    </div>
                                    {item.status === 'resolvido' && item.resolvedBy && (
                                        <div className="flex items-center gap-1 text-emerald-500/80 ml-auto md:ml-0">
                                            <CheckCircle2 size={12} />
                                            Resolvido por {item.resolvedBy} em {item.resolvedAt ? new Date(item.resolvedAt).toLocaleDateString('pt-BR') : '-'}
                                        </div>
                                    )}
                                </div>

                                {item.link && (
                                    <a 
                                        href={item.link} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors hover:underline"
                                    >
                                        <ExternalLink size={14} />
                                        Abrir E-mail / Link Externo
                                    </a>
                                )}
                            </div>

                            {item.status === 'pendente' && (
                                <div className="flex items-center md:border-l border-slate-800 md:pl-4">
                                    <button 
                                        onClick={() => handleResolve(item.id)}
                                        className="w-full md:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all hover:scale-105"
                                    >
                                        <CheckCircle2 size={16} />
                                        Resolver
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Criar Pendência */}
            {showModal && (
                <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-in-right">
                        <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                    <Mail size={18} />
                                </div>
                                <h3 className="text-white font-black text-xs uppercase tracking-widest">Nova Pendência Crítica</h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreatePendency} className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Assunto / Título</label>
                                    <input 
                                        type="text" 
                                        autoFocus 
                                        required 
                                        value={newPendency.title} 
                                        onChange={e => setNewPendency({...newPendency, title: e.target.value})} 
                                        placeholder="Ex: Liberação de Acesso Agência MPI" 
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center gap-1.5">
                                        <LinkIcon size={10} /> Link de Referência (Opcional)
                                    </label>
                                    <input 
                                        type="text" 
                                        value={newPendency.link} 
                                        onChange={e => setNewPendency({...newPendency, link: e.target.value})} 
                                        placeholder="https://..." 
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all font-mono" 
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)} 
                                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isCreating || !newPendency.title.trim()}
                                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isCreating ? <Loader2 className="animate-spin" size={16} /> : <><Send size={16} /> Registrar</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
            {deleteId && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm p-6 relative text-center">
                        <button onClick={() => setDeleteId(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                        <div className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/20">
                                <Trash2 className="text-rose-500 w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Excluir Pendência?</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Esta ação removerá o registro permanentemente do banco de dados para todos.
                                </p>
                            </div>
                            <div className="flex gap-3 w-full pt-2">
                                <button 
                                    onClick={() => setDeleteId(null)}
                                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleDelete}
                                    className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-lg shadow-rose-900/20 transition-all text-sm flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={16} /> Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailPendencies;
