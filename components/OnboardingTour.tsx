
import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Shield, LayoutDashboard, Video, Settings, Bell, CheckCircle2, ClipboardList, MessageSquare, HelpCircle, Smartphone, ArrowUpCircle, Warehouse, Volume2 } from 'lucide-react';
import { UserRole } from '../types';

interface OnboardingTourProps {
  role: UserRole;
  onFinish: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ role, onFinish }) => {
  const [step, setStep] = useState(0);

  const isAdmin = role === 'admin';
  const isManager = role === 'manager';

  const steps = [
    {
      title: "Manual ControlVision v2.5",
      description: "Bem-vindo à nova versão! O sistema foi atualizado com melhorias de performance, novos recursos de gestão e total compatibilidade com celulares.",
      icon: <HelpCircle size={48} className="text-amber-400" />,
    },
    {
      title: "CCOS no seu Bolso",
      description: "Agora o ControlVision é totalmente responsivo. Você pode monitorar câmeras, responder chats e gerenciar tarefas diretamente do seu smartphone com layout adaptado.",
      icon: <Smartphone size={48} className="text-blue-400" />,
    },
    {
      title: "Monitoramento Unificado",
      description: "Simplificamos as unidades! 'Expressa SJM' e 'Meriti' agora são uma única unidade (MERITI) para facilitar a geração de relatórios e a filtragem de dados.",
      icon: <Warehouse size={48} className="text-emerald-500" />,
    },
    {
      title: "Navegação Rápida",
      description: "Ao navegar por listas longas, um botão flutuante 'Voltar ao Topo' aparecerá no canto inferior para que você retorne ao cabeçalho instantaneamente.",
      icon: <ArrowUpCircle size={48} className="text-purple-500" />,
    },
    {
        title: isAdmin ? "Gestão de Tarefas (Supervisão)" : "Minhas Tarefas (Operador)",
        description: isAdmin 
            ? "Delegue tarefas e receba alertas sonoros quando um operador concluir um chamado. Use os novos botões de exclusão para remover tarefas concluídas e manter o banco limpo." 
            : "Visualize suas tarefas, anexe evidências fotográficas e registre comentários. Agora o sistema emite um 'ding' sempre que uma nova tarefa lhe for atribuída.",
        icon: <ClipboardList size={48} className="text-indigo-500" />
    },
    {
        title: "Pendências e Comunicação",
        description: "No Chat e nas Pendências de E-mail, você pode registrar solicitações críticas. Administradores agora possuem o botão de 'Apagar' para remover registros resolvidos permanentemente.",
        icon: <MessageSquare size={48} className="text-pink-500" />
    },
    {
      title: "Alertas em Tempo Real",
      description: "O ícone de sino no topo centraliza alertas de vencimento de documentos (AVCB, Alvarás) e notificações de equipe. Mantenha o som ativado para alertas sonoros!",
      icon: <Volume2 size={48} className="text-rose-500" />,
    },
    {
      title: "Tudo Pronto!",
      description: "O sistema está configurado para máxima eficiência. Se precisar rever este manual, clique no ícone de interrogação (?) no cabeçalho a qualquer momento.",
      icon: <CheckCircle2 size={48} className="text-emerald-400" />,
    }
  ].filter(Boolean) as any[];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onFinish();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const currentStepData = steps[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Progress Bar */}
        <div className="h-1 bg-slate-800 w-full">
            <div 
                className="h-full bg-amber-500 transition-all duration-300 ease-out"
                style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            ></div>
        </div>

        {/* Close Button */}
        <button 
            onClick={onFinish}
            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors p-2"
        >
            <X size={20} />
        </button>

        <div className="p-8 flex flex-col items-center text-center flex-1">
            <div className="mb-6 p-6 bg-slate-950 rounded-full border border-slate-800 shadow-inner transform transition-all duration-500 hover:scale-110">
                {currentStepData.icon}
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-3">
                {currentStepData.title}
            </h2>
            
            <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-sm">
                {currentStepData.description}
            </p>
        </div>

        {/* Footer Navigation */}
        <div className="p-6 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
            <div className="flex gap-2">
                {steps.map((_, idx) => (
                    <div 
                        key={idx} 
                        className={`w-2 h-2 rounded-full transition-colors ${idx === step ? 'bg-amber-500' : 'bg-slate-800'}`}
                    />
                ))}
            </div>

            <div className="flex gap-3">
                {step > 0 && (
                    <button 
                        onClick={handlePrev}
                        className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors"
                    >
                        Voltar
                    </button>
                )}
                <button 
                    onClick={handleNext}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20"
                >
                    {step === steps.length - 1 ? 'Concluir' : 'Próximo'}
                    {step < steps.length - 1 && <ChevronRight size={16} />}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
