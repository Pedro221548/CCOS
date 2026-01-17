
import React, { useRef, useState } from 'react';
import { FileSpreadsheet, RotateCcw, Upload, Video, DoorClosed, Save, Briefcase, Trash2, Clock, FileText, Database, Power, X, Loader2 } from 'lucide-react';
import { Camera, AccessPoint, Status, ProcessedWorker, ThirdPartyImport, ChannelType } from '../types';

// LISTA OFICIAL (9 Empresas)
const VALID_COMPANIES = ['B11', 'FORMA', 'MJM', 'MPI', 'MULT', 'PRAYLOG', 'PRIMUS', 'SUPERA LOG', 'BSB'];

const VALID_UNITS = [
    { id: 'GALPÃO MERITI', keywords: ['MERITI', 'SJM', 'EXPRESSA', 'BSB', 'GRADIL EXPRESSA', 'DOCA RECEXP', 'RUA 17', 'RUA 12', 'RUA 34', 'REC MEZANINO', 'MESA CONTROLADO', 'DOCA RECEBIMENTO', 'ALTO CUSTO', 'ALTO VALOR'] },
    { id: 'GALPÃO 4 ELOS ES', keywords: ['G4 ES', 'G10', '4ELOS ES', '4 ELOS ES', '4ELOS', 'SPEED DOME', 'LOLA', 'CONFERENCIA 04', 'CONFERENCIA 03', 'RUA FLOWRACK', 'CHK0', 'G1004LF', 'G1003LF', 'G1001LF', 'CAMERA 4ELOS'] },
    { id: 'GALPÃO SP', keywords: ['INVD 32', 'SP 01', 'SP 02', 'SP 3_', 'SP_1', 'HOSPIDROGAS', 'FAVO', 'SALLVE', 'ITAPEVI', 'NEURAXPHARM', 'IP01LF', 'IP02LF', 'IP03LF', 'IP04LF', 'IP05LF', 'IP06LF', 'IP07LF', 'IP08LF'] },
    { id: 'GALPÃO 4 ELOS RJ', keywords: ['4 ELOS RJ', 'ELOS RJ', 'RUA 1 FRENTE', 'REFEITORIO MEZANINO', 'DOCA 40414243', 'ACESSO MD 2', '4E01LF', '4E02LF', '4E03LF'] },
    { id: 'GALPÃO LSP', keywords: ['LSP_', 'LSP01', 'ENTRADA RODOVIA', 'PORTÃO SOCIAL', 'SPEED ESTACIONAMENTO', 'PÁTIO DOCAS', 'GUARITA', 'LSP01LF', 'LSP02LF', 'LSP03LF', 'ECLUSA LSP'] },
    { id: 'GALPÃO G5', keywords: ['TERABYTE', 'NVD 1 G5', 'NVD 2 G5', 'NVD 3 G5', 'NVD 4 G5', 'NVD 5 G5', 'MD 4', 'MD 5', 'MD 6', 'MD 7', 'MD 8', 'MD 9', 'MD4', 'MD5', 'MD6', 'MD7', 'MD8', 'MD9', 'PINOS0', 'HERSHEYS', 'AC BRAZIL', 'BIOSANTE', 'BEYOUNG', 'LOLA COS', 'SERVIER', 'CELLERA', 'BIOCHIMICO', 'TUNEL', 'SAIDA EMER'] },
    { id: 'GALPÃO PAVUNA', keywords: ['PAVUNA', 'UNILOG PAVUNA', 'PV01', 'PV02', 'REC MODULO 01', 'ANTECAMARA ENTRADA', 'PV01LF', 'PV02LF', 'PV03LF'] },
    { id: 'GALPÃO G2', keywords: ['G2 MODULO', 'G2 DOCA', 'SEMEAR', 'RG SOLUÇÕES', 'PFS', 'PRESTIGE', 'BEAUTYGLAM', 'MERCO', 'BIOCON', 'MD A', 'MD B', 'MD C', 'MD D', 'MD E', 'MD F', 'VESTIARIO', 'COPA G2', 'ESCANINHO CELULAR', 'G216LF', 'G213LF', 'G203LF', 'G208LF', 'G207LF', 'G205LF', 'G210LF', 'G215LF', 'G201LF', 'G214LF', 'G212LF', 'G206LF', 'G204LF', 'G209LF', 'G217LF', 'G211LF', 'G202LF', 'ZYDUS', 'PRATI', 'GAIOLA', 'CATRACA G2', 'BEB', 'B E B', 'CHECKOUT'] },
    { id: 'GALPÃO G3', keywords: ['G3 MATRIZ', 'G3 CCTO', 'MYLAN', 'ASPEN', 'DIPRIVAN', 'SALA MYLAN', 'G3 MD', 'RUA 25-26', 'RUA 23-24', 'RUA 21-22', 'RUA 19-20', 'RUA 17-18', 'RUA 11-12', 'RUA 9-10', 'RUA 3-4', 'RUA 5-6', 'RUA 1-2', 'ANTECAMERA ASPEN', 'CAMARA FRIA ASPEN', 'G3 ANTECAMARA', 'VPC', 'G315LF', 'G313LF', 'G311LF', 'G307LF', 'G306LF', 'G302LF', 'G305LF', 'G309LF', 'G316LF', 'G314LF', 'G312LF', 'G304LF', 'G301LF', 'G310LF', 'G308LF', 'G303LF'] }
];

const normalizeWarehouse = (name: string | null, deviceName: string | null, location: string | null): string => {
    const text = `${name} ${deviceName} ${location}`.toUpperCase();
    for (const unit of VALID_UNITS) {
        if (unit.keywords.some(k => text.includes(k))) return unit.id;
    }
    return 'Geral';
};

const Importer: React.FC<any> = ({ onImport, onImportThirdParty, onDeleteImport, thirdPartyImports = [], onResetCameras, onResetAccess, onResetThirdParty }) => {
  const [cameraData, setCameraData] = useState<any[]>([]);
  const [accessData, setAccessData] = useState<any[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const accessInputRef = useRef<HTMLInputElement>(null);
  const thirdPartyInputRef = useRef<HTMLInputElement>(null);

  const handleThirdPartyUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !window.XLSX) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = window.XLSX.read(bstr, { type: 'binary' });
        const jsonData: any[] = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const newWorkers: ProcessedWorker[] = jsonData.map((row, idx) => {
            const rawCompany = (row['Grupo de pessoas'] || row['Empresa'] || '').toUpperCase();
            // VALIDAÇÃO ESTRITA PELO NOME DA EMPRESA
            let company = VALID_COMPANIES.find(c => rawCompany.includes(c)) || null;
            if (!company) return null;

            return {
                id: `w-${idx}-${Date.now()}`,
                name: (row['Pessoa'] || row['Nome'] || '').trim(),
                company,
                unit: normalizeWarehouse(null, row['Ambiente'] || row['Ponto de Acesso'], null),
                date: row['Data'] || '',
                time: row['Hora'] || '',
                accessPoint: row['Ponto de Acesso'] || '',
                eventType: (row['Eventos'] || '').includes('ENTRADA') ? 'ENTRADA' : 'SAÍDA'
            };
        }).filter(Boolean) as ProcessedWorker[];
        
        if (newWorkers.length > 0) onImportThirdParty(newWorkers, file.name);
        else alert("Nenhum dado das 9 empresas oficiais encontrado.");
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-12 max-w-[1400px] mx-auto">
        <div className="glass-panel rounded-[3rem] p-16 flex flex-col xl:flex-row justify-between items-center gap-10">
            <div className="relative z-10">
                <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter flex items-center gap-6">
                    <div className="p-4 bg-emerald-500 rounded-3xl shadow-2xl shadow-emerald-900/40"><Power size={32} /></div>
                    ControlVision Core
                </h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-6 ml-2">Console Central de Sincronismo de Dados</p>
            </div>
            <button onClick={() => { /* process all */ }} className="px-16 py-6 bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xl shadow-emerald-900/30 transition-all font-black uppercase text-xs tracking-[0.3em] rounded-3xl active:scale-95 group">
                <Save size={24} className="inline mr-3 group-hover:scale-110 transition-transform" /> EFETIVAR SINCRONISMO
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
                { label: 'Câmeras / Alarme', icon: Video, color: 'blue', ref: cameraInputRef },
                { label: 'Controle de Acesso', icon: DoorClosed, color: 'indigo', ref: accessInputRef },
                { label: 'Terceirizados (OFICIAIS)', icon: Briefcase, color: 'amber', ref: thirdPartyInputRef, onChange: handleThirdPartyUpload }
            ].map((box, i) => (
                <div key={i} onClick={() => box.ref.current?.click()} className="glass-panel border-2 border-dashed border-white/5 hover:border-emerald-500/20 hover:bg-white/[0.03] transition-all rounded-[3rem] p-12 flex flex-col items-center justify-center gap-8 cursor-pointer group shadow-2xl">
                    <div className={`p-8 bg-${box.color}-500/10 rounded-full group-hover:scale-110 transition-transform`}><box.icon size={48} className={`text-${box.color}-500`} /></div>
                    <div className="text-center">
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">{box.label}</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">Clique para carregar .xlsx</p>
                    </div>
                    <input type="file" ref={box.ref} className="hidden" accept=".xlsx" onChange={box.onChange} />
                </div>
            ))}
        </div>
    </div>
  );
};

export default Importer;
