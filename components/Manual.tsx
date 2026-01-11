
import React from 'react';
import { HelpCircle, ExternalLink, Info, BookOpen } from 'lucide-react';

const Manual: React.FC = () => {
  return (
    <div className="bg-[#0b0e14] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-fade-in flex flex-col min-h-[700px] h-[calc(100vh-12rem)]">
      <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20 shadow-inner">
            <BookOpen size={28} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Manual Operacional</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Guia de treinamento e procedimentos</p>
          </div>
        </div>
        <a 
          href="https://www.canva.com/design/DAG95NSKkKA/if2-2d1bE7rN-kHEuDu55w/view?utm_content=DAG95NSKkKA&utm_campaign=designshare&utm_medium=embeds&utm_source=link"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border border-slate-700 active:scale-95"
        >
          <ExternalLink size={16} /> Abrir em Nova Aba
        </a>
      </div>
      
      <div className="flex-1 relative w-full overflow-hidden bg-black shadow-inner">
        <iframe 
          loading="lazy" 
          className="absolute inset-0 w-full h-full border-0"
          src="https://www.canva.com/design/DAG95NSKkKA/if2-2d1bE7rN-kHEuDu55w/view?embed" 
          allowFullScreen 
          allow="fullscreen"
          title="Manual do Sistema ControlVision"
        ></iframe>
      </div>

      <div className="p-4 bg-slate-950/80 backdrop-blur-sm border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 border border-blue-500/20">
            <Info size={18} />
          </div>
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Dica: Use as setas laterais ou clique na apresentação para navegar entre os slides.</p>
        </div>
        <div className="flex gap-2 sm:hidden w-full">
           <a 
            href="https://www.canva.com/design/DAG95NSKkKA/if2-2d1bE7rN-kHEuDu55w/view?utm_content=DAG95NSKkKA&utm_campaign=designshare&utm_medium=embeds&utm_source=link"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-center py-3 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg"
          >
            Ver em Tela Cheia
          </a>
        </div>
      </div>
    </div>
  );
};

export default Manual;
