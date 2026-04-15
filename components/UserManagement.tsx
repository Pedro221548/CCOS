
import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, UserStatus, AppFeedback } from '../types';
import { authService } from '../services/auth';
import { 
    Users, UserPlus, Trash2, Shield, Eye, Lock, Check, AlertCircle, 
    Loader2, CheckCircle, AlertTriangle, X, Briefcase, Warehouse, 
    MessageSquareHeart, Search, MoreVertical, ShieldCheck, Mail, ShieldAlert,
    Building2, Filter, Key, ChevronDown, LayoutDashboard
} from 'lucide-react';
import Checkbox from './ui/Checkbox';
import { WAREHOUSE_LIST } from '../constants';
import { ref, onValue, update, off } from 'firebase/database';
import { db } from '../services/firebase';

const MASTER_EMAIL = 'pedro.fernandes@ccos.com';

const TAB_OPTIONS = [
    { id: 'dashboard', label: 'PAINEL PRINCIPAL' },
    { id: 'monitoring', label: 'MONITORAMENTO' },
    { id: 'work-mgmt', label: 'PLANTÃO' },
    { id: 'third-party-mgmt', label: 'FLUXO DE ACESSO' },
    { id: 'registration', label: 'CADASTRO' },
    { id: 'registration-history', label: 'HISTÓRICO' },
    { id: 'finance', label: 'FINANCEIRO' },
    { id: 'occurrences-bi', label: 'OCORRÊNCIAS BI' },
    { id: 'manual', label: 'MANUAL' },
    { id: 'data', label: 'FONTE DADOS' },
    { id: 'users', label: 'USUÁRIOS' },
];

interface UserManagementProps {
    currentUser: User;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [allFeedbacks, setAllFeedbacks] = useState<AppFeedback[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  
  const [newUser, setNewUser] = useState<{ 
      name: string; 
      email: string; 
      password: string; 
      role: UserRole; 
      allowedWarehouses: string[];
      companyName?: string;
  }>({ name: '', email: '', password: '', role: 'viewer', allowedWarehouses: [], companyName: '' });
  
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editing Permissions State
  const [editingPermissionsId, setEditingPermissionsId] = useState<string | null>(null);
  const [tempPermissions, setTempPermissions] = useState<string[]>([]);
  
  const [editingTabPermissionsId, setEditingTabPermissionsId] = useState<string | null>(null);
  const [tempTabPermissions, setTempTabPermissions] = useState<string[]>([]);
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'admin';
  const isMaster = currentUser.email === MASTER_EMAIL;

  useEffect(() => {
    loadUsers();
    
    if (isAdmin) {
        const fbRef = ref(db, 'monitoramento/feedbacks');
        const unsubscribe = onValue(fbRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const list: AppFeedback[] = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));
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

  const handleCompleteFeedback = async (feedback: AppFeedback) => {
    try {
      await update(ref(db, `monitoramento/feedbacks/${feedback.id}`), {
        status: 'completed'
      });
    } catch (err) {
      alert("Erro ao salvar no banco de dados.");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (newUser.password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        setLoading(false);
        return;
    }

    if (newUser.role === 'provider' && !newUser.companyName) {
        setError('Selecione a empresa parceira do fornecedor.');
        setLoading(false);
        return;
    }

    try {
      await authService.addUser({
          ...newUser,
          allowedWarehouses: newUser.role === 'manager' ? newUser.allowedWarehouses : []
      } as any);
      setSuccess('Usuário adicionado com sucesso!');
      setNewUser({ name: '', email: '', password: '', role: 'viewer', allowedWarehouses: [], companyName: '' });
      await loadUsers();
    } catch (err: any) {
      let msg = err.message;
      if (msg.includes('email-already-in-use')) msg = "Este e-mail já está sendo usado por outro usuário.";
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

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    const uid = confirmDeleteId;
    setDeletingId(uid);
    setConfirmDeleteId(null);

    try {
      await authService.removeUser(uid);
      setUsers(prev => prev.filter(u => u.uid !== uid));
    } catch (err: any) {
      alert("Erro ao excluir usuário.");
      await loadUsers();
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateRole = async (uid: string, newRole: UserRole) => {
      try {
          await authService.updateUserProfile(uid, { role: newRole });
          setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
      } catch (err) {
          loadUsers();
      }
  };

  const handleUpdateStatus = async (uid: string, newStatus: UserStatus) => {
      try {
          await authService.updateUserProfile(uid, { status: newStatus });
          setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: newStatus } : u));
      } catch (err) {
          loadUsers();
      }
  };

  const openPermissionsModal = (user: User) => {
      setEditingPermissionsId(user.uid);
      setTempPermissions(user.allowedWarehouses || []);
  };

  const openTabPermissionsModal = (user: User) => {
      setEditingTabPermissionsId(user.uid);
      setTempTabPermissions(user.permissions || TAB_OPTIONS.map(t => t.id));
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

  const saveTabPermissions = async () => {
      if (!editingTabPermissionsId) return;
      try {
          await authService.updateUserProfile(editingTabPermissionsId, { permissions: tempTabPermissions });
          setUsers(prev => prev.map(u => u.uid === editingTabPermissionsId ? { ...u, permissions: tempTabPermissions } : u));
          setEditingTabPermissionsId(null);
      } catch (err) {
          alert("Erro ao salvar permissões de acesso.");
      }
  };

  const filteredUsersList = useMemo(() => {
    return users.filter(u => 
        u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        (u.companyName && u.companyName.toLowerCase().includes(userSearchTerm.toLowerCase()))
    );
  }, [users, userSearchTerm]);

  const pendingFeedbacks = useMemo(() => {
    return allFeedbacks.filter(fb => fb.status !== 'completed');
  }, [allFeedbacks]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
       <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3">
                <Users className="text-amber-500" size={32} />
                Gestão Estratégica de Usuários
            </h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest ml-1">Controle administrativo e auditoria da plataforma</p>
       </div>

       <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-4 space-y-8">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-amber-600"></div>
                    <h3 className="text-white font-black uppercase text-xs tracking-[0.2em] mb-8 flex items-center gap-3">
                        <UserPlus size={18} className="text-blue-500" />
                        Provisionar Novo Acesso
                    </h3>
                    
                    <form onSubmit={handleAddUser} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                            <input type="text" required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all placeholder-slate-800" placeholder="Ex: João da Silva" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Profissional</label>
                            <input type="email" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all placeholder-slate-800" placeholder="nome@ccos.com.br" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha Inicial</label>
                                <input type="password" required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all" placeholder="******" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cargo</label>
                                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer">
                                    <option value="viewer">OPERADOR</option>
                                    <option value="manager">GESTOR</option>
                                    <option value="provider">FORNECEDOR</option>
                                    <option value="admin">ADMIN</option>
                                </select>
                            </div>
                        </div>

                        {newUser.role === 'provider' && (
                            <div className="space-y-1.5 animate-fade-in relative">
                                <label className="block text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1">Empresa Parceira</label>
                                <div className="relative">
                                    <select 
                                        required 
                                        value={newUser.companyName} 
                                        onChange={e => setNewUser({...newUser, companyName: e.target.value})} 
                                        className="w-full bg-slate-950 border border-amber-500/20 rounded-2xl px-5 py-3 text-sm text-white focus:border-amber-500 outline-none transition-all appearance-none cursor-pointer font-bold uppercase"
                                    >
                                        <option value="" disabled className="text-slate-700">SELECIONE A EMPRESA</option>
                                        <option value="B11">B11</option>
                                        <option value="MULT">MULT</option>
                                        <option value="MJM">MJM</option>
                                        <option value="PRIMUS">PRIMUS</option>
                                        <option value="MPI">MPI</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" size={18} />
                                </div>
                            </div>
                        )}

                        {newUser.role === 'manager' && (
                            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 animate-fade-in">
                                <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Galpões Permitidos</label>
                                <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                    {WAREHOUSE_LIST.map(wh => (
                                        <label key={wh} className="flex items-center gap-3 cursor-pointer hover:bg-slate-900 p-2 rounded-xl transition-colors group">
                                            <Checkbox 
                                                checked={newUser.allowedWarehouses.includes(wh)}
                                                onChange={() => toggleWarehouse(wh)}
                                            />
                                            <span className="text-[11px] font-bold text-slate-400 group-hover:text-white uppercase truncate">{wh}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3 animate-pulse font-bold leading-relaxed">
                                <AlertTriangle size={18} className="shrink-0" /> 
                                {error}
                            </div>
                        )}
                        
                        {success && (
                            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-3 font-bold">
                                <CheckCircle size={18} className="shrink-0" /> 
                                {success}
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-3 uppercase text-xs tracking-widest active:scale-95">
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <><ShieldCheck size={18} /> Cadastrar Membro</>}
                        </button>
                    </form>
                </div>

                {isAdmin && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col group">
                        <h3 className="text-white font-black uppercase text-xs tracking-[0.2em] mb-8 flex items-center gap-3">
                            <MessageSquareHeart size={18} className="text-rose-500" />
                            Feedbacks da Operação
                        </h3>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {pendingFeedbacks.length === 0 ? (
                                <div className="text-center py-12 text-slate-600 border border-dashed border-slate-800 rounded-3xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma pendência</p>
                                </div>
                            ) : (
                                pendingFeedbacks.map(fb => (
                                    <div key={fb.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 hover:border-rose-500/30 transition-all">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="text-white text-[11px] font-black uppercase block tracking-tight">{fb.userName}</span>
                                                <span className="text-[9px] text-slate-600 font-mono font-bold uppercase">{new Date(fb.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            <button onClick={() => handleCompleteFeedback(fb)} className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl border border-emerald-500/20 transition-all"><Check size={14}/></button>
                                        </div>
                                        <p className="text-xs text-slate-400 italic leading-relaxed">"{fb.content}"</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="xl:col-span-8">
                <div className="bg-slate-900 border border-slate-800 rounded-[40px] overflow-hidden shadow-2xl flex flex-col h-full">
                    <div className="p-8 border-b border-slate-800 bg-slate-950/50 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="relative flex-1 md:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input 
                                    type="text"
                                    value={userSearchTerm}
                                    onChange={e => setUserSearchTerm(e.target.value)}
                                    placeholder="Procurar por nome, email ou empresa..."
                                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-6 py-3 text-sm text-slate-300 focus:border-blue-500 outline-none transition-all placeholder-slate-700"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{filteredUsersList.length} Usuários Filtrados</span>
                            <button onClick={loadUsers} className="p-3 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-2xl transition-all active:scale-90 shadow-lg">
                                <Loader2 size={20} className={listLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800 sticky top-0 z-10">
                                <tr>
                                    <th className="p-6">Identificação</th>
                                    <th className="p-6">Acesso Master</th>
                                    <th className="p-6">Situação</th>
                                    <th className="p-6 text-center">Unidades</th>
                                    <th className="p-6 text-center">Acesso Site</th>
                                    <th className="p-6 text-right">Controle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                                {listLoading && users.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-20 text-center">
                                            <Loader2 className="animate-spin text-blue-500 mx-auto mb-4" size={40} />
                                            <span className="text-slate-600 font-bold uppercase tracking-widest text-[10px]">Sincronizando Banco de Dados...</span>
                                        </td>
                                    </tr>
                                ) : filteredUsersList.map(user => {
                                    const isSelf = user.uid === currentUser.uid;
                                    const isUserMaster = user.email === MASTER_EMAIL;
                                    return (
                                        <tr key={user.uid} className={`hover:bg-slate-800/20 transition-colors group ${deletingId === user.uid ? 'opacity-30' : ''}`}>
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-lg font-black text-blue-500 shadow-inner group-hover:scale-105 transition-transform">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-white uppercase text-sm truncate max-w-[180px]">{user.name} {isSelf && <span className="text-[10px] text-blue-500 ml-1">(VOCÊ)</span>}</div>
                                                        <div className="text-[10px] text-slate-600 font-mono font-bold truncate">{user.email}</div>
                                                        {user.companyName && <div className="text-[9px] text-amber-500 font-black uppercase tracking-tighter mt-1 flex items-center gap-1"><Building2 size={10} /> {user.companyName}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2">
                                                    <select 
                                                        value={user.role} 
                                                        onChange={(e) => handleUpdateRole(user.uid, e.target.value as UserRole)} 
                                                        disabled={isSelf || isUserMaster} 
                                                        className={`bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest outline-none transition-all cursor-pointer hover:border-blue-500 disabled:opacity-30 disabled:cursor-not-allowed
                                                            ${user.role === 'admin' ? 'text-rose-500 border-rose-500/20' : 
                                                              user.role === 'manager' ? 'text-blue-500 border-blue-500/20' : 
                                                              user.role === 'provider' ? 'text-amber-500 border-amber-500/20' : 'text-slate-400 border-slate-700'}
                                                        `}
                                                    >
                                                        <option value="viewer">OPERADOR</option>
                                                        <option value="manager">GESTOR</option>
                                                        <option value="provider">FORNECEDOR</option>
                                                        <option value="admin">ADMIN</option>
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <button 
                                                    onClick={() => !isSelf && !isUserMaster && handleUpdateStatus(user.uid, user.status === 'blocked' ? 'active' : 'blocked')}
                                                    disabled={isSelf || isUserMaster}
                                                    className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all
                                                        ${user.status === 'blocked' 
                                                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500 hover:text-white' 
                                                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'}
                                                    `}
                                                >
                                                    {user.status === 'blocked' ? 'BLOQUEADO' : 'ATIVO'}
                                                </button>
                                            </td>
                                            <td className="p-6 text-center">
                                                {user.role === 'manager' ? (
                                                    <button 
                                                        onClick={() => openPermissionsModal(user)}
                                                        className="p-3 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white border border-blue-500/20 rounded-2xl transition-all shadow-lg shadow-blue-900/10"
                                                        title="Configurar Galpões"
                                                    >
                                                        <Warehouse size={18} />
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] text-slate-700 font-black uppercase tracking-widest italic">-</span>
                                                )}
                                            </td>
                                            <td className="p-6 text-center">
                                                {isMaster && user.role !== 'provider' && !isUserMaster ? (
                                                    <button 
                                                        onClick={() => openTabPermissionsModal(user)}
                                                        className="p-3 bg-amber-600/10 text-amber-500 hover:bg-amber-600 hover:text-white border border-amber-500/20 rounded-2xl transition-all shadow-lg shadow-amber-900/10"
                                                        title="Configurar Acesso ao Site"
                                                    >
                                                        <Key size={18} />
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] text-slate-700 font-black uppercase tracking-widest italic">-</span>
                                                )}
                                            </td>
                                            <td className="p-6 text-right">
                                                <button 
                                                    onClick={() => !isSelf && !isUserMaster && setConfirmDeleteId(user.uid)} 
                                                    disabled={isSelf || isUserMaster} 
                                                    className="p-3 bg-slate-950 border border-slate-800 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 rounded-2xl transition-all disabled:opacity-0"
                                                >
                                                    <Trash2 size={18}/>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredUsersList.length === 0 && !listLoading && (
                            <div className="p-20 text-center flex flex-col items-center gap-4">
                                <Search size={48} className="text-slate-800" />
                                <p className="text-slate-600 font-black uppercase tracking-widest">Nenhum usuário correspondente à pesquisa.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
       </div>

       {/* MODAL: EDITAR PERMISSÕES DE GESTOR */}
       {editingPermissionsId && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                <div className="bg-slate-900 border border-slate-700 rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
                    
                    <div className="p-10">
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">CONFIGURAR UNIDADES</h3>
                                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-2">Defina quais galpões este gestor pode monitorar</p>
                            </div>
                            <button onClick={() => setEditingPermissionsId(null)} className="p-3 bg-slate-800 hover:bg-rose-600 text-white rounded-full transition-all"><X size={24}/></button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 mb-10">
                            {WAREHOUSE_LIST.map(wh => (
                                <label key={wh} className={`flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer group
                                    ${tempPermissions.includes(wh) ? 'bg-blue-600/10 border-blue-500 shadow-lg' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}
                                `} onClick={() => {
                                    setTempPermissions(prev => prev.includes(wh) ? prev.filter(w => w !== wh) : [...prev, wh]);
                                }}>
                                    <div className="flex items-center gap-3">
                                        <Warehouse size={16} className={tempPermissions.includes(wh) ? 'text-blue-400' : 'text-slate-600'} />
                                        <span className={`text-xs font-bold uppercase tracking-tight ${tempPermissions.includes(wh) ? 'text-white' : 'text-slate-400'}`}>{wh}</span>
                                    </div>
                                    <Checkbox 
                                        checked={tempPermissions.includes(wh)}
                                        onChange={() => {
                                            setTempPermissions(prev => prev.includes(wh) ? prev.filter(w => w !== wh) : [...prev, wh]);
                                        }}
                                    />
                                </label>
                            ))}
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setEditingPermissionsId(null)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-3xl font-black uppercase text-xs tracking-widest transition-all">Cancelar</button>
                            <button onClick={savePermissions} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-900/40 transition-all flex items-center justify-center gap-3">
                                <ShieldCheck size={20} /> ATUALIZAR ACESSOS
                            </button>
                        </div>
                    </div>
                </div>
            </div>
       )}

       {/* MODAL: EDITAR PERMISSÕES DE ACESSO AO SITE */}
       {editingTabPermissionsId && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                <div className="bg-slate-900 border border-slate-700 rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-600"></div>
                    
                    <div className="p-10">
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">PERMISSÕES DE ACESSO</h3>
                                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-2">Defina quais módulos este usuário pode acessar</p>
                            </div>
                            <button onClick={() => setEditingTabPermissionsId(null)} className="p-3 bg-slate-800 hover:bg-rose-600 text-white rounded-full transition-all"><X size={24}/></button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 mb-10">
                            {TAB_OPTIONS.map(tab => (
                                <label key={tab.id} className={`flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer group
                                    ${tempTabPermissions.includes(tab.id) ? 'bg-amber-600/10 border-amber-500 shadow-lg' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}
                                `} onClick={() => {
                                    setTempTabPermissions(prev => prev.includes(tab.id) ? prev.filter(t => t !== tab.id) : [...prev, tab.id]);
                                }}>
                                    <div className="flex items-center gap-3">
                                        <LayoutDashboard size={16} className={tempTabPermissions.includes(tab.id) ? 'text-amber-400' : 'text-slate-600'} />
                                        <span className={`text-xs font-bold uppercase tracking-tight ${tempTabPermissions.includes(tab.id) ? 'text-white' : 'text-slate-400'}`}>{tab.label}</span>
                                    </div>
                                    <Checkbox 
                                        checked={tempTabPermissions.includes(tab.id)}
                                        onChange={() => {
                                            setTempTabPermissions(prev => prev.includes(tab.id) ? prev.filter(t => t !== tab.id) : [...prev, tab.id]);
                                        }} 
                                    />
                                </label>
                            ))}
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setEditingTabPermissionsId(null)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-3xl font-black uppercase text-xs tracking-widest transition-all">Cancelar</button>
                            <button onClick={saveTabPermissions} className="flex-1 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-amber-900/40 transition-all flex items-center justify-center gap-3">
                                <ShieldCheck size={20} /> ATUALIZAR PERMISSÕES
                            </button>
                        </div>
                    </div>
                </div>
            </div>
       )}

       {/* MODAL: EXCLUIR USUÁRIO */}
       {confirmDeleteId && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
                <div className="bg-slate-900 border border-slate-700 rounded-[40px] p-10 shadow-2xl max-w-sm w-full text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-600"></div>
                    <div className="w-20 h-20 bg-rose-600/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-600/20">
                        <ShieldAlert className="text-rose-600" size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter italic">Revogar Acesso?</h3>
                    <p className="text-slate-500 text-sm mb-10 font-bold uppercase tracking-widest leading-relaxed">Esta ação removerá o acesso permanentemente e apagará logs vinculados.</p>
                    <div className="flex gap-4">
                        <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-4 bg-slate-800 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest transition-all">Manter</button>
                        <button onClick={handleConfirmDelete} className="flex-1 py-4 bg-rose-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-rose-900/40 transition-all active:scale-95">Sim, Excluir</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default UserManagement;
