
import React, { useState } from 'react';
import { X, MessageSquare, Send, Loader2, Sparkles, Megaphone, Bug } from 'lucide-react';
import { User } from '../types';
import { push, ref, get } from 'firebase/database';
import { db } from '../services/firebase';

interface FeedbackModalProps {
  user: User;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ user, onClose }) => {
  const [content, setContent] = useState('');
  const [type, setType] = useState<'bug' | 'suggestion' | 'praise'>('suggestion');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    setLoading(true);
    try {
      // 1. Salva o Feedback
      const feedbackRef = ref(db, 'monitoramento/feedbacks');
      await push(feedbackRef, {
        userId: user.uid,
        userName: user.name,
        type,
        content,
        timestamp: new Date().toISOString(),
        status: 'pending'
      });

      // 2. Notifica Administradores (Sistema de Central de Notificações)
      const usersRef = ref(db, 'users');
      const usersSnap = await get(usersRef);
      if (usersSnap.exists()) {
        const usersData = usersSnap.val();
        const notificationPromises: Promise<any>[] = [];
        const typeLabel = type === 'bug' ? 'Bug/Erro' : type === 'suggestion' ? 'Sugestão' : 'Elogio';

        Object.keys(usersData).forEach(uid => {
          if (usersData[uid].role === 'admin') {
            const notifRef = ref(db, `notifications/${uid}`);
            notificationPromises.push(push(notifRef, {
                recipientId: uid,
                message: `Novo feedback de ${user.name} (${typeLabel})`,
                type: 'alert',
                timestamp: new Date().toISOString(),
                read: false,
                linkTo: 'users'
            }));
          }
        });
        await Promise.all(notificationPromises);
      }

      setSent(true);
      setTimeout(onClose, 2000);
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar feedback.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-8 text-center shadow-2xl max-w-sm">
           <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <Sparkles className="text-emerald-500" size={32} />
           </div>
           <h3 className="text-xl font-bold text-white mb-2">Obrigado!</h3>
           <p className="text-slate-400 text-sm">Sua sugestão foi enviada com sucesso para nossa equipe de desenvolvimento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
        <div className="h-1 bg-blue-500"></div>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
        <div className="p-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2"><MessageSquare className="text-blue-500" /> Central de Feedback</h2>
          <p className="text-slate-400 text-xs mb-6 uppercase tracking-widest font-black opacity-60">Sua opinião é vital para a evolução do sistema</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex gap-2">
               <button type="button" onClick={() => setType('suggestion')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest flex flex-col items-center gap-1 border transition-all ${type === 'suggestion' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'}`}><Megaphone size={16} /> Sugestão</button>
               <button type="button" onClick={() => setType('bug')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest flex flex-col items-center gap-1 border transition-all ${type === 'bug' ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'}`}><Bug size={16} /> Erro/Bug</button>
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">O que podemos melhorar?</label>
                <textarea required autoFocus value={content} onChange={e => setContent(e.target.value)} placeholder="Descreva sua sugestão..." className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white focus:border-blue-500 outline-none h-32 resize-none leading-relaxed" />
            </div>
            <button type="submit" disabled={loading || !content.trim()} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 uppercase text-xs tracking-widest shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50 transition-all">{loading ? <Loader2 className="animate-spin" size={18} /> : <><Send size={18} /> Enviar Feedback</>}</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
