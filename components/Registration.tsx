
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Camera, AccessPoint, PublicDocument, UserRole } from '../types';
import { CheckCircle2, Camera as CameraIcon, Upload, Image as ImageIcon, X, List, FileText, Search, CheckSquare, Trash2, ClipboardList, Loader2, Scan, Wand2, Plus, Calendar, ShieldAlert, Building2, AlertTriangle, Clock, Sparkles, User as UserIcon, Briefcase, Warehouse, Copy, ShieldCheck } from 'lucide-react';
import { ref, push, onValue, update, remove, off } from 'firebase/database';
import { db } from '../services/firebase';
import { monitoringService } from '../services/monitoring';
import { GoogleGenAI, Type } from "@google/genai";
import { WAREHOUSE_LIST } from '../constants';

interface RegistrationProps {
  onAddCamera: (cam: Camera) => void;
  onAddAccess: (ap: AccessPoint) => void;
  onAddDocument: (doc: PublicDocument) => void;
  onDeleteDocument: (uuid: string) => void;
  documents?: PublicDocument[];
  userRole?: UserRole;
}

const OCR_SPACE_KEY = "K89510033988957";

const COMPANIES = ['MULT', 'MPI', 'PRIMUS', 'MJM', 'B11', 'FORMA', 'SUPERA LOG', 'GMILL', 'BSB'];

const WAREHOUSE_RESPONSIBLE: { [key: string]: string } = {
    'GALPÃO G2': 'ROBSON DIAS BRITO',
    'GALPÃO G3': 'EDNEI RODRIGUES SOARES',
    'GALPÃO G5': 'MOACIR ANDRADE NUNES',
    'GALPÃO SP': 'JOSENIAS SANTOS NASCIMENTO',
    'GALPÃO PAVUNA': 'MAURO BAPTISTA CERQUEIRA',
    'GALPÃO 4 ELOS ES': 'SILVIA SANTOS',
    'GALPÃO 4 ELOS RJ': 'DANIEL CESAR MACHADO',
    'GALPÃO LSP': 'MAURO BAPTISTA CERQUEIRA',
    'GALPÃO MERITI': 'MAURO BAPTISTA CERQUEIRA'
};

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
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  
  // Estados para metadados (Painel de Cópia Rápida - Não salvos no DB)
  const [ocrWarehouse, setOcrWarehouse] = useState('');
  const [ocrOperatorName, setOcrOperatorName] = useState('');
  const [ocrCompany, setOcrCompany] = useState('');

  // Responsável Automático
  const currentResponsible = useMemo(() => WAREHOUSE_RESPONSIBLE[ocrWarehouse] || '', [ocrWarehouse]);

  // Campo calculado para Empresa/Operador (ex: PEDRO-MULT)
  const ocrOperatorComposite = useMemo(() => {
    if (!ocrOperatorName) return ocrCompany;
    if (!ocrCompany) return ocrOperatorName.toUpperCase();
    return `${ocrOperatorName.toUpperCase()}-${ocrCompany}`;
  }, [ocrOperatorName, ocrCompany]);

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

  // --- GEMINI AI REFINEMENT ---
  const handleAIRefinement = async () => {
    if (!rawText.trim()) return;
    setIsProcessingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analise o seguinte texto bruto extraído de um documento de identificação (RG/CNH) via OCR. 
        Extraia o nome completo e o CPF de cada pessoa encontrada.
        Retorne os dados em uma lista de objetos JSON contendo "name" e "cpf".
        Texto: ${rawText}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                cpf: { type: Type.STRING }
              },
              required: ["name", "cpf"]
            }
          }
        }
      });

      const structuredData = JSON.parse(response.text || '[]');
      let count = 0;
      for (const item of structuredData) {
        const cpfClean = item.cpf.replace(/\D/g, '');
        if (cpfClean.length === 11 && validateCPF(cpfClean)) {
            const cpfFormatted = `${cpfClean.slice(0,3)}.${cpfClean.slice(3,6)}.${cpfClean.slice(6,9)}-${cpfClean.slice(9,11)}`;
            await push(ref(db, 'monitoramento/cadastros_ocr'), {
                name: formatNameNormal(item.name),
                cpf: cpfFormatted,
                done: false,
                timestamp: new Date().toISOString()
            });
            count++;
        }
      }
      setSuccessMsg(`IA processou ${count} registros com sucesso!`);
      setRawText('');
    } catch (error) {
      console.error("AI Error:", error);
      alert("Falha no processamento inteligente. Verifique o texto bruto.");
    } finally {
      setIsProcessingAI(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

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
      if (!text) return;
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
      
      {/* HEADER INTEGRADO */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-inner">
            <ClipboardList size={32} className="text-amber-500" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">CENTRAL CADASTRO</h2>
            <div className="h-1 w-20 bg-amber-500 rounded-full mt-1"></div>
          </div>
        </div>

        <div className="bg-slate-950/50 p-1.5 rounded-2xl border border-slate-800 flex gap-2">
            <button 
                onClick={() => setActiveTab('ocr')}
                className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'ocr' ? 'bg-slate-800 text-white shadow-xl border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
            >
                LISTAS OCR
            </button>
            <button 
                onClick={() => setActiveTab('documents')}
                className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'documents' ? 'bg-slate-800 text-white shadow-xl border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
            >
                DOCUMENTOS
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
            {/* 1. CAPTURA DE FICHA */}
            <div className="bg-[#0d1117] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
                <div className="bg-slate-900/40 px-8 py-5 border-b border-slate-800 flex items-center gap-3">
                    <div className="p-1.5 bg-amber-500/10 rounded-lg">
                        <Scan size={20} className="text-amber-500" />
                    </div>
                    <h3 className="text-xs font-black text-slate-300 uppercase tracking-[0.3em]">1. CAPTURA DE FICHA</h3>
                </div>
                
                <div className="p-8 flex flex-col lg:flex-row gap-12 items-center">
                    <div className="w-full lg:w-2/5">
                        <div className="w-full aspect-[4/3] bg-slate-950 rounded-3xl border-2 border-dashed border-slate-700 relative overflow-hidden flex items-center justify-center group shadow-inner">
                            {selectedImage ? (
                                <>
                                    <img src={selectedImage} alt="Preview" className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                                        <button onClick={() => setSelectedImage(null)} className="p-4 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-2xl transform transition-transform hover:scale-110 active:scale-95"><X size={32} /></button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-4 opacity-30 text-slate-500">
                                    <div className="p-6 bg-slate-900 rounded-full border border-slate-800">
                                        <ImageIcon size={64} strokeWidth={1} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">AGUARDANDO IMAGEM</span>
                                </div>
                            )}
                            {showCamera && (
                                <div className="absolute inset-0 bg-black z-30 flex flex-col">
                                    <video ref={videoRef} autoPlay playsInline className="flex-1 w-full h-full object-cover" />
                                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6">
                                        <button onClick={stopCamera} className="p-4 bg-rose-600 rounded-full text-white shadow-xl"><X size={24}/></button>
                                        <button onClick={capturePhoto} className="p-4 bg-emerald-600 rounded-full text-white px-10 text-xs font-black uppercase tracking-widest shadow-xl">Capturar</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 w-full flex flex-col gap-6">
                        <div className="grid grid-cols-2 gap-6">
                            <button onClick={startCamera} className="flex flex-col items-center justify-center gap-4 p-10 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-3xl text-slate-300 transition-all hover:border-amber-500/50 group shadow-xl active:scale-95">
                                <div className="p-4 bg-amber-500/10 rounded-2xl group-hover:bg-amber-500/20 transition-colors">
                                    <CameraIcon size={40} className="text-amber-500" />
                                </div>
                                <span className="text-xs font-black uppercase tracking-[0.2em]">CÂMERA</span>
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-4 p-10 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-3xl text-slate-300 transition-all hover:border-blue-500/50 group shadow-xl active:scale-95">
                                <div className="p-4 bg-blue-500/10 rounded-2xl group-hover:bg-blue-500/20 transition-colors">
                                    <Upload size={40} className="text-blue-500" />
                                </div>
                                <span className="text-xs font-black uppercase tracking-[0.2em]">ARQUIVO</span>
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                        </div>
                        
                        <button 
                            onClick={handleStartOCR} 
                            disabled={isProcessingOCR || !selectedImage} 
                            className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-4 disabled:opacity-20 shadow-2xl shadow-blue-900/40 transition-all active:scale-95"
                        >
                            {isProcessingOCR ? <Loader2 className="animate-spin" size={24} /> : <Scan size={24} />} 
                            INICIAR PROCESSAMENTO OCR
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. REVISÃO - PAINEL DE CÓPIA RÁPIDA (Não salvo no banco) */}
            <div className="bg-[#0b0e14] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-fade-in relative p-8">
                {/* Metadados: 4 colunas - Apenas UI Helper */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* COLUNA 1: GALPÃO */}
                    <div className="space-y-4">
                        <label className="text-xs font-black text-[#facc15] text-center w-full block uppercase tracking-widest">
                            Galpão:
                        </label>
                        <div className="space-y-3">
                            <select 
                                value={ocrWarehouse}
                                onChange={e => setOcrWarehouse(e.target.value)}
                                className="w-full h-[54px] bg-[#1a1c24] border border-slate-700 rounded-xl px-5 text-sm text-white font-bold focus:border-amber-500 outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Selecione...</option>
                                {WAREHOUSE_LIST.map(wh => <option key={wh} value={wh}>{wh}</option>)}
                            </select>
                            <button 
                                onClick={() => copyToClipboard(ocrWarehouse)}
                                disabled={!ocrWarehouse}
                                className="w-full py-3 bg-[#1a1c24] hover:bg-[#252833] text-[#facc15] font-black rounded-xl uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-20"
                            >
                                Copiar
                            </button>
                        </div>
                    </div>

                    {/* COLUNA 2: EMPRESA/OPERADOR */}
                    <div className="space-y-4">
                        <label className="text-xs font-black text-[#facc15] text-center w-full block uppercase tracking-widest">
                            Empresa/Operador:
                        </label>
                        <div className="space-y-3">
                            <div className="relative">
                                <input 
                                    placeholder="Nome do Operador..."
                                    value={ocrOperatorName}
                                    onChange={e => setOcrOperatorName(e.target.value)}
                                    className="w-full h-[54px] bg-[#1a1c24] border border-slate-700 rounded-xl px-5 text-sm text-white font-bold focus:border-amber-500 outline-none transition-all placeholder-slate-600"
                                />
                                {ocrOperatorComposite && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-amber-500/50 uppercase">
                                        {ocrOperatorComposite}
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={() => copyToClipboard(ocrOperatorComposite)}
                                disabled={!ocrOperatorComposite}
                                className="w-full py-3 bg-[#1a1c24] hover:bg-[#252833] text-[#facc15] font-black rounded-xl uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-20"
                            >
                                Copiar
                            </button>
                        </div>
                    </div>

                    {/* COLUNA 3: EMPRESA */}
                    <div className="space-y-4">
                        <label className="text-xs font-black text-[#facc15] text-center w-full block uppercase tracking-widest">
                            Empresa:
                        </label>
                        <div className="space-y-3">
                            <select 
                                value={ocrCompany}
                                onChange={e => setOcrCompany(e.target.value)}
                                className="w-full h-[54px] bg-[#1a1c24] border border-slate-700 rounded-xl px-5 text-sm text-white font-bold focus:border-amber-500 outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Empresa Parceira...</option>
                                {COMPANIES.map(comp => <option key={comp} value={comp}>{comp}</option>)}
                            </select>
                            <button 
                                onClick={() => copyToClipboard(ocrCompany)}
                                disabled={!ocrCompany}
                                className="w-full py-3 bg-[#1a1c24] hover:bg-[#252833] text-[#facc15] font-black rounded-xl uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-20"
                            >
                                Copiar
                            </button>
                        </div>
                    </div>

                    {/* COLUNA 4: RESPONSÁVEL (Automático) */}
                    <div className="space-y-4">
                        <label className="text-xs font-black text-[#facc15] text-center w-full block uppercase tracking-widest">
                            Responsável:
                        </label>
                        <div className="space-y-3">
                            <div className="w-full h-[54px] bg-[#1a1c24]/50 border border-slate-700/50 rounded-xl px-5 flex items-center justify-center text-sm text-slate-300 font-black uppercase tracking-tight overflow-hidden text-center">
                                {currentResponsible || '---'}
                            </div>
                            <button 
                                onClick={() => copyToClipboard(currentResponsible)}
                                disabled={!currentResponsible}
                                className="w-full py-3 bg-[#1a1c24] hover:bg-[#252833] text-[#facc15] font-black rounded-xl uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-20"
                            >
                                Copiar
                            </button>
                        </div>
                    </div>
                </div>

                {/* ÁREA DE TEXTO BRUTO */}
                <div className="bg-slate-900/40 p-1 rounded-2xl border border-slate-800 shadow-inner">
                    <div className="bg-slate-950/40 px-8 py-4 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileText size={18} className="text-amber-500" />
                            <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">2. TEXTO BRUTO</h3>
                        </div>
                        {rawText && (
                            <button 
                                onClick={handleAIRefinement}
                                disabled={isProcessingAI}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                {isProcessingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                Refinar com Inteligência Artificial
                            </button>
                        )}
                    </div>
                    <div className="p-6 space-y-6">
                        <textarea 
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            placeholder="O texto extraído do OCR aparecerá aqui..."
                            className="w-full bg-[#020408] border border-slate-800 rounded-2xl p-6 text-slate-300 text-sm font-mono focus:border-amber-500 outline-none h-40 resize-none leading-relaxed shadow-inner"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button 
                                onClick={handleOrganizeRecords}
                                disabled={!rawText.trim()}
                                className="py-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-500 font-black rounded-2xl uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all disabled:opacity-30"
                            >
                                <Wand2 size={16} /> ORGANIZAR REGISTROS (REGEX)
                            </button>
                            <button 
                                onClick={() => {
                                    setRawText('');
                                    setOcrWarehouse('');
                                    setOcrOperatorName('');
                                    setOcrCompany('');
                                }}
                                disabled={!rawText.trim() && !ocrWarehouse && !ocrOperatorName && !ocrCompany}
                                className="py-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-500 font-black rounded-2xl uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all disabled:opacity-30"
                            >
                                <X size={16} /> LIMPAR ÁREA
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. LISTA DE REGISTROS */}
            <div className="bg-[#0d1117] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="px-8 py-5 border-b border-slate-800 bg-slate-900/20 flex flex-col sm:flex-row justify-between items-center gap-6">
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3"><List size={22} className="text-amber-500" /> REGISTROS PROCESSADOS</h3>
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                        <input 
                            type="text" 
                            value={listSearch} 
                            onChange={e => setListSearch(e.target.value)} 
                            placeholder="PESQUISAR CADASTROS..." 
                            className="w-full sm:w-80 pl-12 pr-6 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white text-xs font-bold focus:outline-none focus:border-amber-500 transition-colors tracking-widest placeholder-slate-700" 
                        />
                    </div>
                </div>
                <div className="overflow-x-auto min-h-[300px]">
                    {filteredPeople.length === 0 ? (
                        <div className="p-20 text-center flex flex-col items-center gap-4">
                            <div className="p-6 bg-slate-900/50 rounded-full border border-dashed border-slate-800">
                                <Search size={48} className="text-slate-800" />
                            </div>
                            <p className="text-slate-600 text-xs font-black uppercase tracking-[0.3em]">NENHUM REGISTRO ENCONTRADO</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-900/80 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] border-b border-slate-800">
                                <tr>
                                    <th className="p-6 w-20 text-center">STATUS</th>
                                    <th className="p-6">NOME COMPLETO</th>
                                    <th className="p-6">DOCUMENTO (CPF)</th>
                                    <th className="p-6 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filteredPeople.map(p => (
                                    <tr key={p.id} className={`transition-all duration-300 ${p.done ? 'opacity-40 grayscale bg-slate-900/10' : 'hover:bg-slate-800/20 group'}`}>
                                        <td className="p-6 text-center">
                                            <button 
                                                onClick={() => toggleDone(p.id, p.done)} 
                                                className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all transform active:scale-90 ${p.done ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-950 border-slate-800 text-transparent hover:border-amber-500/50'}`}
                                            >
                                                <CheckSquare size={20}/>
                                            </button>
                                        </td>
                                        <td className="p-6">
                                            <div onClick={() => copyToClipboard(p.name)} className="cursor-pointer flex flex-col">
                                                <span className={`font-black text-sm uppercase tracking-tight transition-colors ${p.done ? 'text-slate-500' : 'text-slate-100 group-hover:text-amber-500'}`}>{p.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div onClick={() => copyToClipboard(p.cpf.replace(/\D/g, ''))} className="cursor-pointer inline-flex items-center gap-3">
                                                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 font-mono text-sm font-black shadow-sm group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                                    {p.cpf}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <button onClick={() => deleteRecord(p.id)} className="text-slate-700 hover:text-rose-500 p-2 transition-all hover:scale-110"><Trash2 size={20}/></button>
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
            <div className="bg-[#0d1117] border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
                <div className="flex items-center gap-3 mb-8 text-blue-500">
                    <ShieldAlert size={24} />
                    <h3 className="text-sm font-black uppercase tracking-[0.3em]">CADASTRO DE DOCUMENTO</h3>
                </div>
                
                <form onSubmit={handleAddDoc} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">IDENTIFICAÇÃO DO DOC</label>
                        <input 
                            required
                            placeholder="Ex: AVCB"
                            value={docForm.name}
                            onChange={e => setDocForm({...docForm, name: e.target.value})}
                            className="w-full h-[54px] bg-[#05070a] border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white font-bold focus:border-blue-500 outline-none transition-all placeholder-slate-800"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ÓRGÃO EMISSOR</label>
                        <input 
                            required
                            placeholder="Ex: BOMBEIROS"
                            value={docForm.organ}
                            onChange={e => setDocForm({...docForm, organ: e.target.value})}
                            className="w-full h-[54px] bg-[#05070a] border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white font-bold focus:border-blue-500 outline-none transition-all placeholder-slate-800"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">DATA DE VALIDADE</label>
                        <input 
                            required
                            type="date"
                            value={docForm.expirationDate}
                            onChange={e => setDocForm({...docForm, expirationDate: e.target.value})}
                            className="w-full bg-[#05070a] border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white font-bold focus:border-blue-500 outline-none transition-all [color-scheme:dark]"
                        />
                    </div>
                    <div className="flex items-end">
                        <button 
                            type="submit"
                            disabled={isAddingDoc}
                            className="w-full h-[54px] bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-900/30 active:scale-95"
                        >
                            {isAddingDoc ? <Loader2 className="animate-spin" size={20} /> : <><Plus size={20} /> ADICIONAR</>}
                        </button>
                    </div>
                </form>
            </div>

            {/* LISTA DE DOCUMENTOS MONITORADOS */}
            <div className="bg-[#0d1117] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="px-8 py-5 border-b border-slate-800 bg-slate-900/20">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">DOCUMENTOS MONITORADOS</h3>
                </div>
                
                <div className="overflow-x-auto min-h-[300px]">
                    {documents.length === 0 ? (
                        <div className="p-24 text-center flex flex-col items-center gap-4">
                            <Building2 size={64} className="text-slate-800" />
                            <p className="text-slate-600 text-xs font-black uppercase tracking-[0.3em]">NENHUM DOCUMENTO REGISTRADO</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900/80 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] border-b border-slate-800">
                                <tr>
                                    <th className="p-6">DOCUMENTO</th>
                                    <th className="p-6">ÓRGÃO</th>
                                    <th className="p-6">VENCIMENTO</th>
                                    <th className="p-6">STATUS</th>
                                    <th className="p-6 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {documents.map(doc => {
                                    const status = getDocStatus(doc.expirationDate);
                                    return (
                                        <tr key={doc.uuid} className="hover:bg-slate-800/20 transition-all group">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20">
                                                        <FileText size={22} />
                                                    </div>
                                                    <span className="font-black text-slate-100 uppercase tracking-tight">{doc.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[11px] tracking-widest">
                                                    <Building2 size={16} className="text-slate-600" />
                                                    {doc.organ}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-sm text-slate-300 font-black">{new Date(doc.expirationDate).toLocaleDateString('pt-BR')}</span>
                                                    <div className="flex items-center gap-1 text-[9px] text-slate-600 uppercase mt-1">
                                                        <Clock size={10} /> SISTEMA MONITORANDO
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border-2 tracking-widest flex items-center justify-center w-32 ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="p-6 text-center">
                                                <button onClick={() => handleDeleteDoc(doc.uuid)} className="text-slate-700 hover:text-rose-500 p-2 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={22}/></button>
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
            <div className="bg-blue-600/5 border border-blue-600/20 p-8 rounded-3xl flex items-start gap-6 shadow-lg">
                <div className="p-3 bg-blue-600/10 rounded-2xl">
                    <AlertTriangle className="text-blue-500" size={32} />
                </div>
                <div className="space-y-2">
                    <h4 className="text-sm font-black text-blue-400 uppercase tracking-[0.2em]">SISTEMA DE ALERTA AUTOMÁTICO</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-bold uppercase max-w-2xl">DOCUMENTOS COM MENOS DE 30 DIAS PARA VENCER ENTRAM AUTOMATICAMENTE NO STATUS DE ALERTA NO PAINEL PRINCIPAL DO SISTEMA, NOTIFICANDO TODA A EQUIPE DE SUPERVISÃO.</p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Registration;
