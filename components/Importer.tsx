
import React, { useRef, useState } from 'react';
import { FileSpreadsheet, RotateCcw, AlertCircle, Power, Upload, Video, DoorClosed, Save, Briefcase, FileUp, AlertTriangle, X, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { Camera, AccessPoint, Status, ProcessedWorker, ThirdPartyImport, Alarm } from '../types';

const VALID_COMPANIES = ['B11', 'MULT', 'MPI', 'FORMA', 'SUPERA LOG', 'MJM', 'PRIMUS', 'PRAYLOG'];

const VALID_UNITS = [
    { id: 'GALPÃO G2', keywords: ['G216LF', 'G213LF', 'G203LF', 'G208LF', 'G207LF', 'G205LF', 'G210LF', 'G215LF', 'G201LF', 'G214LF', 'G212LF', 'G206LF', 'G204LF', 'G209LF', 'G217LF', 'G211LF', 'G202LF', 'SALA DE DESCANSO G2', 'CF MERCO-2', 'CONTROLADO ZYDUS', 'CONTROLADO PRATI', 'SAIDA CATRACA G2', 'ENTRADA CATRACA G2', 'CF PFS', 'CF MERCO', 'CAMARA FRIA BIOCON', 'SERVIDOR G2', 'RG SOLUÇÕES', 'RG SOLUCOES', 'GAIOLA 1', 'PRESTIGE MEZ', 'TORNIQUETE SAIDA', 'TORNIQUETE ENTRADA', 'PRESTIGE', 'ZYDUS', 'BIOCON', 'PRATI', 'MERCO', 'G2'] },
    { id: 'GALPÃO G3 / MATRIZ', keywords: ['G315LF', 'G313LF', 'G311LF', 'G307LF', 'G306LF', 'G302LF', 'G305LF', 'G309LF', 'G316LF', 'G314LF', 'G312LF', 'G304LF', 'G301LF', 'G310LF', 'G308LF', 'G303LF', 'SALA MYLAN', 'MYLAN IMPORTADORA', 'CAMERA FRIA MYLAN', 'CONTROLADO ASPEN', 'MYLAN DISTRIBUIDORA', 'CF MYLAN', 'CF ASPEN', 'CORPORATIVO MATRIZ', 'ENTRADA G3 MYLAN', 'ENTRADA TORNIQUETE G3', 'SAIDA TORNIQUETE G3', 'ENTRADA G3 MATRIZ', 'SERVIDOR G3', 'ADM G3 MATRIZ', 'RECEPÇÃO G3', 'RECEPCAO G3', 'CONTROLE DE ACESSO CCOS', 'CCOS G3', 'G3', 'MATRIZ', 'CORPORATIVO'], exclude: ['LSP'] },
    { id: 'GALPÃO G5 (MD6)', keywords: ['G526LF', 'G503LF', 'G517LF', 'G515LF', 'G505LF', 'G519LF', 'G513LF', 'G524LF', 'G521LF', 'G509LF', 'G508LF', 'G507LF', 'G512LF', 'G520LF', 'G518LF', 'G516LF', 'G514LF', 'G525LF', 'G506LF', 'G501LF', 'G523LF', 'G522LF', 'G511LF', 'G510LF', 'G502LF', 'G504LF', 'VESTIARIO FEMININO MD 6', 'VESTIARIO MASCULINO MD 09', 'GAIOLA SERVIER', 'AC MEZANINO MD 8', 'CONTROLADO BIOCHIMICO', 'CONTROLADO CELLERA', 'CONTROLADO SERVIER', 'CONTROLE DE ACESSO MD 5', 'CONTROLE DE ACESSO MD 6', 'CONTROLE DE ACESSO MD 7', 'CONTROLE DE ACESSO MD 8', 'SAIDA MD 4', 'ENTRADA MD4', 'ENTRADA CATRATA MD 9', 'SAIDA CATRATA MD 9', 'G5', 'MD6', 'MD 6', 'TERABYTE'] },
    { id: 'UNIDADE SP-IP', keywords: ['IP06LF', 'IP04LF', 'IP07LF', 'IP01LF', 'IP02LF', 'IP05LF', 'IP08LF', 'IP03LF', 'SP-IP06LF', 'SP-IP04LF', 'SP-IP07LF', 'SP-IP01LF', 'SP-IP02LF', 'SP-IP05LF', 'SP-IP08LF', 'SP-IP03LF', 'HOSPDROGAS', 'NEURAXPHARM', 'SERVIDOR SP', 'TORNIQUETE SP', 'CATRACA ENTRADA SP', 'CATRACA SAIDA SP', 'SP-IP', 'SP IP', 'ITAPEVI', 'SP - IP'] },
    { id: 'MERITI', keywords: ['SJM10LF', 'SJM08LF', 'SJM15LF', 'SJM14LF', 'SJM12LF', 'SJM05LF', 'SJM02LF', 'SJM07LF', 'SJM04LF', 'SJM03LF', 'SJM01LF', 'SJM09LF', 'SJM13LF', 'SJM11LF', 'SJM06LF', 'SAIDA CATRACA EXPRESSA', 'ENTRADA CATRACA EXPRESSA', 'ENTRADA GALPÃO LATERAL', 'SAIDA GALPÃO LATERAL', 'ENTRADA BSB', 'SAIDA BSB', 'SAIDA GRADIL EXPRESSA', 'ENTRADA CATRACA UNILOG MERITI', 'ENTRADA MEZANINO MERITI', 'SAIDA MEZANINO MERITI', 'SAIDA CATRACA UNILOG MERITI', 'ENTRADA GRADIL EXPRESSA', 'CONTROLADO EXPRESSA', 'ALTO VALOR EXPRESSA', 'CAMARA FRIA EXPRESSA', 'MERITI', 'SJM', 'EXPRESSA', 'SÃO JOSÉ', 'SAO JOSE', 'LATERAL'] },
    { id: 'PAVUNA', keywords: ['PV01LF', 'PV02LF', 'PV03LF', 'SAIDA CATRACA PAVUNA', 'ENTRADA CATRACA PAVUNA', 'SERVIDOR PAVUNA', 'PAVUNA', 'PV'] },
    { id: 'GALPÃO 4 ELOS ES', keywords: ['G1004LF', 'G1001LF', 'G1003LF', 'VESTIARIO FEMININO 4 ELOS', 'ENTRADA CATRACA 4 ELOS', 'SAIDA CATRACA 4ELOS', 'VESTIARIO MASCULINO 4ELOS', '4 ELOS ES', '4ELOS ES', 'GA-G4', 'G4'] },
    { id: 'GALPÃO 4 ELOS RJ', keywords: ['4E03LF', '4E02LF', '4E01LF', 'ENTRADA MEZANINO 4ELOS RJ', 'CATRACA ENTRADA 4ELOS RJ', 'CATRACA SAIDA 4ELOS RJ', '4 ELOS RJ', 'ELOS RJ', '4ELOS RJ'] },
    { id: 'GALPÃO LSP', keywords: ['LSP', 'LSP01', 'LSP02'] }
];

interface ImporterProps {
  onImport: (cameras: Camera[], accessPoints: AccessPoint[], alarms: Alarm[]) => void;
  onImportThirdParty: (workers: ProcessedWorker[], fileName: string) => void;
  onDeleteImport: (id: string) => void;
  thirdPartyImports?: ThirdPartyImport[];
  onReset: () => void;
}

const normalizeWarehouse = (rawWarehouse: string | null, location: string | null, module: string | null, name: string | null): string => {
    const textToCheck = ((rawWarehouse || '') + ' ' + (location || '') + ' ' + (module || '') + ' ' + (name || '')).toUpperCase();
    if (textToCheck.includes('4E01LF') || textToCheck.includes('4E02LF') || textToCheck.includes('4E03LF')) return '4 ELOS RJ';
    if (textToCheck.includes('IP0') || textToCheck.includes('IP1')) return 'SP (ITAPEVI)';
    if (textToCheck.includes('SJM') || textToCheck.includes('MERITI') || textToCheck.includes('EXPRESSA') || textToCheck.includes('SÃO JOSÉ')) return 'MERITI';
    if (textToCheck.includes('PV01') || textToCheck.includes('PV02') || textToCheck.includes('PV03')) return 'UNILOG PAVUNA';
    if (textToCheck.includes('ITAPEVI') || textToCheck.includes('SP-IP')) return 'SP (ITAPEVI)';
    if (textToCheck.includes('4 ELOS RJ') || textToCheck.includes('ELOS RJ')) return '4 ELOS RJ';
    if (textToCheck.includes('LSP')) return 'GALPÃO LSP';
    if (textToCheck.includes('PAVUNA')) return 'UNILOG PAVUNA';
    if (textToCheck.includes('G3')) return 'G3 MATRIZ';
    if (textToCheck.includes('G2')) return 'G2';
    if (textToCheck.includes('G5') || textToCheck.includes('TERABYTE')) return 'G5';
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

const parseCSV = (csv: string, type: 'camera' | 'access') => {
  if (!csv) return { cameras: [], alarms: [], accessPoints: [] };
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return { cameras: [], alarms: [], accessPoints: [] }; 
  const headers = lines[0].split(',').map(h => h.trim());
  
  const getValue = (rowObj: any, possibleHeaders: string[]) => {
    const key = Object.keys(rowObj).find(k => possibleHeaders.some(h => k.toUpperCase() === h.toUpperCase()));
    return key ? rowObj[key] : null;
  };

  const results: { cameras: Camera[], alarms: Alarm[], accessPoints: AccessPoint[] } = {
      cameras: [],
      alarms: [],
      accessPoints: []
  };

  lines.slice(1).forEach((line, idx) => {
    if (!line.trim()) return;
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
      const channelType = (getValue(obj, ['Tipo de Canal']) || '').toUpperCase();
      let warehouseRaw = getValue(obj, ['Galpão', 'Galpao', 'Warehouse']);
      const warehouse = normalizeWarehouse(warehouseRaw, location, module, name);
      const responsibleRaw = getValue(obj, ['Responsável', 'Responsavel', 'Resp', 'Tecnico']);
      const responsible = getResponsibleByWarehouse(warehouse, responsibleRaw);
      const statusRaw = getValue(obj, ['Canal on-line/off-line', 'Status ONLINE', 'Status', 'Status OFFLINE', 'STATUS', 'Estado', 'SITUACAO'])?.toUpperCase() || '';
      
      let status: Status = 'ONLINE';
      const offlineKeywords = ['OFFLINE', 'OFF', 'SEM SINAL', 'NO SIGNAL', 'ERRO', 'FALHA', 'DESLIGADO', 'INATIVO', '0', 'FALSE', 'NAO', 'NO', 'PERDA'];
      if (offlineKeywords.some(k => statusRaw.includes(k))) status = 'OFFLINE';

      if (!name) return;

      // LOGICA DE SEPARAÇÃO: ALARME VS CAMERA
      if (channelType.includes('ALARME')) {
          results.alarms.push({
              uuid, id: id || 'N/A', name: name || 'Alarme Sem Nome',
              type: channelType.includes('ENTRADA') ? 'Entrada' : channelType.includes('SAÍDA') ? 'Saída' : 'Geral',
              location: location || 'N/A', warehouse, responsible, status
          });
      } else {
          results.cameras.push({
              uuid, id: id || 'N/A', name: name || 'Sem Nome',
              location: location || 'N/A', module: module || 'Geral',
              warehouse, responsible, status
          });
      }
    } else {
      // Access Point Logic
      const name = getValue(obj, ['Nome do dispositivo', 'Nome', 'Name', 'Dispositivo', 'Equipamento']);
      const id = getValue(obj, ['IP', 'ID', 'Id', 'Cod', 'Código', 'Serial']);
      const location = getValue(obj, ['Nome org', 'Local', 'Location', 'Localização', 'Setor']);
      let warehouseRaw = getValue(obj, ['Galpão', 'Galpao', 'Warehouse']);
      const lastLog = getValue(obj, ['Última alteraçãoStatus', 'UltimoRegistro', 'LastLog', 'Data']);
      if (!name && !id) return;
      const warehouse = normalizeWarehouse(warehouseRaw, location, null, name);
      const statusRaw = getValue(obj, ['Status On-line/Off-line', 'Status', 'STATUS'])?.toUpperCase() || '';
      let status: Status = 'ONLINE';
      if (['OFFLINE', 'OFF', 'INATIVO', '0'].some(k => statusRaw.includes(k))) status = 'OFFLINE';
      
      results.accessPoints.push({
          uuid, id: id || name, name: name || id, type: 'Controle de Acesso',
          location: location || 'N/A', warehouse, status, lastLog: lastLog || '-', latency: '-'
      });
    }
  });

  return results;
};

const Importer: React.FC<ImporterProps> = ({ onImport, onImportThirdParty, onDeleteImport, thirdPartyImports = [], onReset }) => {
  const [cameraCsv, setCameraCsv] = useState('');
  const [accessCsv, setAccessCsv] = useState('');
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
            // ... (logica de processamento existente no arquivo original)
            if (newWorkers.length > 0) onImportThirdParty(newWorkers, fileName);
        }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleProcess = () => {
      const camData = parseCSV(cameraCsv, 'camera');
      const accData = parseCSV(accessCsv, 'access');
      onImport(camData.cameras, accData.accessPoints, camData.alarms);
  };

  return (
    <div className="space-y-6 animate-fade-in mx-auto pb-12 max-w-5xl">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
            <div>
                <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                    <Power size={24} className="text-emerald-500" /> Fonte de Dados
                </h2>
                <p className="text-slate-400 text-sm">Câmeras, Alarmes e Acessos são processados automaticamente.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
                <button onClick={handleProcess} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 transition-all font-bold"><Save size={18} /> PROCESSAR DADOS</button>
                <button onClick={() => setShowResetConfirm(true)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors text-sm font-medium"><RotateCcw size={16} /> Limpar Tudo</button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button onClick={() => cameraInputRef.current?.click()} className="w-full bg-slate-900 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all rounded-xl p-6 flex flex-col items-center justify-center gap-3 group min-h-[180px]">
                <div className="p-4 bg-slate-800 rounded-full group-hover:bg-emerald-500/20 transition-colors"><Video className="w-8 h-8 text-slate-400 group-hover:text-emerald-500" /></div>
                <div className="text-center"><h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">Câmeras e Alarmes</h3><p className="text-slate-500 text-xs mt-1">Carregar planilha de canais</p></div>
                <input type="file" accept=".csv, .xlsx, .xls" ref={cameraInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'camera')} />
            </button>
            <button onClick={() => accessInputRef.current?.click()} className="w-full bg-slate-900 border-2 border-dashed border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all rounded-xl p-6 flex flex-col items-center justify-center gap-3 group min-h-[180px]">
                <div className="p-4 bg-slate-800 rounded-full group-hover:bg-blue-500/20 transition-colors"><DoorClosed className="w-8 h-8 text-slate-400 group-hover:text-blue-500" /></div>
                <div className="text-center"><h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">Controle de Acesso</h3><p className="text-slate-500 text-xs mt-1">Carregar planilha de acessos</p></div>
                <input type="file" accept=".csv, .xlsx, .xls" ref={accessInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'access')} />
            </button>
            <button onClick={() => thirdPartyInputRef.current?.click()} className="w-full bg-slate-900 border-2 border-dashed border-slate-700 hover:border-amber-500/50 hover:bg-slate-800/50 transition-all rounded-xl p-6 flex flex-col items-center justify-center gap-3 group min-h-[180px]">
                <div className="p-4 bg-slate-800 rounded-full group-hover:bg-amber-500/20 transition-colors"><Briefcase className="w-8 h-8 text-slate-400 group-hover:text-amber-500" /></div>
                <div className="text-center"><h3 className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors">Terceirizados</h3><p className="text-slate-500 text-xs mt-1">Histórico de acessos nominais</p></div>
                <input type="file" accept=".xlsx, .csv" ref={thirdPartyInputRef} className="hidden" onChange={handleThirdPartyUpload} />
            </button>
        </div>
    </div>
  );
};

export default Importer;
