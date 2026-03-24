
import React from 'react';
import { ClipboardList, Clock, User, Trash2 } from 'lucide-react';
import { ShiftNote } from '../../types';

interface ShiftNotesProps {
    sortedShiftNotes: ShiftNote[];
}

const ShiftNotes: React.FC<ShiftNotesProps> = ({
    sortedShiftNotes
}) => {
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] shadow-xl flex flex-col h-[400px] overflow-hidden">
            <h3 className="text-slate-800 dark:text-slate-200 font-black text-[10px] uppercase tracking-widest mb-6 flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <ClipboardList size={16} />
                </div>
                Notas do Plantão
            </h3>
            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1">
                {sortedShiftNotes.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-[9px] uppercase font-black tracking-widest text-center px-4 gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                            <ClipboardList size={24} className="opacity-20" />
                        </div>
                        <p>Nenhuma nota registrada</p>
                    </div>
                ) : (
                    sortedShiftNotes.map(note => (
                        <div key={note.id} className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50 hover:border-amber-500/20 transition-all group">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/10">
                                        <User size={12} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase truncate max-w-[120px] tracking-tight">{note.author}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-400">
                                    <Clock size={10} />
                                    <span className="text-[9px] font-mono font-bold uppercase">{new Date(note.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/30">{note.content}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ShiftNotes;
