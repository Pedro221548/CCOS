
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Camera, AccessPoint, PublicDocument, UserRole } from '../types';
import { CheckCircle2, Camera as CameraIcon, Upload, Image as ImageIcon, X, List, FileText, Search, CheckSquare, Trash2, ClipboardList, Loader2, Scan, Wand2 } from 'lucide-react';
import { ref, push, onValue, update, remove, off } from 'firebase/database';
import { db } from '../services/firebase';

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

// Formatação para Nome Normal (Sem caixa alta)
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

const Registration: React.FC<RegistrationProps> = ({ userRole = 'viewer' }) => {
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

  const isAdmin = userRole === 'admin';

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
              
              if (!validateCPF(cpfClean)) {
                  console.log("CPF inválido ignorado:", cpfClean);
                  continue;
              }

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
          setSuccessMsg(`CPF Válido - ${count} registro(s) salvo(s)`);
          setRawText('');
          setSelectedImage(null);
      } else {
          setSuccessMsg("CPF Inválido - Nenhum registro salvo");
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
    <div className="max-w-5xl mx-auto animate-fade-in space-y-8 pb-20 px-4 sm:px-0">
      
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center gap-4">
        <div className="p-3 rounded-xl bg-amber-600 shadow-lg shadow-amber-900/20">
          <ClipboardList size={28} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-tight">Scanner de Cadastro</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Nomes Normais e CPFs Válidos</p>
        </div>
      </div>

      {successMsg && (
          <div className="bg-[#111827] border border-amber-500/30 text-amber-500 p-4 rounded-xl flex items-center gap-3 animate-fade-in shadow-lg sticky top-4 z-50 backdrop-blur-md">
              <CheckCircle2 size={24} /> <span className="font-bold text-xs uppercase tracking-widest">{successMsg}</span>
          </div>
      )}

      {/* 1. CAPTURA */}
      <div className="bg-[#05070a] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-slate-900/40 px-6 py-4 border-b border-slate-800 flex items-center gap-3">
              <Scan size={18} className="text-amber-500" />
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">1. CAPTURA DE FICHA</h3>
          </div>
          
          <div className="p-6 sm:p-8 flex flex-col lg:flex-row gap-8 items-center">
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
                              <ImageIcon size={56} className="text-slate-500" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aguardando Imagem</span>
                          </div>
                      )}
                      {showCamera && (
                          <div className="absolute inset-0 bg-black z-30 flex flex-col">
                              <video ref={videoRef} autoPlay playsInline className="flex-1 w-full h-full object-cover" />
                              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                                  <button onClick={stopCamera} className="p-3 bg-rose-600 rounded-full text-white shadow-xl"><X size={20}/></button>
                                  <button onClick={capturePhoto} className="p-3 bg-emerald-600 rounded-full text-white px-8 flex items-center gap-2 font-black uppercase text-[10px] shadow-xl"><CameraIcon size={18}/> Capturar</button>
                              </div>
                          </div>
                      )}
                      <canvas ref={canvasRef} width="640" height="480" className="hidden"></canvas>
                  </div>
              </div>

              <div className="flex-1 w-full space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                      <button onClick={startCamera} className="flex flex-col items-center justify-center gap-3 p-10 bg-[#161b22] hover:bg-[#1c2128] border border-slate-800 rounded-2xl text-slate-300 transition-all active:scale-95 shadow-md">
                          <CameraIcon size={36} className="text-amber-500" />
                          <span className="text-[11px] font-black uppercase tracking-widest">USAR CÂMERA</span>
                      </button>
                      <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-3 p-10 bg-[#161b22] hover:bg-[#1c2128] border border-slate-800 rounded-2xl text-slate-300 transition-all active:scale-95 shadow-md">
                          <Upload size={36} className="text-blue-500" />
                          <span className="text-[11px] font-black uppercase tracking-widest">CARREGAR</span>
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                  </div>
                  <button 
                      onClick={handleStartOCR} 
                      disabled={isProcessingOCR || !selectedImage} 
                      className="w-full py-5 bg-[#111827] border border-slate-700/50 hover:border-amber-500/50 text-amber-500 font-black rounded-2xl uppercase text-[12px] tracking-[0.3em] flex items-center justify-center gap-4 disabled:opacity-20 shadow-xl"
                  >
                      {isProcessingOCR ? <Loader2 className="animate-spin" size={24} /> : <Scan size={24} />} 
                      INICIAR PROCESSAMENTO
                  </button>
              </div>
          </div>
      </div>

      {/* 2. REVISÃO */}
      <div className="bg-[#05070a] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-slate-900/40 px-6 py-4 border-b border-slate-800 flex items-center gap-3">
              <FileText size={18} className="text-amber-500" />
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">2. CONFERÊNCIA DE TEXTO</h3>
          </div>
          <div className="p-6 space-y-4">
              <textarea 
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Revisão dos dados antes de salvar..."
                  className="w-full bg-[#020406] border border-slate-800 rounded-xl p-6 text-slate-300 text-sm font-mono focus:border-amber-500 outline-none h-40 resize-none leading-relaxed shadow-inner"
              />
              <button 
                  onClick={handleOrganizeRecords}
                  disabled={!rawText.trim()}
                  className="w-full py-4 bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-emerald-500 font-black rounded-xl uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-30 transition-all active:scale-95 shadow-lg"
              >
                  <Wand2 size={18} />
                  ORGANIZAR E SALVAR REGISTROS
              </button>
          </div>
      </div>

      {/* 3. LISTA FINAL */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
          <div className="p-5 border-b border-slate-800 bg-slate-950/30 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2"><List size={18} className="text-amber-500" /> 3. REGISTROS PROCESSADOS</h3>
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input type="text" value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="Pesquisar..." className="w-full sm:w-56 pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 shadow-inner" />
              </div>
          </div>
          <div className="overflow-x-auto min-h-[200px]">
              {filteredPeople.length === 0 ? (
                  <div className="p-10 text-center text-slate-600 text-xs italic">Nenhum dado salvo no banco.</div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-800">
                        <tr>
                            <th className="p-5 w-20 text-center">CHECK</th>
                            <th className="p-5">NOME COMPLETO</th>
                            <th className="p-5 w-64 text-center">CPF</th>
                            <th className="p-5 w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-slate-300">
                        {filteredPeople.map(p => (
                            <tr key={p.id} className={`transition-all duration-300 ${p.done ? 'bg-slate-950/80 grayscale opacity-40 line-through' : 'hover:bg-slate-800/20'}`}>
                                <td className="p-5 text-center">
                                    <button 
                                        onClick={() => toggleDone(p.id, p.done)} 
                                        className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${p.done ? 'bg-amber-500 border-amber-500 text-slate-950' : 'bg-slate-950 border-slate-700 text-transparent hover:border-amber-500'}`}
                                    >
                                        {p.done && <CheckSquare size={18}/>}
                                    </button>
                                </td>
                                <td className="p-5">
                                    <div onClick={() => copyToClipboard(p.name)} className="bg-[#1a1c1e] border border-slate-800 rounded-xl px-6 py-3 cursor-pointer hover:border-amber-500/50 transition-all active:scale-95 shadow-md flex items-center justify-between group/cell">
                                        <span className="text-sm font-bold text-amber-500 tracking-tight truncate">{p.name}</span>
                                        <span className="text-[8px] font-black uppercase text-slate-600 group-hover/cell:text-amber-500/50 opacity-0 group-hover/cell:opacity-100 transition-all">Copiar</span>
                                    </div>
                                </td>
                                <td className="p-5">
                                    <div 
                                      onClick={() => copyToClipboard(p.cpf.replace(/\D/g, ''))} 
                                      className="w-full bg-[#1a1c1e] border border-slate-800 rounded-xl px-6 py-3 text-center cursor-pointer transition-all active:scale-95 shadow-md flex items-center justify-center gap-3 group/cpf"
                                    >
                                        <span className="text-sm font-bold text-emerald-500 font-mono tracking-wider">{p.cpf}</span>
                                        <span className="text-[8px] font-black uppercase text-slate-600 group-hover/cpf:text-slate-400 opacity-0 group-hover/cpf:opacity-100 transition-all">Copiar</span>
                                    </div>
                                </td>
                                <td className="p-5 text-center">
                                    <button onClick={() => deleteRecord(p.id)} className="text-slate-600 hover:text-rose-500 p-2 transition-all"><Trash2 size={20}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              )}
          </div>
      </div>
    </div>
  );
};

export default Registration;
