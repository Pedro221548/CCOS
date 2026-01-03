
import React, { useState } from 'react';
import { X, Camera, Lock, Save, User as UserIcon, Briefcase, MessageSquare, Loader2 } from 'lucide-react';
import { User } from '../types';
import { authService } from '../services/auth';

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
        <div className="relative h-56 bg-gradient-to-b from-[#1e3a8a] to-[#0d1117] flex items-center justify-center shrink-0">
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all z-20"
            >
                <X size={20} />
            </button>

            <div className="relative z-10">
                <div className="w-32 h-32 rounded-full border-4 border-[#0d1117] bg-slate-800 overflow-hidden shadow-2xl group cursor-pointer">
                    <img 
                        src={formData.photoURL || `https://ui-avatars.com/api/?name=${user.name}&background=f59e0b&color=fff&size=256`} 
                        alt="Avatar" 
                        className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                         <Camera size={24} className="text-white" />
                    </div>
                </div>
                {/* Botão de câmera flutuante conforme screenshot */}
                <button className="absolute bottom-1 right-1 p-2 bg-black/80 hover:bg-black text-white rounded-full border border-slate-700 shadow-lg transition-transform active:scale-95">
                    <Camera size={16} />
                </button>
            </div>
            
            {/* Ícone de placeholder ao fundo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <UserIcon size={140} className="text-white" />
            </div>
        </div>

        {/* Área de Formulário */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 space-y-8">
            <div className="text-center">
                <h2 className="text-2xl font-black text-white tracking-tight">Editar Meu Perfil</h2>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Nome Completo */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        <UserIcon size={14} /> Nome Completo
                    </label>
                    <input 
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-[#05070a] border border-slate-800 rounded-xl px-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition-all font-medium"
                        placeholder="Seu nome completo"
                    />
                </div>

                {/* Cargo */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        <Briefcase size={14} /> Cargo / Função
                    </label>
                    <input 
                        type="text" 
                        value={formData.jobTitle}
                        onChange={e => setFormData({...formData, jobTitle: e.target.value})}
                        className="w-full bg-[#05070a] border border-slate-800 rounded-xl px-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition-all font-medium"
                        placeholder="Ex: Operador de Monitoramento"
                    />
                </div>

                {/* Bio / Status */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        <MessageSquare size={14} /> Bio / Status
                    </label>
                    <textarea 
                        value={formData.bio}
                        onChange={e => setFormData({...formData, bio: e.target.value})}
                        placeholder="Escreva algo sobre você..."
                        className="w-full bg-[#05070a] border border-slate-800 rounded-xl px-4 py-4 text-sm text-white focus:border-blue-500 outline-none transition-all h-32 resize-none leading-relaxed"
                    />
                </div>

                {/* Alterar Senha */}
                <div className="pt-2">
                    <button 
                        type="button"
                        onClick={() => setShowPasswordFields(!showPasswordFields)}
                        className="text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-2 transition-colors"
                    >
                        <Lock size={14} /> Alterar Senha
                    </button>
                    
                    {showPasswordFields && (
                        <div className="mt-4 space-y-3 animate-fade-in p-4 bg-slate-950 border border-slate-800 rounded-xl shadow-inner">
                             <input 
                                type="password" 
                                placeholder="Nova Senha"
                                value={passwords.new}
                                onChange={e => setPasswords({...passwords, new: e.target.value})}
                                className="w-full bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                            />
                             <input 
                                type="password" 
                                placeholder="Confirmar Nova Senha"
                                value={passwords.confirm}
                                onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                                className="w-full bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                            />
                        </div>
                    )}
                </div>

                {/* Botão de Salvar - Estilo Imagem */}
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-4 rounded-xl flex items-center justify-center gap-3 font-bold uppercase text-sm tracking-widest transition-all shadow-xl shadow-blue-900/30 active:scale-95 disabled:opacity-50 mt-4"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Salvar Alterações</>}
                </button>
            </form>
        </div>

        {/* Rodapé Interno */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 text-center">
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.4em]">ControlVision Enterprise</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
