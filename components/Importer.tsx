
import React, { useRef, useState } from 'react';
import { FileSpreadsheet, RotateCcw, AlertCircle, Power, Upload, Video, DoorClosed, Save, Briefcase, FileUp, AlertTriangle, X, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { Camera, AccessPoint, Status, ProcessedWorker, ThirdPartyImport } from '../types';

const VALID_COMPANIES = ['B11', 'MULT', 'MPI', 'FORMA', 'SUPERA LOG', 'MJM', 'PRIMUS', 'PRAYLOG'];

const VALID_UNITS = [
    { id: 'GALPÃO G2', keywords: ['G216LF', 'G213LF', 'G203LF', 'G208LF', 'G207LF', 'G205LF', 'G210LF', 'G215LF', 'G201LF', 'G214LF', 'G212LF', 'G206LF', 'G204LF', 'G209LF', 'G217LF', 'G211LF', 'G202LF', 'SALA DE DESCANSO G2', 'CF MERCO-2', 'CONTROLADO ZYDUS', 'CONTROLADO PRATI', 'SAIDA CATRACA G2', 'ENTRADA CATRACA G2', 'CF PFS', 'CF MERCO', 'CAMARA FRIA BIOCON', 'SERVIDOR G2', 'RG SOLUÇÕES', 'RG SOLUCOES', 'GAIOLA 1', 'PRESTIGE MEZ', 'TORNIQUETE SAIDA', 'TORNIQUETE ENTRADA', 'PRESTIGE', 'ZYDUS', 'BIOCON', 'PRATI', 'MERCO', 'G2'] },
    { id: 'GALPÃO G3 / MATRIZ', keywords: ['G315LF', 'G313LF', 'G311LF', 'G307LF', 'G306LF', 'G302LF', 'G305LF', 'G309LF', 'G316LF', 'G314LF', 'G312LF', 'G304LF', 'G301LF', 'G310LF', 'G308LF', 'G303LF', 'SALA MYLAN', 'MYLAN IMPORTADORA', 'CAMERA FRIA MYLAN', 'CONTROLADO ASPEN', 'MYLAN DISTRIBUIDORA', 'CF MYLAN', 'CF ASPEN', 'CORPORATIVO MATRIZ', 'ENTRADA G3 MYLAN', 'ENTRADA TORNIQUETE G3', 'SAIDA TORNIQUETE G3', 'ENTRADA G3 MATRIZ', 'SERVIDOR G3', 'ADM G3 MATRIZ', 'RECEPÇÃO G3', 'RECEPCAO G3', 'CONTROLE DE ACESSO CCOS', 'CCOS G3', 'G3', 'MATRIZ', 'CORPORATIVO'], exclude: ['LSP'] },
    { id: 'GALPÃO G5 (MD6)', keywords: ['G526LF', 'G503LF', 'G517LF', 'G515LF', 'G505LF', 'G519LF', 'G513LF', 'G524LF', 'G521LF', 'G509LF', 'G508LF', 'G507LF', 'G512LF', 'G520LF', 'G518LF', 'G516LF', 'G514LF', 'G525LF', 'G506LF', 'G501LF', 'G523LF', 'G522LF', 'G511LF', 'G510LF', 'G502LF', 'G504LF', 'VESTIARIO FEMININO MD 6', 'VESTIARIO MASCULINO MD 09', 'GAIOLA SERVIER', 'AC MEZANINO MD 8', 'CONTROLADO BIOCHIMICO', 'CONTROLADO CELLERA', 'CONTROLADO SERVIER', 'CONTROLE DE ACESSO MD 5', 'CONTROLE DE ACESSO MD 6', 'CONTROLE DE ACESSO MD 7', 'CONTROLE DE ACESSO MD 8', 'SAIDA MD 4', 'ENTRADA MD4', 'ENTRADA CATRATA MD 9', 'SAIDA CATRATA MD 9', 'G5', 'MD6', 'MD 6', 'TERABYTE'] },
    { id: 'UNIDADE SP-IP', keywords: ['IP06LF', 'IP04LF', 'IP07LF', 'IP01LF', 'IP02LF', 'IP05LF', 'IP08LF', 'IP03LF', 'SP-IP06LF', 'SP-IP04LF', 'SP-IP07LF', 'SP-IP01LF', 'SP-IP02LF', 'SP-IP05LF', 'SP-IP08LF', 'SP-IP03LF', 'HOSPDROGAS', 'NEURAXPHARM', 'SERVIDOR SP', 'TORNIQUETE SP', 'CATRACA ENTRADA SP', 'CATRACA SAIDA SP', 'SP-IP', 'SP IP', 'ITAPEVI', 'SP - IP'] },
    { id: 'MERITI', keywords: ['SJM10LF', 'SJM08LF', 'SJM15LF', 'SJM14LF', 'SJM12LF', 'SJM05LF', 'SJM02LF', 'SJM07LF', 'SJM04LF', 'SJM03LF', 'SJM01LF', 'SJM09LF', 'SJM13LF', 'SJM11LF', 'SJM06LF', 'SAIDA CATRACA EXPRESSA', 'ENTRADA CATRACA EXPRESSA', 'ENTRADA GALPÃO LATERAL', 'SAIDA GALPÃO LATERAL', 'ENTRADA BSB', 'SAIDA BSB', 'SAIDA GRADIL EXPRESSA', 'ENTRADA CATRACA UNILOG MERITI', 'ENTRADA MEZANINO MERITI', 'SAIDA MEZANINO MERITI', 'SAIDA CATRACA UNILOG MERITI', 'ENTRADA GRADIL EXPRESSA', 'CONTROLADO EXPRESSA', 'ALTO VALOR EXPRESSA', 'CAMARA FRIA EXPRESSA', 'MERITI', 'UNILOG MERITI', 'UNILOG EXPRESS', 'SJM', 'EXPRESSA', 'SÃO JOSÉ', 'SAO JOSE', 'LATERAL', 'SJ', 'SJC'] },
    { id: 'PAVUNA', keywords: ['PV01LF', 'PV02LF', 'PV03LF', 'PAVUNA-PV01LF', 'PAVUNA-PV02LF', 'PAVUNA-PV03LF', 'SAIDA CATRACA PAVUNA', 'ENTRADA CATRACA PAVUNA', 'SERVIDOR PAVUNA', 'PAVUNA', 'PV', 'UNILOG PAVUNA'] },
    { id: 'GALPÃO 4 ELOS ES', keywords: ['G1004LF', 'G1001LF', 'G1003LF', 'VESTIARIO FEMININO 4 ELOS', 'ENTRADA CATRACA 4 ELOS', 'SAIDA CATRACA 4ELOS', 'VESTIARIO MASCULINO 4ELOS', '4 ELOS ES', '4ELOS ES', '4ELLOS ES', 'GA-G4', 'G4'] },
    { id: 'GALPÃO 4 ELOS RJ', keywords: ['4E03LF', '4E02LF', '4E01LF', 'ENTRADA MEZANINO 4ELOS RJ', 'CATRACA ENTRADA 4ELOS RJ', 'CATRACA SAIDA 4ELOS RJ', 'REFEITORIO MEZANINO', '4 ELOS RJ', 'ELOS RJ', '4ELOS RJ'] },
    { id: 'GALPÃO LSP', keywords: ['LSP', 'LSP01', 'LSP02', 'LSP01LF', 'LSP02LF'] }
];

interface ImporterProps {
  onImport: (cameras: Camera[], accessPoints: AccessPoint[]) => void;
  onImportThirdParty: (workers: ProcessedWorker[], fileName: string) => void;
  onDeleteImport: (id: string) => void;
  thirdPartyImports?: ThirdPartyImport[];
  onReset: () => void;
  initialCameraCsv?: string;
  initialAccessCsv?: string;
  initialMode?: boolean;
}

const parseRowDate = (row: any): string => {
    let val = row['Data'] || row['DATA'] || row['Date'] || row['Dia'];
    if (!val && row['Hora'] && typeof row['Hora'] === 'string' && row['Hora'].length > 10) val = row['Hora'];
    if (!val) return 'N/A';
    if (typeof val === 'number') {
        const d = new Date(Math.round((val - 25569)*86400*1000));
        d.setMinutes(d.getMinutes() + 1);
        return d.toISOString().split('T')[0];
    }
    if (typeof val === 'string') {
        let datePart = val.split(' ')[0].trim();
        if (datePart.includes('/')) {
            const parts = datePart.split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        if (datePart.includes('-')) return datePart;
    }
    return 'N/A';
};

const detectCompany = (text: string): string | null => {
    if (!text) return null;
    const upper = text.toUpperCase();
    const words = upper.split(/[\s,.-]+/);
    if (upper.includes('PRAYLOG') || upper.includes('PRAY LOG')) return 'PRAYLOG';
    if (upper.includes('SUPERA LOG') || upper.includes('SUPERA')) return 'SUPERA LOG';
    if (upper.includes('FORMA')) return 'FORMA';
    if (upper.includes('PRIMUS')) return 'PRIMUS';
    if (words.includes('MPI')) return 'MPI';
    if (words.includes('B11')) return 'B11';
    if (words.includes('MJM')) return 'MJM';
    if (words.includes('MULT')) return 'MULT';
    return null;
};

const detectUnit = (text: string): string | null => {
    if (!text) return null;
    const upper = text.toUpperCase();
    for (const unit of VALID_UNITS) {
        if ((unit as any).exclude && (unit as any).exclude.some((exc: string) => upper.includes(exc))) continue;
        if (unit.keywords.some(k => upper.includes(k))) return unit.id;
    }
    return null;
};

const normalizeWarehouse = (rawWarehouse: string | null, location: string | null, module: string | null, name: string | null): string => {
    const textToCheck = ((rawWarehouse || '') + ' ' + (location || '') + ' ' + (module || '') + ' ' + (name || '')).toUpperCase();
    if (textToCheck.includes('4E01LF') || textToCheck.includes('4E02LF') || textToCheck.includes('4E03LF')) return '4 ELOS RJ';
    if (textToCheck.includes('IP0') || textToCheck.includes('IP1')) return 'SP (ITAPEVI)';
    if (textToCheck.includes('SJM') || textToCheck.includes('MERITI') || textToCheck.includes('EXPRESSA') || textToCheck.includes('SÃO JOSÉ')) return 'MERITI';
    if (textToCheck.includes('PV01') || textToCheck.includes('PV02') || textToCheck.includes('PV03')) return 'UNILOG PAVUNA';
    if (textToCheck.includes('4ELLOS ES') || textToCheck.includes('4 ELOS ES') || textToCheck.includes('G10')) return 'G4 4ELLOS ES';
    if (textToCheck.includes('ITAPEVI') || textToCheck.includes('SP-IP')) return 'SP (ITAPEVI)';
    if (textToCheck.includes('4 ELOS RJ') || textToCheck.includes('ELOS RJ')) return '4 ELOS RJ';
    if (textToCheck.includes('LSP')) return 'GALPÃO LSP';
    if (textToCheck.includes('PAVUNA')) return 'UNILOG PAVUNA';
    if (textToCheck.includes('G3')) return 'G3 MATRIZ';
    if (textToCheck.includes('G2')) return 'G2';
    if (textToCheck.includes('G5') || textToCheck.includes('TERABYTE')) return 'G5';
    const g5Modules = ['MODULO 08', 'MODULO 09', 'MODULO 8', 'MODULO 9', 'MODULO 06', 'MODULO 07', 'MODULO 6', 'MODULO 7', 'MODULO 04', 'MODULO 05', 'MODULO 4', 'MODULO 5', 'MODULO A', 'MODULO B', 'MODULO C', 'MODULO D', 'MODULO E', 'MODULO F'];
    if (g5Modules.some(m => textToCheck.includes(m))) return 'G5';
    return rawWarehouse || 'Geral';
};

const getResponsibleByWarehouse = (warehouse: string, currentResponsible: string | null): string => {
    switch (warehouse) {
        case 'G2': return 'ROBSON DIAS BRITO';
        case 'G3 MATRIZ': return 'EDNEI RODRIGUES SOARES';
        case 'G5': return 'MOACIR ANDRADE NUNES';
        case 'UNILOG PAVUNA': case 'MERITI': case 'GALPÃO LSP': return 'MAURO BAPTISTA CERQUEIRA';
        case 'SP (ITAPEVI)': return 'JOSENIAS SANTOS NASCIMENTO';
        case '4 ELOS RJ': return 'DANIEL CESAR MACHADO';
        case 'G4 4ELLOS ES': return 'SILVIA SANTOS';
        default: return currentResponsible || 'N/A';
    }
};

const parseCSV = (csv: string, type: 'camera' | 'access'): any[] => {
  if (!csv) return [];
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return []; 
  const headers = lines[0].split(',').map(h => h.trim());
  const getValue = (rowObj: any, possibleHeaders: string[]) => {
    const key = Object.keys(rowObj).find(k => possibleHeaders.some(h => k.toUpperCase() === h.toUpperCase()));
    return key ? rowObj[key] : null;
  };
  return lines.slice(1).map((line, idx) => {
    if (!line.trim()) return null;
    const uuid = `${type}-${idx}-${Date.now()}`;
    const values = line.split(','); 
    const obj: any = {};
    headers.forEach((header, index) => {
      const cleanHeader = header.replace(/["\r]/g, '').trim();
      const cleanValue = values[index]?.replace(/["\r]/g, '').trim();
      obj[cleanHeader] = cleanValue;
    });
    if (type === 'camera') {
      const name = getValue(obj, ['Nome do Canal', 'NOME', 'Nome_Camera', 'Nome', 'Camera']);
      const id = getValue(obj, ['IP do Dispositivo', 'ID_Camera', 'ID', 'Codigo', 'Número']);
      const location = getValue(obj, ['Nome org', 'Localização', 'Localizacao', 'Local']);
      const module = getValue(obj, ['Nome do dispositivo', 'MODULO', 'Módulo', 'Modulo', 'Setor']);
      let warehouseRaw = getValue(obj, ['Galpão', 'Galpao', 'Warehouse']);
      const warehouse = normalizeWarehouse(warehouseRaw, location, module, name);
      const responsibleRaw = getValue(obj, ['Responsável', 'Responsavel', 'Resp', 'Tecnico']);
      const responsible = getResponsibleByWarehouse(warehouse, responsibleRaw);
      const statusRaw = getValue(obj, ['Canal on-line/off-line', 'Status ONLINE', 'Status', 'Status OFFLINE', 'STATUS', 'Estado', 'SITUACAO'])?.toUpperCase() || '';
      let status: Status = 'ONLINE';
      const offlineKeywords = ['OFFLINE', 'OFF', 'SEM SINAL', 'NO SIGNAL', 'ERRO', 'FALHA', 'DESLIGADO', 'INATIVO', '0', 'FALSE', 'NAO', 'NO', 'PERDA'];
      if (offlineKeywords.some(k => statusRaw.includes(k))) status = 'OFFLINE';
      if (!name) return null;
      return { uuid, id: id || 'N/A', name: name || 'Sem Nome', location: location || 'N/A', module: module || 'Geral', warehouse, responsible, status } as Camera;
    } else {
      const name = getValue(obj, ['Nome do dispositivo', 'Nome', 'Name', 'Dispositivo', 'Equipamento']);
      const id = getValue(obj, ['IP', 'ID', 'Id', 'Cod', 'Código', 'Serial']);
      const location = getValue(obj, ['Nome org', 'Local', 'Location', 'Localização', 'Setor']);
      let warehouseRaw = getValue(obj, ['Galpão', 'Galpao', 'Warehouse']);
      const lastLog = getValue(obj, ['Última alteraçãoStatus', 'UltimoRegistro', 'LastLog', 'Data']);
      if (!name && !id) return null;
      const finalName = name || id || 'Dispositivo Sem Nome';
      const finalId = id || finalName; 
      const warehouse = normalizeWarehouse(warehouseRaw, location, null, name);
      const statusRaw = getValue(obj, ['Status On-line/Off-line', 'Status', 'STATUS', 'Estado', 'Situação', 'Conexão'])?.toUpperCase() || '';
      let status: Status = 'ONLINE';
      const offlineKeywords = ['OFFLINE', 'OFF', 'INATIVO', 'DESLIGADO', 'FALHA', 'ERRO', 'ERROR', 'DOWN', 'DISCONNECTED', '0', 'FALSE', 'NAO', 'NÃO', 'RUIM', 'PARADO'];
      if (offlineKeywords.some(k => statusRaw === k || statusRaw.includes(k))) status = 'OFFLINE';
      return { uuid, id: finalId, name: finalName, type: 'Controle de Acesso', location: location || 'N/A', warehouse, status, lastLog: lastLog || '-', latency: '-' } as AccessPoint;
    }
  }).filter(Boolean);
};

const Importer: React.FC<ImporterProps> = ({ onImport, onImportThirdParty, onDeleteImport, thirdPartyImports = [], onReset, initialCameraCsv = '', initialAccessCsv = '', initialMode = false }) => {
  const [cameraCsv, setCameraCsv] = useState(initialCameraCsv);
  const [accessCsv, setAccessCsv] = useState(initialAccessCsv);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const accessInputRef = useRef<HTMLInputElement>(null);
  const thirdPartyInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'camera' | 'access') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      if (window.XLSX) {
        const wb = window.XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = window.XLSX.utils.sheet_to_csv(ws);
        
        if (type === 'camera') setCameraCsv(data);
        else setAccessCsv(data);
      } else {
        alert('Biblioteca XLSX não carregada. Recarregue a página.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; 
  };

  const handleThirdPartyUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = file.name;

    const reader = new FileReader();
    reader.onload = (evt) => {
        const bstr = evt.target?.result;
        if (window.XLSX) {
            const wb = window.XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const jsonData: any[] = window.XLSX.utils.sheet_to_json(ws);
            
            const newWorkers: ProcessedWorker[] = [];
            jsonData.forEach((row, index) => {
                const rawName = row['Pessoa'] || row['Nome'];
                if (!rawName || typeof rawName !== 'string' || !rawName.trim()) return; 

                const eventType = (row['Tipo de evento'] || row['Eventos'] || '').toUpperCase();
                const status = (row['Status de Entrada/Saída'] || '').toUpperCase();
                const isEntry = eventType.includes('ENTRADA') || eventType.includes('DESBLOQUEIO') || eventType.includes('ACESSO LIBERADO') || status.includes('ENTRADA');

                if (!isEntry) return;
                if (eventType.includes('SAÍDA') || eventType.includes('SAIDA')) return;

                const locationString = [row['Ambiente'], row['Ponto de Acesso'], row['Tipo de ponto de acesso'], row['Local'], row['Nome do dispositivo'], row['Device']].join(' ').toUpperCase();
                const unit = detectUnit(locationString);
                if (!unit) return; 

                const fullSearchString = [locationString, row['Grupo de pessoas'], row['Pessoa'], row['Nome']].join(' ').toUpperCase();
                let company = row['Grupo de pessoas'] ? row['Grupo de pessoas'].trim().toUpperCase() : detectCompany(fullSearchString);
                if (!company) company = 'NÃO IDENTIFICADO';

                const dateNormalized = parseRowDate(row);
                let timeStr = row['Hora'] || '-';
                if (timeStr.includes(' ')) timeStr = timeStr.split(' ')[1]; 

                newWorkers.push({
                    id: `w-${index}-${Date.now()}`,
                    name: rawName.trim(),
                    company, unit, date: dateNormalized, time: timeStr, accessPoint: row['Ponto de Acesso'] || row['Ambiente'] || '-', eventType: eventType
                });
            });

            if (newWorkers.length > 0) {
                onImportThirdParty(newWorkers, fileName);
            } else {
                alert("Nenhum dado válido encontrado na planilha.");
            }
        }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleProcess = () => {
      const cameras = parseCSV(cameraCsv, 'camera');
      const access = parseCSV(accessCsv, 'access');
      if (cameras.length === 0 && access.length === 0) {
          alert("Nenhum dado válido encontrado.");
          return;
      }
      onImport(cameras, access);
  };

  return (
    <div className={`space-y-6 animate-fade-in mx-auto pb-12 ${initialMode ? 'p-8 max-w-4xl pt-12' : 'max-w-5xl'}`}>
        
        {/* Header Control */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
            <div>
                <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                    <Power size={24} className="text-emerald-500" />
                    Fonte de Dados
                </h2>
                <p className="text-slate-400 text-sm">Gerencie a conexão das planilhas e upload de dados.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
                <button onClick={handleProcess} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 transition-all font-bold">
                    <Save size={18} /> PROCESSAR CSVs
                </button>
                {!initialMode && (
                    <button onClick={() => setShowResetConfirm(true)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors text-sm font-medium whitespace-nowrap">
                        <RotateCcw size={16} /> Limpar Tudo
                    </button>
                )}
            </div>
        </div>

        {/* Upload Areas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button onClick={() => cameraInputRef.current?.click()} className="w-full bg-slate-900 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all rounded-xl p-6 flex flex-col items-center justify-center gap-3 group min-h-[180px]">
                <div className="p-4 bg-slate-800 rounded-full group-hover:bg-emerald-500/20 transition-colors"><Video className="w-8 h-8 text-slate-400 group-hover:text-emerald-500" /></div>
                <div className="text-center"><h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">Câmeras</h3><p className="text-slate-500 text-xs mt-1">Carregar planilha (.xlsx/.csv)</p></div>
                <input type="file" accept=".csv, .xlsx, .xls" ref={cameraInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'camera')} />
            </button>

            <button onClick={() => accessInputRef.current?.click()} className="w-full bg-slate-900 border-2 border-dashed border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all rounded-xl p-6 flex flex-col items-center justify-center gap-3 group min-h-[180px]">
                <div className="p-4 bg-slate-800 rounded-full group-hover:bg-blue-500/20 transition-colors"><DoorClosed className="w-8 h-8 text-slate-400 group-hover:text-blue-500" /></div>
                <div className="text-center"><h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">Controle de Acesso</h3><p className="text-slate-500 text-xs mt-1">Carregar planilha (.xlsx/.csv)</p></div>
                <input type="file" accept=".csv, .xlsx, .xls" ref={accessInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'access')} />
            </button>

            <button onClick={() => thirdPartyInputRef.current?.click()} className="w-full bg-slate-900 border-2 border-dashed border-slate-700 hover:border-amber-500/50 hover:bg-slate-800/50 transition-all rounded-xl p-6 flex flex-col items-center justify-center gap-3 group min-h-[180px]">
                <div className="p-4 bg-slate-800 rounded-full group-hover:bg-amber-500/20 transition-colors"><Briefcase className="w-8 h-8 text-slate-400 group-hover:text-amber-500" /></div>
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors">Terceirizados (Histórico)</h3>
                    <p className="text-slate-500 text-xs mt-1">Nova importação cumulativa</p>
                    <span className="text-[10px] text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded mt-2 inline-block">Será adicionado ao histórico</span>
                </div>
                <input type="file" accept=".xlsx, .csv" ref={thirdPartyInputRef} className="hidden" onChange={handleThirdPartyUpload} />
            </button>
        </div>

        {/* HISTÓRICO DE IMPORTAÇÕES */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <Clock size={18} className="text-amber-500" />
                    Histórico de Planilhas Terceirizados
                </h3>
                <span className="text-xs text-slate-500">{thirdPartyImports.length} arquivos salvos</span>
            </div>
            
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {thirdPartyImports.length === 0 ? (
                    <div className="p-10 text-center text-slate-600 italic text-sm">
                        Nenhuma planilha importada no histórico.
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950 text-slate-500 text-xs uppercase">
                            <tr>
                                <th className="p-4">Arquivo / Lote</th>
                                <th className="p-4">Data Importação</th>
                                <th className="p-4 text-center">Registros</th>
                                <th className="p-4 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                            {thirdPartyImports.map((imp) => (
                                <tr key={imp.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-4 font-medium text-blue-400 flex items-center gap-2">
                                        <FileSpreadsheet size={16} /> {imp.fileName}
                                    </td>
                                    <td className="p-4 text-slate-500 text-xs">
                                        {new Date(imp.importedAt).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="bg-slate-800 px-2 py-0.5 rounded text-xs font-mono">{imp.count}</span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => onDeleteImport(imp.id)} 
                                            className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
                                            title="Excluir do Histórico"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center gap-2 text-[10px] text-slate-500">
                <AlertCircle size={12} />
                <span>Os dados de todos os arquivos acima são somados automaticamente nas telas de visualização.</span>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-3">
                <label className="flex items-center gap-2 text-slate-200 font-medium"><FileSpreadsheet className="w-5 h-5 text-emerald-500" /> CSV Câmeras</label>
                <textarea value={cameraCsv} onChange={(e) => setCameraCsv(e.target.value)} className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-xs text-slate-300 focus:outline-none resize-none" spellCheck={false} />
            </div>
            <div className="space-y-3">
                <label className="flex items-center gap-2 text-slate-200 font-medium"><FileSpreadsheet className="w-5 h-5 text-blue-500" /> CSV Acessos</label>
                <textarea value={accessCsv} onChange={(e) => setAccessCsv(e.target.value)} className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-xs text-slate-300 focus:outline-none resize-none" spellCheck={false} />
            </div>
        </div>

        {showResetConfirm && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
                    <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/20 mx-auto"><AlertTriangle className="text-rose-500 w-8 h-8" /></div>
                    <h3 className="text-xl font-bold text-white">Limpar Tudo?</h3>
                    <p className="text-slate-400 text-sm">Apagará câmeras, acessos e todo o histórico de terceiros.</p>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setShowResetConfirm(false)} className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg">Cancelar</button>
                        <button onClick={() => { onReset(); setShowResetConfirm(false); }} className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg font-bold">Sim, Limpar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Importer;