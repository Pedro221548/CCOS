
import React, { useState, useEffect, useMemo } from 'react';
import { Camera, AccessPoint, PublicDocument, UserRole } from '../types';
import { CheckCircle2, List, Search, CheckSquare, Square, Trash2, ClipboardList, Plus, FileBadge, Key, UserPlus, ShieldCheck, Fingerprint } from 'lucide-react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../services/firebase';

interface RegistrationProps {
  onAddCamera: (cam: Camera) => void;
  onAddAccess: (ap: AccessPoint) => void;
  onAddDocument: (doc: PublicDocument) => void;
  onDeleteDocument: (uuid: string) => void;
  documents?: PublicDocument[];
  userRole?: UserRole;
}

type RegistrationType = 'LIST' | 'DOCUMENT';

const SYSTEM_KEY = "K89510033988957";

const DEFAULT_OPTIONS = {
    responsibles: ['MOACIR ANDRADE', 'ROBSON DIAS', 'EDNEI RODRIGUES', 'MAURO BAPTISTA', 'JOSENIAS SANTOS', 'DANIEL CESAR', 'SILVIA SANTOS'],
    contractors: ['MULT-PEDRO', 'MULT-JOAO', 'MULT-MARIA', 'OUTRO'],
    types: ['DIARISTA', 'MENSALISTA', 'VISITANTE', 'MOTORISTA', 'AJUDANTE']
};

const Registration: React.FC<RegistrationProps> = ({ onAddDocument, onDeleteDocument, documents = [], userRole = 'viewer' }) => {
  const [activeType, setActiveType] = useState<RegistrationType>('LIST'); 
  const [successMsg, setSuccessMsg] = useState('');
  
  const [customOptions, setCustomOptions] = useState(DEFAULT_OPTIONS);
  const [newPerson, setNewPerson] = useState({ name: '', cpf: '' });
  const [newDoc, setNewDoc] = useState({ name: '', organ: '', expirationDate: '' });
  const [processedPeople, setProcessedPeople] = useState<any[]>([]);
  
  const [listMetadata, setListMetadata] = useState({
      responsible: '', 
      contractor: '',
      type: ''
  });
  const [listSearch, setListSearch] = useState('');

  const isAdmin = userRole === 'admin';

  useEffect(() => {
      const configRef = ref(db, 'monitoramento/config/registration_options');
      const unsub = onValue(configRef, (snapshot) => {
          if (snapshot.exists()) {
              setCustomOptions(snapshot.val());
          }
      });
      return () => unsub();
  }, []);

  useEffect(() => {
      if (customOptions.responsibles?.length > 0 && !listMetadata.responsible) {
          setListMetadata(prev => ({ ...prev, responsible: customOptions.responsibles[0] }));
      }
      if (customOptions.contractors?.length > 0 && !listMetadata.contractor) {
          setListMetadata(prev => ({ ...prev, contractor: customOptions.contractors[0] }));
      }
      if (customOptions.types?.length > 0 && !listMetadata.type) {
          setListMetadata(prev => ({ ...prev, type: customOptions.types[0] }));
      }
  }, [customOptions]);

  const handleManualAdd = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newPerson.name || !newPerson.cpf) return;

      const person = {
          id: `p-${Date.now()}`,
          name: newPerson.name.toUpperCase(),
          cpf: newPerson.cpf,
          done: false,
          timestamp: new Date().toISOString()
      };

      setProcessedPeople(prev => [person, ...prev]);
      setNewPerson({ name: '', cpf: '' });
      setSuccessMsg("Registro adicionado!");
      setTimeout(() => setSuccessMsg(''), 2000);
  };

  const handleSaveDocument = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newDoc.name || !newDoc.expirationDate) return;
      onAddDocument({ uuid: `doc-${Date.now()}`, name: newDoc.name, organ: newDoc.organ || 'N/I', expirationDate: newDoc.expirationDate });
      setNewDoc({ name: '', organ: '', expirationDate: '' });
  };

  const sortedAndFilteredPeople = useMemo(() => {
    return processedPeople
        .filter(p => p.name.toLowerCase().includes(listSearch.toLowerCase()))
        .sort((a, b) => {
            if (a.done === b.done) return 0;
            return a.done ? 1 : -1;
        });
  }, [processedPeople, listSearch]);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-6 pb-12 px-4 sm:px-0">
      
      {/* HEADER COM CHAVE DE CONEXÃO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Fingerprint size={120} className="text-white" />
        </div>
        
        <div className="relative z-10">
            <h2 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-tighter italic">
                <div className="p-2 rounded-lg bg-amber-600 shadow-lg shadow-amber-900/20">
                    <ClipboardList size={24} />
                </div>
                Central de Cadastro
            </h2>
            <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status da Conexão:</span>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-400 font-mono tracking-wider">CHAVE {SYSTEM_KEY} ATIVA</span>
                </div>
            </div>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 w-full md:w-auto shadow-inner relative z-10">
             <button onClick={() => setActiveType('LIST')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${activeType === 'LIST' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>Listas de Acesso</button>
             <button onClick={() => setActiveType('DOCUMENT')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${activeType === 'DOCUMENT' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>Documentação</button>
        </div>
      </div>

      {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3 animate-fade-in shadow-lg sticky top-4 z-50 backdrop-blur-md">
              <CheckCircle2 size={24} /> <span className="font-bold text-xs uppercase tracking-widest">{successMsg}</span>
          </div>
      )}

      {activeType === 'DOCUMENT' && (
          <div className="space-y-6 animate-fade-in">
              {isAdmin && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
                      <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-widest"><FileBadge className="text-blue-500" size={20} /> Novo Documento Monitorado</h3>
                      <form onSubmit={handleSaveDocument} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome do Documento</label><input type="text" placeholder="Ex: AVCB" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" value={newDoc.name} onChange={e => setNewDoc({...newDoc, name: e.target.value})} /></div>
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Órgão Emissor</label><input type="text" placeholder="Ex: Bombeiros" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" value={newDoc.organ} onChange={e => setNewDoc({...newDoc, organ: e.target.value})} /></div>
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Validade</label><input type="date" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm [color-scheme:dark] outline-none" value={newDoc.expirationDate} onChange={e => setNewDoc({...newDoc, expirationDate: e.target.value})} /></div>
                          <div className="md:col-span-3 flex justify-end pt-2"><button type="submit" className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 uppercase text-xs tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-900/20"><Plus size={18} /> Adicionar Documento</button></div>
                      </form>
                  </div>
              )}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                   <div className="p-4 bg-slate-950/50 border-b border-slate-800"><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Painel de Validade</h3></div>
                   <div className="overflow-x-auto">
                        {documents.length === 0 ? <div className="p-10 text-center text-slate-600 text-xs italic">Nenhum documento cadastrado.</div> : (
                            <table className="w-full text-left text-sm min-w-[500px]">
                                <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase font-bold"><tr><th className="p-4">Documento</th><th className="p-4">Órgão</th><th className="p-4">Vencimento</th><th className="p-4 text-right">Ação</th></tr></thead>
                                <tbody className="divide-y divide-slate-800/50 text-slate-300">{documents.map(doc => (<tr key={doc.uuid} className="hover:bg-slate-800/30 transition-colors"><td className="p-4 font-bold text-white">{doc.name}</td><td className="p-4 text-slate-500">{doc.organ}</td><td className="p-4 font-mono text-xs">{new Date(doc.expirationDate).toLocaleDateString('pt-BR')}</td><td className="p-4 text-right">{isAdmin && <button onClick={() => onDeleteDocument(doc.uuid)} className="text-slate-500 hover:text-rose-500 p-2 transition-colors"><Trash2 size={16}/></button>}</td></tr>))}</tbody>
                            </table>
                        )}
                   </div>
              </div>
          </div>
      )}

      {activeType === 'LIST' && (
          <div className="space-y-6 animate-fade-in">
                {/* CADASTRO MANUAL RÁPIDO */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="bg-slate-950/40 px-6 py-4 border-b border-slate-800/50 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-amber-500 flex items-center gap-3 uppercase tracking-[0.1em]">
                            <UserPlus size={18} className="text-amber-500" /> Cadastro de Pessoas
                        </h3>
                    </div>
                    
                    <div className="p-6">
                        <form onSubmit={handleManualAdd} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Nome Completo</label>
                                <input 
                                    type="text" 
                                    value={newPerson.name} 
                                    onChange={e => setNewPerson({...newPerson, name: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none shadow-inner" 
                                    placeholder="DIGITE O NOME..." 
                                />
                            </div>
                            <div className="md:col-span-4">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">CPF</label>
                                <input 
                                    type="text" 
                                    value={newPerson.cpf} 
                                    onChange={e => setNewPerson({...newPerson, cpf: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none shadow-inner font-mono" 
                                    placeholder="000.000.000-00" 
                                />
                            </div>
                            <div className="md:col-span-3">
                                <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-3 rounded-xl uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95">
                                    <Plus size={18} /> Adicionar à Lista
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* METADADOS DA LISTA */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-3">
                        <label className="text-amber-500 font-black text-[9px] uppercase tracking-[0.2em]">Responsável pela Lista</label>
                        <select value={listMetadata.responsible} onChange={e => setListMetadata({...listMetadata, responsible: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold focus:border-amber-500 outline-none">{customOptions.responsibles?.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-3">
                        <label className="text-amber-500 font-black text-[9px] uppercase tracking-[0.2em]">Empresa / Contratada</label>
                        <select value={listMetadata.contractor} onChange={e => setListMetadata({...listMetadata, contractor: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold focus:border-amber-500 outline-none">{customOptions.contractors?.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-3">
                        <label className="text-amber-500 font-black text-[9px] uppercase tracking-[0.2em]">Categoria de Acesso</label>
                        <select value={listMetadata.type} onChange={e => setListMetadata({...listMetadata, type: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold focus:border-amber-500 outline-none">{customOptions.types?.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                    </div>
                </div>

                {/* TABELA DE REGISTROS */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
                    <div className="p-5 border-b border-slate-800 bg-slate-950/30 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2"><List size={18} className="text-amber-500" /> Registros em Aberto</h3>
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input type="text" value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="Filtrar por nome..." className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 shadow-inner" />
                        </div>
                    </div>
                    <div className="overflow-x-auto min-h-[300px]">
                        {processedPeople.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-600 italic">
                                <UserPlus size={48} className="opacity-20 mb-4" />
                                <p>Nenhum registro pendente.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm min-w-[600px] border-collapse">
                                <thead className="bg-slate-800/50 text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] border-b border-slate-800">
                                    <tr>
                                        <th className="p-5 w-24 text-center">STATUS</th>
                                        <th className="p-5">NOME COMPLETO</th>
                                        <th className="p-5 w-64 text-center">IDENTIFICAÇÃO (CPF)</th>
                                        <th className="p-5 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                                    {sortedAndFilteredPeople.map(p => (
                                        <tr key={p.id} className={`transition-all duration-500 ${p.done ? 'bg-slate-950/80 grayscale opacity-40 line-through' : 'hover:bg-slate-800/20'}`}>
                                            <td className="p-5 text-center">
                                                <button 
                                                    onClick={() => setProcessedPeople(prev => prev.map(x => x.id === p.id ? { ...x, done: !x.done } : x))} 
                                                    className={`w-6 h-6 rounded flex items-center justify-center border transition-all ${p.done ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-slate-800 border-slate-700 text-transparent hover:border-amber-500'}`}
                                                >
                                                    {p.done && <CheckSquare size={16}/>}
                                                </button>
                                            </td>
                                            <td className="p-5">
                                                <span className="text-sm font-bold text-white tracking-tight uppercase">{p.name}</span>
                                            </td>
                                            <td className="p-5 text-center">
                                                <span className="text-sm font-bold text-amber-500 font-mono tracking-wider">{p.cpf}</span>
                                            </td>
                                            <td className="p-5 text-center">
                                                <button onClick={() => setProcessedPeople(prev => prev.filter(x => x.id !== p.id))} className="text-slate-600 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-500/5 transition-all"><Trash2 size={20}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* INFO FOOTER */}
                <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 flex items-center gap-3 text-slate-500">
                    <ShieldCheck size={18} className="text-amber-600" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">
                        Terminal {SYSTEM_KEY} conectado e pronto para recebimento de dados. O processamento por IA está desativado conforme solicitado pelo administrador.
                    </p>
                </div>
          </div>
      )}
    </div>
  );
};

export default Registration;
