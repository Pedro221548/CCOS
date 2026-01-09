
import React, { useRef, useState } from 'react';
import { FileSpreadsheet, RotateCcw, Upload, Video, DoorClosed, Save, Briefcase, Trash2, Clock, FileText, Download, Database, Check, Layers, Power, X, AlertTriangle } from 'lucide-react';
import { Camera, AccessPoint, Status, ProcessedWorker, ThirdPartyImport, ChannelType } from '../types';
// @ts-ignore - jspdf might be loaded via CDN or missing type declarations
import { jsPDF } from "jspdf";

const VALID_COMPANIES = ['B11', 'MULT', 'MPI', 'FORMA', 'SUPERA LOG', 'MJM', 'PRIMUS', 'PRAYLOG'];

// Mapeamento de Palavras-Chave atualizado
const VALID_UNITS = [
    { id: 'GALPÃO MERITI', keywords: ['MERITI', 'SJM', 'EXPRESSA', 'BSB', 'GRADIL EXPRESSA', 'DOCA RECEXP', 'RUA 17', 'RUA 12', 'RUA 34', 'REC MEZANINO', 'MESA CONTROLADO', 'DOCA RECEBIMENTO', 'ALTO CUSTO', 'ALTO VALOR'] },
    { id: 'GALPÃO 4 ELOS ES', keywords: ['G4 ES', 'G10', '4ELOS ES', '4 ELOS ES', '4ELOS', 'SPEED DOME', 'LOLA', 'CONFERENCIA 04', 'CONFERENCIA 03', 'RUA FLOWRACK', 'CHK0', 'G1004LF', 'G1003LF', 'G1001LF', 'CAMERA 4ELOS'] },
    { id: 'GALPÃO SP', keywords: ['INVD 32', 'SP 01', 'SP 02', 'SP 3_', 'SP_1', 'HOSPIDROGAS', 'FAVO', 'SALLVE', 'ITAPEVI', 'NEURAXPHARM', 'IP01LF', 'IP02LF', 'IP03LF', 'IP04LF', 'IP05LF', 'IP06LF', 'IP07LF', 'IP08LF'] },
    { id: 'GALPÃO 4 ELOS RJ', keywords: ['4 ELOS RJ', 'ELOS RJ', 'RUA 1 FRENTE', 'REFEITORIO MEZANINO', 'DOCA 40414243', 'ACESSO MD 2', '4E01LF', '4E02LF', '4E03LF'] },
    { id: 'GALPÃO LSP', keywords: ['LSP_', 'LSP01', 'ENTRADA RODOVIA', 'PORTÃO SOCIAL', 'SPEED ESTACIONAMENTO', 'PÁTIO DOCAS', 'GUARITA', 'LSP01LF', 'LSP02LF', 'LSP03LF', 'ECLUSA LSP'] },
    { id: 'GALPÃO G5', keywords: ['TERABYTE', 'NVD 1 G5', 'NVD 2 G5', 'NVD 3 G5', 'NVD 4 G5', 'NVD 5 G5', 'MD 4', 'MD 5', 'MD 6', 'MD 7', 'MD 8', 'MD 9', 'MD4', 'MD5', 'MD6', 'MD7', 'MD8', 'MD9', 'PINOS0', 'HERSHEYS', 'AC BRAZIL', 'BIOSANTE', 'BEYOUNG', 'LOLA COS', 'SERVIER', 'CELLERA', 'BIOCHIMICO', 'TUNEL', 'SAIDA EMER'] },
    { id: 'GALPÃO PAVUNA', keywords: ['PAVUNA', 'UNILOG PAVUNA', 'PV01', 'PV02', 'REC MODULO 01', 'ANTECAMARA ENTRADA', 'PV01LF', 'PV02LF', 'PV03LF'] },
    { id: 'GALPÃO G2', keywords: ['10.0.10.13', '10.0.10.14', '10.0.10.15', '10.0.10.16', '10.0.10.20', 'G2 MODULO', 'G2 DOCA', 'SEMEAR', 'RG SOLUÇÕES', 'PFS', 'PRESTIGE', 'BEAUTYGLAM', 'MERCO', 'BIOCON', 'MD A', 'MD B', 'MD C', 'MD D', 'MD E', 'MD F', 'VESTIARIO', 'COPA G2', 'ESCANINHO CELULAR', 'G216LF', 'G213LF', 'G203LF', 'G208LF', 'G207LF', 'G205LF', 'G210LF', 'G215LF', 'G201LF', 'G214LF', 'G212LF', 'G206LF', 'G204LF', 'G209LF', 'G217LF', 'G211LF', 'G202LF', 'ZYDUS', 'PRATI', 'GAIOLA', 'CATRACA G2', 'BEB', 'B E B', 'CHECKOUT'] },
    { id: 'GALPÃO G3', keywords: ['10.0.10.18', 'G3 MATRIZ', 'G3 CCTO', 'MYLAN', 'ASPEN', 'DIPRIVAN', 'SALA MYLAN', 'G3 MD', 'RUA 25-26', 'RUA 23-24', 'RUA 21-22', 'RUA 19-20', 'RUA 17-18', 'RUA 11-12', 'RUA 9-10', 'RUA 3-4', 'RUA 5-6', 'RUA 1-2', 'ANTECAMERA ASPEN', 'CAMARA FRIA ASPEN', 'G3 ANTECAMARA', 'VPC', 'G315LF', 'G313LF', 'G311LF', 'G307LF', 'G306LF', 'G302LF', 'G305LF', 'G309LF', 'G316LF', 'G314LF', 'G312LF', 'G304LF', 'G301LF', 'G310LF', 'G308LF', 'G303LF'] }
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
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
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

    // --- REGRAS DE IP (PRIORIDADE MÁXIMA) ---
    const G5_EXCLUSIVO_IP = '201.49.121.109';
    const MERITI_IPS = ['192.168.18.93', '192.168.18.92', '192.168.18.81', '192.168.18.80', '192.168.18.30', '192.168.18.27', '200.170.152.229'];
    const G3_IPS = ['10.0.11.59', '10.0.11.16', '10.0.11.15', '10.0.11.14', '10.0.11.7', '10.0.11.9', '10.0.11.37', '10.0.11.4', '10.0.11.19', '10.0.11.21', '10.0.11.22', '10.0.11.23', '10.0.11.20', '10.0.11.26', '10.0.11.25', '10.0.11.24'];
    const G2_IPS = ['10.0.11.227', '10.0.11.33', '10.0.11.34', '10.0.11.35', '10.0.11.32', '10.0.11.31', '10.0.11.30', '10.0.11.27', '10.0.11.28', '10.0.11.12', '10.0.11.11', '10.0.11.10', '10.0.11.29', '10.0.10.214', '10.0.10.213', '10.0.10.209', '10.0.10.208'];
    const SP_IP = '177.69.119.221';
    const RJ_IP = '179.127.193.194';
    const ES_IPS = ['10.0.4.8', '149.40.19.46'];

    // 1. Checagem G5
    if (idStr.includes(G5_EXCLUSIVO_IP)) return 'GALPÃO G5';

    // 2. Checagem Meriti
    if (MERITI_IPS.some(ip => idStr.includes(ip))) return 'GALPÃO MERITI';

    // 3. Checagem G3
    if (G3_IPS.some(ip => idStr.includes(ip))) return 'GALPÃO G3';

    // 4. Checagem G2
    if (G2_IPS.some(ip => idStr.includes(ip))) return 'GALPÃO G2';
    
    // 5. Checagem SP (Galpão IP)
    if (idStr.includes(SP_IP)) return 'GALPÃO SP';

    // 6. Checagem 4ELOS RJ
    if (idStr.includes(RJ_IP)) return 'GALPÃO 4 ELOS RJ';

    // 7. Checagem 4ELOS ES
    if (ES_IPS.some(ip => idStr.includes(ip))) return 'GALPÃO 4 ELOS ES';

    // --- REGRAS DE KEYWORDS / LEGACY ---
    if (devName.includes('G5') || devName.includes('TERABYTE')) return 'GALPÃO G5';
    if (devName.includes('G10') || devName.includes('4ELOS G4 ES') || devName.includes('ELOS ES') || devName.includes('4 ELOS ES')) return 'GALPÃO 4 ELOS ES';
    if (devName.includes('SP 01') || devName.includes('SP 02') || devName.includes('SP-IP') || devName.includes('INVD 32')) return 'GALPÃO SP';
    if (devName.includes('G3') || devName.includes('MYLAN') || devName.includes('ASPEN')) return 'GALPÃO G3';
    if (devName.includes('PV0') || devName.includes('PAVUNA')) return 'GALPÃO PAVUNA';
    if (devName.includes('SJM') || devName.includes('MERITI')) return 'GALPÃO MERITI';
    if (devName.includes('4E0') || devName.includes('ELOS RJ')) return 'GALPÃO 4 ELOS RJ';
    if (devName.includes('LSP')) return 'GALPÃO LSP';
    if (devName.includes('G2')) return 'GALPÃO G2';

    const textToCheck = `${channelName} ${locName} ${modName}`.toUpperCase();
    if (textToCheck.includes('BEB') || textToCheck.includes('B E B') || textToCheck.includes('MD F') || textToCheck.includes('CHECKOUT')) return 'GALPÃO G2';
    if (textToCheck.includes('CHK0') && !devName.includes('SP') && !devName.includes('G5')) return 'GALPÃO 4 ELOS ES';
    if (textToCheck.includes('CATRACA G10') || textToCheck.includes('FRENTE RUA G10') || textToCheck.includes('EME DOCA 3 E 4')) return 'GALPÃO 4 ELOS ES';
    if (textToCheck.includes('LOLA') && !textToCheck.includes('COS')) return 'GALPÃO 4 ELOS ES';
    if (textToCheck.includes('CCOS G3') || textToCheck.includes('DIPRIVAN')) return 'GALPÃO G3';
    if (textToCheck.includes('MD 4') || textToCheck.includes('MD 5') || textToCheck.includes('MD 6') || 
        textToCheck.includes('MD 7') || textToCheck.includes('MD 8') || textToCheck.includes('MD 9') ||
        textToCheck.includes('HERSHEYS') || textToCheck.includes('AC BRAZIL') || 
        textToCheck.includes('BIOSANTE') || textToCheck.includes('BEYOUNG') || 
        textToCheck.includes('LOLA COS') || textToCheck.includes('CELLERA')) return 'GALPÃO G5';
    if (textToCheck.includes('HOSPDROGAS') || textToCheck.includes('NEURAXPHARM') || textToCheck.includes('IP0')) return 'GALPÃO SP';

    for (const unit of VALID_UNITS) {
        if (unit.keywords.some(k => textToCheck.includes(k))) return unit.id;
    }

    return rawWarehouse || 'Geral';
};

const getResponsibleByWarehouse = (warehouse: string, currentResponsible: string | null): string => {
    switch (warehouse) {
        case 'GALPÃO G2': return 'ROBSON DIAS BRITO';
        case 'GALPÃO G3': return 'EDNEI RODRIGUES SOARES';
        case 'GALPÃO G5': return 'MOACIR ANDRADE NUNES';
        case 'GALPÃO PAVUNA': case 'GALPÃO MERITI': case 'GALPÃO LSP': return 'MAURO BAPTISTA CERQUEIRA';
        case 'GALPÃO SP': return 'JOSENIAS SANTOS NASCIMENTO';
        case 'GALPÃO 4 ELOS RJ': return 'DANIEL CESAR MACHADO';
        case 'GALPÃO 4 ELOS ES': return 'SILVIA SANTOS';
        default: return currentResponsible || 'N/A';
    }
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
            return { uuid, id: id || 'N/A', name: name || 'Sem Nome', location: location || 'N/A', module: module || 'Geral', warehouse, responsible, status, channelType, lastLog } as Camera;
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
            const statusRaw = getValue(obj, ['Status On-line/Off-line', 'Status', 'STATUS', 'Estado', 'Situação', 'Conexão'])?.toUpperCase() || '';
            let status: Status = 'ONLINE';
            const offlineKeywords = ['OFFLINE', 'OFF', 'INATIVO', 'DESLIGADO', 'FALHA', 'ERRO', 'ERROR', 'DOWN', 'DISCONNECTED', '0', 'FALSE', 'NAO', 'NÃO', 'RUIM', 'PARADO'];
            if (offlineKeywords.some(k => statusRaw === k || statusRaw.includes(k))) status = 'OFFLINE';
            return { uuid, id: finalId, name: finalName, type: 'Controle de Acesso', location: location || 'N/A', warehouse, status, lastLog, latency: '-' } as AccessPoint;
        }
    }).filter(Boolean);
};

interface ImporterProps {
  onImport: (cameras: Camera[], accessPoints: AccessPoint[]) => void;
  onImportThirdParty: (workers: ProcessedWorker[], fileName: string) => void;
  onDeleteImport: (id: string) => void;
  thirdPartyImports?: ThirdPartyImport[];
  onResetCameras: () => void;
  onResetAccess: () => void;
  onResetThirdParty: () => void;
}

const Importer: React.FC<ImporterProps> = ({ onImport, onImportThirdParty, onDeleteImport, thirdPartyImports = [], onResetCameras, onResetAccess, onResetThirdParty }) => {
  const [cameraData, setCameraData] = useState<any[]>([]);
  const [accessData, setAccessData] = useState<any[]>([]);
  const [resetTarget, setResetTarget] = useState<'cameras' | 'access' | 'thirdparty' | null>(null);
  
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
                const rawName = row['Pessoa'] || row['Nome'];
                if (!rawName || typeof rawName !== 'string' || !rawName.trim()) return; 

                const rawEventType = (row['Tipo de evento'] || row['Eventos'] || '').toUpperCase();
                const rawStatus = (row['Status de Entrada/Saída'] || '').toUpperCase();
                
                // Mapeamento Inteligente de Fluxo (Entrada/Saída)
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
                if (!company) {
                   if (fullSearchString.includes('PRAYLOG')) company = 'PRAYLOG';
                   else if (fullSearchString.includes('SUPERA')) company = 'SUPERA LOG';
                   else if (fullSearchString.includes('FORMA')) company = 'FORMA';
                   else if (fullSearchString.includes('PRIMUS')) company = 'PRIMUS';
                   else if (fullSearchString.includes('MPI')) company = 'MPI';
                   else if (fullSearchString.includes('B11')) company = 'B11';
                   else if (fullSearchString.includes('MJM')) company = 'MJM';
                   else if (fullSearchString.includes('MULT')) company = 'MULT';
                }
                if (!company) company = 'NÃO IDENTIFICADO';
                const dateNormalized = parseRowDate(row);
                let timeStr = row['Hora'] || '-';
                if (typeof timeStr === 'string' && timeStr.includes(' ')) timeStr = timeStr.split(' ')[1]; 
                
                newWorkers.push({
                    id: `w-${index}-${Date.now()}`,
                    name: rawName.trim(),
                    company, unit, date: dateNormalized, time: timeStr, accessPoint: row['Ponto de Acesso'] || row['Ambiente'] || '-', eventType: finalEvent
                });
            });
            if (newWorkers.length > 0) onImportThirdParty(newWorkers, fileName);
            else alert("Nenhum dado válido de terceiros encontrado na planilha.");
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

  const executeReset = () => {
      if (!resetTarget) return;
      if (resetTarget === 'cameras') onResetCameras();
      else if (resetTarget === 'access') onResetAccess();
      else if (resetTarget === 'thirdparty') onResetThirdParty();
      setResetTarget(null);
  };

  const generatePDFReport = () => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = 210;
    const blueColor = [37, 99, 235];
    const amberColor = [245, 158, 11];
    const slateColor = [13, 17, 23];
    let y = 0;
    const addFooter = (pageNum: number) => {
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Manual ControlVision - Página ${pageNum} | Documento Restrito`, pageWidth/2, 285, { align: "center" });
    };
    doc.setFillColor(slateColor[0], slateColor[1], slateColor[2]);
    doc.rect(0, 0, 210, 297, 'F');
    doc.setDrawColor(amberColor[0], amberColor[1], amberColor[2]);
    doc.setLineWidth(2);
    doc.line(40, 70, 170, 70);
    doc.setTextColor(amberColor[0], amberColor[1], amberColor[2]);
    doc.setFontSize(60);
    doc.setFont("helvetica", "bold");
    doc.text("CONTROLVISION", 105, 110, { align: "center" });
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("Manual Operacional Padrão (POP)", 105, 135, { align: "center" });
    doc.setFontSize(14);
    doc.text("Plataforma Unificada de Monitoramento e Gestão", 105, 145, { align: "center" });
    doc.setFillColor(blueColor[0], blueColor[1], blueColor[2]);
    doc.rect(60, 160, 90, 1, 'F');
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Versão do Sistema: 3.5.0-Enterprise`, 105, 250, { align: "center" });
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 105, 260, { align: "center" });
    doc.addPage();
    y = 25;
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("1. ARQUITETURA E PERFIS DE ACESSO", margin, y);
    y += 15;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const intro = "O ControlVision é um ecossistema desenvolvido para centralizar a segurança patrimonial e a gestão de fluxo de terceiros. O acesso é restrito e baseado em três níveis de permissão hierárquica:";
    doc.text(doc.splitTextToSize(intro, 170), margin, y);
    y += 15;
    const roles = [
        { t: "Administrador (Admin)", d: "Acesso total. Gestão de usuários, limpeza de banco, configuração de fontes de dados e auditoria de feedbacks." },
        { t: "Gestor (Manager)", d: "Visão analítica. Restrito aos galpões permitidos no cadastro. Pode gerar relatórios de acesso e visualizar dashboards de disponibilidade." },
        { t: "Operador (Viewer)", d: "Uso diário. Focado no monitoramento de status, registro de plantão e execução de tarefas delegadas pela supervisão." }
    ];
    roles.forEach(r => {
        doc.setFont("helvetica", "bold");
        doc.text(r.t, margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const dr = doc.splitTextToSize(r.d, 160);
        doc.text(dr, margin + 5, y);
        y += (dr.length * 5) + 5;
    });
    doc.setDrawColor(200);
    doc.rect(margin, y, 170, 40);
    doc.text("Fluxo de Dados", 105, y + 10, { align: "center" });
    doc.line(margin + 10, y + 25, 200, y + 25);
    doc.text("Admin -> Gestor -> Operador", 105, y + 33, { align: "center" });
    addFooter(2);
    doc.save("POP_COMPLETO_ControlVision_3.5.pdf");
  };

  return (
    <div className="space-y-8 animate-fade-in mx-auto pb-20 max-w-6xl">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Database size={160} className="text-white" />
            </div>
            <div className="relative z-10">
                <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-3 uppercase tracking-tighter italic">
                    <div className="p-2 bg-emerald-500 rounded-lg shadow-lg shadow-emerald-900/40"><Power size={28} className="text-white" /></div>
                    Fonte de Dados
                </h2>
                <p className="text-slate-400 text-sm max-w-lg leading-relaxed">
                    Interface central de sincronismo. Carregue as planilhas oficiais extraídas do IVMS/HikCentral para atualizar o ecossistema seguindo as regras da tabela mestra de canais.
                </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto relative z-10">
                <button onClick={handleProcess} className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-12 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-900/40 transition-all font-black uppercase text-xs tracking-widest active:scale-95 group">
                    <Save size={20} className="group-hover:scale-110 transition-transform" /> 
                    ATUALIZAR SISTEMA
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CARD CÂMERAS */}
            <div className="bg-slate-900 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all rounded-2xl flex flex-col items-center justify-center gap-4 group min-h-[250px] shadow-lg relative p-8">
                <div onClick={() => cameraInputRef.current?.click()} className="flex flex-col items-center gap-4 cursor-pointer w-full">
                    <div className="p-5 bg-slate-800 rounded-full group-hover:bg-emerald-500/20 transition-all group-hover:scale-110 shadow-inner"><Video className="w-10 h-10 text-slate-400 group-hover:text-emerald-500" /></div>
                    <div className="text-center"><h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">Câmeras / Alarmes</h3><p className="text-slate-500 text-xs mt-2 font-medium">{cameraData.length > 0 ? `${cameraData.length} linhas em espera` : 'Selecionar .xlsx oficial'}</p></div>
                    <input type="file" accept=".xlsx, .xls" ref={cameraInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'camera')} />
                    {cameraData.length > 0 && <div className="mt-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-full border border-emerald-500/20 animate-pulse uppercase">Arquivo Pronto</div>}
                </div>
                <button onClick={() => setResetTarget('cameras')} className="mt-4 px-4 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <RotateCcw size={12} /> Limpar
                </button>
            </div>

            {/* CARD ACESSO */}
            <div className="bg-slate-900 border-2 border-dashed border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all rounded-2xl flex flex-col items-center justify-center gap-4 group min-h-[250px] shadow-lg relative p-8">
                <div onClick={() => accessInputRef.current?.click()} className="flex flex-col items-center gap-4 cursor-pointer w-full">
                    <div className="p-5 bg-slate-800 rounded-full group-hover:bg-blue-500/20 transition-all group-hover:scale-110 shadow-inner"><DoorClosed className="w-10 h-10 text-slate-400 group-hover:text-blue-500" /></div>
                    <div className="text-center"><h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">Controle de Acesso</h3><p className="text-slate-500 text-xs mt-2 font-medium">{accessData.length > 0 ? `${accessData.length} linhas em espera` : 'Selecionar .xlsx oficial'}</p></div>
                    <input type="file" accept=".xlsx, .xls" ref={accessInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'access')} />
                    {accessData.length > 0 && <div className="mt-2 px-3 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-black rounded-full border border-blue-500/20 animate-pulse uppercase">Arquivo Pronto</div>}
                </div>
                <button onClick={() => setResetTarget('access')} className="mt-4 px-4 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <RotateCcw size={12} /> Limpar
                </button>
            </div>

            {/* CARD TERCEIRIZADOS */}
            <div className="bg-slate-900 border-2 border-dashed border-slate-700 hover:border-amber-500/50 hover:bg-slate-800/50 transition-all rounded-2xl flex flex-col items-center justify-center gap-4 group min-h-[250px] shadow-lg relative p-8">
                <div onClick={() => thirdPartyInputRef.current?.click()} className="flex flex-col items-center gap-4 cursor-pointer w-full">
                    <div className="p-5 bg-slate-800 rounded-full group-hover:bg-amber-500/20 transition-all group-hover:scale-110 shadow-inner"><Briefcase className="w-10 h-10 text-slate-400 group-hover:text-amber-500" /></div>
                    <div className="text-center"><h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors uppercase tracking-tight">Terceirizados</h3><p className="text-slate-500 text-xs mt-2 font-medium">Acumular ao histórico de fluxo</p></div>
                    <input type="file" accept=".xlsx, .xls" ref={thirdPartyInputRef} className="hidden" onChange={handleThirdPartyUpload} />
                    <div className="mt-2 px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black rounded-full border border-amber-500/20 uppercase tracking-widest">Acumulativo</div>
                </div>
                <button onClick={() => setResetTarget('thirdparty')} className="mt-4 px-4 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <RotateCcw size={12} /> Limpar
                </button>
            </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                <h3 className="text-white font-bold flex items-center gap-3 text-lg">
                    <Clock size={22} className="text-amber-500" /> 
                    Histórico de Importações Recentes
                </h3>
                <span className="text-[10px] font-black bg-slate-800 text-slate-400 px-3 py-1.5 rounded-full border border-slate-700 uppercase tracking-widest">{thirdPartyImports.length} Arquivos Armazenados</span>
            </div>
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {thirdPartyImports.length === 0 ? (
                    <div className="p-20 text-center text-slate-600 flex flex-col items-center gap-3">
                        <Database size={48} className="opacity-20" />
                        <p className="italic text-sm font-medium">Nenhum histórico de importação encontrado.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest sticky top-0 z-10 border-b border-slate-800">
                            <tr>
                                <th className="p-5">Arquivo</th>
                                <th className="p-5">Data do Sincronismo</th>
                                <th className="p-5 text-center">Volume Registros</th>
                                <th className="p-5 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                            {thirdPartyImports.map((imp) => (
                                <tr key={imp.id} className="hover:bg-slate-800/40 transition-colors group">
                                    <td className="p-5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/10 text-blue-500 rounded"><FileSpreadsheet size={18} /></div>
                                            <span className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{imp.fileName}</span>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-400">{new Date(imp.importedAt).toLocaleDateString('pt-BR')}</span>
                                            <span className="text-[10px] text-slate-600 font-mono">{new Date(imp.importedAt).toLocaleTimeString('pt-BR')}</span>
                                        </div>
                                    </td>
                                    <td className="p-5 text-center">
                                        <span className="bg-slate-950 px-3 py-1 rounded-full border border-slate-800 text-emerald-400 font-mono font-bold">{imp.count}</span>
                                    </td>
                                    <td className="p-5 text-right">
                                        <button onClick={() => onDeleteImport(imp.id)} className="p-2.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all" title="Remover Histórico">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>

        {/* MODAL DE CONFIRMAÇÃO DINÂMICO */}
        {resetTarget && (
            <div className="fixed inset-0 z-150 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
                    <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                        <RotateCcw className="text-rose-500 w-10 h-10 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Apagar Dados?</h3>
                        <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                            Esta ação irá remover permanentemente a base de <strong>{resetTarget === 'cameras' ? 'Câmeras e Alarmes' : resetTarget === 'access' ? 'Controle de Acesso' : 'Histórico de Terceirizados'}</strong>.
                        </p>
                    </div>
                    <div className="flex gap-4 pt-2">
                        <button onClick={() => setResetTarget(null)} className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black uppercase text-xs tracking-widest transition-all">Cancelar</button>
                        <button onClick={executeReset} className="flex-1 px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-rose-900/40 transition-all active:scale-95">Sim, Limpar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Importer;
