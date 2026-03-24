
import React from 'react';
import { Search, User as UserIcon, X, CalendarSearch, Warehouse } from 'lucide-react';

interface PersonalSearchProps {
    personalSearch: string;
    setPersonalSearch: (val: string) => void;
    personalSearchResults: any[];
    selectedPersonKey: string | null;
    setSelectedPersonKey: (val: string | null) => void;
    personalDateFilter: string;
    setPersonalDateFilter: (val: string) => void;
    selectedPersonHistory: any[];
}

const PersonalSearch: React.FC<PersonalSearchProps> = ({
    personalSearch,
    setPersonalSearch,
    personalSearchResults,
    selectedPersonKey,
    setSelectedPersonKey,
    personalDateFilter,
    setPersonalDateFilter,
    selectedPersonHistory
}) => {
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-xl flex flex-col h-[450px] overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
                <h3 className="text-slate-800 dark:text-slate-200 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Search size={12} />
                    </div>
                    Consulta de Acesso
                </h3>
            </div>
            
            <div className="p-6 flex-1 flex flex-col overflow-hidden">
                {!selectedPersonKey ? (
                    <div className="space-y-4 flex flex-col flex-1 overflow-hidden">
                        <div className="relative shrink-0">
                            <input 
                                type="text"
                                placeholder="Nome do colaborador..."
                                value={personalSearch}
                                onChange={(e) => setPersonalSearch(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-[11px] font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase"
                            />
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                            {personalSearchResults.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-[9px] uppercase font-black tracking-widest text-center px-4 gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                        <UserIcon size={20} className="opacity-20" />
                                    </div>
                                    <p>{personalSearch.length < 2 ? 'Digite para buscar' : 'Nenhum resultado'}</p>
                                </div>
                            ) : (
                                personalSearchResults.map(p => (
                                    <button 
                                        key={p.key}
                                        onClick={() => setSelectedPersonKey(p.key)}
                                        className="w-full text-left bg-slate-50 dark:bg-slate-950/30 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50 hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors border border-blue-500/10">
                                                <UserIcon size={14} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 block truncate uppercase leading-none mb-1">{p.name}</span>
                                                <span className="text-[8px] text-slate-400 uppercase font-black tracking-tighter">{p.company}</span>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col flex-1 overflow-hidden animate-fade-in">
                        <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 mb-4 flex justify-between items-start shrink-0">
                            <div className="flex-1 min-w-0">
                                <span className="text-[12px] font-black text-blue-600 dark:text-blue-400 uppercase block truncate leading-none mb-1.5">{selectedPersonKey.split('|')[0]}</span>
                                <span className="text-[9px] text-slate-500 font-bold uppercase truncate block tracking-tighter">{selectedPersonKey.split('|')[1]}</span>
                            </div>
                            <button 
                                onClick={() => { setSelectedPersonKey(null); setPersonalSearch(''); setPersonalDateFilter(''); }}
                                className="p-2 bg-white dark:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-500 transition-colors shrink-0 ml-2 shadow-sm"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="mb-4 shrink-0">
                            <div className="relative">
                                <input 
                                    type="date"
                                    value={personalDateFilter}
                                    onChange={(e) => setPersonalDateFilter(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-8 py-3 text-[10px] font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 [color-scheme:light] dark:[color-scheme:dark]"
                                />
                                <CalendarSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                {personalDateFilter && (
                                    <button 
                                        onClick={() => setPersonalDateFilter('')}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                            {selectedPersonHistory.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 text-[9px] uppercase font-black tracking-widest flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                        <CalendarSearch size={20} className="opacity-20" />
                                    </div>
                                    <p>{personalDateFilter ? 'Sem registros nesta data' : 'Nenhum histórico encontrado'}</p>
                                </div>
                            ) : (
                                selectedPersonHistory.map(h => (
                                    <div key={h.id} className="bg-slate-50 dark:bg-slate-950/30 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex flex-col gap-2 hover:border-blue-500/20 transition-colors">
                                        <div className="flex justify-between items-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${h.eventType === 'ENTRADA' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10' : 'bg-rose-500/10 text-rose-500 border-rose-500/10'}`}>
                                                {h.eventType}
                                            </span>
                                            <span className="text-[10px] font-mono font-black text-slate-500">{h.time}</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-1">
                                            <Warehouse size={10} className="text-slate-400" />
                                            <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase truncate">{h.unit}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PersonalSearch;
