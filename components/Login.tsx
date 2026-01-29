
import React, { useState } from 'react';
import { Shield, Lock, Mail, Loader2, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/auth';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.login(email, password);
    } catch (err: any) {
      // Simplifica a mensagem de erro para o usuário final conforme solicitado
      setError('Senha/E-mail incorreto');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020408] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] sm:w-[40%] h-[40%] bg-amber-600/5 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] sm:w-[40%] h-[40%] bg-amber-500/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md bg-slate-900/40 border border-slate-800 rounded-[32px] shadow-2xl overflow-hidden animate-fade-in relative z-10 backdrop-blur-xl">
        
        {/* Header - CCOS Styled Logo */}
        <div className="p-10 pb-8 flex flex-col items-center justify-center">
            <div className="relative mb-6 group transform transition-transform duration-500">
                <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full animate-pulse"></div>
                <Shield className="w-20 h-20 text-amber-500 relative z-10 fill-amber-500/10 drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]" strokeWidth={1.5} />
            </div>
            
            <h1 className="text-6xl font-black text-amber-500 tracking-tighter leading-none text-center drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                CCOS
            </h1>
            
            <div className="mt-6 px-10 py-2.5 bg-amber-500/5 border border-amber-500/20 rounded-full">
                <span className="text-xs font-black text-amber-600 uppercase tracking-[0.4em]">
                    DEMONSTRAÇÃO
                </span>
            </div>
        </div>

        <div className="p-8 pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-2">Acesso Restrito</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-600 group-focus-within:text-amber-500 transition-colors" />
                    </div>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder-slate-700 text-sm"
                        placeholder="E-mail Corporativo"
                        required
                    />
                </div>
            </div>

            <div>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-600 group-focus-within:text-amber-500 transition-colors" />
                    </div>
                    <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-12 pr-12 py-4 text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder-slate-700 text-sm"
                        placeholder="Senha de Segurança"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-600 hover:text-slate-300 focus:outline-none transition-colors"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center font-bold flex items-center justify-center gap-2 animate-pulse">
                    <AlertCircle size={14} className="shrink-0" />
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 rounded-2xl transition-all shadow-xl shadow-amber-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 group uppercase text-sm tracking-widest active:scale-[0.98]"
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                    <>
                        Entrar na Operação <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                )}
            </button>
            </form>
        </div>
        
        <div className="bg-slate-950/30 p-5 text-center border-t border-slate-800/50">
             <p className="text-[9px] text-slate-600 uppercase tracking-[0.5em] font-black">
                 SISTEMA DE MONITORAMENTO AVANÇADO
             </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
