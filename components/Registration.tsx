
import React, { useState, useRef, useEffect } from 'react';
import { Camera, AccessPoint, PublicDocument, UserRole } from '../types';
import { Video, DoorClosed, CheckCircle2, Info, Camera as CameraIcon, Upload, Image as ImageIcon, X, ScanLine, List, FileText, Search, Copy, CheckSquare, Square, Trash2, ClipboardList, Loader2, ArrowDown, AlertTriangle, Table, Settings, Plus, FileBadge, Calendar, Edit3, Save } from 'lucide-react';
import { ref, onValue, set, update } from 'firebase/database';
import { db } from '../services/firebase';

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
  const [showTable, setShowTable] = useState(false);
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
    } catch (err) { alert("Erro câmera."); setShowCamera(false); }
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

  const handleExtractText = async () => {
      if (!selectedImage) return;
      setIsProcessingOCR(true);
      try {
          const img = new Image(); img.src = selectedImage; await new Promise(r => img.onload = r);
          const canvas = document.createElement('canvas'); let w = img.width; let h = img.height; const max = 1200;
          if (w > max || h > max) { if (w > h) { h *= max/w; w = max; } else { w *= max/h; h = max; } }
          canvas.width = w; canvas.height = h; canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
          const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.7));
          if (!blob) throw new Error();
          const fd = new FormData(); fd.append('apikey', 'K89510033988957'); fd.append('language', 'por'); fd.append('OCREngine', '2'); fd.append('file', blob);
          const res = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: fd });
          const d = await res.json();
          if (d.ParsedResults?.[0]?.ParsedText) { setRawListText(d.ParsedResults[0].ParsedText); setSuccessMsg("OK!"); }
      } catch (e) { alert("Erro OCR."); }
      finally { setIsProcessingOCR(false); setTimeout(() => setSuccessMsg(''), 3000); }
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
      setProcessedPeople(newPeople); setSuccessMsg(`${newPeople.length} itens.`); setTimeout(() => setSuccessMsg(''), 3000);
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text); setSuccessMsg('Copiado!'); setTimeout(() => setSuccessMsg(''), 1500);
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-4 sm:space-y-6 pb-12">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-lg">
        <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 uppercase tracking-tighter">
            <div className="p-2 rounded-lg bg-amber-600"><ClipboardList size={24} /></div>
            Central Cadastro
        </h2>
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 w-full md:w-auto">
             <button onClick={() => setActiveType('LIST')} className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${activeType === 'LIST' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-white'}`}>Listas OCR</button>
             <button onClick={() => setActiveType('DOCUMENT')} className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${activeType === 'DOCUMENT' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-white'}`}>Documentos</button>
        </div>
      </div>

      {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3 animate-fade-in shadow-lg sticky top-4 z-50 backdrop-blur-md mx-2 sm:mx-0">
              <CheckCircle2 size={24} /> <span className="font-bold text-xs uppercase">{successMsg}</span>
          </div>
      )}

      {activeType === 'DOCUMENT' && (
          <div className="space-y-4 sm:space-y-6 animate-fade-in">
              {isAdmin && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-lg">
                      <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 uppercase"><FileBadge className="text-blue-500" size={20} /> Novo Documento</h3>
                      <form onSubmit={handleSaveDocument} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome Doc</label><input type="text" placeholder="Ex: AVCB" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" value={newDoc.name} onChange={e => setNewDoc({...newDoc, name: e.target.value})} /></div>
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Órgão Emissor</label><input type="text" placeholder="Ex: Bombeiros" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" value={newDoc.organ} onChange={e => setNewDoc({...newDoc, organ: e.target.value})} /></div>
                          <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Validade</label><input type="date" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm [color-scheme:dark] outline-none" value={newDoc.expirationDate} onChange={e => setNewDoc({...newDoc, expirationDate: e.target.value})} /></div>
                          <div className="md:col-span-3 flex justify-end pt-2"><button type="submit" className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 uppercase text-xs tracking-widest transition-transform active:scale-95"><Plus size={18} /> Adicionar</button></div>
                      </form>
                  </div>
              )}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                   <div className="p-4 bg-slate-950/50 border-b border-slate-800"><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Documentos Monitorados</h3></div>
                   <div className="overflow-x-auto">
                        {documents.length === 0 ? <div className="p-10 text-center text-slate-600 text-xs italic">Nenhum documento.</div> : (
                            <table className="w-full text-left text-sm min-w-[500px]">
                                <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase font-bold"><tr><th className="p-4">Nome</th><th className="p-4">Órgão</th><th className="p-4">Validade</th><th className="p-4 text-right">Ação</th></tr></thead>
                                <tbody className="divide-y divide-slate-800/50 text-slate-300">{documents.map(doc => (<tr key={doc.uuid} className="hover:bg-slate-800/30"><td className="p-4 font-bold text-white">{doc.name}</td><td className="p-4 text-slate-500">{doc.organ}</td><td className="p-4 font-mono text-xs">{new Date(doc.expirationDate).toLocaleDateString('pt-BR')}</td><td className="p-4 text-right">{isAdmin && <button onClick={() => onDeleteDocument(doc.uuid)} className="text-slate-500 hover:text-rose-500 p-2"><Trash2 size={16}/></button>}</td></tr>))}</tbody>
                            </table>
                        )}
                   </div>
              </div>
          </div>
      )}

      {activeType === 'LIST' && (
          <div className="space-y-4 sm:space-y-6 animate-fade-in">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
                    <div className="bg-slate-900 px-4 sm:px-6 py-4 border-b border-slate-800 flex items-center justify-between"><h3 className="text-sm sm:text-base font-bold text-amber-400 flex items-center gap-2 uppercase tracking-widest"><ScanLine size={18} /> 1. Captura OCR</h3></div>
                    <div className="p-5 sm:p-8 flex flex-col lg:flex-row gap-6 lg:gap-10">
                        <div className="w-full lg:w-1/3">
                            <div className="aspect-square sm:aspect-video lg:aspect-square bg-black rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center relative overflow-hidden group">
                                {selectedImage ? (<><img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />{isAdmin && <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><button onClick={() => setSelectedImage(null)} className="p-3 bg-rose-600 text-white rounded-full"><X size={24} /></button></div>}</>) : (<div className="text-slate-700 text-center p-4"><ImageIcon size={48} className="mx-auto mb-2 opacity-20" /><span className="text-[10px] font-bold uppercase tracking-widest">Sem Imagem</span></div>)}
                                {showCamera && (<div className="absolute inset-0 bg-black z-20 flex flex-col"><video ref={videoRef} autoPlay playsInline className="flex-1 w-full h-full object-cover" /><div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4"><button onClick={stopCamera} className="p-3 bg-rose-600 rounded-full text-white"><X size={20}/></button><button onClick={capturePhoto} className="p-3 bg-emerald-600 rounded-full text-white px-6 flex items-center gap-2 font-bold uppercase text-[10px]"><CameraIcon size={18}/> Usar Foto</button></div></div>)}
                                <canvas ref={canvasRef} width="640" height="480" className="hidden"></canvas>
                            </div>
                        </div>
                        <div className="w-full lg:w-2/3 flex flex-col justify-center">
                            {isAdmin ? (<div className="bg-slate-900/50 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <button type="button" onClick={startCamera} className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-200 transition-all active:scale-95"><CameraIcon size={24} className="text-amber-400" /><span className="text-[10px] font-black uppercase tracking-widest">Câmera</span></button>
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-200 transition-all active:scale-95"><Upload size={24} className="text-blue-400" /><span className="text-[10px] font-black uppercase tracking-widest">Arquivo</span></button>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                                    </div>
                                    <button type="button" onClick={handleExtractText} disabled={isProcessingOCR || !selectedImage} className="w-full py-4 bg-slate-900 border border-slate-700 text-amber-500 font-black rounded-xl uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-30 transition-all active:scale-95 shadow-lg shadow-black/40">{isProcessingOCR ? <Loader2 className="animate-spin" /> : <ScanLine size={18} />} Iniciar Escaneamento</button>
                                </div>) : <div className="text-center p-10 border border-dashed border-slate-800 rounded-2xl text-slate-600 uppercase text-[10px] font-black tracking-widest">Acesso Administrativo Requerido</div>}
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-lg">
                    <h3 className="text-amber-400 font-bold text-xs sm:text-sm flex items-center gap-2 uppercase tracking-widest mb-4"><FileText size={18} /> 2. Texto Bruto</h3>
                    <textarea value={rawListText} onChange={e => isAdmin && setRawListText(e.target.value)} readOnly={!isAdmin} placeholder="O texto extraído aparecerá aqui..." className="w-full h-32 sm:h-48 bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-300 font-mono text-xs sm:text-sm resize-none focus:border-amber-500 outline-none"></textarea>
                    {isAdmin && <button onClick={handleOrganizeList} className="w-full mt-4 py-3 bg-slate-800 border border-slate-700 text-amber-500 font-bold rounded-xl uppercase tracking-widest text-[10px] sm:text-xs active:scale-95 transition-all">Organizar Registros</button>}
                </div>

                {/* METADATA CARDS - Empilhados no Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-slate-900 border border-amber-900/20 rounded-xl p-4 shadow-lg flex flex-col gap-2">
                        <div className="flex items-center justify-between"><label className="text-amber-500 font-black text-[9px] uppercase tracking-[0.15em]">Responsável</label>{isAdmin && <button onClick={() => setEditingCategory('responsibles')} className="text-slate-600 hover:text-amber-500"><Settings size={14}/></button>}</div>
                        <select value={listMetadata.responsible} onChange={e => setListMetadata({...listMetadata, responsible: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white text-xs font-bold focus:border-amber-500 outline-none">{customOptions.responsibles?.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                        <button onClick={() => copyToClipboard(listMetadata.responsible)} className="w-full py-2 bg-slate-800/50 hover:bg-slate-800 text-slate-400 rounded text-[9px] font-black uppercase tracking-widest">Copiar</button>
                    </div>
                    <div className="bg-slate-900 border border-amber-900/20 rounded-xl p-4 shadow-lg flex flex-col gap-2">
                        <div className="flex items-center justify-between"><label className="text-amber-500 font-black text-[9px] uppercase tracking-[0.15em]">Empresa</label>{isAdmin && <button onClick={() => setEditingCategory('contractors')} className="text-slate-600 hover:text-amber-500"><Settings size={14}/></button>}</div>
                        <select value={listMetadata.contractor} onChange={e => setListMetadata({...listMetadata, contractor: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white text-xs font-bold focus:border-amber-500 outline-none">{customOptions.contractors?.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                        <button onClick={() => copyToClipboard(listMetadata.contractor)} className="w-full py-2 bg-slate-800/50 hover:bg-slate-800 text-slate-400 rounded text-[9px] font-black uppercase tracking-widest">Copiar</button>
                    </div>
                    <div className="bg-slate-900 border border-amber-900/20 rounded-xl p-4 shadow-lg flex flex-col gap-2">
                        <div className="flex items-center justify-between"><label className="text-amber-500 font-black text-[9px] uppercase tracking-[0.15em]">Tipo</label>{isAdmin && <button onClick={() => setEditingCategory('types')} className="text-slate-600 hover:text-amber-500"><Settings size={14}/></button>}</div>
                        <select value={listMetadata.type} onChange={e => setListMetadata({...listMetadata, type: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white text-xs font-bold focus:border-amber-500 outline-none">{customOptions.types?.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                        <button onClick={() => copyToClipboard(listMetadata.type)} className="w-full py-2 bg-slate-800/50 hover:bg-slate-800 text-slate-400 rounded text-[9px] font-black uppercase tracking-widest">Copiar</button>
                    </div>
                </div>

                {processedPeople.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                        <div className="p-4 border-b border-slate-800 bg-slate-950/30">
                            <div className="relative w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input type="text" value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="Pesquisar na lista..." className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none" /></div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm min-w-[500px]">
                                <thead className="bg-slate-800 text-slate-500 text-[10px] uppercase font-black tracking-widest"><tr><th className="p-3 w-14 text-center">F</th><th className="p-3">Nome</th><th className="p-3 w-40">CPF</th><th className="p-3 w-10"></th></tr></thead>
                                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                                    {processedPeople.filter(p => p.name.toLowerCase().includes(listSearch.toLowerCase())).map(p => (
                                        <tr key={p.id} className={`transition-all ${p.done ? 'bg-slate-950/80 grayscale opacity-40 line-through' : 'hover:bg-slate-800/30'}`}>
                                            <td className="p-3 text-center"><button onClick={() => setProcessedPeople(prev => prev.map(x => x.id === p.id ? { ...x, done: !x.done } : x))} className={`p-2 ${p.done ? 'text-emerald-500' : 'text-slate-500'}`}>{p.done ? <CheckSquare size={22}/> : <Square size={22}/>}</button></td>
                                            <td className="p-3"><div className="flex items-center justify-between group"><span className="text-xs sm:text-sm font-bold text-white uppercase">{p.name}</span><button onClick={() => copyToClipboard(p.name)} className="p-2 text-slate-500 hover:text-white"><Copy size={14}/></button></div></td>
                                            <td className="p-3 font-mono text-[11px]"><div className="flex items-center justify-between group"><div className="flex items-center gap-1.5"><span>{cleanMode ? p.cpf.replace(/\D/g, '') : p.cpf}</span>{!isValidCPF(p.cpf) && p.cpf !== '-' && !p.done && <AlertTriangle size={14} className="text-amber-500"/>}</div><button onClick={() => copyToClipboard(cleanMode ? p.cpf.replace(/\D/g, '') : p.cpf)} className="p-2 text-slate-500 hover:text-white"><Copy size={14}/></button></div></td>
                                            <td className="p-3 text-center">{isAdmin && <button onClick={() => setProcessedPeople(prev => prev.filter(x => x.id !== p.id))} className="text-slate-600 hover:text-rose-500 p-1"><Trash2 size={16}/></button>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {editingCategory && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6">
                            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4"><h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest"><Settings size={18} className="text-amber-500" /> Editar Lista</h3><button onClick={() => {setEditingCategory(null); setRenamingItem(null);}} className="text-slate-500 hover:text-white"><X size={20} /></button></div>
                            <form onSubmit={handleAddItem} className="flex gap-2 mb-6"><input type="text" autoFocus value={newItemName} onChange={e => setNewItemName(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none" placeholder="Novo item..." /><button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-transform active:scale-95"><Plus size={20} /></button></form>
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {(customOptions[editingCategory] || []).map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/50 group">
                                        {renamingItem?.index === idx ? (
                                            <div className="flex flex-1 gap-2"><input type="text" autoFocus className="flex-1 bg-slate-950 border border-blue-500 rounded-lg px-2 py-1.5 text-white text-[11px] outline-none" value={renamingItem.value} onChange={e => setRenamingItem({...renamingItem, value: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleSaveRename()} /><button onClick={handleSaveRename} className="text-emerald-500 p-1"><Save size={16}/></button><button onClick={() => setRenamingItem(null)} className="text-rose-500 p-1"><X size={16}/></button></div>
                                        ) : (
                                            <><span className="text-xs text-slate-300 font-bold uppercase pl-2">{item}</span><div className="flex gap-1.5"><button onClick={() => handleStartRename(idx, item)} className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors"><Edit3 size={14}/></button><button onClick={() => handleDeleteItem(editingCategory, item)} className="p-1.5 text-slate-500 hover:text-rose-500 transition-colors"><Trash2 size={14}/></button></div></>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end"><button onClick={() => {setEditingCategory(null); setRenamingItem(null);}} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all">Fechar</button></div>
                        </div>
                    </div>
                )}
          </div>
      )}
    </div>
  );
};

export default Registration;
