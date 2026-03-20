
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, MapPin, Tag, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { Camera } from '../../types';

interface IncidentModalProps {
    selectedCamForInfo: Camera | null;
    closeInfoModal: () => void;
    localTicket: string;
    setLocalTicket: (val: string) => void;
    localObs: string;
    setLocalObs: (val: string) => void;
    isEditingModal: boolean;
    handleSaveInfo: () => void;
    handleResolveIssue: (uuid: string) => void;
    savingId: string | null;
}

const IncidentModal: React.FC<IncidentModalProps> = ({
    selectedCamForInfo,
    closeInfoModal,
    localTicket,
    setLocalTicket,
    localObs,
    setLocalObs,
    isEditingModal,
    handleSaveInfo,
    handleResolveIssue,
    savingId
}) => {
    return (
        <AnimatePresence>
            {selectedCamForInfo && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
                    >
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedCamForInfo.channelType === 'alarm' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">{selectedCamForInfo.name}</h3>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedCamForInfo.channelType === 'alarm' ? 'Canal de Alarme' : 'Câmera de Vídeo'}</p>
                                </div>
                            </div>
                            <button onClick={closeInfoModal} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={24} /></button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                                        <MapPin size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Localização</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase">{selectedCamForInfo.location}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                                        <Tag size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Galpão</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase">{selectedCamForInfo.warehouse}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">Número do Chamado</label>
                                    {isEditingModal ? (
                                        <input 
                                            type="text"
                                            value={localTicket}
                                            onChange={(e) => setLocalTicket(e.target.value)}
                                            placeholder="Ex: 123456"
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                    ) : (
                                        <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 min-h-[48px] flex items-center">
                                            {selectedCamForInfo.ticket ? (
                                                <span className="text-sm font-mono font-bold text-blue-500">#{selectedCamForInfo.ticket}</span>
                                            ) : (
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Nenhum chamado aberto</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">Observações Técnicas</label>
                                    {isEditingModal ? (
                                        <textarea 
                                            value={localObs}
                                            onChange={(e) => setLocalObs(e.target.value)}
                                            placeholder="Descreva o problema ou status da manutenção..."
                                            rows={4}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                                        />
                                    ) : (
                                        <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 min-h-[100px]">
                                            {selectedCamForInfo.observation ? (
                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{selectedCamForInfo.observation}</p>
                                            ) : (
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Nenhuma observação registrada</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                            {isEditingModal ? (
                                <>
                                    <button 
                                        onClick={handleSaveInfo}
                                        disabled={savingId === selectedCamForInfo.uuid}
                                        className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
                                    >
                                        {savingId === selectedCamForInfo.uuid ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                                        Salvar Alterações
                                    </button>
                                    <button onClick={() => handleResolveIssue(selectedCamForInfo.uuid)} className="flex-1 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-600/20 font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest">
                                        <CheckCircle2 size={18} />
                                        Marcar como Online
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => handleResolveIssue(selectedCamForInfo.uuid)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/20">
                                    <CheckCircle2 size={18} />
                                    Resolver Incidente
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default IncidentModal;
