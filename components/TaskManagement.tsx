
import React, { useState, useEffect } from 'react';
import { User, Task } from '../types';
import { authService } from '../services/auth';
import { taskService } from '../services/tasks';
import { db } from '../services/firebase';
import { ref, onValue, off } from 'firebase/database';
import { ClipboardList, Plus, Calendar, User as UserIcon, Clock, CheckCircle2, AlertCircle, PlayCircle, Trash2, MessageSquare, AlertTriangle, X } from 'lucide-react';

interface TaskManagementProps {
    currentUser: User;
}

const TaskManagement: React.FC<TaskManagementProps> = ({ currentUser }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [operators, setOperators] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form State
    const [showModal, setShowModal] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        assignedToId: '',
        dueDate: ''
    });

    // Delete Confirmation State
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        // Load Operators
        authService.listUsers().then(users => {
            // Filter only non-admins (Operators)
            setOperators(users.filter(u => u.role !== 'admin'));
        });

        // Listen to Tasks
        const tasksRef = ref(db, 'tasks');
        const unsub = onValue(tasksRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const list = Object.keys(data).map(key => data[key]);
                setTasks(list.reverse()); // Newest first
            } else {
                setTasks([]);
            }
            setLoading(false);
        });

        return () => {
            unsub();
            off(tasksRef);
        };
    }, []);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.assignedToId || !newTask.title || !newTask.dueDate) {
            alert("Preencha todos os campos obrigatórios.");
            return;
        }

        const assignedUser = operators.find(u => u.uid === newTask.assignedToId);
        
        await taskService.createTask({
            title: newTask.title,
            description: newTask.description,
            assignedToId: newTask.assignedToId,
            assignedToName: assignedUser?.name || 'Desconhecido',
            createdBy: currentUser.name,
            createdAt: new Date().toISOString(),
            dueDate: newTask.dueDate,
            status: 'pending',
            attachments: []
        });

        setShowModal(false);
        setNewTask({ title: '', description: '', assignedToId: '', dueDate: '' });
        alert("Tarefa delegada com sucesso!");
    };

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (deleteId) {
            await taskService.deleteTask(deleteId);
            setDeleteId(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'completed': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'in_progress': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            default: return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        }
    };

    const getStatusLabel = (status: string) => {
        switch(status) {
            case 'completed': return 'Concluída';
            case 'in_progress': return 'Em Andamento';
            default: return 'Pendente';
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ClipboardList className="text-amber-500" />
                        Gestão de Tarefas (Supervisão)
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Delegue e monitore tarefas para a equipe de monitoramento.
                    </p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all"
                >
                    <Plus size={20} /> Nova Tarefa
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {tasks.length === 0 && !loading && (
                    <div className="text-center py-20 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-xl">
                        <ClipboardList size={48} className="mx-auto mb-4 text-slate-600" />
                        <p className="text-slate-500">Nenhuma tarefa registrada.</p>
                    </div>
                )}

                {tasks.map(task => (
                    <div key={task.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all shadow-md group">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(task.status)}`}>
                                        {getStatusLabel(task.status)}
                                    </span>
                                    <h3 className="text-lg font-bold text-white">{task.title}</h3>
                                </div>
                                <p className="text-slate-400 text-sm mb-4 leading-relaxed">{task.description || "Sem descrição."}</p>
                                
                                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                        <UserIcon size={14} className="text-blue-500" />
                                        Atribuído a: <span className="text-slate-300 font-medium">{task.assignedToName}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={14} className="text-amber-500" />
                                        Prazo: <span className="text-slate-300">{new Date(task.dueDate).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    {task.completedAt && (
                                        <div className="flex items-center gap-1.5 text-emerald-500">
                                            <CheckCircle2 size={14} />
                                            Concluído em: {new Date(task.completedAt).toLocaleString('pt-BR')}
                                        </div>
                                    )}
                                </div>
                                
                                {task.completionNote && (
                                    <div className="mt-4 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg">
                                        <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1 flex items-center gap-1">
                                            <MessageSquare size={10} /> Resolução do Operador:
                                        </p>
                                        <p className="text-xs text-slate-300 italic">"{task.completionNote}"</p>
                                    </div>
                                )}

                                {task.attachments && task.attachments.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-slate-800">
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Anexos do Operador:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {task.attachments.map((att, idx) => (
                                                <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-slate-800 rounded text-xs text-blue-400 hover:text-blue-300 border border-slate-700 hover:border-blue-500/50 transition-colors">
                                                    {att.name}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* BOTÃO DE EXCLUSÃO */}
                            <div className="flex md:flex-col items-center justify-center border-l border-slate-800 pl-4 md:gap-2">
                                <button 
                                    onClick={() => handleDeleteClick(task.id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-rose-600/10 hover:bg-rose-600 hover:text-white text-rose-500 border border-rose-600/20 rounded-lg transition-all shadow-sm group"
                                    title="Apagar Tarefa Permanentemente"
                                >
                                    <Trash2 size={16} />
                                    <span className="text-xs font-bold uppercase whitespace-nowrap">APAGAR TAREFA</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Criar Tarefa */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg p-6">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                            <h3 className="text-xl font-bold text-white">Nova Tarefa</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white">X</button>
                        </div>
                        
                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Título da Tarefa</label>
                                <input 
                                    type="text" 
                                    required
                                    value={newTask.title}
                                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="Ex: Verificar Câmera G2"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Operador Responsável</label>
                                <select 
                                    required
                                    value={newTask.assignedToId}
                                    onChange={e => setNewTask({...newTask, assignedToId: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="">Selecione um operador...</option>
                                    {operators.map(op => (
                                        <option key={op.uid} value={op.uid}>{op.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Data Limite</label>
                                <input 
                                    type="date" 
                                    required
                                    value={newTask.dueDate}
                                    onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-white text-sm [color-scheme:dark]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Descrição Detalhada</label>
                                <textarea 
                                    value={newTask.description}
                                    onChange={e => setNewTask({...newTask, description: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-white text-sm focus:border-blue-500 focus:outline-none h-24 resize-none"
                                    placeholder="Descreva o que precisa ser feito..."
                                />
                            </div>
                            
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Cancelar</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-sm">Criar Tarefa</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
            {deleteId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm p-6 relative">
                        <button 
                            onClick={() => setDeleteId(null)} 
                            className="absolute top-4 right-4 text-slate-500 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                        
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/20">
                                <AlertTriangle className="text-rose-500 w-8 h-8" />
                            </div>
                            
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Excluir Tarefa?</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Você realmente deseja apagar esta tarefa? <br/>
                                    <span className="text-rose-400 font-semibold">Essa ação não pode ser desfeita.</span>
                                </p>
                            </div>
                            
                            <div className="flex gap-3 w-full pt-2">
                                <button 
                                    onClick={() => setDeleteId(null)}
                                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-lg shadow-rose-900/20 transition-all text-sm flex items-center justify-center gap-2"
                                >
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

export default TaskManagement;
