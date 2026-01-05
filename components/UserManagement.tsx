
import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, UserStatus, AppFeedback } from '../types';
import { authService } from '../services/auth';
import { Users, UserPlus, Trash2, Shield, Eye, Lock, Check, AlertCircle, Loader2, Ban, CheckCircle, AlertTriangle, X, Briefcase, Warehouse, MessageSquare, Clock, Megaphone, Bug, MessageSquareHeart, Send, CheckCircle2 } from 'lucide-react';
import { WAREHOUSE_LIST } from '../constants';
import { ref, onValue, update, off } from 'firebase/database';
import { db } from '../services/firebase';

interface UserManagementProps {
    currentUser: User;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [allFeedbacks, setAllFeedbacks] = useState<AppFeedback[]>([]);
  
  const [newUser, setNewUser] = useState<{ 
      name: string; 
      email: string; 
      password: string; 
      role: UserRole; 
      allowedWarehouses: string[] 
  }>({ name: '', email: '', password: '', role: 'viewer', allowedWarehouses: [] });
  
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Reply state
  const [replyTexts, setReplyTexts] = useState<{[key: string]: string}>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Editing Permissions State
  const [editingPermissionsId, setEditingPermissionsId] = useState<string | null>(null);
  const [tempPermissions, setTempPermissions] = useState<string[]>([]);

  // State for Delete Confirmation Modal
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    loadUsers();
    
    // Real-time listener for feedbacks
    if (isAdmin) {
        const fbRef = ref(db, 'monitoramento/feedbacks');
        const unsubscribe = onValue(fbRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const list: AppFeedback[] = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));
                // Sort by newest first
                setAllFeedbacks(list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
            } else {
                setAllFeedbacks([]);
            }
        });
        return () => off(fbRef);
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    setListLoading(true);
    try {
      const list = await authService.listUsers();
      setUsers(list);
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setListLoading(false);
    }
  };

  const handleSendReply = async (feedback: AppFeedback) => {
    const text = replyTexts[feedback.id];
    if (!text?.trim()) return;

    setReplyingId(feedback.id);
    try {
      await update(ref(db, `monitoramento/feedbacks/${feedback.id}`), {
        adminReply: text,
        repliedAt: new Date().toISOString()
      });
      // Clear specific reply text
      setReplyTexts(prev => {
          const next = {...prev};
          delete next[feedback.id];
          return next;
      });
    } catch (err) {
      alert("Erro ao responder.");
    } finally {
      setReplyingId(null);
    }
  };

  const handleCompleteFeedback = async (feedback: AppFeedback) => {
    // Marcamos localmente como concluído IMEDIATAMENTE para sumir da tela
    setAllFeedbacks(prev => prev.map(f => f.id === feedback.id ? { ...f, status: 'completed' } : f));
    
    try {
      await update(ref(db, `monitoramento/feedbacks/${feedback.id}`), {
        status: 'completed'
      });
    } catch (err) {
      console.error("Erro ao concluir no banco:", err);
      // Reverte se der erro
      alert("Erro ao salvar no banco de dados.");
      loadUsers(); 
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (newUser.password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres (Exigência Firebase).');
        setLoading(false);
        return;
    }

    try {
      await authService.addUser({
          ...newUser,
          allowedWarehouses: newUser.role === 'manager' ? newUser.allowedWarehouses : []
      });
      setSuccess('Usuário adicionado com sucesso!');
      setNewUser({ name: '', email: '', password: '', role: 'viewer', allowedWarehouses: [] });
      await loadUsers();
    } catch (err: any) {
      let msg = 'Erro ao adicionar usuário.';
      if (err.code === 'auth/email-already-in-use') msg = 'Este email já está em uso.';
      if (err.code === 'auth/weak-password') msg = 'A senha é muito fraca.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleWarehouse = (wh: string) => {
      setNewUser(prev => {
          const current = prev.allowedWarehouses;
          if (current.includes(wh)) return { ...prev, allowedWarehouses: current.filter(w => w !== wh) };
          return { ...prev, allowedWarehouses: [...current, wh] };
      });
  };

  const initiateDelete = (uid: string) => {
      if (uid === currentUser.uid) {
          alert("Você não pode excluir sua própria conta.");
          return;
      }
      setConfirmDeleteId(uid);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    const uid = confirmDeleteId;
    setDeletingId(uid);
    setConfirmDeleteId(null);

    try {
      await authService.removeUser(uid);
      setUsers(prev => prev.filter(u => u.uid !== uid));
      setSuccess('Usuário excluído.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      alert("Erro ao excluir usuário: " + err.message);
      await loadUsers();
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateRole = async (uid: string, newRole: UserRole) => {
      if (uid === currentUser.uid) {
          if (!window.confirm("Alterar seu próprio cargo pode restringir seu acesso. Continuar?")) return;
      }
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
      try {
          await authService.updateUserProfile(uid, { role: newRole });
      } catch (err) {
          console.error(err);
          loadUsers();
      }
  };

  const handleUpdateStatus = async (uid: string, newStatus: UserStatus) => {
      if (uid === currentUser.uid && newStatus === 'blocked') {
          alert("Você não pode bloquear a si mesmo.");
          return;
      }
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: newStatus } : u));
      try {
          await authService.updateUserProfile(uid, { status: newStatus });
      } catch (err) {
          console.error(err);
          loadUsers();
      }
  };

  const openPermissionsModal = (user: User) => {
      setEditingPermissionsId(user.uid);
      setTempPermissions(user.allowedWarehouses || []);
  };

  const savePermissions = async () => {
      if (!editingPermissionsId) return;
      try {
          await authService.updateUserProfile(editingPermissionsId, { allowedWarehouses: tempPermissions });
          setUsers(prev => prev.map(u => u.uid === editingPermissionsId ? { ...u, allowedWarehouses: tempPermissions } : u));
          setEditingPermissionsId(null);
      } catch (err) {
          alert("Erro ao salvar permissões.");
      }
  };

  const toggleTempPermission = (wh: string) => {
      setTempPermissions(prev => prev.includes(wh) ? prev.filter(w => w !== wh) : [...prev, wh]);
  };

  // Filtrar apenas feedbacks que NÃO estão concluídos
  const pendingFeedbacks = useMemo(() => {
    return allFeedbacks.filter(fb => fb.status !== 'completed');
  }, [allFeedbacks]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
       <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Users className="text-amber-500" />
                Gestão de Usuários
            </h2>
            <p className="text-slate-400 text-sm">Adicione membros à equipe, defina cargos e acompanhe feedbacks.</p>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form + Feedback Column */}
            <div className="lg:col-span-1 space-y-6">
                {/* Form */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <UserPlus size={18} className="text-blue-500" />
                        Novo Usuário
                    </h3>
                    
                    <form onSubmit={handleAddUser} className="space-y-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Nome Completo</label>
                            <input 
                                type="text" 
                                required
                                value={newUser.name}
                                onChange={e => setNewUser({...newUser, name: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                                placeholder="Ex: João Silva"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Email</label>
                            <input 
                                type="email" 
                                required
                                value={newUser.email}
                                onChange={e => setNewUser({...newUser, email: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                                placeholder="usuario@ccos.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Senha Inicial</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    required
                                    value={newUser.password}
                                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 pl-8 text-sm text-white focus:border-blue-500 focus:outline-none"
                                    placeholder="Mínimo 6 caracteres"
                                />
                                <Lock size={14} className="absolute left-2.5 top-2.5 text-slate-600" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Cargo Inicial</label>
                            <select 
                                value={newUser.role}
                                onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                            >
                                <option value="viewer">Visualizador (Operador)</option>
                                <option value="manager">Gestor</option>
                                <option value="admin">Administrador (Total)</option>
                            </select>
                        </div>

                        {newUser.role === 'manager' && (
                            <div className="bg-slate-950 border border-slate-800 rounded p-3">
                                <label className="block text-xs text-amber-500 font-bold mb-2 uppercase">Galpões Permitidos</label>
                                <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                                    {WAREHOUSE_LIST.map(wh => (
                                        <label key={wh} className="flex items-center gap-2 cursor-pointer hover:bg-slate-900 p-1 rounded">
                                            <input 
                                                type="checkbox" 
                                                checked={newUser.allowedWarehouses.includes(wh)}
                                                onChange={() => toggleWarehouse(wh)}
                                                className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                                            />
                                            <span className="text-xs text-slate-300">{wh}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {error && <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}
                        {success && <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2"><Check size={14} /> {success}</div>}

                        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Cadastrar Usuário'}
                        </button>
                    </form>
                </div>

                {/* FEEDBACK SECTION BELOW FORM (ADMIN ONLY) */}
                {isAdmin && (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-white font-bold flex items-center gap-2 uppercase tracking-widest text-xs">
                                <MessageSquareHeart size={18} className="text-rose-500" />
                                Feedbacks Pendentes
                            </h3>
                        </div>

                        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                            {pendingFeedbacks.length === 0 ? (
                                <div className="text-center py-10 text-slate-600 italic text-xs border border-dashed border-slate-800 rounded-xl">
                                    Tudo resolvido por aqui!
                                </div>
                            ) : (
                                pendingFeedbacks.map(fb => (
                                    <div key={fb.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors group relative overflow-hidden flex flex-col gap-3">
                                        <div className={`absolute top-0 left-0 bottom-0 w-1 ${fb.type === 'bug' ? 'bg-rose-500' : fb.type === 'suggestion' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                                        
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col">
                                                <span className="text-white text-xs font-black uppercase tracking-tighter truncate max-w-[150px]">
                                                    {fb.userName}
                                                </span>
                                                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mt-0.5">
                                                    <Clock size={10} /> {new Date(fb.timestamp).toLocaleDateString('pt-BR')} {new Date(fb.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                <button 
                                                  onClick={() => handleCompleteFeedback(fb)}
                                                  className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-lg border border-emerald-500/20 transition-all shadow-sm active:scale-90"
                                                  title="Marcar como Concluído"
                                                >
                                                  <CheckCircle2 size={16} />
                                                </button>
                                                {fb.type === 'bug' ? (
                                                    <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[9px] font-black uppercase tracking-widest border border-rose-500/20 flex items-center gap-1">
                                                        <Bug size={8} /> Bug
                                                    </span>
                                                ) : fb.type === 'suggestion' ? (
                                                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[9px] font-black uppercase tracking-widest border border-blue-500/20 flex items-center gap-1">
                                                        <Megaphone size={8} /> Sugestão
                                                    </span>
                                                ) : (
                                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                        Elogio
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                                            <p className="text-xs text-slate-300 leading-relaxed italic">
                                                "{fb.content}"
                                            </p>
                                        </div>

                                        {/* Reply area */}
                                        <div className="space-y-2 mt-1">
                                            <div className="relative group">
                                              <textarea 
                                                value={replyTexts[fb.id] !== undefined ? replyTexts[fb.id] : fb.adminReply || ''}
                                                onChange={e => setReplyTexts({...replyTexts, [fb.id]: e.target.value})}
                                                placeholder="Sua resposta para o usuário..."
                                                className="w-full bg-[#0d1117] border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-blue-500 outline-none h-16 resize-none"
                                              />
                                              <button 
                                                onClick={() => handleSendReply(fb)}
                                                disabled={replyingId === fb.id || !(replyTexts[fb.id] || fb.adminReply || '').trim()}
                                                className="absolute bottom-2 right-2 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md shadow-lg disabled:opacity-30 transition-all"
                                              >
                                                {replyingId === fb.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                              </button>
                                            </div>
                                            {fb.adminReply && (
                                              <div className="flex items-center gap-1 text-[9px] text-blue-400 font-bold uppercase">
                                                <Check size={10} /> Já respondido
                                              </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        <div className="mt-4 p-3 bg-slate-950/50 border-t border-slate-800 rounded-b-xl">
                            <p className="text-[9px] text-slate-500 text-center uppercase tracking-widest font-bold">Monitorando {pendingFeedbacks.length} interações pendentes</p>
                        </div>
                    </div>
                )}
            </div>

            {/* List Column */}
            <div className="lg:col-span-2">
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg min-h-[400px]">
                    <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                        <span className="text-sm font-semibold text-slate-200">Usuários Cadastrados</span>
                        <button onClick={loadUsers} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><Loader2 size={12} className={listLoading ? 'animate-spin' : 'hidden'} /> Atualizar</button>
                    </div>
                    {listLoading ? (
                        <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
                    ) : (
                        <div className="overflow-x-auto pb-4">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-950 text-slate-400 text-xs uppercase">
                                    <tr>
                                        <th className="p-4">Usuário</th>
                                        <th className="p-4">Cargo</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                                    {users.map(user => {
                                        return (
                                            <tr key={user.uid} className={`hover:bg-slate-800/30 transition-colors ${deletingId === user.uid ? 'opacity-50 pointer-events-none' : ''}`}>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 border border-slate-700">{(user.name || '?').charAt(0)}</div>
                                                        <div>
                                                            <div className="font-medium text-white">{user.name || 'Sem Nome'} {user.uid === currentUser.uid && <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded ml-1">(Você)</span>}</div>
                                                            <div className="text-xs text-slate-500">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="relative">
                                                            <select 
                                                                value={user.role}
                                                                onChange={(e) => handleUpdateRole(user.uid, e.target.value as UserRole)}
                                                                disabled={user.uid === currentUser.uid}
                                                                className={`appearance-none w-full pl-8 pr-4 py-1.5 rounded text-xs font-bold border focus:outline-none cursor-pointer disabled:opacity-50 
                                                                    ${user.role === 'admin' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                                                    user.role === 'manager' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 
                                                                    'bg-blue-500/10 text-blue-400 border-blue-500/20'}
                                                                `}
                                                            >
                                                                <option value="viewer">Visualizador</option>
                                                                <option value="manager">Gestor</option>
                                                                <option value="admin">Administrador</option>
                                                            </select>
                                                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                                                {user.role === 'admin' ? <Shield size={12} className="text-amber-500"/> : user.role === 'manager' ? <Briefcase size={12} className="text-purple-400"/> : <Eye size={12} className="text-blue-400"/>}
                                                            </div>
                                                        </div>
                                                        {user.role === 'manager' && (
                                                            <button 
                                                                onClick={() => openPermissionsModal(user)}
                                                                className="text-[10px] text-slate-500 hover:text-purple-400 flex items-center gap-1 mt-1"
                                                            >
                                                                <Warehouse size={10} /> {user.allowedWarehouses?.length || 0} Galpões
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="p-4">
                                                    <div className="relative">
                                                        <select 
                                                            value={user.status || 'active'}
                                                            onChange={(e) => handleUpdateStatus(user.uid, e.target.value as UserStatus)}
                                                            disabled={user.uid === currentUser.uid}
                                                            className={`appearance-none w-full pl-8 pr-4 py-1.5 rounded text-xs font-bold border focus:outline-none cursor-pointer disabled:opacity-50
                                                                ${(user.status === 'blocked') ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}
                                                            `}
                                                        >
                                                            <option value="active">Ativo</option>
                                                            <option value="blocked">Bloqueado</option>
                                                        </select>
                                                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                                            {(user.status === 'blocked') ? <Ban size={12} className="text-rose-500"/> : <CheckCircle size={12} className="text-emerald-500"/>}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => initiateDelete(user.uid)} disabled={user.uid === currentUser.uid} className="p-2 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-500 border border-rose-500/20 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
       </div>

       {/* DELETE MODAL */}
       {confirmDeleteId && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm p-6 relative">
                    <button onClick={() => setConfirmDeleteId(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/20 mx-auto"><AlertTriangle className="text-rose-500 w-8 h-8" /></div>
                        <div><h3 className="text-xl font-bold text-white mb-2">Excluir Usuário?</h3><p className="text-slate-400 text-sm">Ação irreversível.</p></div>
                        <div className="flex gap-3 w-full pt-2">
                            <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium">Cancelar</button>
                            <button onClick={handleConfirmDelete} className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-lg">Sim, Excluir</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* PERMISSIONS MODAL */}
        {editingPermissionsId && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm p-6 relative">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2"><Warehouse size={18} className="text-purple-500" /> Permissões de Acesso</h3>
                        <p className="text-xs text-slate-400">Selecione os galpões que este gestor pode visualizar.</p>
                    </div>
                    <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar bg-slate-950 p-2 rounded border border-slate-800 mb-4">
                        {WAREHOUSE_LIST.map(wh => (
                            <label key={wh} className="flex items-center gap-2 cursor-pointer hover:bg-slate-900 p-2 rounded transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={tempPermissions.includes(wh)}
                                    onChange={() => toggleTempPermission(wh)}
                                    className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-0"
                                />
                                <span className={`text-sm ${tempPermissions.includes(wh) ? 'text-white font-medium' : 'text-slate-400'}`}>{wh}</span>
                            </label>
                        ))}
                    </div>
                    <div className="flex gap-3 w-full">
                        <button onClick={() => setEditingPermissionsId(null)} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm">Cancelar</button>
                        <button onClick={savePermissions} className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow-lg text-sm">Salvar Permissões</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default UserManagement;
