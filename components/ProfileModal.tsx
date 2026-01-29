
import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Lock, Save, User as UserIcon, Briefcase, MessageSquare, Loader2, Sparkles, Clock, Megaphone, Bug, CheckCircle2, MessageSquareHeart, Shield } from 'lucide-react';
import { User, AppFeedback } from '../types';
import { authService } from '../services/auth';
import { db } from '../services/firebase';
import { ref, get } from 'firebase/database';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    jobTitle: user.jobTitle || '',
    bio: user.bio || '',
    photoURL: user.photoURL || '',
    bannerURL: user.bannerURL || ''
  });

  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [userFeedbacks, setUserFeedbacks] = useState<AppFeedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchMyFeedbacks = async () => {
      try {
        const fbRef = ref(db, 'monitoramento/feedbacks');
        const snapshot = await get(fbRef);
        if (snapshot.exists()) {
          const all = snapshot.val();
          const filtered = Object.keys(all)
            .map(key => ({ id: key, ...all[key] }))
            .filter(fb => fb.userId === user.uid)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setUserFeedbacks(filtered);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingFeedbacks(false);
      }
    };
    fetchMyFeedbacks();
  }, [user.uid]);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("A imagem é muito grande. Escolha uma foto de até 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData(prev => ({ ...prev, photoURL: event.target?.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Atualiza Perfil
      await authService.updateUserProfile(user.uid, formData);
      
      // Atualiza Senha se preenchida
      if (showPasswordFields && passwords.new) {
        if (passwords.new !== passwords.confirm) throw new Error("As senhas não coincidem.");
        await authService.updateUserPassword(passwords.new);
      }
      
      alert("Perfil atualizado com sucesso!");
      onClose();
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Clique fora para fechar */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[#0d1117] h-full shadow-2xl border-l border-slate-800 flex flex-col overflow-hidden animate-slide-in-right">
        
        {/* Cabeçalho Azul com Foto - Estilo Imagem */}
        <div className="relative h-48 bg-gradient-to-b from-[#1e3a8a] to-[#0d1117] flex items-center justify-center shrink-0">
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all z-20"
            >
                <X size={20} />
            </button>

            <div className="relative z-10">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div 
                  onClick={handlePhotoClick}
                  className="w-24 h-24 rounded-full border-4 border-[#0d1117] bg-slate-800 overflow-hidden shadow-2xl group cursor-pointer relative"
                >
                    <img 
                        src={formData.photoURL || `https://ui-avatars.com/api/?name=${user.name}&background=f59e0b&color=fff&size=256`} 
                        alt="Avatar" 
                        className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                         <Camera size={24} className="text-white" />
                    </div>
                </div>
                <button 
                  onClick={handlePhotoClick}
                  className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg border-2 border-[#0d1117] transition-all hover:scale-110"
                  title="Alterar Foto"
                >
                  <Camera size={14} />
                </button>
            </div>
            
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <UserIcon size={120} className="text-white" />
            </div>
        </div>

        {/* Área de Conteúdo */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 space-y-8">
            {/* Tabs fake: Perfil / Feedbacks */}
            <div className="space-y-6">
                <div className="text-center">
                    <h2 className="text-xl font-black text-white tracking-tight">Meu Perfil</h2>
                </div>

                <form onSubmit={handleSave} className="space-y-5">
                    <div className="space-y-1">
                        <label className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                            <UserIcon size={12} /> Nome Completo
                        </label>
                        <input 
                            type="text" 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full bg-[#05070a] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-all font-medium"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                            <Briefcase size={12} /> Cargo / Função
                        </label>
                        <input 
                            type="text" 
                            value={formData.jobTitle}
                            onChange={e => setFormData({...formData, jobTitle: e.target.value})}
                            className="w-full bg-[#05070a] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-all font-medium"
                        />
                    </div>

                    <div className="pt-1">
                        <button 
                            type="button"
                            onClick={() => setShowPasswordFields(!showPasswordFields)}
                            className="text-[10px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-2 transition-colors uppercase tracking-widest"
                        >
                            <Lock size={12} /> Alterar Minha Senha
                        </button>
                        
                        {showPasswordFields && (
                            <div className="mt-3 space-y-3 animate-fade-in p-3 bg-slate-950 border border-slate-800 rounded-xl shadow-inner">
                                <input type="password" placeholder="Nova Senha" value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} className="w-full bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none" />
                                <input type="password" placeholder="Confirmar" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} className="w-full bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none" />
                            </div>
                        )}
                    </div>

                    <button type="submit" disabled={loading} className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-3 rounded-xl flex items-center justify-center gap-3 font-bold uppercase text-xs tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50">
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Salvar Alterações</>}
                    </button>
                </form>
            </div>

            {/* SEÇÃO DE FEEDBACKS ENVIADOS */}
            <div className="pt-8 border-t border-slate-800 space-y-4">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                    <MessageSquareHeart size={18} className="text-rose-500" />
                    Meus Feedbacks
                </h3>

                {loadingFeedbacks ? (
                  <div className="flex justify-center py-6"><Loader2 className="animate-spin text-blue-500" size={20} /></div>
                ) : userFeedbacks.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-4">Você ainda não enviou nenhum feedback.</p>
                ) : (
                  <div className="space-y-4">
                    {userFeedbacks.map(fb => (
                      <div key={fb.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                         <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                               {fb.type === 'bug' ? <Bug size={14} className="text-rose-500" /> : fb.type === 'suggestion' ? <Megaphone size={14} className="text-blue-500" /> : <Sparkles size={14} className="text-emerald-500" />}
                               <span className="text-[10px] font-bold text-slate-400 font-mono">{new Date(fb.timestamp).toLocaleDateString()}</span>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${fb.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                               {fb.status === 'completed' ? 'Resolvido' : 'Pendente'}
                            </span>
                         </div>
                         <p className="text-xs text-slate-300 leading-relaxed">"{fb.content}"</p>
                         
                         {fb.adminReply && (
                           <div className="mt-2 bg-blue-500/5 border border-blue-500/10 p-3 rounded-lg flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-[9px] font-black text-blue-400 uppercase tracking-widest">
                                 <Shield size={10} /> Resposta do Administrador
                              </div>
                              <p className="text-xs text-blue-100 font-medium leading-relaxed italic">{fb.adminReply}</p>
                           </div>
                         )}
                      </div>
                    ))}
                  </div>
                )}
            </div>
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800 text-center">
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.4em]">ControlVision Enterprise</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
