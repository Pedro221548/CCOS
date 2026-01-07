
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Camera, AccessPoint, PublicDocument, UserRole } from '../types';
import { CheckCircle2, Camera as CameraIcon, Upload, Image as ImageIcon, X, List, FileText, Search, CheckSquare, Square, Trash2, ClipboardList, Loader2, AlertTriangle, Settings, Plus, Edit3, Save, Scan, Wand2 } from 'lucide-react';
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

const OCR_SPACE_KEY = "K89510033988957";

const DEFAULT_OPTIONS = {
    responsibles: ['MOACIR ANDRADE', 'ROBSON DIAS', 'EDNEI RODRIGUES', 'MAURO BAPTISTA', 'JOSENIAS SANTOS', 'DANIEL CESAR', 'SILVIA SANTOS'],
    contractors: ['MULT-PEDRO', 'MULT-JOAO', 'MULT-MARIA', 'OUTRO'],
    types: ['DIARISTA', 'MENSALISTA', 'VISITANTE', 'MOTORISTA', 'AJUDANTE']
};

const Registration: React.FC<RegistrationProps> = ({ onAddDocument, onDeleteDocument, documents = [], userRole = 'viewer' }) => {
  const [activeType, setActiveType] = useState<RegistrationType>('LIST'); 
  const [successMsg, setSuccessMsg] = useState('');
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  
  const [customOptions, setCustomOptions] = useState(DEFAULT_OPTIONS);
  const [editingCategory, setEditingCategory] = useState<'responsibles' | 'contractors' | 'types' | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // OCR States
  const [rawText, setRawText] = useState('');
  const [processedPeople, setProcessedPeople] = useState<any[]>([]);
  const [listSearch, setListSearch] = useState('');

  const isAdmin = userRole === 'admin';

  useEffect(() => {
      const configRef = ref(db, 'monitoramento/config/registration_options');
      const unsub = onValue(configRef, (snapshot) => {
          if (snapshot.exists()) setCustomOptions(snapshot.val());
      });
      return () => unsub();
  }, []);

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

  // --- ESCANEAMENTO VIA OCR.SPACE ---
  const handleStartOCR = async () => {
      if (!selectedImage) {
          alert("Selecione uma imagem primeiro.");
          return;
      }

      setIsProcessingOCR(true);
      try {
          const base64Data = selectedImage;
          
          const formData = new FormData();
          formData.append("base64image", base64Data);
          formData.append("apikey", OCR_SPACE_KEY);
          formData.append("language", "por");
          formData.append("isOverlayRequired", "false");
          formData.append("filetype", "JPG");

          const response = await fetch("https://api.ocr.space/parse/image", {
              method: "POST",
              body: formData
          });

          const result = await response.json();

          if (result.OCRExitCode === 1) {
              const text = result.ParsedResults[0].ParsedText;
              setRawText(text);
              setSuccessMsg("Escaneamento concluído!");
          } else {
              throw new Error(result.ErrorMessage || "Erro ao processar imagem.");
          }
      } catch (e: any) {
          alert(`Erro OCR: ${e.message}`);
      } finally {
          setIsProcessingOCR(false);
          setTimeout(() => setSuccessMsg(''), 3000);
      }
  };

  // --- ORGANIZAR REGISTROS (ALGORITMO MANUAL SEM IA) ---
  const handleOrganizeRecords = () => {
      if (!rawText.trim()) return;

      const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 2);
      const newPeople: any[] = [];
      
      // Padrão de CPF: procura por sequências de 11 números ou formato pontuado
      const cpfRegex = /(\d{3}\.?\d{3}\.?\d{3}-?\d{2})|(\d{11})/;

      lines.forEach((line, index) => {
          const cpfMatch = line.match(cpfRegex);
          if (cpfMatch) {
              let cpf = cpfMatch[0].replace(/\D/g, '');
              if (cpf.length === 11) {
                  cpf = `${cpf.slice(0,3)}.${cpf.slice(3,6)}.${cpf.slice(6,9)}-${cpf.slice(9,11)}`;
              }
              
              // Tenta achar o nome: geralmente está na mesma linha ou na anterior
              let nameCandidate = line.replace(cpfMatch[0], '').trim();
              if (nameCandidate.length < 3 && index > 0) {
                  nameCandidate = lines[index - 1];
              }

              if (nameCandidate.length > 3) {
                  newPeople.push({
                      id: `p-${Date.now()}-${index}`,
                      name: nameCandidate.toUpperCase(),
                      cpf: cpf,
                      done: false
                  });
              }
          }
      });

      if (newPeople.length > 0) {
          setProcessedPeople(prev => [...newPeople, ...prev]);
          setSuccessMsg(`${newPeople.length} registros identificados!`);
      } else {
          alert("Nenhum padrão de CPF/Nome encontrado no texto bruto.");
      }
      setTimeout(() => setSuccessMsg(''), 3000);
  };

  const sortedAndFilteredPeople = useMemo(() => {
    return processedPeople
        .filter(p => p.name.toLowerCase().includes(listSearch.toLowerCase()))
        .sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
  }, [processedPeople, listSearch]);

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      setSuccessMsg('Copiado!');
      setTimeout(() => setSuccessMsg(''), 1500);
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-6 pb-12 px-4 sm:px-0">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-lg">
        <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 uppercase tracking-tighter italic">
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

      {activeType === 'LIST' && (
          <div className="space-y-6 animate-fade-in">
                {/* 1. CAPTURA OCR */}
                <div className="bg-[#05070a] border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="bg-slate-900/40 px-6 py-4 border-b border-slate-800/50">
                        <h3 className="text-xs font-black text-amber-500 flex items-center gap-3 uppercase tracking-[0.2em]">
                            <Scan size={16} className="text-amber-500" /> 1. CAPTURA OCR
                        </h3>
                    </div>
                    
                    <div className="p-6 sm:p-10 flex flex-col lg:flex-row gap-8 items-center">
                        <div className="w-full lg:w-1/3 flex justify-center">
                            <div className="w-full max-w-[280px] aspect-square bg-[#020406] rounded-2xl border-2 border-dashed border-slate-800 relative overflow-hidden flex items-center justify-center group shadow-inner">
                                {selectedImage ? (
                                    <>
                                        <img src={selectedImage} alt="Preview" className="w-full h-full object-contain p-2" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button onClick={() => setSelectedImage(null)} className="p-3 bg-rose-600 text-white rounded-full"><X size={24} /></button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-3 opacity-20">
                                        <ImageIcon size={48} className="text-slate-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">SEM IMAGEM</span>
                                    </div>
                                )}
                                
                                {showCamera && (
                                    <div className="absolute inset-0 bg-black z-30 flex flex-col">
                                        <video ref={videoRef} autoPlay playsInline className="flex-1 w-full h-full object-cover" />
                                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                                            <button onClick={stopCamera} className="p-3 bg-rose-600 rounded-full text-white"><X size={20}/></button>
                                            <button onClick={capturePhoto} className="p-3 bg-emerald-600 rounded-full text-white px-6 flex items-center gap-2 font-bold uppercase text-[10px]"><CameraIcon size={18}/> Capturar</button>
                                        </div>
                                    </div>
                                )}
                                <canvas ref={canvasRef} width="640" height="480" className="hidden"></canvas>
                            </div>
                        </div>

                        <div className="flex-1 w-full">
                            <div className="bg-[#0a0c10] border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={startCamera} className="flex flex-col items-center justify-center gap-3 p-8 bg-[#161b22] hover:bg-[#1c2128] border border-slate-800 rounded-2xl text-slate-300 transition-all group active:scale-95 shadow-md">
                                        <CameraIcon size={32} className="text-amber-500" />
                                        <span className="text-[11px] font-black uppercase tracking-widest">CÂMERA</span>
                                    </button>
                                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-3 p-8 bg-[#161b22] hover:bg-[#1c2128] border border-slate-800 rounded-2xl text-slate-300 transition-all group active:scale-95 shadow-md">
                                        <Upload size={32} className="text-blue-500" />
                                        <span className="text-[11px] font-black uppercase tracking-widest">ARQUIVO</span>
                                    </button>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                                </div>
                                
                                <button 
                                    onClick={handleStartOCR} 
                                    disabled={isProcessingOCR || !selectedImage} 
                                    className="w-full py-4 bg-[#111827] border border-slate-700/50 hover:border-amber-500/50 text-amber-500 font-black rounded-xl uppercase text-[12px] tracking-[0.2em] flex items-center justify-center gap-4 disabled:opacity-30 transition-all active:scale-95"
                                >
                                    {isProcessingOCR ? <Loader2 className="animate-spin" size={20} /> : <Scan size={20} />} 
                                    INICIAR ESCANEAMENTO
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. TEXTO BRUTO */}
                <div className="bg-[#05070a] border border-slate-800/50 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="bg-slate-900/40 px-6 py-4 border-b border-slate-800/50">
                        <h3 className="text-xs font-black text-amber-500 flex items-center gap-3 uppercase tracking-[0.2em]">
                            <FileText size={16} className="text-amber-500" /> 2. TEXTO BRUTO
                        </h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <textarea 
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            placeholder="O texto extraído aparecerá aqui..."
                            className="w-full bg-[#020406] border border-slate-800 rounded-xl p-6 text-slate-300 text-sm font-mono focus:border-amber-500 outline-none h-48 resize-none leading-relaxed"
                        />
                        <button 
                            onClick={handleOrganizeRecords}
                            disabled={!rawText.trim()}
                            className="w-full py-4 bg-[#111827] border border-slate-700 hover:border-amber-500/50 text-amber-500 font-black rounded-xl uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-30 transition-all active:scale-95 shadow-lg"
                        >
                            <Wand2 size={18} />
                            ORGANIZAR REGISTROS
                        </button>
                    </div>
                </div>

                {/* TABELA DE RESULTADOS */}
                {processedPeople.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
                        <div className="p-5 border-b border-slate-800 bg-slate-950/30 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2"><List size={18} className="text-amber-500" /> 3. REGISTROS PROCESSADOS</h3>
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
                                    {sortedAndFilteredPeople.map(p => (
                                        <tr key={p.id} className={`transition-all duration-500 ${p.done ? 'bg-slate-950/80 grayscale opacity-40 line-through' : 'hover:bg-slate-800/20'}`}>
                                            <td className="p-5 text-center">
                                                <button 
                                                    onClick={() => setProcessedPeople(prev => prev.map(x => x.id === p.id ? { ...x, done: !x.done } : x))} 
                                                    className={`w-6 h-6 rounded flex items-center justify-center border transition-all ${p.done ? 'bg-amber-500 border-amber-500 text-slate-950' : 'bg-white border-slate-400 text-white shadow-inner'}`}
                                                >
                                                    {p.done && <CheckSquare size={16}/>}
                                                </button>
                                            </td>
                                            <td className="p-5">
                                                <div onClick={() => copyToClipboard(p.name)} className="bg-[#1a1c1e] border border-slate-800 rounded-lg px-6 py-3 text-center cursor-pointer hover:border-amber-500/50 transition-all active:scale-95 shadow-md">
                                                    <span className="text-sm font-bold text-amber-500 tracking-tight">{p.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div onClick={() => copyToClipboard(p.cpf.replace(/\D/g, ''))} className="w-full bg-[#1a1c1e] border border-slate-800 rounded-lg px-6 py-3 text-center cursor-pointer hover:border-amber-500/50 transition-all active:scale-95 shadow-md flex items-center justify-center gap-3">
                                                    <span className="text-sm font-bold text-amber-500 font-mono tracking-wider">{p.cpf}</span>
                                                </div>
                                            </td>
                                            <td className="p-5 text-center">
                                                {isAdmin && <button onClick={() => setProcessedPeople(prev => prev.filter(x => x.id !== p.id))} className="text-slate-600 hover:text-rose-500 p-2 transition-all"><Trash2 size={20}/></button>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
          </div>
      )}

      {activeType === 'DOCUMENT' && (
          <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                   <div className="p-4 bg-slate-950/50 border-b border-slate-800"><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Painel de Validade</h3></div>
                   <div className="overflow-x-auto min-h-[200px]">
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
    </div>
  );
};

export default Registration;
