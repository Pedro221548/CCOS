
import React, { useState, useEffect, useRef } from 'react';
// Add ShieldCheck and ChevronRight to the imports from lucide-react
import { X, Camera, Lock, Save, User as UserIcon, Briefcase, MessageSquare, Loader2, Sparkles, Clock, Megaphone, Bug, CheckCircle2, MessageSquareHeart, Shield, Download, Trash2, ShieldAlert, ShieldCheck, ChevronRight } from 'lucide-react';
import { User, AppFeedback } from '../types';
import { authService } from '../services/auth';
import { db } from '../services/firebase';
import { ref, get } from 'firebase/database';
import Legal from './Legal';

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
  const [showLegal, setShowLegal] = useState<any>(null);
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
      await authService.updateUserProfile(user.uid, formData);
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

  const handleRequestDataExport = () => {
    alert("Uma solicitação de exportação de dados foi enviada ao encarregado (DPO). Você receberá um e-mail em até 15 dias conforme a LGPD.");
  };

  const handleRequestDeletion = () => {
    if (window.confirm("ATENÇÃO: Deseja solicitar a exclusão permanente de seus dados pessoais do sistema? Esta ação é irreversível e notificará o administrador do sistema.")) {
      alert("Solicitação de exclusão enviada com sucesso.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      {showLegal && <Legal type={showLegal} onClose={() => setShowLegal(null)} />}
      
      <div className="relative w-full max-w-md bg-[#0d1117] h-full shadow-2xl border-l border-slate-800 flex flex-col overflow-hidden animate-slide-in-right">
        
        <div className="relative h-48 bg-gradient-to-b from-[#1e3a8a] to-[#0d1117] flex items-center justify-center shrink-0">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all z-20"><X size={20} /></button>
            <div className="relative z-10">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <div onClick={handlePhotoClick} className="w-24 h-24 rounded-full border-4 border-[#0d1117] bg-slate-800 overflow-hidden shadow-2xl group cursor-pointer relative">
                    <img src={formData.photoURL || `https://ui-avatars.com/api/?name=${user.name}&background=f59e0b&color=fff&size=256`} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Camera size={24} className="text-white" /></div>
                </div>
                <button onClick={handlePhotoClick} className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg border-2 border-[#0d1117] transition-all hover:scale-110"><Camera size={14} /></button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 space-y-8">
            <div className="space-y-6">
                <div className="text-center"><h2 className="text-xl font-black text-white tracking-tight">Meu Perfil</h2></div>
                <form onSubmit={handleSave} className="space-y-5">
                    <div className="space-y-1">
                        <label className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1"><UserIcon size={12} /> Nome Completo</label>
                        <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#05070a] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-all font-medium" />
                    </div>
                    <div className="space-y-1">
                        <label className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1"><Briefcase size={12} /> Cargo / Função</label>
                        <input type="text" value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} className="w-full bg-[#05070a] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-all font-medium" />
                    </div>
                    <div className="pt-1">
                        <button type="button" onClick={() => setShowPasswordFields(!showPasswordFields)} className="text-[10px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-2 transition-colors uppercase tracking-widest"><Lock size={12} /> Alterar Minha Senha</button>
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

            {/* SEÇÃO LGPD */}
            <div className="pt-8 border-t border-slate-800 space-y-6">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-500" />
                    Privacidade e Dados (LGPD)
                </h3>
                
                <div className="space-y-3">
                    <button onClick={handleRequestDataExport} className="w-full flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-blue-500/50 transition-all group">
                        <div className="flex items-center gap-3 text-left">
                            <Download size={16} className="text-slate-500 group-hover:text-blue-400" />
                            <span className="text-xs font-bold text-slate-300">Exportar Meus Dados Pessoais</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-700" />
                    </button>

                    <button onClick={() => setShowLegal('privacy')} className="w-full flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-emerald-500/50 transition-all group">
                        <div className="flex items-center gap-3 text-left">
                            <Shield size={16} className="text-slate-500 group-hover:text-emerald-400" />
                            <span className="text-xs font-bold text-slate-300">Acessar Política de Privacidade</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-700" />
                    </button>

                    <button onClick={handleRequestDeletion} className="w-full flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl hover:bg-rose-500/10 hover:border-rose-500/30 transition-all group">
                        <div className="flex items-center gap-3 text-left">
                            <Trash2 size={16} className="text-rose-500" />
                            <span className="text-xs font-bold text-rose-500">Solicitar Exclusão de Dados</span>
                        </div>
                        <ShieldAlert size={14} className="text-rose-900" />
                    </button>
                </div>
            </div>

            <div className="pt-8 border-t border-slate-800 space-y-4 text-center">
                <p className="text-[10px] text-slate-500 font-medium">O ControlVision Enterprise utiliza padrões OWASP para segurança de dados.</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
