
import React, { useState, useEffect } from 'react';
import { User, Task } from '../types';
import { taskService } from '../services/tasks';
import { db } from '../services/firebase';
import { ref, onValue, off } from 'firebase/database';
import { ClipboardList, Play, CheckSquare, Upload, Paperclip, Clock, FileText, Loader2, X, MessageSquare, Trash2, AlertTriangle, Save } from 'lucide-react';

interface MyTasksProps {
    currentUser: User;
}

const MyTasks: React.FC<MyTasksProps> = ({ currentUser }) => {
    const [myTasks, setMyTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
    const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

    // State for live editing notes on the card
    const [liveNotes, setLiveNotes] = useState<{ [key: string]: string }>({});

    // Completion Modal State
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

    // Delete Confirmation State
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        const tasksRef = ref(db, 'tasks');
        const unsub = onValue(tasksRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const list: Task[] = Object.keys(data).map(key => data[key]);
                const userTasks = list.filter(t => t.assignedToId === currentUser.uid);
                
                userTasks.sort((a, b) => {
                    const statusOrder = { 'in_progress': 0, 'pending': 1, 'completed': 2 };
                    return (statusOrder[a.status as keyof typeof statusOrder] || 0) - (statusOrder[b.status as keyof typeof statusOrder] || 0);
                });

                // Pre-fill live notes if not already edited
                const notes: { [key: string]: string } = {};
                userTasks.forEach(t => {
                    notes[t.id] = t.completionNote || '';
                });
                setLiveNotes(prev => ({ ...notes, ...prev }));
                
                setMyTasks(userTasks);
            } else {
                setMyTasks([]);
            }
            setLoading(false);
        });

        return () => off(tasksRef);
    }, [currentUser.uid]);

    const handleStartTask = async (taskId: string) => {
        await taskService.updateTaskStatus(taskId, 'in_progress');
    };

    const handleDeleteClick = (taskId: string) => {
        setDeleteId(taskId);
    };

    const confirmDelete = async () => {
        if (deleteId) {
            await taskService.deleteTask(deleteId);
            setDeleteId(null);
        }
    };

    const handleSaveNote = async (taskId: string) => {
        setSavingNoteId(taskId);
        try {
            await taskService.updateTaskNote(taskId, liveNotes[taskId] || '');
            alert("Comentário salvo!");
        } catch (error) {
            alert("Erro ao salvar comentário.");
        } finally {
            setSavingNoteId(null);
        }
    };

    const openCompletionModal = (taskId: string) => {
        setCompletingTaskId(taskId);
        setShowCompleteModal(true);
    };

    const handleConfirmCompletion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!completingTaskId) return;

        try {
            await taskService.updateTaskStatus(completingTaskId, 'completed', liveNotes[completingTaskId]);
            setShowCompleteModal(false);
            setCompletingTaskId(null);
        } catch (error) {
            console.error(error);
            alert("Erro ao concluir tarefa.");
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, taskId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingTaskId(taskId);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            if (evt.target?.result) {
                try {
                    await taskService.addAttachment(taskId, {
                        name: file.name,
                        url: evt.target.result as string,
                        type: 'image'
                    });
                    alert("Arquivo anexado!");
                } catch (err) {
                    alert("Erro ao enviar.");
                } finally {
                    setUploadingTaskId(null);
                }
            }
        };
        reader.readAsDataURL(file);
    };

    const triggerFileInput = (taskId: string) => {
        document.getElementById(`file-input-${taskId}`)?.click();
    };

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6 animate-fade-in pb-12">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <CheckSquare className="text-emerald-500" />
                    Minhas Tarefas
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                    Tarefas atribuídas pela supervisão. Inicie, anexe evidências, escreva seus comentários e conclua.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : myTasks.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-xl">
                    <ClipboardList size={48} className="mx-auto mb-4 text-emerald-500/50" />
                    <h3 className="text-white font-bold">Tudo em dia!</h3>
                    <p className="text-slate-500">Você não tem tarefas pendentes no momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {myTasks.map(task => (
                        <div key={task.id} className={`border rounded-xl p-5 shadow-lg flex flex-col transition-all relative overflow-hidden
                            ${task.status === 'completed' 
                                ? 'bg-slate-900/50 border-slate-800 opacity-70' 
                                : 'bg-slate-900 border-slate-700 hover:border-blue-500/50'}
                        `}>
                            <div className={`absolute top-0 left-0 right-0 h-1 
                                ${task.status === 'pending' ? 'bg-amber-500' : task.status === 'in_progress' ? 'bg-blue-500' : 'bg-emerald-500'}
                            `}></div>

                            <div className="flex justify-between items-start mb-3 mt-1">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-white leading-tight">{task.title}</h3>
                                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                                        <div className="flex items-center gap-1.5"><Clock size={14} className="text-amber-500" /> Prazo: {new Date(task.dueDate).toLocaleDateString('pt-BR')}</div>
                                        <div className="flex items-center gap-1.5"><FileText size={14} className="text-blue-500" /> Supervisão: {task.createdBy}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border
                                        ${task.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                        task.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                                        'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}
                                    `}>
                                        {task.status === 'pending' ? 'Pendente' : task.status === 'in_progress' ? 'Em Andamento' : 'Concluída'}
                                    </span>
                                    <button onClick={() => handleDeleteClick(task.id)} className="p-2 bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded transition-colors" title="Apagar Tarefa"><Trash2 size={16} /></button>
                                </div>
                            </div>

                            <div className="bg-slate-950/30 p-4 rounded-lg border border-slate-800 mb-6">
                                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{task.description}</p>
                            </div>

                            {/* COMMENT SECTION FOR OPERATOR */}
                            {(task.status === 'in_progress' || task.status === 'completed') && (
                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                                            <MessageSquare size={14} className="text-blue-500" />
                                            Seu Comentário / Relatório de Execução
                                        </label>
                                        {task.status === 'in_progress' && (
                                            <button 
                                                onClick={() => handleSaveNote(task.id)}
                                                disabled={savingNoteId === task.id}
                                                className="text-[10px] bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-2 py-1 rounded border border-blue-600/30 transition-all flex items-center gap-1 font-bold uppercase"
                                            >
                                                {savingNoteId === task.id ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                                                Salvar Rascunho
                                            </button>
                                        )}
                                    </div>
                                    <textarea 
                                        readOnly={task.status === 'completed'}
                                        value={liveNotes[task.id] || ''}
                                        onChange={(e) => setLiveNotes({ ...liveNotes, [task.id]: e.target.value })}
                                        placeholder="Escreva aqui o que foi verificado ou observações sobre a tarefa..."
                                        className={`w-full bg-slate-950 border rounded-lg p-3 text-white text-sm focus:outline-none transition-all h-28 resize-none leading-relaxed
                                            ${task.status === 'completed' ? 'border-slate-800 text-slate-400 italic' : 'border-slate-700 focus:border-blue-500'}
                                        `}
                                    />
                                </div>
                            )}

                            {/* Attachments List */}
                            {task.attachments && task.attachments.length > 0 && (
                                <div className="mb-6">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Evidências Anexadas:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {task.attachments.map((att, i) => (
                                            <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/5 px-3 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-500/10 transition-colors">
                                                <Paperclip size={12} /> {att.name}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ACTIONS */}
                            {task.status !== 'completed' && (
                                <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                                    {task.status === 'pending' ? (
                                        <button 
                                            onClick={() => handleStartTask(task.id)}
                                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
                                        >
                                            <Play size={20} /> Iniciar Execução
                                        </button>
                                    ) : (
                                        <>
                                            <div className="flex-1">
                                                <input 
                                                    id={`file-input-${task.id}`} 
                                                    type="file" 
                                                    className="hidden" 
                                                    onChange={(e) => handleFileUpload(e, task.id)}
                                                    accept="image/*,application/pdf"
                                                />
                                                <button 
                                                    onClick={() => triggerFileInput(task.id)}
                                                    disabled={uploadingTaskId === task.id}
                                                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-700"
                                                >
                                                    {uploadingTaskId === task.id ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                                                    Anexar Evidência
                                                </button>
                                            </div>
                                            <button 
                                                onClick={() => openCompletionModal(task.id)}
                                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
                                            >
                                                <CheckSquare size={20} /> Concluir Tarefa
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* COMPLETION MODAL */}
            {showCompleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <CheckSquare className="text-emerald-500" />
                                Finalizar Tarefa
                            </h3>
                            <button onClick={() => setShowCompleteModal(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                        </div>
                        
                        <div className="space-y-4">
                            <p className="text-slate-400 text-sm">Deseja marcar esta tarefa como concluída? Seus comentários e anexos serão registrados permanentemente.</p>
                            
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowCompleteModal(false)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-medium">Voltar</button>
                                <button onClick={handleConfirmCompletion} className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-bold shadow-lg shadow-emerald-900/20">Confirmar Conclusão</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {deleteId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm p-6 relative">
                        <button onClick={() => setDeleteId(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/20">
                                <AlertTriangle className="text-rose-500 w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Excluir Tarefa?</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">Essa ação é irreversível.</p>
                            </div>
                            <div className="flex gap-3 w-full pt-2">
                                <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors text-sm">Cancelar</button>
                                <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-lg text-sm flex items-center justify-center gap-2">
                                    <Trash2 size={16} /> Sim, Apagar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyTasks;
