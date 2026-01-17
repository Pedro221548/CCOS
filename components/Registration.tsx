
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

// LISTA OFICIAL CORRIGIDA (9 Empresas)
const COMPANIES = ['B11', 'FORMA', 'MJM', 'MPI', 'MULT', 'PRAYLOG', 'PRIMUS', 'SUPERA LOG', 'BSB'];

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
    return name.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0)
        .map(word => {
            const prepositions = ['de', 'da', 'do', 'dos', 'das', 'e'];
            if (prepositions.includes(word)) return word;
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
};

const Registration: React.FC<RegistrationProps> = ({ userRole = 'viewer', documents = [] }) => {
  const [activeTab, setActiveTab] = useState<'ocr' | 'documents'>('ocr');
  const [successMsg, setSuccessMsg] = useState('');
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [ocrWarehouse, setOcrWarehouse] = useState('');
  const [ocrOperatorName, setOcrOperatorName] = useState('');
  const [ocrCompany, setOcrCompany] = useState('');
  const [rawText, setRawText] = useState('');
  const [processedPeople, setProcessedPeople] = useState<any[]>([]);
  const [listSearch, setListSearch] = useState('');
  const [docForm, setDocForm] = useState({ name: '', organ: '', expirationDate: '' });
  const [isAddingDoc, setIsAddingDoc] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentResponsible = useMemo(() => WAREHOUSE_RESPONSIBLE[ocrWarehouse] || '', [ocrWarehouse]);
  const ocrOperatorComposite = useMemo(() => {
    if (!ocrOperatorName) return ocrCompany;
    if (!ocrCompany) return ocrOperatorName.toUpperCase();
    return `${ocrOperatorName.toUpperCase()}-${ocrCompany}`;
  }, [ocrOperatorName, ocrCompany]);

  useEffect(() => {
    const regRef = ref(db, 'monitoramento/cadastros_ocr');
    const unsub = onValue(regRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
            setProcessedPeople(list);
        } else { setProcessedPeople([]); }
    });
    return () => off(regRef);
  }, []);

  const handleAIRefinement = async () => {
    if (!rawText.trim()) return;
    setIsProcessingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analise o seguinte texto bruto extraído de um documento de identificação (RG/CNH) via OCR. Extraia o nome completo e o CPF de cada pessoa encontrada. Retorne os dados em uma lista de objetos JSON contendo "name" e "cpf". Texto: ${rawText}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { name: { type: Type.STRING }, cpf: { type: Type.STRING } },
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
            await push(ref(db, 'monitoramento/cadastros_ocr'), { name: formatNameNormal(item.name), cpf: cpfFormatted, done: false, timestamp: new Date().toISOString() });
            count++;
        }
      }
      setSuccessMsg(`IA processou ${count} registros!`);
      setRawText('');
    } catch (error) { alert("Falha no processamento IA."); } finally { setIsProcessingAI(false); }
  };

  const handleAddDoc = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!docForm.name || !docForm.organ || !docForm.expirationDate) return;
      setIsAddingDoc(true);
      try {
          const newDoc: PublicDocument = { uuid: `doc-${Date.now()}`, name: docForm.name.toUpperCase(), organ: docForm.organ.toUpperCase(), expirationDate: docForm.expirationDate };
          await monitoringService.addDocument(newDoc, documents);
          setDocForm({ name: '', organ: '', expirationDate: '' });
          setSuccessMsg("Documento cadastrado!");
      } catch (e) { alert("Erro ao cadastrar."); } finally { setIsAddingDoc(false); }
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
              setSuccessMsg("Texto extraído!");
          } else { throw new Error(result.ErrorMessage || "Erro OCR."); }
      } catch (e: any) { alert(`Erro: ${e.message}`); } finally { setIsProcessingOCR(false); }
  };

  const filteredPeople = useMemo(() => processedPeople.filter(p => p.name.toLowerCase().includes(listSearch.toLowerCase())).sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1)), [processedPeople, listSearch]);

  return (
    <div className="max-w-[1920px] mx-auto space-y-12 pb-32">
      <div className="glass-panel rounded-[3rem] p-12 flex flex-col md:flex-row justify-between items-center gap-10">
        <div className="flex items-center gap-8">
          <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 shadow-inner">
            <ClipboardList size={48} className="text-amber-500" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">ControlVision Intelligence</h2>
            <div className="h-1.5 w-32 bg-amber-500 rounded-full mt-2"></div>
          </div>
        </div>

        <div className="bg-black/40 p-2 rounded-3xl border border-white/5 flex gap-2">
            <button onClick={() => setActiveTab('ocr')} className={`px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'ocr' ? 'bg-slate-800 text-white shadow-2xl' : 'text-slate-500 hover:text-slate-300'}`}>IDENTIFICAÇÃO OCR</button>
            <button onClick={() => setActiveTab('documents')} className={`px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'documents' ? 'bg-slate-800 text-white shadow-2xl' : 'text-slate-500 hover:text-slate-300'}`}>COMPLIANCE</button>
        </div>
      </div>

      {activeTab === 'ocr' ? (
        <div className="space-y-12">
            <div className="glass-panel rounded-[3rem] p-14 flex flex-col lg:flex-row gap-20 items-center">
                <div className="w-full lg:w-[400px]">
                    <div className="w-full aspect-square bg-slate-950/50 rounded-[3rem] border-2 border-dashed border-white/5 relative overflow-hidden flex items-center justify-center group shadow-inner">
                        {selectedImage ? (
                            <img src={selectedImage} alt="Preview" className="w-full h-full object-contain p-8 transition-transform duration-700 group-hover:scale-110" />
                        ) : (
                            <div className="flex flex-col items-center gap-6 opacity-20">
                                <div className="p-8 bg-slate-900 rounded-full border border-white/10"><ImageIcon size={80} strokeWidth={1} /></div>
                                <span className="text-[11px] font-black uppercase tracking-[0.5em]">Lente Pronta</span>
                            </div>
                        )}
                        {showCamera && (
                            <div className="absolute inset-0 bg-black z-30">
                                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-6">
                                    <button onClick={() => setShowCamera(false)} className="p-5 bg-rose-600 rounded-full text-white shadow-2xl"><X size={28}/></button>
                                    <button onClick={() => { if(canvasRef.current && videoRef.current) { canvasRef.current.getContext('2d')?.drawImage(videoRef.current, 0,0,640,480); setSelectedImage(canvasRef.current.toDataURL()); setShowCamera(false); } }} className="px-12 py-5 bg-emerald-600 rounded-full text-white font-black uppercase tracking-widest text-xs shadow-2xl">CAPTURAR AGORA</button>
                                </div>
                            </div>
                        )}
                        <canvas ref={canvasRef} width="640" height="480" className="hidden" />
                    </div>
                </div>

                <div className="flex-1 w-full space-y-10">
                    <div className="grid grid-cols-2 gap-8">
                        <button onClick={() => setShowCamera(true)} className="flex flex-col items-center gap-6 p-12 bg-white/5 hover:bg-white/10 rounded-[3rem] text-slate-300 transition-all border border-white/5 group active:scale-95 shadow-xl">
                            <CameraIcon size={48} className="text-amber-500 group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] font-black uppercase tracking-[0.3em]">CÂMERA LIVE</span>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-6 p-12 bg-white/5 hover:bg-white/10 rounded-[3rem] text-slate-300 transition-all border border-white/5 group active:scale-95 shadow-xl">
                            <Upload size={48} className="text-blue-500 group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] font-black uppercase tracking-[0.3em]">UPLOAD LOCAL</span>
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f){ const r = new FileReader(); r.onload=(ev)=>setSelectedImage(ev.target?.result as string); r.readAsDataURL(f); } }} />
                    </div>
                    <button onClick={handleStartOCR} disabled={!selectedImage || isProcessingOCR} className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-3xl uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-4 disabled:opacity-20 shadow-2xl transition-all">
                        {isProcessingOCR ? <Loader2 className="animate-spin" size={24} /> : <Scan size={24} />} 
                        Sincronizar Inteligência de Imagem
                    </button>
                </div>
            </div>

            <div className="glass-panel rounded-[4rem] p-16 space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest block ml-2">Unidade Operacional</label>
                        <select value={ocrWarehouse} onChange={e => setOcrWarehouse(e.target.value)} className="w-full h-16 bg-black/40 border border-white/5 rounded-2xl px-6 text-sm text-white font-bold outline-none focus:border-amber-500/50 appearance-none">
                            <option value="">Selecione Unidade...</option>
                            {WAREHOUSE_LIST.map(wh => <option key={wh} value={wh}>{wh}</option>)}
                        </select>
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest block ml-2">Nome do Agente</label>
                        <input value={ocrOperatorName} onChange={e => setOcrOperatorName(e.target.value)} placeholder="Agente Responsável" className="w-full h-16 bg-black/40 border border-white/5 rounded-2xl px-6 text-sm text-white font-bold outline-none focus:border-amber-500/50" />
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest block ml-2">Empresa Parceira</label>
                        <select value={ocrCompany} onChange={e => setOcrCompany(e.target.value)} className="w-full h-16 bg-black/40 border border-white/5 rounded-2xl px-6 text-sm text-white font-bold outline-none focus:border-amber-500/50 appearance-none">
                            <option value="">Selecione Empresa...</option>
                            {COMPANIES.map(comp => <option key={comp} value={comp}>{comp}</option>)}
                        </select>
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest block ml-2">Responsável Técnico</label>
                        <div className="w-full h-16 bg-amber-500/5 border border-amber-500/10 rounded-2xl px-6 flex items-center text-xs font-black text-amber-500 uppercase tracking-tighter italic">
                            {currentResponsible || 'Aguardando Unidade'}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Console de Texto Bruto</h3>
                        {rawText && <button onClick={handleAIRefinement} className="flex items-center gap-3 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">{isProcessingAI ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>} Refinar com Gemini IA</button>}
                    </div>
                    <textarea value={rawText} onChange={e => setRawText(e.target.value)} placeholder="A saída OCR aparecerá aqui..." className="w-full h-48 bg-black/40 border border-white/5 rounded-3xl p-10 text-slate-300 text-sm font-mono focus:border-amber-500/50 outline-none resize-none shadow-inner" />
                </div>
            </div>
        </div>
      ) : (
        <div className="glass-panel rounded-[4rem] p-16">
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-12 flex items-center gap-6">
                <div className="w-2 h-10 bg-blue-500 rounded-full"></div>
                Gestão de Documentos Auditáveis
            </h3>
            <form onSubmit={handleAddDoc} className="grid grid-cols-1 md:grid-cols-4 gap-10">
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Identificação</label>
                    <input required placeholder="Ex: AVCB" value={docForm.name} onChange={e => setDocForm({...docForm, name: e.target.value})} className="w-full h-16 bg-black/40 border border-white/5 rounded-2xl px-6 text-sm text-white font-bold outline-none focus:border-blue-500/50" />
                </div>
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Órgão</label>
                    <input required placeholder="Ex: Bombeiros" value={docForm.organ} onChange={e => setDocForm({...docForm, organ: e.target.value})} className="w-full h-16 bg-black/40 border border-white/5 rounded-2xl px-6 text-sm text-white font-bold outline-none focus:border-blue-500/50" />
                </div>
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Validade</label>
                    <input required type="date" value={docForm.expirationDate} onChange={e => setDocForm({...docForm, expirationDate: e.target.value})} className="w-full h-16 bg-black/40 border border-white/5 rounded-2xl px-6 text-sm text-white font-bold outline-none focus:border-blue-500/50 [color-scheme:dark]" />
                </div>
                <div className="flex items-end">
                    <button type="submit" className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase text-[11px] tracking-widest shadow-2xl transition-all active:scale-95">ADICIONAR DOCUMENTO</button>
                </div>
            </form>
        </div>
      )}
    </div>
  );
};

export default Registration;
