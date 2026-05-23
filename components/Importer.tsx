
import React, { useRef, useState } from 'react';
import { FileSpreadsheet, RotateCcw, Upload, Video, DoorClosed, Save, Briefcase, Trash2, Clock, FileText, Download, Database, Check, Layers, Power, X, AlertTriangle, RefreshCw, Info, DollarSign, Wand2, ListChecks, ShieldAlert, Loader2 } from 'lucide-react';
import { Camera, AccessPoint, Status, ProcessedWorker, ThirdPartyImport, ChannelType, ThirdPartyPayment, PaymentImport } from '../types';
import { WAREHOUSE_LIST } from '../constants';
import { getResponsibleByWarehouse } from '../services/monitoring';

const VALID_COMPANIES = ['B11', 'MULT', 'MPI', 'FORMA', 'SUPERA LOG', 'MJM', 'PRIMUS', 'PRAYLOG', 'GMILL', 'BSB'];

const VALID_UNITS = [
    { id: 'GALPÃO MERITI', keywords: ['MERITI', 'SJM', 'EXPRESSA', 'BSB', 'GRADIL EXPRESSA', 'DOCA RECEXP', 'RUA 17', 'RUA 12', 'RUA 34', 'REC MEZANINO', 'MESA CONTROLADO', 'DOCA RECEBIMENTO', 'ALTO CUSTO', 'ALTO VALOR'] },
    { id: 'GALPÃO 4 ELOS ES', keywords: ['G4 ES', 'G10', '4ELOS ES', '4 ELOS ES', '4ELOS', 'SPEED DOME', 'LOLA', 'CONFERENCIA 04', 'CONFERENCIA 03', 'RUA FLOWRACK', 'CHK0', 'G1004LF', 'G1003LF', 'G1001LF', 'CAMERA 4ELOS', 'FRENTE RUA G10-2'] },
    { id: 'GALPÃO LSP', keywords: ['10.0.30.65', '179.108.121.85', 'LSP_', 'LSP01', 'ENTRADA RODOVIA', 'PORTÃO SOCIAL', 'SPEED ESTACIONAMENTO', 'PÁTIO DOCAS', 'GUARITA', 'LSP01LF', 'LSP02LF', 'LSP03LF', 'ECLUSA LSP', 'CATRACA'] },
    { id: 'GALPÃO SP', keywords: ['177.69.119.221', 'INVD 32', 'SP 01', 'SP 02', 'SP 3_', 'SP_1', 'HOSPIDROGAS', 'FAVO', 'SALLVE', 'ITAPEVI', 'NEURAXPHARM', 'IP01LF', 'IP02LF', 'IP03LF', 'IP04LF', 'IP05LF', 'IP06LF', 'IP07LF', 'IP08LF', '29 E 30 FUNDOS'] },
    { id: 'GALPÃO 4 ELOS RJ', keywords: ['4 ELOS RJ', 'ELOS RJ', 'RUA 1 FRENTE', 'REFEITORIO MEZANINO', 'DOCA 40414243', 'ACESSO MD 2', '4E01LF', '4E02LF', '4E03LF'] },
    { id: 'GALPÃO G5', keywords: ['TERABYTE', 'NVD 1 G5', 'NVD 2 G5', 'NVD 3 G5', 'NVD 4 G5', 'NVD 5 G5', 'MD 4', 'MD 5', 'MD 6', 'MD 7', 'MD 8', 'MD 9', 'MD4', 'MD5', 'MD6', 'MD7', 'MD8', 'MD9', 'PINOS0', 'HERSHEYS', 'AC BRAZIL', 'BIOSANTE', 'BEYOUNG', 'LOLA COS', 'SERVIER', 'CELLERA', 'BIOCHIMICO', 'TUNEL', 'SAIDA EMER', 'CHECKOUT 06'] },
    { id: 'GALPÃO PAVUNA', keywords: ['PAVUNA', 'UNILOG PAVUNA', 'PV01', 'PV02', 'REC MODULO 01', 'PV01LF', 'PV02LF', 'PV03LF', 'ANTECAMARA ENTRADA'] },
    { id: 'GALPÃO G2', keywords: ['10.0.10.13', '10.0.10.14', '10.0.10.15', '10.0.10.16', '10.0.10.20', 'G2 MODULO', 'G2 DOCA', 'SEMEAR', 'RG SOLUÇÕES', 'PFS', 'PRESTIGE', 'BEAUTYGLAM', 'MERCO', 'BIOCON', 'MD A', 'MD B', 'MD C', 'MD D', 'MD E', 'MD F', 'VESTIARIO', 'COPA G2', 'ESCANINHO CELULAR', 'G216LF', 'G213LF', 'G203LF', 'G208LF', 'G207LF', 'G205LF', 'G210LF', 'G215LF', 'G201LF', 'G214LF', 'G212LF', 'G206LF', 'G204LF', 'G209LF', 'G217LF', 'G211LF', 'G202LF', 'ZYDUS', 'PRATI', 'GAIOLA', 'CATRACA G2', 'BEB', 'B E B', 'CHECKOUT', 'ACESSO MD A'] },
    { id: 'GALPÃO G3', keywords: ['10.0.10.18', 'G3 MATRIZ', 'G3 CCTO', 'MYLAN', 'ASPEN', 'DIPRIVAN', 'SALA MYLAN', 'G3 MD', 'RUA 25-26', 'RUA 23-24', 'RUA 21-22', 'RUA 19-20', 'RUA 17-18', 'RUA 11-12', 'RUA 9-10', 'RUA 3-4', 'RUA 5-6', 'RUA 1-2', 'ANTECAMERA ASPEN', 'CAMARA FRIA ASPEN', 'VPC', 'G315LF', 'G313LF', 'G311LF', 'G307LF', 'G306LF', 'G302LF', 'G305LF', 'G309LF', 'G316LF', 'G314LF', 'G312LF', 'G304LF', 'G301LF', 'G310LF', 'G308LF', 'G303LF', 'G3 ANTECAMARA'] }
];

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
            if (parts.length === 3) {
                const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }
        if (datePart.includes('-')) return datePart;
    }
    return 'N/A';
};

const formatExcelDate = (val: any): string => {
    if (!val) return '-';
    if (typeof val === 'number') {
        const d = new Date(Math.round((val - 25569) * 86400 * 1000));
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    return String(val).trim();
};

const normalizeWarehouse = (rawWarehouse: string | null, location: string | null, module: string | null, name: string | null, deviceName: string | null, id: string | null): string => {
    const channelName = (name || '').toUpperCase();
    const devName = (deviceName || '').toUpperCase();
    const locName = (location || '').toUpperCase();
    const modName = (module || '').toUpperCase();
    const idStr = (id || '').toString().trim();

    if (idStr.includes('177.69.119.221')) return 'GALPÃO SP';
    if (idStr.includes('10.0.30.65') || idStr.includes('179.108.121.85')) return 'GALPÃO LSP';

    const textToCheck = `${channelName} ${locName} ${modName} ${rawWarehouse}`.toUpperCase();

    if (textToCheck.includes('LSP')) return 'GALPÃO LSP'; 
    if (textToCheck.includes('G5')) return 'GALPÃO G5';
    if (textToCheck.includes('G2')) return 'GALPÃO G2';
    if (textToCheck.includes('G3')) return 'GALPÃO G3';
    
    if (textToCheck.includes('SP-IP') || textToCheck.includes('SP0') || textToCheck.includes('SP_') || (textToCheck.includes('SP') && !textToCheck.includes('LSP'))) {
        return 'GALPÃO SP';
    }

    if (textToCheck.includes('MERITI') || textToCheck.includes('SJM')) return 'GALPÃO MERITI';
    if (textToCheck.includes('PAVUNA')) return 'GALPÃO PAVUNA';
    if (textToCheck.includes('4ELOS ES') || textToCheck.includes('4 ELOS ES')) return 'GALPÃO 4 ELOS ES';
    if (textToCheck.includes('4ELOS RJ') || textToCheck.includes('4 ELOS RJ')) return 'GALPÃO 4 ELOS RJ';

    for (const unit of VALID_UNITS) {
        if (unit.keywords.some(k => textToCheck.includes(k))) return unit.id;
    }

    return rawWarehouse || 'Geral';
};

const mapJsonToDevices = (jsonData: any[], type: 'camera' | 'access'): any[] => {
    const getValue = (rowObj: any, possibleHeaders: string[]) => {
        const key = Object.keys(rowObj).find(k => {
            const normalizedKey = k.trim().toUpperCase();
            return possibleHeaders.some(h => normalizedKey === h.toUpperCase().trim());
        });
        return key ? rowObj[key] : null;
    };
    return jsonData.map((obj, idx) => {
        const uuid = `${type}-${idx}-${Date.now()}`;
        if (type === 'camera') {
            const name = getValue(obj, ['Nome do canal', 'Nome do dispositivo', 'NOME', 'Nome_Camera', 'Nome', 'Camera', 'Canal']);
            const deviceName = getValue(obj, ['Nome do dispositivo', 'Device Name', 'NVD', 'Equipamento', 'Nome do Dispositivo']);
            const id = getValue(obj, ['IP do Dispositivo', 'ID_Camera', 'ID', 'Codigo', 'Número', 'IP']);
            const location = getValue(obj, ['Nome org', 'Localização', 'Localizacao', 'Local']);
            const module = getValue(obj, ['Módulo', 'Modulo', 'MODULO', 'Setor']);
            let warehouseRaw = getValue(obj, ['Galpão', 'Galpao', 'Warehouse']);
            const warehouse = normalizeWarehouse(warehouseRaw, location, module, name, deviceName, id);
            const warehouseManuallyEdited = !!(warehouseRaw && warehouseRaw.toString().trim());
            const responsibleRaw = getValue(obj, ['Responsável', 'Responsavel', 'Resp', 'Tecnico']);
            const responsible = getResponsibleByWarehouse(warehouse, responsibleRaw);
            const lastLogRaw = getValue(obj, ['Última alteraçãoStatus', 'Última alteração Status', 'UltimaAlteracaoStatus', 'DataStatus', 'Data']);
            const lastLog = formatExcelDate(lastLogRaw);
            const channelTypeRaw = getValue(obj, ['Tipo de Canal', 'Tipo', 'TIPO_CANAL', 'ChannelType'])?.toUpperCase() || '';
            let channelType: ChannelType = 'video';
            if (channelTypeRaw.includes('ALARME')) channelType = 'alarm';
            const statusRaw = getValue(obj, ['Status On-line/Off-line', 'Canal on-line/off-line', 'Status ONLINE', 'Status', 'Status OFFLINE', 'STATUS', 'Estado', 'SITUACAO'])?.toUpperCase() || '';
            let status: Status = 'ONLINE';
            const offlineKeywords = ['OFFLINE', 'OFF', 'SEM SINAL', 'NO SIGNAL', 'ERRO', 'FALHA', 'DESLIGADO', 'INATIVO', '0', 'FALSE', 'NAO', 'NO', 'PERDA'];
            if (offlineKeywords.some(k => statusRaw.includes(k))) status = 'OFFLINE';
            if (!name) return null;
            return { uuid, id: id || 'N/A', name: name || 'Sem Nome', location: location || 'N/A', module: module || 'Geral', warehouse, responsible, status, channelType, lastLog, warehouseManuallyEdited } as Camera;
        } else {
            const name = getValue(obj, ['Nome do canal', 'Nome do dispositivo', 'Nome', 'Name', 'Dispositivo', 'Equipamento']);
            const id = getValue(obj, ['IP', 'ID', 'Id', 'Cod', 'Código', 'Serial', 'IP do Dispositivo']);
            const location = getValue(obj, ['Nome org', 'Local', 'Location', 'Localização', 'Setor']);
            let warehouseRaw = getValue(obj, ['Galpão', 'Galpao', 'Warehouse']);
            const lastLogRaw = getValue(obj, ['Última alteraçãoStatus', 'Última alteração Status', 'UltimoRegistro', 'LastLog', 'Data']);
            const lastLog = formatExcelDate(lastLogRaw);
            if (!name && !id) return null;
            const finalName = name || id || 'Dispositivo Sem Nome';
            const finalId = id || finalName; 
            const warehouse = normalizeWarehouse(warehouseRaw, location, null, name, name, id);
            const warehouseManuallyEdited = !!(warehouseRaw && warehouseRaw.toString().trim());
            const statusRaw = getValue(obj, ['Status On-line/Off-line', 'Status', 'STATUS', 'Estado', 'Situação', 'Conexão'])?.toUpperCase() || '';
            let status: Status = 'ONLINE';
            const offlineKeywords = ['OFFLINE', 'OFF', 'INATIVO', 'DESLIGADO', 'FALHA', 'ERRO', 'ERROR', 'DOWN', 'DISCONNECTED', '0', 'FALSE', 'NAO', 'NÃO', 'RUIM', 'PARADO'];
            if (offlineKeywords.some(k => statusRaw === k || statusRaw.includes(k))) status = 'OFFLINE';
            const responsibleRaw = getValue(obj, ['Responsável', 'Responsavel', 'Resp', 'Tecnico']);
            const responsible = getResponsibleByWarehouse(warehouse, responsibleRaw);
            return { uuid, id: finalId, name: finalName, type: 'Controle de Acesso', location: location || 'N/A', warehouse, responsible, status, lastLog, latency: '-', warehouseManuallyEdited } as AccessPoint;
        }
    }).filter(Boolean);
};

interface ImporterProps {
  onImport: (cameras: Camera[], accessPoints: AccessPoint[]) => void;
  onImportThirdParty: (workers: ProcessedWorker[], fileName: string, startDate?: string, endDate?: string) => void;
  onImportPayments: (payments: ThirdPartyPayment[], fileName: string) => void;
  onDeleteImport: (id: string) => void;
  onDeletePayment: (id: string) => void;
  thirdPartyImports?: ThirdPartyImport[];
  paymentImports?: PaymentImport[];
  onResetCameras: () => void;
  onResetAccess: () => void;
  onResetThirdParty: () => void;
  onResetPayments: () => void;
}

const Importer: React.FC<ImporterProps> = ({ 
    onImport, onImportThirdParty, onImportPayments, onDeleteImport, onDeletePayment,
    thirdPartyImports = [], paymentImports = [],
    onResetCameras, onResetAccess, onResetThirdParty, onResetPayments 
}) => {
  const [cameraData, setCameraData] = useState<any[]>([]);
  const [accessData, setAccessData] = useState<any[]>([]);
  const [selectedPivotUnit, setSelectedPivotUnit] = useState<string>('GALPÃO G2');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // MODAL STATES
  const [resetTarget, setResetTarget] = useState<'cameras' | 'access' | 'thirdparty' | 'payments' | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'thirdparty' | 'payment', name: string } | null>(null);
  const [pendingThirdPartyFile, setPendingThirdPartyFile] = useState<{ bstr: any, fileName: string } | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const accessInputRef = useRef<HTMLInputElement>(null);
  const thirdPartyInputRef = useRef<HTMLInputElement>(null);
  const paymentInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'camera' | 'access') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      if (window.XLSX) {
        const wb = window.XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData: any[] = window.XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (type === 'camera') setCameraData(jsonData);
        else setAccessData(jsonData);
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
            const wb = window.XLSX.read(bstr, { type: 'binary', cellDates: true });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const jsonData: any[] = window.XLSX.utils.sheet_to_json(ws);
            const newWorkers: ProcessedWorker[] = [];
            jsonData.forEach((row, index) => {
                const rawName = row['Pessoa'] || row['Nome'] || row['NOME'];
                if (!rawName || typeof rawName !== 'string' || !rawName.trim()) return; 

                const rawEventType = (row['Tipo de evento'] || row['Eventos'] || '').toUpperCase();
                const rawStatus = (row['Status de Entrada/Saída'] || '').toUpperCase();
                
                let finalEvent = 'NORMAL';
                if (rawStatus.includes('ENTRADA') || rawEventType.includes('ENTRADA') || rawEventType.includes('DESBLOQUEIO') || rawEventType.includes('ACESSO LIBERADO')) {
                    finalEvent = 'ENTRADA';
                } else if (rawStatus.includes('SAÍDA') || rawStatus.includes('SAIDA') || rawEventType.includes('SAÍDA') || rawEventType.includes('SAIDA')) {
                    finalEvent = 'SAÍDA';
                } else {
                    finalEvent = rawEventType || 'OUTRO';
                }

                const locationString = [row['Ambiente'], row['Ponto de Acesso'], row['Tipo de ponto de acesso'], row['Local'], row['Nome do dispositivo'], row['Device']].join(' ').toUpperCase();
                const unit = normalizeWarehouse(null, locationString, null, null, locationString, null);
                if (!unit || unit === 'Geral') return; 

                const fullSearchString = [locationString, row['Grupo de pessoas'], row['Pessoa'], row['Nome']].join(' ').toUpperCase();
                let company = row['Grupo de pessoas'] ? row['Grupo de pessoas'].trim().toUpperCase() : null;
                if (company === 'MULT ALTA DIARISTA') company = 'MULT';
                if (company === 'B11 ALTA DIARISTA') company = 'B11';
                
                if (!company) {
                   if (fullSearchString.includes('PRAYLOG')) company = 'PRAYLOG';
                   else if (fullSearchString.includes('SUPERA')) company = 'SUPERA LOG';
                   else if (fullSearchString.includes('FORMA')) company = 'FORMA';
                   else if (fullSearchString.includes('PRIMUS')) company = 'PRIMUS';
                   else if (fullSearchString.includes('MPI')) company = 'MPI';
                   else if (fullSearchString.includes('B11')) company = 'B11';
                   else if (fullSearchString.includes('MJM')) company = 'MJM';
                   else if (fullSearchString.includes('MULT')) company = 'MULT';
                   else if (fullSearchString.includes('GMILL')) company = 'GMILL';
                   else if (fullSearchString.includes('BSB')) company = 'BSB';
                }
                
                if (!company) company = ''; 

                const dateNormalized = parseRowDate(row);
                let timeStr = row['Hora'] || '-';
                if (typeof timeStr === 'string' && timeStr.includes(' ')) timeStr = timeStr.split(' ')[1]; 
                
                newWorkers.push({
                    id: `w-${index}-${Date.now()}`,
                    name: rawName.trim(),
                    company, unit, date: dateNormalized, time: timeStr, accessPoint: row['Ponto de Acesso'] || row['Ambiente'] || '-', eventType: finalEvent
                });
            });
            if (newWorkers.length > 0) {
                setPendingThirdPartyFile({ bstr, fileName });
            }
            else alert("Nenhum dado válido de terceiros encontrado na planilha.");
        }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handlePaymentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = file.name;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const bstr = evt.target?.result;
        if (window.XLSX) {
            const wb = window.XLSX.read(bstr, { type: 'binary', cellDates: true });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const jsonData: any[] = window.XLSX.utils.sheet_to_json(ws);
            const newPayments: ThirdPartyPayment[] = [];
            
            const headers = Object.keys(jsonData[0] || {});
            const isPivot = headers.some(h => h.includes('Rótulos de Linha') || h.includes('Linha'));

            if (isPivot) {
                const nameKey = headers.find(h => h.includes('Rótulos de Linha') || h.includes('Linha')) || '';
                
                jsonData.forEach((row, rIdx) => {
                    const name = row[nameKey];
                    if (!name || name === 'Total Geral' || name === '(vazio)') return;

                    headers.forEach((h, cIdx) => {
                        const dateRegex = /\d{2}\/\d{2}\/\d{4}/;
                        if (dateRegex.test(h) && row[h]) {
                            const dateParts = h.split('/');
                            const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                            
                            newPayments.push({
                                id: `p-pvt-${rIdx}-${cIdx}-${Date.now()}`,
                                workerName: name.toString().trim(),
                                company: 'TERCEIRIZADO',
                                unit: selectedPivotUnit,
                                date: formattedDate,
                                value: 1, 
                                reference: 'Frequência Automatizada',
                                category: 'DIÁRIA'
                            });
                        }
                    });
                });
            } else {
                jsonData.forEach((row, index) => {
                    const name = row['Colaborador'] || row['Nome'] || row['Pessoa'] || row['NOME'];
                    const companyRaw = row['Empresa'] || row['Parceiro'] || row['Empresa_contratada'] || row['Empresa contratada'];
                    const value = 1;
                    const unitRaw = row['Unidade'] || row['Galpão'] || row['Local'] || 'Geral';
                    const date = parseRowDate(row);
                    const refCode = row['Referência'] || row['Referencia'] || row['ID'] || row['HORA TOTAL'] || 'N/A';

                    if (name && name !== 'Total Geral') {
                        const unit = normalizeWarehouse(unitRaw, unitRaw, null, null, null, null);
                        newPayments.push({
                            id: `p-${index}-${Date.now()}`,
                            workerName: name.toString().trim(),
                            company: companyRaw ? companyRaw.toString().trim().toUpperCase() : 'N/A',
                            unit: unit,
                            date,
                            value,
                            reference: refCode.toString().trim(),
                            category: row['CATEGORIA'] || row['Categoria'] || 'Serviço'
                        });
                    }
                });
            }

            if (newPayments.length > 0) onImportPayments(newPayments, fileName);
            else alert("Nenhum registro válido encontrado.");
        }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleProcess = () => {
      const cameras = mapJsonToDevices(cameraData, 'camera');
      const access = mapJsonToDevices(accessData, 'access');
      if (cameras.length === 0 && access.length === 0) {
          alert("Nenhum dado carregado para processar.");
          return;
      }
      onImport(cameras, access);
  };

  const processPendingThirdPartyFile = () => {
      if (!pendingThirdPartyFile) return;
      const { bstr, fileName } = pendingThirdPartyFile;
      const wb = window.XLSX.read(bstr, { type: 'binary', cellDates: true });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const jsonData: any[] = window.XLSX.utils.sheet_to_json(ws);
      const newWorkers: ProcessedWorker[] = [];
      jsonData.forEach((row, index) => {
          const rawName = row['Pessoa'] || row['Nome'] || row['NOME'];
          if (!rawName || typeof rawName !== 'string' || !rawName.trim()) return; 

          const rawEventType = (row['Tipo de evento'] || row['Eventos'] || '').toUpperCase();
          const rawStatus = (row['Status de Entrada/Saída'] || '').toUpperCase();
          
          let finalEvent = 'NORMAL';
          if (rawStatus.includes('ENTRADA') || rawEventType.includes('ENTRADA') || rawEventType.includes('DESBLOQUEIO') || rawEventType.includes('ACESSO LIBERADO')) {
              finalEvent = 'ENTRADA';
          } else if (rawStatus.includes('SAÍDA') || rawStatus.includes('SAIDA') || rawEventType.includes('SAÍDA') || rawEventType.includes('SAIDA')) {
              finalEvent = 'SAÍDA';
          } else {
              finalEvent = rawEventType || 'OUTRO';
          }

          const locationString = [row['Ambiente'], row['Ponto de Acesso'], row['Tipo de ponto de acesso'], row['Local'], row['Nome do dispositivo'], row['Device']].join(' ').toUpperCase();
          const unit = normalizeWarehouse(null, locationString, null, null, locationString, null);
          if (!unit || unit === 'Geral') return; 

          const fullSearchString = [locationString, row['Grupo de pessoas'], row['Pessoa'], row['Nome']].join(' ').toUpperCase();
          let company = row['Grupo de pessoas'] ? row['Grupo de pessoas'].trim().toUpperCase() : null;
          if (company === 'MULT ALTA DIARISTA') company = 'MULT';
          if (company === 'B11 ALTA DIARISTA') company = 'B11';

          if (!company) {
             if (fullSearchString.includes('PRAYLOG')) company = 'PRAYLOG';
             else if (fullSearchString.includes('SUPERA')) company = 'SUPERA LOG';
             else if (fullSearchString.includes('FORMA')) company = 'FORMA';
             else if (fullSearchString.includes('PRIMUS')) company = 'PRIMUS';
             else if (fullSearchString.includes('MPI')) company = 'MPI';
             else if (fullSearchString.includes('B11')) company = 'B11';
             else if (fullSearchString.includes('MJM')) company = 'MJM';
             else if (fullSearchString.includes('MULT')) company = 'MULT';
             else if (fullSearchString.includes('GMILL')) company = 'GMILL';
             else if (fullSearchString.includes('BSB')) company = 'BSB';
          }
          
          if (!company) company = ''; 

          const dateNormalized = parseRowDate(row);
          let timeStr = row['Hora'] || '-';
          if (typeof timeStr === 'string' && timeStr.includes(' ')) timeStr = timeStr.split(' ')[1]; 
          
          newWorkers.push({
              id: `w-${index}-${Date.now()}`,
              name: rawName.trim(),
              company, unit, date: dateNormalized, time: timeStr, accessPoint: row['Ponto de Acesso'] || row['Ambiente'] || '-', eventType: finalEvent
          });
      });
      onImportThirdParty(newWorkers, fileName, dateRange.start, dateRange.end);
      setPendingThirdPartyFile(null);
      setDateRange({ start: '', end: '' });
  };

  // EXECUTE ACTIONS AFTER CONFIRMATION
  const executeReset = async () => {
      if (!resetTarget) return;
      setIsDeleting(true);
      try {
        if (resetTarget === 'cameras') await onResetCameras();
        else if (resetTarget === 'access') await onResetAccess();
        else if (resetTarget === 'thirdparty') await onResetThirdParty();
        else if (resetTarget === 'payments') await onResetPayments();
      } finally {
        setIsDeleting(false);
        setResetTarget(null);
      }
  };

  const executeDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
        if (itemToDelete.type === 'thirdparty') await onDeleteImport(itemToDelete.id);
        else if (itemToDelete.type === 'payment') await onDeletePayment(itemToDelete.id);
    } finally {
        setIsDeleting(false);
        setItemToDelete(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in mx-auto pb-20 max-w-6xl">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Database size={160} className="text-white" />
            </div>
            <div className="relative z-10 w-full xl:w-auto">
                <h2 className="text-3xl font-black text-white mb-4 flex items-center gap-3 uppercase tracking-tighter italic">
                    <div className="p-2 bg-emerald-500 rounded-lg shadow-lg shadow-emerald-900/40"><Power size={28} className="text-white" /></div>
                    Fonte de Dados
                </h2>
                <p className="text-slate-400 text-sm max-w-lg leading-relaxed">
                    Interface central de sincronismo. Carregue as planilhas extraídas dos sistemas oficiais para atualizar o ecossistema.
                </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto relative z-10">
                <button onClick={handleProcess} className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-12 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-900/40 transition-all font-black uppercase text-xs tracking-widest active:scale-95 group">
                    <Save size={20} className="group-hover:scale-110 transition-transform" /> 
                    ATUALIZAR MONITORAMENTO
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-900 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all rounded-2xl flex flex-col items-center justify-center gap-4 group min-h-[250px] shadow-lg relative p-8">
                <div onClick={() => cameraInputRef.current?.click()} className="flex flex-col items-center gap-4 cursor-pointer w-full text-center">
                    <div className="p-5 bg-slate-800 rounded-full group-hover:bg-emerald-500/20 transition-all group-hover:scale-110 shadow-inner"><Video className="w-10 h-10 text-slate-400 group-hover:text-emerald-500" /></div>
                    <div className="text-center"><h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight italic">CÂMERAS / ALARMES</h3><p className="text-slate-500 text-xs mt-2 font-medium">{cameraData.length > 0 ? `${cameraData.length} linhas em espera` : 'Selecionar .xlsx oficial'}</p></div>
                    <input type="file" accept=".xlsx, .xls" ref={cameraInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'camera')} />
                </div>
                <button onClick={() => setResetTarget('cameras')} className="mt-4 px-4 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <RotateCcw size={12} /> Limpar
                </button>
            </div>

            <div className="bg-slate-900 border-2 border-dashed border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all rounded-2xl flex flex-col items-center justify-center gap-4 group min-h-[250px] shadow-lg relative p-8">
                <div onClick={() => accessInputRef.current?.click()} className="flex flex-col items-center gap-4 cursor-pointer w-full text-center">
                    <div className="p-5 bg-slate-800 rounded-full group-hover:bg-blue-500/20 transition-all group-hover:scale-110 shadow-inner"><DoorClosed className="w-10 h-10 text-slate-400 group-hover:text-blue-500" /></div>
                    <div className="text-center"><h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight italic">CONTROLE DE ACESSO</h3><p className="text-slate-500 text-xs mt-2 font-medium">{accessData.length > 0 ? `${accessData.length} linhas em espera` : 'Selecionar .xlsx oficial'}</p></div>
                    <input type="file" accept=".xlsx, .xls" ref={accessInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'access')} />
                </div>
                <button onClick={() => setResetTarget('access')} className="mt-4 px-4 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <RotateCcw size={12} /> Limpar
                </button>
            </div>

            <div className="bg-slate-900 border-2 border-dashed border-slate-700 hover:border-amber-500/50 hover:bg-slate-800/50 transition-all rounded-2xl flex flex-col items-center justify-center gap-4 group min-h-[250px] shadow-lg relative p-8">
                <div onClick={() => thirdPartyInputRef.current?.click()} className="flex flex-col items-center gap-4 cursor-pointer w-full text-center">
                    <div className="p-5 bg-slate-800 rounded-full group-hover:bg-amber-500/20 transition-all group-hover:scale-110 shadow-inner"><Briefcase className="w-10 h-10 text-slate-400 group-hover:text-amber-500" /></div>
                    <div className="text-center"><h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors uppercase tracking-tight italic">FLUXO DE ACESSO</h3><p className="text-slate-500 text-xs mt-2 font-medium">Histórico bruto de catracas</p></div>
                    <input type="file" accept=".xlsx, .xls" ref={thirdPartyInputRef} className="hidden" onChange={handleThirdPartyUpload} />
                </div>
                <button onClick={() => setResetTarget('thirdparty')} className="mt-4 px-4 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <RotateCcw size={12} /> Limpar
                </button>
            </div>

            <div className="bg-slate-900 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all rounded-2xl flex flex-col items-center justify-center gap-4 group min-h-[250px] shadow-lg relative p-8">
                <div className="w-full flex flex-col items-center text-center">
                    <div onClick={() => paymentInputRef.current?.click()} className="flex flex-col items-center gap-4 cursor-pointer w-full">
                        <div className="p-5 bg-slate-800 rounded-full group-hover:bg-emerald-500/20 transition-all group-hover:scale-110 shadow-inner"><ListChecks className="w-10 h-10 text-slate-400 group-hover:text-emerald-500" /></div>
                        <div className="text-center"><h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight italic">FREQUÊNCIA/PIVOT</h3><p className="text-slate-500 text-[10px] mt-2 font-black uppercase tracking-widest">Planilha de Diárias</p></div>
                        <input type="file" accept=".xlsx, .xls" ref={paymentInputRef} className="hidden" onChange={handlePaymentUpload} />
                    </div>
                    <div className="mt-4 w-full px-2">
                        <label className="block text-[9px] font-black text-slate-500 uppercase mb-1 ml-1">Vincular Diárias ao Galpão:</label>
                        <select 
                            value={selectedPivotUnit} 
                            onChange={(e) => setSelectedPivotUnit(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-[10px] text-emerald-500 font-bold uppercase outline-none focus:border-emerald-500"
                        >
                            {WAREHOUSE_LIST.map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                    </div>
                </div>
                <button onClick={() => setResetTarget('payments')} className="mt-4 px-4 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <RotateCcw size={12} /> Limpar
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-3 text-lg">
                        <Clock size={22} className="text-amber-500" /> 
                        Fluxo de Acesso
                    </h3>
                    <span className="text-[10px] font-black bg-slate-800 text-slate-400 px-3 py-1.5 rounded-full border border-slate-700 uppercase tracking-widest">{thirdPartyImports.length} Arquivos</span>
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {thirdPartyImports.length === 0 ? (
                        <div className="p-20 text-center text-slate-600 flex flex-col items-center gap-3">
                            <Database size={48} className="opacity-20" />
                            <p className="italic text-sm font-medium">Sem histórico de fluxo.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest sticky top-0 z-10 border-b border-slate-800">
                                <tr>
                                    <th className="p-5">Arquivo</th>
                                    <th className="p-5 text-center">Volume</th>
                                    <th className="p-5 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                {thirdPartyImports.map((imp) => (
                                    <tr key={imp.id} className="hover:bg-slate-800/40 transition-colors group">
                                        <td className="p-5"><span className="font-bold text-slate-200">{imp.fileName}</span></td>
                                        <td className="p-5 text-center"><span className="bg-slate-950 px-2 py-1 rounded text-emerald-400 font-mono font-bold text-xs">{imp.count}</span></td>
                                        <td className="p-5 text-right">
                                            <button 
                                                onClick={() => setItemToDelete({ id: imp.id, type: 'thirdparty', name: imp.fileName })} 
                                                className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded transition-all"
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
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-3 text-lg">
                        <ListChecks size={22} className="text-emerald-500" /> 
                        Planilhas de Frequência
                    </h3>
                    <span className="text-[10px] font-black bg-slate-800 text-slate-400 px-3 py-1.5 rounded-full border border-slate-700 uppercase tracking-widest">{paymentImports.length} Arquivos</span>
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {paymentImports.length === 0 ? (
                        <div className="p-20 text-center text-slate-600 flex flex-col items-center gap-3">
                            <ListChecks size={48} className="opacity-20" />
                            <p className="italic text-sm font-medium">Sem histórico de frequência.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest sticky top-0 z-10 border-b border-slate-800">
                                <tr>
                                    <th className="p-5">Arquivo</th>
                                    <th className="p-5 text-center">Volume</th>
                                    <th className="p-5 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                {paymentImports.map((imp) => (
                                    <tr key={imp.id} className="hover:bg-slate-800/40 transition-colors group">
                                        <td className="p-5"><span className="font-bold text-slate-200">{imp.fileName}</span></td>
                                        <td className="p-5 text-center"><span className="bg-slate-950 px-2 py-1 rounded text-emerald-400 font-mono font-bold text-xs">{imp.count}</span></td>
                                        <td className="p-5 text-right">
                                            <button 
                                                onClick={() => setItemToDelete({ id: imp.id, type: 'payment', name: imp.fileName })} 
                                                className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded transition-all"
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
            </div>
        </div>

        {/* MODAL DE DATA PARA FLUXO DE ACESSO */}
        {pendingThirdPartyFile && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
                <div className="bg-[#05070a] border border-slate-800 rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-md p-10 text-center space-y-8 relative overflow-hidden ring-1 ring-slate-800">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.5)]"></div>
                    
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">REGISTRO DE DATA</h3>
                    
                    <div className="space-y-4">
                        <div className="text-left">
                            <label className="text-slate-400 text-xs font-bold uppercase">Data Início</label>
                            <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white" />
                        </div>
                        <div className="text-left">
                            <label className="text-slate-400 text-xs font-bold uppercase">Data Fim</label>
                            <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white" />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button onClick={() => setPendingThirdPartyFile(null)} className="flex-1 px-6 py-4 bg-[#1e293b] hover:bg-slate-700 text-slate-200 rounded-2xl font-black uppercase text-xs tracking-widest transition-all border border-slate-700">CANCELAR</button>
                        <button onClick={processPendingThirdPartyFile} disabled={!dateRange.start || !dateRange.end} className="flex-1 px-6 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all disabled:opacity-50">CONFIRMAR</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL DE CONFIRMAÇÃO UNIFICADO (ESTILO CCOS) */}
        {(resetTarget || itemToDelete) && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
                <div className="bg-[#05070a] border border-slate-800 rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-md p-10 text-center space-y-8 relative overflow-hidden ring-1 ring-slate-800">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-600 shadow-[0_0_15px_rgba(225,29,72,0.5)]"></div>
                    
                    <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20 shadow-inner">
                        <ShieldAlert className="text-rose-600 w-12 h-12 animate-pulse" />
                    </div>
                    
                    <div className="space-y-4">
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none drop-shadow-md">CONFIRMAR AÇÃO?</h3>
                        <div className="text-slate-400 text-sm leading-relaxed font-medium">
                            {resetTarget ? (
                                <p>Esta ação removerá permanentemente TODA a base de <br/> <strong className="text-white uppercase tracking-wider">{
                                    resetTarget === 'cameras' ? 'Câmeras' : 
                                    resetTarget === 'access' ? 'Acessos' : 
                                    resetTarget === 'thirdparty' ? 'Fluxo de Acesso' : 'Frequência'
                                }</strong>. <br/>Não há como desfazer.</p>
                            ) : (
                                <p>Deseja realmente excluir o arquivo <br/> <strong className="text-rose-500 font-bold italic tracking-tight">"{itemToDelete?.name}"</strong>?</p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button 
                            onClick={() => { setResetTarget(null); setItemToDelete(null); }} 
                            disabled={isDeleting}
                            className="flex-1 px-6 py-4 bg-[#1e293b] hover:bg-blue-600 text-slate-200 hover:text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all border border-slate-700 hover:border-blue-400 shadow-lg disabled:opacity-50"
                        >
                            CANCELAR
                        </button>
                        <button 
                            onClick={resetTarget ? executeReset : executeDeleteItem} 
                            disabled={isDeleting}
                            className="flex-1 px-6 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_30px_rgba(225,29,72,0.5)] transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'CONFIRMAR'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Importer;
