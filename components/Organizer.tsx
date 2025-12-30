
import React, { useState } from 'react';
import { Note, ShiftNote, User as AppUser } from '../types';
import { 
  Calendar, Clock, CheckSquare, Square, Trash2, Plus, 
  NotebookPen, History, UserCircle, Save, X, Edit2
} from 'lucide-react';

interface OrganizerProps {
  currentUser: AppUser;
  notes: Note[];
  shiftNotes: ShiftNote[];
  onAddNote: (note: Note) => void;
  onToggleNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onEditNote: (id: string, newContent: string) => void;
  onAddShiftNote: (note: ShiftNote) => void;
  onDeleteShiftNote: (id: string) => void;
}

const Organizer: React.FC<OrganizerProps> = ({
  currentUser, notes, shiftNotes,
  onAddNote, onToggleNote, onDeleteNote, onEditNote,
  onAddShiftNote, onDeleteShiftNote
}) => {
  // State for Inputs
  const [noteInput, setNoteInput] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  const [shiftInput, setShiftInput] = useState('');
  const [showShiftModal, setShowShiftModal] = useState(false);

  // --- NOTES HANDLERS ---
  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    onAddNote({
      id: Date.now().toString(),
      content: noteInput,
      completed: false,
      createdAt: new Date().toISOString()
    });
    setNoteInput('');
  };

  const startEditingNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingNoteText(note.content);
  };

  const saveEditedNote = (id: string) => {
    if (editingNoteText.trim()) {
      onEditNote(id, editingNoteText);
    }
    setEditingNoteId(null);
  };

  // --- SHIFT NOTES HANDLERS ---
  const handleShiftSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!shiftInput.trim()) return;
      onAddShiftNote({
          id: Date.now().toString(),
          author: currentUser.name,
          authorId: currentUser.uid,
          content: shiftInput,
          createdAt: new Date().toISOString()
      });
      setShiftInput('');
      setShowShiftModal(false);
  };

  // Sort Logic
  const sortedShiftNotes = [...shiftNotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
         <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="text-amber-500" />
            Agenda e Anotações
         </h2>
         <p className="text-slate-400 text-sm">Gerencie anotações de plantão e lembretes particulares.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* COLUMN 1: SHIFT REPORTS (Ocorrências de Plantão) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col h-[700px] border-t-4 border-t-amber-500">
           <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-amber-500 font-bold uppercase tracking-wider text-sm">
                  <History size={20} /> Relatório de Plantão
              </div>
              <button onClick={() => setShowShiftModal(true)} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-amber-900/40 flex items-center gap-2 text-sm font-bold">
                 <Plus size={18} /> Novo Registro
              </button>
           </div>

           <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {sortedShiftNotes.length === 0 && (
                <div className="text-center text-slate-600 text-xs italic py-20">
                  Nenhum registro de plantão. Clique no botão acima para iniciar.
                </div>
              )}
              {sortedShiftNotes.map(sn => (
                <div key={sn.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-amber-500/30 transition-all group relative">
                   <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold border border-amber-500/20 text-xs">
                         {sn.author.charAt(0)}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white uppercase block">{sn.author}</span>
                        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          <Clock size={10} /> {new Date(sn.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                   </div>
                   <p className="text-sm text-slate-300 leading-relaxed mb-1 whitespace-pre-wrap">{sn.content}</p>
                   { (currentUser.role === 'admin' || currentUser.uid === sn.authorId) && (
                      <button onClick={() => onDeleteShiftNote(sn.id)} className="absolute top-4 right-4 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                          <Trash2 size={16} />
                      </button>
                   )}
                </div>
              ))}
           </div>
        </div>

        {/* COLUMN 2: DAILY NOTES */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col h-[700px] border-t-4 border-t-blue-500">
           <div className="flex items-center gap-2 mb-6 text-blue-400 font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-4">
              <NotebookPen size={20} /> Anotações Particulares
           </div>

           <form onSubmit={handleNoteSubmit} className="flex gap-2 mb-6">
              <input 
                type="text" 
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Lembrete rápido..." 
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg transition-all shadow-lg shadow-blue-900/40">
                <Plus size={24} />
              </button>
           </form>

           <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {notes.length === 0 && (
                <div className="text-center text-slate-600 text-xs italic py-20">
                  Sua lista de anotações está vazia.
                </div>
              )}
              {notes.map(note => (
                <div key={note.id} className={`p-4 rounded-xl border transition-all group ${note.completed ? 'bg-slate-950/50 border-slate-800 opacity-60' : 'bg-slate-800/40 border-slate-700 hover:border-blue-500/50'}`}>
                   <div className="flex items-start gap-4">
                      <button 
                        onClick={() => onToggleNote(note.id)} 
                        className={`mt-0.5 shrink-0 ${note.completed ? 'text-emerald-500' : 'text-slate-500 hover:text-white'}`}
                      >
                        {note.completed ? <CheckSquare size={22} /> : <Square size={22} />}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                         {editingNoteId === note.id ? (
                           <div className="flex gap-2">
                             <input 
                               value={editingNoteText}
                               onChange={(e) => setEditingNoteText(e.target.value)}
                               className="w-full bg-slate-950 text-white text-sm p-2 rounded border border-blue-500 focus:outline-none"
                               autoFocus
                               onKeyDown={(e) => e.key === 'Enter' && saveEditedNote(note.id)}
                             />
                             <button onClick={() => saveEditedNote(note.id)} className="text-emerald-500 p-1"><Save size={20}/></button>
                           </div>
                         ) : (
                           <p className={`text-sm break-words leading-relaxed ${note.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                              {note.content}
                           </p>
                         )}
                      </div>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         {editingNoteId !== note.id && (
                           <button onClick={() => startEditingNote(note)} className="text-slate-500 hover:text-blue-400 p-1.5">
                             <Edit2 size={16} />
                           </button>
                         )}
                         <button onClick={() => onDeleteNote(note.id)} className="text-slate-500 hover:text-rose-500 p-1.5">
                            <Trash2 size={16} />
                         </button>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>

      </div>

      {/* --- MODAL: SHIFT NOTE --- */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg p-6">
                <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <History className="text-amber-500" />
                        Registro de Ocorrência
                    </h3>
                    <button onClick={() => setShowShiftModal(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 mb-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-lg border border-amber-500/20">
                        {currentUser.name.charAt(0)}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white uppercase">{currentUser.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Plantonista em {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>
                <form onSubmit={handleShiftSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Descrição do Plantão</label>
                        <textarea 
                            required
                            autoFocus
                            placeholder="Descreva as ocorrências e observações do turno..." 
                            value={shiftInput} 
                            onChange={e => setShiftInput(e.target.value)} 
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-white text-sm focus:border-amber-500 focus:outline-none h-48 resize-none leading-relaxed" 
                        />
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setShowShiftModal(false)} className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium">Cancelar</button>
                        <button type="submit" className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shadow-lg shadow-amber-900/40 transition-transform active:scale-95">Salvar Registro</button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
};

export default Organizer;
