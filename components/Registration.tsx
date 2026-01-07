
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Camera, AccessPoint, PublicDocument, UserRole } from '../types';
import { CheckCircle2, Camera as CameraIcon, Upload, Image as ImageIcon, X, List, FileText, Search, CheckSquare, Trash2, ClipboardList, Loader2, Scan, Wand2, Plus, Calendar, ShieldAlert, Building2, AlertTriangle, Clock } from 'lucide-react';
import { ref, push, onValue, update, remove, off } from 'firebase/database';
import { db } from '../services/firebase';
import { monitoringService } from '../services/monitoring';

interface RegistrationProps {
  onAddCamera: (cam: Camera) => void;
  onAddAccess: (ap: AccessPoint) => void;
  onAddDocument: (doc: PublicDocument) => void;
  onDeleteDocument: (uuid: string) => void;
  documents?: PublicDocument[];
  userRole?: UserRole;
}

const OCR_SPACE_KEY = "K89510033988957";

// Validação oficial de CPF
const validateCPF = (cpf: string): boolean => {
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
    return true;
};

const formatNameNormal = (name: string) => {
    if (!name) return "";
    return name
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(word => word.length > 0)
        .map(word => {
            const prepositions = ['de', 'da', 'do', 'dos', 'das', 'e'];
            if (prepositions.includes(word)) return word;
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
};

const Registration: React.FC<RegistrationProps> = ({ userRole = 'viewer', documents = [] }) => {
  const [activeTab, setActiveTab] = useState<'ocr' | 'documents'>('ocr');
  const [successMsg, setSuccessMsg] = useState('');
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [rawText, setRawText] = useState('');
  const [processedPeople, setProcessedPeople] = useState<any[]>([]);
  const [listSearch, setListSearch] = useState('');

  // Estados para Documentos
  const [docForm, setDocForm] = useState({ name: '', organ: '', expirationDate: '' });
  const [isAddingDoc, setIsAddingDoc] = useState(false);

  useEffect(() => {
    const regRef = ref(db, 'monitoramento/cadastros_ocr');
    const unsub = onValue(regRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
            setProcessedPeople(list);
        } else {
            setProcessedPeople([]);
        }
    });
    return () => off(regRef);
  }, []);

  // --- HANDLERS DOCUMENTOS ---
  const handleAddDoc = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!docForm.name || !docForm.organ || !docForm.expirationDate) return;
      
      setIsAddingDoc(true);
      try {
          const newDoc: PublicDocument = {
              uuid: `doc-${Date.now()}`,
              name: docForm.name.toUpperCase(),
              organ: docForm.organ.toUpperCase(),
              expirationDate: docForm.expirationDate
          };
          await monitoringService.addDocument(newDoc, documents);
          setDocForm({ name: '', organ: '', expirationDate: '' });
          setSuccessMsg("Documento cadastrado com sucesso!");
          setTimeout(() => setSuccessMsg(''), 3000);
      } catch (e) {
          alert("Erro ao cadastrar documento.");
      } finally {
          setIsAddingDoc(false);
      }
  };

  const handleDeleteDoc = async (uuid: string) => {
      if (window.confirm("Deseja remover este documento do monitoramento?")) {
          await monitoringService.deleteDocument(uuid, documents);
      }
  };

  const getDocStatus = (expirationDate: string) => {
      const today = new Date();
      const exp = new Date(expirationDate);
      const diffTime = exp.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return { label: 'EXPIRADO', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
      if (diffDays <= 30) return { label: 'ALERTA', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
      return { label: 'VÁLIDO', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
  };

  // --- HANDLERS OCR ---
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
    } catch (err) { alert("Câmera indisponível."); setShowCamera(false); }
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

  const handleStartOCR = async () => {
      if (!selectedImage) return;
      setIsProcessingOCR(true);
      try {
          const formData = new FormData();
          formData.append("base64image", selectedImage);
          formData.append("apikey", OCR_SPACE_KEY);
          formData.append("language", "por");
          const response = await fetch("https://api.ocr.space/parse/image", { method: "POST", body: formData });
          const result = await response.json();
          if (result.OCRExitCode === 1) {
              setRawText(result.ParsedResults[0].ParsedText);
              setSuccessMsg("Texto extraído com sucesso!");
          } else {
              throw new Error(result.ErrorMessage || "Erro OCR.");
          }
      } catch (e: any) {
          alert(`Erro: ${e.message}`);
      } finally {
          setIsProcessingOCR(false);
          setTimeout(() => setSuccessMsg(''), 3000);
      }
  };

  const handleOrganizeRecords = async () => {
      if (!rawText.trim()) return;
      const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 2);
      const cpfRegex = /(\d{3}\.?\d{3}\.?\d{3}-?\d{2})|(\d{11})/;
      let count = 0;

      for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const cpfMatch = line.match(cpfRegex);
          
          if (cpfMatch) {
              const cpfRaw = cpfMatch[0];
              const cpfClean = cpfRaw.replace(/\D/g, '');
              
              if (!validateCPF(cpfClean)) continue;

              const cpfFormatted = `${cpfClean.slice(0,3)}.${cpfClean.slice(3,6)}.${cpfClean.slice(6,9)}-${cpfClean.slice(9,11)}`;
              let namePart = line.replace(cpfRaw, '').replace(/[^a-zA-Z\sà-úÀ-Ú]/g, '').trim();
              
              if (namePart.length < 3 && i > 0) {
                  namePart = lines[i - 1].replace(/[^a-zA-Z\sà-úÀ-Ú]/g, '').trim();
              }

              if (namePart.length > 3) {
                  await push(ref(db, 'monitoramento/cadastros_ocr'), {
                      name: formatNameNormal(namePart),
                      cpf: cpfFormatted,
                      done: false,
                      timestamp: new Date().toISOString()
                  });
                  count++;
              }
          }
      }

      if (count > 0) {
          setSuccessMsg(`${count} registro(s) salvo(s)`);
          setRawText('');
          setSelectedImage(null);
      } else {
          setSuccessMsg("Nenhum registro válido encontrado");
      }
      setTimeout(() => setSuccessMsg(''), 3000);
  };

  const toggleDone = async (id: string, currentStatus: boolean) => {
      await update(ref(db, `monitoramento/cadastros_ocr/${id}`), { done: !currentStatus });
  };

  const deleteRecord = async (id: string) => {
      if (window.confirm("Remover este cadastro?")) {
          await remove(ref(db, `monitoramento/cadastros_ocr/${id}`));
      }
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      setSuccessMsg('Copiado!');
      setTimeout(() => setSuccessMsg(''), 1500);
  };

  const filteredPeople = useMemo(() => {
    return processedPeople
        .filter(p => p.name.toLowerCase().includes(listSearch.toLowerCase()))
        .sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
  }, [processedPeople, listSearch]);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-6 pb-20 px-4 sm:px-0">
      
      {/* HEADER INTEGRADO COM ABAS */}
      <div className="bg-[#0d1117] border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-600 shadow-lg shadow-amber-900/30">
            <ClipboardList size={24} className="text-white" />
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight italic">Central Cadastro</h2>
        </div>

        <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex w-full md:w-auto">
            <button 
                onClick={() => setActiveTab('ocr')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'ocr' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
                Listas OCR
            </button>
            <button 
                onClick={() => setActiveTab('documents')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'documents' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
                Documentos
            </button>
        </div>
      </div>

      {successMsg && (
          <div className="bg-emerald-600 border border-emerald-500 text-white p-4 rounded-xl flex items-center gap-3 animate-fade-in shadow-xl sticky top-4 z-50">
              <CheckCircle2 size={24} /> <span className="font-bold text-xs uppercase tracking-widest">{successMsg}</span>
          </div>
      )}

      {/* CONTEÚDO ABAS */}
      {activeTab === 'ocr' ? (
        <div className="space-y-6">
            {/* CAPTURA */}
            <div className="bg-[#0d1117] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="bg-slate-900/40 px-6 py-4 border-b border-slate-800 flex items-center gap-3">
                    <Scan size={18} className="text-amber-500" />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">1. Captura de Ficha</h3>
                </div>
                
                <div className="p-6 flex flex-col lg:flex-row gap-8 items-center">
                    <div className="w-full lg:w-1/3">
                        <div className="w-full aspect-square bg-slate-950 rounded-2xl border-2 border-dashed border-slate-800 relative overflow-hidden flex items-center justify-center group">
                            {selectedImage ? (
                                <>
                                    <img src={selectedImage} alt="Preview" className="w-full h-full object-contain p-2" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button onClick={() => setSelectedImage(null)} className="p-3 bg-rose-600 text-white rounded-full"><X size={24} /></button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-3 opacity-20">
                                    <ImageIcon size={56} className="text-slate-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Aguardando Imagem</span>
                                </div>
                            )}
                            {showCamera && (
                                <div className="absolute inset-0 bg-black z-30 flex flex-col">
                                    <video ref={videoRef} autoPlay playsInline className="flex-1 w-full h-full object-cover" />
                                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                                        <button onClick={stopCamera} className="p-2 bg-rose-600 rounded-full text-white"><X size={18}/></button>
                                        <button onClick={capturePhoto} className="p-2 bg-emerald-600 rounded-full text-white px-6 text-[10px] font-bold uppercase">Capturar</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 w-full space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={startCamera} className="flex flex-col items-center justify-center gap-2 p-6 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-slate-300 transition-all active:scale-95">
                                <CameraIcon size={28} className="text-amber-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Câmera</span>
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-6 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-slate-300 transition-all active:scale-95">
                                <Upload size={28} className="text-blue-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Arquivo</span>
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                        </div>
                        <button 
                            onClick={handleStartOCR} 
                            disabled={isProcessingOCR || !selectedImage} 
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 disabled:opacity-20 shadow-lg"
                        >
                            {isProcessingOCR ? <Loader2 className="animate-spin" size={20} /> : <Scan size={20} />} 
                            Iniciar Processamento
                        </button>
                    </div>
                </div>
            </div>

            {/* REVISÃO */}
            {rawText && (
                <div className="bg-[#0d1117] border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-fade-in">
                    <div className="bg-slate-900/40 px-6 py-4 border-b border-slate-800 flex items-center gap-3">
                        <FileText size={18} className="text-amber-500" />
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">2. Conferência de Texto</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <textarea 
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 text-sm font-mono focus:border-amber-500 outline-none h-40 resize-none leading-relaxed"
                        />
                        <button 
                            onClick={handleOrganizeRecords}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 transition-all"
                        >
                            <Wand2 size={18} /> Organizar e Salvar
                        </button>
                    </div>
                </div>
            )}

            {/* LISTA */}
            <div className="bg-[#0d1117] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-slate-800 bg-slate-900/20 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2"><List size={18} className="text-amber-500" /> Registros Processados</h3>
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input type="text" value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="Pesquisar..." className="w-full sm:w-56 pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none" />
                    </div>
                </div>
                <div className="overflow-x-auto min-h-[200px]">
                    {filteredPeople.length === 0 ? (
                        <div className="p-10 text-center text-slate-600 text-xs italic">Nenhum registro encontrado.</div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                                <tr>
                                    <th className="p-4 w-16 text-center">Status</th>
                                    <th className="p-4">Nome Completo</th>
                                    <th className="p-4">CPF</th>
                                    <th className="p-4 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filteredPeople.map(p => (
                                    <tr key={p.id} className={`transition-all ${p.done ? 'opacity-40 grayscale bg-slate-900/20' : 'hover:bg-slate-800/20'}`}>
                                        <td className="p-4 text-center">
                                            <button onClick={() => toggleDone(p.id, p.done)} className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${p.done ? 'bg-amber-500 border-amber-500 text-slate-950' : 'bg-slate-950 border-slate-700 text-transparent hover:border-amber-500'}`}>
                                                <CheckSquare size={16}/>
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <div onClick={() => copyToClipboard(p.name)} className="cursor-pointer group flex items-center gap-2">
                                                <span className={`font-bold text-sm transition-colors ${p.done ? 'text-slate-500' : 'text-slate-200 group-hover:text-amber-500'}`}>{p.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono text-xs font-bold text-emerald-500 cursor-pointer" onClick={() => copyToClipboard(p.cpf.replace(/\D/g, ''))}>
                                            {p.cpf}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => deleteRecord(p.id)} className="text-slate-600 hover:text-rose-500 p-1.5 transition-colors"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
      ) : (
        <div className="space-y-6">
            {/* NOVO DOCUMENTO */}
            <div className="bg-[#0d1117] border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-2 mb-6 text-blue-400">
                    <ShieldAlert size={18} />
                    <h3 className="text-xs font-black uppercase tracking-[0.2em]">Novo Documento</h3>
                </div>
                
                <form onSubmit={handleAddDoc} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nome Doc</label>
                        <input 
                            required
                            placeholder="Ex: AVCB"
                            value={docForm.name}
                            onChange={e => setDocForm({...docForm, name: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Órgão Emissor</label>
                        <input 
                            required
                            placeholder="Ex: Bombeiros"
                            value={docForm.organ}
                            onChange={e => setDocForm({...docForm, organ: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Validade</label>
                        <div className="relative">
                            <input 
                                required
                                type="date"
                                value={docForm.expirationDate}
                                onChange={e => setDocForm({...docForm, expirationDate: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none [color-scheme:dark]"
                            />
                        </div>
                    </div>
                    <div className="flex items-end">
                        <button 
                            type="submit"
                            disabled={isAddingDoc}
                            className="w-full h-[46px] bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                        >
                            {isAddingDoc ? <Loader2 className="animate-spin" size={16} /> : <><Plus size={16} /> Adicionar</>}
                        </button>
                    </div>
                </form>
            </div>

            {/* LISTA DE DOCUMENTOS MONITORADOS */}
            <div className="bg-[#0d1117] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-slate-800 bg-slate-900/20">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Documentos Monitorados</h3>
                </div>
                
                <div className="overflow-x-auto min-h-[200px]">
                    {documents.length === 0 ? (
                        <div className="p-16 text-center text-slate-600 text-xs italic">Nenhum documento cadastrado.</div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                                <tr>
                                    <th className="p-4">Documento</th>
                                    <th className="p-4">Órgão</th>
                                    <th className="p-4">Validade</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {documents.map(doc => {
                                    const status = getDocStatus(doc.expirationDate);
                                    return (
                                        <tr key={doc.uuid} className="hover:bg-slate-800/20 transition-colors group">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                                        <FileText size={18} />
                                                    </div>
                                                    <span className="font-bold text-slate-200">{doc.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-400 font-medium flex items-center gap-2">
                                                <Building2 size={14} className="text-slate-600" />
                                                {doc.organ}
                                            </td>
                                            <td className="p-4 font-mono text-xs text-slate-500">
                                                {new Date(doc.expirationDate).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-[9px] font-black border tracking-wider ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button onClick={() => handleDeleteDoc(doc.uuid)} className="text-slate-600 hover:text-rose-500 p-1.5 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* INFO ALERT */}
            <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-4">
                <AlertTriangle className="text-blue-500 shrink-0" size={20} />
                <div>
                    <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Cálculo de Validade Automático</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-bold">Documentos com menos de 30 dias para vencer entram automaticamente no status de ALERTA no painel principal do sistema.</p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Registration;
