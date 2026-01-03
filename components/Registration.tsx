
import React, { useState, useRef, useEffect } from 'react';
import { Camera, AccessPoint, PublicDocument, UserRole } from '../types';
import { Video, DoorClosed, CheckCircle2, Info, Camera as CameraIcon, Upload, Image as ImageIcon, X, ScanLine, List, FileText, Search, Copy, CheckSquare, Square, Trash2, ClipboardList, Loader2, ArrowDown, AlertTriangle, Table, Settings, Plus, FileBadge, Calendar, Edit3, Save, Scan } from 'lucide-react';
import { ref, onValue, set, update } from 'firebase/database';
import { db } from '../services/firebase';
import { GoogleGenAI } from "@google/genai";

interface RegistrationProps {
  onAddCamera: (cam: Camera) => void;
  onAddAccess: (ap: AccessPoint) => void;
  onAddDocument: (doc: PublicDocument) => void;
  onDeleteDocument: (uuid: string) => void;
  documents?: PublicDocument[];
  userRole?: UserRole;
}

type RegistrationType = 'CAMERA' | 'ACCESS' | 'LIST' | 'DOCUMENT';

const DEFAULT_OPTIONS = {
    responsibles: ['MOACIR ANDRADE', 'ROBSON DIAS', 'EDNEI RODRIGUES', 'MAURO BAPTISTA', 'JOSENIAS SANTOS', 'DANIEL CESAR', 'SILVIA SANTOS'],
    contractors: ['MULT-PEDRO', 'MULT-JOAO', 'MULT-MARIA', 'OUTRO'],
    types: ['DIARISTA', 'MENSALISTA', 'VISITANTE', 'MOTORISTA', 'AJUDANTE']
};

const Registration: React.FC<RegistrationProps> = ({ onAddCamera, onAddAccess, onAddDocument, onDeleteDocument, documents = [], userRole = 'viewer' }) => {
  const [activeType, setActiveType] = useState<RegistrationType>('LIST'); 
  const [successMsg, setSuccessMsg] = useState('');
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  
  // --- DYNAMIC LISTS STATE ---
  const [customOptions, setCustomOptions] = useState(DEFAULT_OPTIONS);
  const [editingCategory, setEditingCategory] = useState<'responsibles' | 'contractors' | 'types' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [renamingItem, setRenamingItem] = useState<{ index: number, value: string } | null>(null);

  // --- CAMERA / ACCESS STATE ---
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- DOCUMENT STATE ---
  const [newDoc, setNewDoc] = useState({ name: '', organ: '', expirationDate: '' });

  // --- LIST PROCESSING STATE ---
  const [rawListText, setRawListText] = useState('');
  const [processedPeople, setProcessedPeople] = useState<any[]>([]);
  const [cleanMode, setCleanMode] = useState(true);
  
  const [listMetadata, setListMetadata] = useState({
      responsible: '', 
      contractor: '',
      company: 'MULT',
      type: ''
  });
  const [listSearch, setListSearch] = useState('');

  const isAdmin = userRole === 'admin';

  useEffect(() => {
      const configRef = ref(db, 'monitoramento/config/registration_options');
      const unsub = onValue(configRef, (snapshot) => {
          if (snapshot.exists()) {
              setCustomOptions(snapshot.val());
          } else if (isAdmin) {
              set(configRef, DEFAULT_OPTIONS);
          }
      });
      return () => unsub();
  }, [isAdmin]);

  useEffect(() => {
      if (customOptions.responsibles?.length > 0 && (!listMetadata.responsible || !customOptions.responsibles.includes(listMetadata.responsible))) {
          setListMetadata(prev => ({ ...prev, responsible: customOptions.responsibles[0] }));
      }
      if (customOptions.contractors?.length > 0 && (!listMetadata.contractor || !customOptions.contractors.includes(listMetadata.contractor))) {
          setListMetadata(prev => ({ ...prev, contractor: customOptions.contractors[0] }));
      }
      if (customOptions.types?.length > 0 && (!listMetadata.type || !customOptions.types.includes(listMetadata.type))) {
          setListMetadata(prev => ({ ...prev, type: customOptions.types[0] }));
      }
  }, [customOptions, listMetadata.responsible, listMetadata.contractor, listMetadata.type]);

  const saveOptionsToFirebase = async (newOptions: typeof DEFAULT_OPTIONS) => {
      if (!isAdmin) return;
      try { await set(ref(db, 'monitoramento/config/registration_options'), newOptions); } catch (e) { alert("Erro DB."); }
  };

  const handleAddItem = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingCategory || !newItemName.trim()) return;
      const val = newItemName.toUpperCase();
      const currentList = customOptions[editingCategory] || [];
      if (currentList.includes(val)) return;
      const updatedOptions = { ...customOptions, [editingCategory]: [...currentList, val] };
      setCustomOptions(updatedOptions); saveOptionsToFirebase(updatedOptions); setNewItemName('');
  };

  const handleDeleteItem = (category: 'responsibles' | 'contractors' | 'types', item: string) => {
      const updatedOptions = { ...customOptions, [category]: customOptions[category].filter(i => i !== item) };
      setCustomOptions(updatedOptions); saveOptionsToFirebase(updatedOptions);
  };

  const handleStartRename = (index: number, value: string) => setRenamingItem({ index, value });
  const handleSaveRename = () => {
      if (!editingCategory || !renamingItem || !renamingItem.value.trim()) return;
      const newValue = renamingItem.value.toUpperCase();
      const currentList = [...customOptions[editingCategory]];
      currentList[renamingItem.index] = newValue;
      const updatedOptions = { ...customOptions, [editingCategory]: currentList };
      setCustomOptions(updatedOptions); saveOptionsToFirebase(updatedOptions); setRenamingItem(null);
  };

  const isValidCPF = (cpf: string): boolean => {
    const strCPF = cpf.replace(/[^\d]+/g, '');
    if (strCPF.length !== 11) return false;
    if (/^(\d)\1+$/.test(strCPF)) return false; 
    let sum = 0; let remainder;
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(strCPF.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(strCPF.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(strCPF.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(strCPF.substring(10, 11))) return false;
    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => setSelectedImage(evt.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { alert("Acesso à câmera negado ou não disponível."); setShowCamera(false); }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 640, 480);
        setSelectedImage(canvasRef.current.toDataURL('image/png'));
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    setShowCamera(false);
  };

  const handleSaveDocument = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newDoc.name || !newDoc.expirationDate) return;
      onAddDocument({ uuid: `doc-${Date.now()}`, name: newDoc.name, organ: newDoc.organ || 'N/I', expirationDate: newDoc.expirationDate });
      setNewDoc({ name: '', organ: '', expirationDate: '' });
  };

  // --- MOTOR OCR GEMINI ---
  const handleExtractText = async () => {
      if (!selectedImage) {
          alert("Selecione ou capture uma imagem primeiro.");
          return;
      }
      setIsProcessingOCR(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const base64Data = selectedImage.split(',')[1];
          
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: [{
                  parts: [
                      { inlineData: { data: base64Data, mimeType: 'image/png' } },
                      { text: "Extract all full names and CPFs from this document or list. Return ONLY the text found, one person per line. If it is an ID, extract Name and CPF." }
                  ]
              }]
          });

          const text = response.text;
          if (text) {
              setRawListText(text);
              setSuccessMsg("Escaneamento Concluído!");
          } else {
              throw new Error("Nenhum texto detectado.");
          }
      } catch (e: any) {
          console.error("Erro no OCR Gemini:", e);
          alert("Erro ao processar imagem: " + (e.message || "Tente novamente."));
      } finally {
          setIsProcessingOCR(false);
          setTimeout(() => setSuccessMsg(''), 3000);
      }
  };

  const handleOrganizeList = () => {
      if (!rawListText.trim()) return;
      const lines = rawListText.split(/\r?\n/);
      const newPeople: any[] = [];
      const cpfRegex = /(\d{3}[\.]?\d{3}[\.]?\d{3}[-]?\d{2})|(\d{11})/;
      const blocklist = /\b(RG|SSP|DATA|NASCIMENTO|MAE|PAI|FILIACAO|CARGO|EMPRESA|ADMISSAO|CPF|NOME|EMAIL|TEL|CEL|CNPJ|PAGINA|PAGE|TOTAL|ASSINATURA|LISTA|PRESENCA|DOCUMENTO)\b/gi;
      lines.forEach((line, idx) => {
          let text = line.trim(); if (!text) return;
          let cpf = ''; const m = text.match(cpfRegex);
          if (m) { const d = m[0].replace(/\D/g, ''); if (d.length === 11) cpf = `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`; text = text.replace(m[0], ''); }
          text = text.replace(/[\w.-]+@[\w.-]+\.\w+/g, '').replace(blocklist, '').replace(/[^a-zA-Z\u00C0-\u00FF\s]/g, ' ');
          let name = text.replace(/\s+/g, ' ').trim().toLowerCase().replace(/(?:^|\s)\S/g, a => a.toUpperCase());
          if (name.length > 3) newPeople.push({ id: `p-${Date.now()}-${idx}`, name, cpf: cpf || '-', done: false });
      });
      setProcessedPeople(newPeople); setSuccessMsg(`${newPeople.length} registros organizados.`); setTimeout(() => setSuccessMsg(''), 3000);
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text); setSuccessMsg('Copiado!'); setTimeout(() => setSuccessMsg(''), 1500);
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-4 sm:space-y-6 pb-12 px-4 sm:px-0">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-lg">
        <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 uppercase tracking-tighter">
            <div className="p-2 rounded-lg bg-amber-600 shadow-lg shadow-amber-900/20"><ClipboardList size={24} /></div>
            Central Cadastro
        </h2>
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 w-full md:w-auto shadow-inner">
             <button onClick={() => setActiveType('LIST')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${activeType === 'LIST' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>Listas OCR</button>
             <button onClick={() => setActiveType('DOCUMENT')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${activeType === 'DOCUMENT' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>Documentos</button>
        </div>
      </div>

      {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3 animate-fade-in shadow-lg sticky top-4 z-50 backdrop-blur-md">
              <CheckCircle2 size={24} /> <span className="font-bold text-xs uppercase tracking-widest">{successMsg}</span>
          </div>
      )}

      {activeType === 'DOCUMENT' && (
          <div className="space-y-4 sm:space-y-6 animate-fade-in">
              {isAdmin && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-lg">
                      <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-widest"><FileBadge className="text-blue-500" size={20} /> Novo Documento</h3>
                      <form onSubmit={handleSaveDocument} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome Doc</label><input type="text" placeholder="Ex: AVCB" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" value={newDoc.name} onChange={e => setNewDoc({...newDoc, name: e.target.value})} /></div>
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Órgão Emissor</label><input type="text" placeholder="Ex: Bombeiros" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" value={newDoc.organ} onChange={e => setNewDoc({...newDoc, organ: e.target.value})} /></div>
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Validade</label><input type="date" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm [color-scheme:dark] outline-none" value={newDoc.expirationDate} onChange={e => setNewDoc({...newDoc, expirationDate: e.target.value})} /></div>
                          <div className="md:col-span-3 flex justify-end pt-2"><button type="submit" className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 uppercase text-xs tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-900/20"><Plus size={18} /> Adicionar</button></div>
                      </form>
                  </div>
              )}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                   <div className="p-4 bg-slate-950/50 border-b border-slate-800"><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Documentos Monitorados</h3></div>
                   <div className="overflow-x-auto">
                        {documents.length === 0 ? <div className="p-10 text-center text-slate-600 text-xs italic">Nenhum documento cadastrado.</div> : (
                            <table className="w-full text-left text-sm min-w-[500px]">
                                <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase font-bold"><tr><th className="p-4">Nome</th><th className="p-4">Órgão</th><th className="p-4">Validade</th><th className="p-4 text-right">Ação</th></tr></thead>
                                <tbody className="divide-y divide-slate-800/50 text-slate-300">{documents.map(doc => (<tr key={doc.uuid} className="hover:bg-slate-800/30 transition-colors"><td className="p-4 font-bold text-white">{doc.name}</td><td className="p-4 text-slate-500">{doc.organ}</td><td className="p-4 font-mono text-xs">{new Date(doc.expirationDate).toLocaleDateString('pt-BR')}</td><td className="p-4 text-right">{isAdmin && <button onClick={() => onDeleteDocument(doc.uuid)} className="text-slate-500 hover:text-rose-500 p-2 transition-colors"><Trash2 size={16}/></button>}</td></tr>))}</tbody>
                            </table>
                        )}
                   </div>
              </div>
          </div>
      )}

      {activeType === 'LIST' && (
          <div className="space-y-6 animate-fade-in">
                {/* --- SEÇÃO CAPTURA OCR --- */}
                <div className="bg-[#05070a] border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="bg-slate-900/40 px-6 py-4 border-b border-slate-800/50 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-amber-500 flex items-center gap-3 uppercase tracking-[0.1em]">
                            <Scan size={18} className="text-amber-500" /> 1. CAPTURA OCR
                        </h3>
                    </div>
                    
                    <div className="p-6 sm:p-10 flex flex-col lg:flex-row gap-8 items-center">
                        <div className="w-full lg:w-1/2 flex justify-center">
                            <div className="w-full max-w-[400px] aspect-[4/3] bg-[#020406] rounded-2xl border border-slate-800 relative overflow-hidden flex items-center justify-center group shadow-2xl">
                                {selectedImage ? (
                                    <>
                                        <img src={selectedImage} alt="Capture" className="w-full h-full object-contain" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button onClick={() => setSelectedImage(null)} className="p-4 bg-rose-600 text-white rounded-full shadow-lg hover:bg-rose-500 transition-all"><X size={28} /></button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-4 opacity-20">
                                        <ImageIcon size={64} className="text-slate-500" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Aguardando Imagem</span>
                                    </div>
                                )}
                                
                                {showCamera && (
                                    <div className="absolute inset-0 bg-black z-30 flex flex-col animate-fade-in">
                                        <video ref={videoRef} autoPlay playsInline className="flex-1 w-full h-full object-cover" />
                                        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6">
                                            <button onClick={stopCamera} className="p-4 bg-rose-600 rounded-full text-white shadow-xl hover:bg-rose-500"><X size={24}/></button>
                                            <button onClick={capturePhoto} className="p-4 bg-emerald-600 rounded-full text-white px-8 flex items-center gap-3 font-bold uppercase text-xs tracking-widest shadow-xl hover:bg-emerald-500 transition-all active:scale-95"><CameraIcon size={20}/> Capturar</button>
                                        </div>
                                    </div>
                                )}
                                <canvas ref={canvasRef} width="640" height="480" className="hidden"></canvas>
                            </div>
                        </div>

                        <div className="w-full lg:w-1/2">
                            <div className="bg-[#0a0c10] border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-inner">
                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        onClick={startCamera} 
                                        className="flex flex-col items-center justify-center gap-3 p-8 bg-[#161b22] hover:bg-[#1c2128] border border-slate-800 rounded-2xl text-slate-300 transition-all group active:scale-95"
                                    >
                                        <CameraIcon size={32} className="text-amber-500 group-hover:scale-110 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.1em]">CÂMERA</span>
                                    </button>
                                    <button 
                                        onClick={() => fileInputRef.current?.click()} 
                                        className="flex flex-col items-center justify-center gap-3 p-8 bg-[#161b22] hover:bg-[#1c2128] border border-slate-800 rounded-2xl text-slate-300 transition-all group active:scale-95"
                                    >
                                        <Upload size={32} className="text-blue-500 group-hover:scale-110 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.1em]">ARQUIVO</span>
                                    </button>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                                </div>
                                
                                <button 
                                    onClick={handleExtractText} 
                                    disabled={isProcessingOCR || !selectedImage} 
                                    className="w-full py-5 bg-[#0d1117] border border-slate-700/50 hover:border-amber-500/50 text-amber-500 font-black rounded-2xl uppercase text-[13px] tracking-[0.15em] flex items-center justify-center gap-4 disabled:opacity-30 transition-all active:scale-[0.98] shadow-2xl group"
                                >
                                    {isProcessingOCR ? <Loader2 className="animate-spin" size={24} /> : <Scan size={24} className="group-hover:rotate-90 transition-transform duration-500" />} 
                                    INICIAR ESCANEAMENTO
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg">
                    <h3 className="text-amber-500 font-bold text-xs sm:text-sm flex items-center gap-2 uppercase tracking-widest mb-4"><FileText size={18} /> 2. Texto Bruto Detectado</h3>
                    <textarea 
                        value={rawListText} 
                        onChange={e => setRawListText(e.target.value)} 
                        placeholder="O texto detectado pela IA aparecerá aqui para revisão..." 
                        className="w-full h-40 sm:h-56 bg-slate-950 border border-slate-800 rounded-2xl p-5 text-slate-300 font-mono text-sm leading-relaxed resize-none focus:border-amber-500 outline-none transition-colors shadow-inner"
                    ></textarea>
                    <button onClick={handleOrganizeList} className="w-full mt-4 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-500 font-black rounded-2xl uppercase tracking-[0.2em] text-xs active:scale-[0.99] transition-all shadow-lg">ORGANIZAR REGISTROS</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
                        <div className="flex items-center justify-between"><label className="text-amber-500 font-black text-[9px] uppercase tracking-[0.2em]">Responsável</label>{isAdmin && <button onClick={() => setEditingCategory('responsibles')} className="text-slate-600 hover:text-amber-500"><Settings size={14}/></button>}</div>
                        <select value={listMetadata.responsible} onChange={e => setListMetadata({...listMetadata, responsible: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold focus:border-amber-500 outline-none">{customOptions.responsibles?.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                        <button onClick={() => copyToClipboard(listMetadata.responsible)} className="w-full py-2 bg-slate-800/40 hover:bg-slate-800 text-slate-500 hover:text-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors">Copiar Valor</button>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
                        <div className="flex items-center justify-between"><label className="text-amber-500 font-black text-[9px] uppercase tracking-[0.2em]">Empresa / Contratada</label>{isAdmin && <button onClick={() => setEditingCategory('contractors')} className="text-slate-600 hover:text-amber-500"><Settings size={14}/></button>}</div>
                        <select value={listMetadata.contractor} onChange={e => setListMetadata({...listMetadata, contractor: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold focus:border-amber-500 outline-none">{customOptions.contractors?.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                        <button onClick={() => copyToClipboard(listMetadata.contractor)} className="w-full py-2 bg-slate-800/40 hover:bg-slate-800 text-slate-500 hover:text-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors">Copiar Valor</button>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
                        <div className="flex items-center justify-between"><label className="text-amber-500 font-black text-[9px] uppercase tracking-[0.2em]">Tipo de Acesso</label>{isAdmin && <button onClick={() => setEditingCategory('types')} className="text-slate-600 hover:text-amber-500"><Settings size={14}/></button>}</div>
                        <select value={listMetadata.type} onChange={e => setListMetadata({...listMetadata, type: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold focus:border-amber-500 outline-none">{customOptions.types?.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                        <button onClick={() => copyToClipboard(listMetadata.type)} className="w-full py-2 bg-slate-800/40 hover:bg-slate-800 text-slate-500 hover:text-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors">Copiar Valor</button>
                    </div>
                </div>

                {/* --- TABELA DE RESULTADOS ESTILO IMAGEM --- */}
                {processedPeople.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
                        <div className="p-5 border-b border-slate-800 bg-slate-950/30 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2"><List size={18} className="text-amber-500" /> Registros Processados</h3>
                            <div className="relative w-full sm:w-auto"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input type="text" value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="Filtrar por nome..." className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 shadow-inner" /></div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm min-w-[600px] border-collapse">
                                <thead className="bg-slate-800/50 text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] border-b border-slate-800">
                                    <tr>
                                        <th className="p-5 w-24 text-center">FEITO</th>
                                        <th className="p-5">NOME</th>
                                        <th className="p-5 w-64 text-center">CPF</th>
                                        <th className="p-5 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                                    {processedPeople.filter(p => p.name.toLowerCase().includes(listSearch.toLowerCase())).map(p => (
                                        <tr key={p.id} className={`transition-all duration-300 ${p.done ? 'bg-slate-950/80 grayscale opacity-40 line-through' : 'hover:bg-slate-800/20'}`}>
                                            <td className="p-5 text-center">
                                                <button 
                                                    onClick={() => setProcessedPeople(prev => prev.map(x => x.id === p.id ? { ...x, done: !x.done } : x))} 
                                                    className={`w-6 h-6 rounded flex items-center justify-center border transition-all ${p.done ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'bg-white border-slate-400 text-white shadow-inner'}`}
                                                >
                                                    {p.done && <CheckSquare size={16}/>}
                                                </button>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex items-center gap-2">
                                                    <div 
                                                        onClick={() => copyToClipboard(p.name)}
                                                        className="flex-1 bg-[#1a1c1e] border border-slate-800 rounded-lg px-6 py-3 text-center cursor-pointer hover:border-amber-500/50 transition-all active:scale-95 shadow-md"
                                                    >
                                                        <span className="text-sm font-bold text-amber-500 tracking-tight">{p.name}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div 
                                                    onClick={() => copyToClipboard(cleanMode ? p.cpf.replace(/\D/g, '') : p.cpf)}
                                                    className="w-full bg-[#1a1c1e] border border-slate-800 rounded-lg px-6 py-3 text-center cursor-pointer hover:border-amber-500/50 transition-all active:scale-95 shadow-md flex items-center justify-center gap-3"
                                                >
                                                    <span className="text-sm font-bold text-amber-500 font-mono tracking-wider">
                                                        {cleanMode ? p.cpf.replace(/\D/g, '') : p.cpf}
                                                    </span>
                                                    {!isValidCPF(p.cpf) && p.cpf !== '-' && !p.done && <AlertTriangle size={14} className="text-amber-500 animate-pulse shrink-0"/>}
                                                </div>
                                            </td>
                                            <td className="p-5 text-center">
                                                {isAdmin && <button onClick={() => setProcessedPeople(prev => prev.filter(x => x.id !== p.id))} className="text-slate-600 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-500/5 transition-all"><Trash2 size={20}/></button>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Modal Edição Listas */}
                {editingCategory && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                        <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
                            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-800 bg-slate-950/50"><h3 className="text-sm font-black text-white flex items-center gap-3 uppercase tracking-widest"><Settings size={18} className="text-amber-500" /> Editar Opções</h3><button onClick={() => {setEditingCategory(null); setRenamingItem(null);}} className="text-slate-500 hover:text-white"><X size={24} /></button></div>
                            <div className="p-6">
                                <form onSubmit={handleAddItem} className="flex gap-2 mb-6"><input type="text" autoFocus value={newItemName} onChange={e => setNewItemName(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none shadow-inner" placeholder="Novo item..." /><button type="submit" className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20"><Plus size={20} /></button></form>
                                <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                    {(customOptions[editingCategory] || []).map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-slate-800/40 p-3 rounded-2xl border border-slate-700/50 group hover:border-slate-600 transition-colors">
                                            {renamingItem?.index === idx ? (
                                                <div className="flex flex-1 gap-2"><input type="text" autoFocus className="flex-1 bg-slate-950 border border-blue-500 rounded-xl px-3 py-2 text-white text-[12px] outline-none" value={renamingItem.value} onChange={e => setRenamingItem({...renamingItem, value: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleSaveRename()} /><button onClick={handleSaveRename} className="text-emerald-500 p-2 hover:bg-emerald-500/10 rounded-lg"><Save size={18}/></button><button onClick={() => setRenamingItem(null)} className="text-rose-500 p-2 hover:bg-rose-500/10 rounded-lg"><X size={18}/></button></div>
                                            ) : (
                                                <><span className="text-xs text-slate-300 font-bold uppercase pl-2 truncate pr-2">{item}</span><div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => handleStartRename(idx, item)} className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-400/5 rounded-lg transition-colors"><Edit3 size={16}/></button><button onClick={() => handleDeleteItem(editingCategory, item)} className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/5 rounded-lg transition-colors"><Trash2 size={16}/></button></div></>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="px-6 py-5 bg-slate-950/50 border-t border-slate-800 flex justify-end"><button onClick={() => {setEditingCategory(null); setRenamingItem(null);}} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-[0.2em] active:scale-95 transition-all shadow-lg">Fechar</button></div>
                        </div>
                    </div>
                )}
          </div>
      )}
    </div>
  );
};

export default Registration;
