
import React from 'react';
import { X, ShieldCheck, Lock, Eye, Scale } from 'lucide-react';

interface LegalProps {
  onClose: () => void;
  type: 'privacy' | 'terms';
}

const Legal: React.FC<LegalProps> = ({ onClose, type }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
        
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <div className="flex items-center gap-3">
            {type === 'privacy' ? <ShieldCheck className="text-emerald-500" /> : <Scale className="text-blue-500" />}
            <h3 className="text-white font-black uppercase text-sm tracking-widest">
              {type === 'privacy' ? 'Política de Privacidade (LGPD)' : 'Termos de Uso do Sistema'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar text-slate-300 space-y-6 text-sm leading-relaxed">
          <section className="space-y-3">
            <h4 className="text-white font-bold flex items-center gap-2"><Lock size={16} className="text-blue-400" /> 1. Tratamento de Dados</h4>
            <p>O ControlVision (CCOS) coleta dados como Nome, CPF, Fotos e Documentos estritamente para a finalidade de <strong>Segurança Patrimonial e Controle de Acesso</strong> às unidades logísticas.</p>
          </section>

          <section className="space-y-3">
            <h4 className="text-white font-bold flex items-center gap-2"><Eye size={16} className="text-blue-400" /> 2. Transparência</h4>
            <p>Os dados de terceiros são inseridos por empresas parceiras. O CCOS atua como Operador desses dados, garantindo que o acesso seja restrito apenas a gestores e administradores autorizados.</p>
          </section>

          <section className="space-y-3">
            <h4 className="text-white font-bold flex items-center gap-2"><Scale size={16} className="text-blue-400" /> 3. Seus Direitos</h4>
            <p>Conforme a Lei 13.709/2018 (LGPD), você tem direito ao acesso, correção e exclusão de seus dados. Para solicitações, entre em contato com o DPO (Encarregado de Dados) através do suporte interno.</p>
          </section>

          <section className="bg-slate-950 p-4 rounded-2xl border border-slate-800 italic text-xs text-slate-500">
            Última atualização: Outubro de 2023. Este sistema utiliza criptografia em trânsito e armazenamento seguro em nuvem.
          </section>
        </div>

        <div className="p-6 bg-slate-950 border-t border-slate-800 text-center">
          <button onClick={onClose} className="px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl uppercase text-xs tracking-widest transition-all">
            ENTENDI
          </button>
        </div>
      </div>
    </div>
  );
};

export default Legal;
