
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
      setError(err.message || 'Erro ao entrar.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] sm:w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[80px] sm:blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] sm:w-[40%] h-[40%] bg-amber-500/5 rounded-full blur-[80px] sm:blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in relative z-10">
        
        {/* Glow Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
        
        {/* Header - Reduzido para Mobile */}
        <div className="p-8 sm:p-10 pb-6 sm:pb-8 flex flex-col items-center justify-center border-b border-slate-800 bg-slate-950/30">
            <div className="relative mb-4 sm:mb-5 group transform transition-transform hover:scale-105 duration-300">
                <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full"></div>
                <Shield className="w-16 h-16 sm:w-24 sm:h-24 text-amber-400 relative z-10 fill-amber-400/20 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-amber-400 tracking-tighter leading-none drop-shadow-2xl mb-4 font-sans text-center uppercase">
                CCOS
            </h1>
            <div className="flex items-center justify-center gap-2 sm:gap-3">
                 <div className="bg-white px-2 sm:px-3 py-1 rounded-[4px] h-8 sm:h-9 flex items-center justify-center shadow-lg">
                    <span className="text-[7px] sm:text-[10px] font-extrabold text-red-700 leading-none text-center tracking-tighter uppercase">UNILOG<br/>EXPRESS</span>
                 </div>
                 <div className="bg-white px-2 sm:px-3 py-1 rounded-[4px] h-8 sm:h-9 flex items-center justify-center shadow-lg">
                    <span className="text-[7px] sm:text-[10px] font-extrabold text-cyan-600 leading-none text-center tracking-tighter uppercase">4ELOS<br/>DISTRIB.</span>
                 </div>
            </div>
        </div>

        <div className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            
            <div>
                <label className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Email Corporativo</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-600 text-sm"
                        placeholder="usuario@ccos.com"
                        required
                    />
                </div>
            </div>

            <div>
                <label className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Senha de Acesso</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-12 py-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-600 text-sm"
                        placeholder="••••••••"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center font-bold flex items-center justify-center gap-2 animate-pulse">
                    <AlertCircle size={14} className="shrink-0" />
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 group uppercase text-sm tracking-widest active:scale-95"
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                    <>
                        Entrar no Sistema <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                )}
            </button>
            </form>
        </div>
        
        <div className="bg-slate-950/50 p-4 text-center border-t border-slate-800">
             <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                 Acesso Restrito / Pessoal Autorizado
             </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
