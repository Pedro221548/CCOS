
import React, { useMemo, useState, useEffect } from 'react';
import { User, ProcessedWorker, AccessPoint } from '../types';
import { WAREHOUSE_LIST } from '../constants';
import { Users, Filter, Search, Activity, ChevronDown, ChevronUp, AlertCircle, Calendar, FileText, CheckSquare, Square, MessageCircle, Mail, Copy, X } from 'lucide-react';

interface AccessManagementProps {
    accessPoints: AccessPoint[];
    thirdPartyWorkers: ProcessedWorker[];
    currentUser: User;
}

const AccessManagement: React.FC<AccessManagementProps> = ({ accessPoints, thirdPartyWorkers, currentUser }) => {
    const [activeTab, setActiveTab] = useState<'history' | 'report'>('history');
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
    const [peopleSearch, setPeopleSearch] = useState('');
    const [dateSearch, setDateSearch] = useState(''); 
    
    // State for expanding person details
    const [expandedPersonKey, setExpandedPersonKey] = useState<string | null>(null);

    // State for Report Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [generatedMessage, setGeneratedMessage] = useState('');

    const isAuthorizedForReport = currentUser.role === 'admin' || currentUser.role === 'manager';

    // --- PERMISSIONS ---
    // Ajuste: Admin vê tudo, Gestor vê apenas o que lhe foi permitido no cadastro.
    const allowedWarehouses = useMemo(() => {
        if (currentUser.role === 'admin') return WAREHOUSE_LIST;
        if (currentUser.role === 'manager') return currentUser.allowedWarehouses || [];
        return []; 
    }, [currentUser]);

    // Safety check: ensure selected warehouse is valid
    useEffect(() => {
        if (selectedWarehouse !== 'ALL' && !allowedWarehouses.includes(selectedWarehouse)) {
            setSelectedWarehouse('ALL');
        }
    }, [allowedWarehouses, selectedWarehouse]);

    // --- DATA FILTERING ---
    const filteredWorkers = useMemo(() => {
        // 1. Aplica restrição de permissão (Gestor vê apenas seus galpões)
        let subset = thirdPartyWorkers;
        
        if (currentUser.role === 'manager') {
            subset = subset.filter(w => allowedWarehouses.includes(w.unit));
        }
        
        // 2. Filtro do Dropdown (Se selecionou um galpão específico)
        if (selectedWarehouse !== 'ALL') {
            subset = subset.filter(w => w.unit === selectedWarehouse);
        }

        // 3. Filtro de Data
        if (dateSearch) {
            subset = subset.filter(w => w.date === dateSearch);
        }

        return subset;
    }, [thirdPartyWorkers, selectedWarehouse, dateSearch, currentUser.role, allowedWarehouses]);

    // --- ANALYTICS: GROUPED PEOPLE (For People List) ---
    const groupedPeople = useMemo(() => {
        const groups: { [key: string]: { id: string, name: string, company: string, history: ProcessedWorker[] } } = {};
        
        filteredWorkers.forEach(w => {
            const key = `${w.name.trim().toUpperCase()}|${w.company.trim().toUpperCase()}`;
            
            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    name: w.name,
                    company: w.company,
                    history: []
                };
            }
            groups[key].history.push(w);
        });

        return Object.values(groups)
            .map(person => {
                person.history.sort((a, b) => {
                    const tA = `${a.date} ${a.time}`;
                    const tB = `${b.date} ${b.time}`;
                    return tB.localeCompare(tA);
                });
                return person;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredWorkers]);

    const togglePersonExpand = (key: string) => {
        setExpandedPersonKey(prev => prev === key ? null : key);
    };

    // --- REPORT SELECTION LOGIC ---
    const handleSelectRecord = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleSelectPersonGroup = (personHistory: ProcessedWorker[]) => {
        const idsToToggle = personHistory.map(w => w.id);
        const allSelected = idsToToggle.every(id => selectedIds.has(id));
        
        const newSet = new Set(selectedIds);
        if (allSelected) {
            idsToToggle.forEach(id => newSet.delete(id));
        } else {
            idsToToggle.forEach(id => newSet.add(id));
        }
        setSelectedIds(newSet);
    };

    // --- GENERATE MESSAGE ---
    useEffect(() => {
        if (selectedIds.size === 0) {
            setGeneratedMessage('');
            return;
        }

        const selectedRecords = filteredWorkers.filter(w => selectedIds.has(w.id));
        let msg = "";
        selectedRecords.forEach(r => {
            const dateStr = r.date.split('-').reverse().join('/');
            msg += `Segue o acesso de ${r.name} na data ${dateStr} entrada ${r.time}\n`;
        });

        setGeneratedMessage(msg.trim());
    }, [selectedIds, filteredWorkers]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedMessage);
        alert("Mensagem copiada para a área de transferência!");
    };

    const sendEmail = () => {
        const subject = encodeURIComponent("Relatório de Acessos");
        const body = encodeURIComponent(generatedMessage);
        window.open(`mailto:?subject=${subject}&body=${body}`);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-24 max-w-7xl mx-auto p-4 md:p-6 relative">
            
            {/* Header & Filter */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="text-purple-500" />
                        Gestão de Acessos
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Histórico detalhado de fluxo de pessoas.
                        {currentUser.role === 'manager' && <span className="ml-2 text-purple-400 font-bold">(Visualização Restrita)</span>}
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    {/* Internal Tabs */}
                    {isAuthorizedForReport && (
                        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                            <button 
                                onClick={() => setActiveTab('history')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                Histórico
                            </button>
                            <button 
                                onClick={() => setActiveTab('report')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'report' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                <FileText size={14} /> Gerar Relatório
                            </button>
                        </div>
                    )}

                    <div className="relative z-20">
                        <select 
                            value={selectedWarehouse} 
                            onChange={(e) => setSelectedWarehouse(e.target.value)} 
                            className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-purple-500 appearance-none cursor-pointer min-w-[200px]"
                        >
                            <option value="ALL">
                                {currentUser.role === 'manager' ? 'Meus Galpões Permitidos' : 'Todos os Galpões'}
                            </option>
                            {allowedWarehouses.map(wh => (
                                <option key={wh} value={wh}>{wh}</option>
                            ))}
                        </select>
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                    </div>
                </div>
            </div>

            {/* PEOPLE LIST */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-lg min-h-[500px]">
                {currentUser.role === 'manager' && allowedWarehouses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <AlertCircle size={48} className="text-amber-500 mb-4" />
                        <h3 className="text-lg font-bold text-white">Acesso Restrito</h3>
                        <p className="text-slate-400 max-w-xs">Você não possui nenhum galpão vinculado ao seu perfil. Solicite ao administrador.</p>
                    </div>
                ) : (
                    <div className="animate-fade-in space-y-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Users size={20} className="text-amber-500" />
                                {activeTab === 'report' ? 'Selecione os Acessos para Relatório' : 'Histórico por Pessoa'}
                            </h3>
                            
                            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                {/* Date Filter */}
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                    <input 
                                        type="date"
                                        value={dateSearch}
                                        onChange={(e) => setDateSearch(e.target.value)}
                                        className="w-full sm:w-auto pl-8 pr-4 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-purple-500 [color-scheme:light] dark:[color-scheme:dark]"
                                    />
                                </div>

                                {/* Name Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                    <input 
                                        type="text" 
                                        value={peopleSearch}
                                        onChange={(e) => setPeopleSearch(e.target.value)}
                                        placeholder="Buscar pessoa..." 
                                        className="w-full sm:w-auto pl-8 pr-4 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {groupedPeople
                                .filter(p => p.name.toLowerCase().includes(peopleSearch.toLowerCase()))
                                .map((person) => {
                                    const allPersonIds = person.history.map(h => h.id);
                                    const isAllSelected = allPersonIds.length > 0 && allPersonIds.every(id => selectedIds.has(id));
                                    const isPartialSelected = allPersonIds.some(id => selectedIds.has(id)) && !isAllSelected;

                                    return (
                                        <div key={person.id} className={`border rounded-lg overflow-hidden transition-all duration-300 ${activeTab === 'report' && isPartialSelected ? 'border-purple-500/50 bg-purple-500/5' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'}`}>
                                            {/* HEADER - PERSON */}
                                            <div 
                                                className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                onClick={(e) => {
                                                    if ((e.target as HTMLElement).closest('.selection-checkbox')) return;
                                                    togglePersonExpand(person.id);
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {activeTab === 'report' && (
                                                        <div className="selection-checkbox" onClick={(e) => e.stopPropagation()}>
                                                            <button 
                                                                onClick={() => handleSelectPersonGroup(person.history)}
                                                                className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${isAllSelected || isPartialSelected ? 'text-purple-500' : 'text-slate-400'}`}
                                                            >
                                                                {isAllSelected ? <CheckSquare size={20} /> : isPartialSelected ? <div className="relative"><Square size={20} /><div className="absolute inset-0 m-auto w-3 h-3 bg-purple-500 rounded-sm"></div></div> : <Square size={20} />}
                                                            </button>
                                                        </div>
                                                    )}
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold">
                                                        {person.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 dark:text-white">{person.name}</h4>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{person.company}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-4 mt-3 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                                                    <div className="text-right mr-4">
                                                        <span className="block text-[10px] text-slate-500 uppercase">Acessos</span>
                                                        <span className="block font-mono font-bold text-emerald-500 text-lg">{person.history.length}</span>
                                                    </div>
                                                    {expandedPersonKey === person.id ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
                                                </div>
                                            </div>

                                            {/* BODY - ACCESS HISTORY (EXPANDED) */}
                                            {expandedPersonKey === person.id && (
                                                <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-4 animate-fade-in">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left text-xs">
                                                            <thead className="text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                                                                <tr>
                                                                    {activeTab === 'report' && <th className="pb-2 w-8"></th>}
                                                                    <th className="pb-2">Data</th>
                                                                    <th className="pb-2">Horário</th>
                                                                    <th className="pb-2">Local / Galpão</th>
                                                                    <th className="pb-2">Ponto de Acesso</th>
                                                                    <th className="pb-2">Evento</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                                                {person.history.map((record, idx) => {
                                                                    const isSelected = selectedIds.has(record.id);
                                                                    return (
                                                                        <tr 
                                                                            key={record.id} 
                                                                            className={`transition-colors ${isSelected && activeTab === 'report' ? 'bg-purple-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
                                                                            onClick={() => activeTab === 'report' && handleSelectRecord(record.id)}
                                                                        >
                                                                            {activeTab === 'report' && (
                                                                                <td className="py-2.5">
                                                                                    <button className={`text-purple-500 ${isSelected ? 'opacity-100' : 'opacity-30 hover:opacity-100'}`}>
                                                                                        {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                                                                    </button>
                                                                                </td>
                                                                            )}
                                                                            <td className="py-2.5 font-mono text-slate-600 dark:text-slate-400">
                                                                                {record.date !== 'N/A' ? record.date.split('-').reverse().join('/') : '-'}
                                                                            </td>
                                                                            <td className="py-2.5 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                                                                {record.time}
                                                                            </td>
                                                                            <td className="py-2.5 text-slate-700 dark:text-slate-300">
                                                                                {record.unit}
                                                                            </td>
                                                                            <td className="py-2.5 text-slate-500">
                                                                                {record.accessPoint}
                                                                            </td>
                                                                            <td className="py-2.5">
                                                                                {record.eventType.includes('DESBLOQUEIO') || record.eventType.includes('ENTRADA') ? (
                                                                                    <span className="text-emerald-600 dark:text-emerald-500 bg-emerald-100 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">Entrada</span>
                                                                                ) : (
                                                                                    <span className="text-slate-500">{record.eventType}</span>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            }
                            {groupedPeople.length === 0 && (
                                <div className="text-center py-12 text-slate-500 italic border-2 border-dashed border-slate-800 rounded-xl">
                                    Nenhum registro encontrado para os filtros atuais.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* FLOATING REPORT PANEL */}
            {activeTab === 'report' && selectedIds.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-700 shadow-2xl rounded-xl p-4 md:p-6 flex flex-col md:flex-row gap-6">
                        <div className="flex-1 flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-white font-bold flex items-center gap-2">
                                    <FileText size={18} className="text-purple-500" /> 
                                    Pré-visualização da Mensagem
                                </h3>
                                <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                                    <X size={14} /> Cancelar Seleção
                                </button>
                            </div>
                            <textarea 
                                value={generatedMessage}
                                onChange={(e) => setGeneratedMessage(e.target.value)}
                                className="flex-1 min-h-[120px] bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 focus:border-purple-500 focus:outline-none resize-none font-mono"
                            />
                        </div>
                        <div className="flex flex-col gap-3 justify-center min-w-[200px]">
                            <div className="text-center mb-2">
                                <span className="text-2xl font-bold text-white block">{selectedIds.size}</span>
                                <span className="text-xs text-slate-500 uppercase">Itens Selecionados</span>
                            </div>
                            <button 
                                onClick={copyToClipboard}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-105"
                            >
                                <MessageCircle size={18} /> WhatsApp / Copiar
                            </button>
                            <button 
                                onClick={sendEmail}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-105"
                            >
                                <Mail size={18} /> Enviar E-mail
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccessManagement;
