
import React, { useRef, useState } from 'react';
import { FileSpreadsheet, RotateCcw, AlertCircle, Power, Upload, Video, DoorClosed, Save, Briefcase, FileUp, AlertTriangle, X, Trash2, Clock, CheckCircle2, FileText, Download, Shield, Info, ArrowRight, Table, Database, Check, Layers } from 'lucide-react';
import { Camera, AccessPoint, Status, ProcessedWorker, ThirdPartyImport, ChannelType } from '../types';
import { jsPDF } from "jspdf";

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
            const name = getValue(obj, ['Nome do dispositivo', 'Nome do Canal', 'NOME', 'Nome_Camera', 'Nome', 'Camera']);
            const id = getValue(obj, ['IP do Dispositivo', 'ID_Camera', 'ID', 'Codigo', 'Número']);
            const location = getValue(obj, ['Nome org', 'Localização', 'Localizacao', 'Local']);
            const module = getValue(obj, ['Módulo', 'Modulo', 'MODULO', 'Setor']);
            let warehouseRaw = getValue(obj, ['Galpão', 'Galpao', 'Warehouse']);
            const warehouse = normalizeWarehouse(warehouseRaw, location, module, name);
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
            const name = getValue(obj, ['Nome do dispositivo', 'Nome', 'Name', 'Dispositivo', 'Equipamento']);
            const id = getValue(obj, ['IP', 'ID', 'Id', 'Cod', 'Código', 'Serial', 'IP do Dispositivo']);
            const location = getValue(obj, ['Nome org', 'Local', 'Location', 'Localização', 'Setor']);
            let warehouseRaw = getValue(obj, ['Galpão', 'Galpao', 'Warehouse']);
            
            const lastLogRaw = getValue(obj, ['Última alteraçãoStatus', 'Última alteração Status', 'UltimoRegistro', 'LastLog', 'Data']);
            const lastLog = formatExcelDate(lastLogRaw);
            
            if (!name && !id) return null;
            const finalName = name || id || 'Dispositivo Sem Nome';
            const finalId = id || finalName; 
            const warehouse = normalizeWarehouse(warehouseRaw, location, null, name);
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
  onReset: () => void;
}

const Importer: React.FC<ImporterProps> = ({ onImport, onImportThirdParty, onDeleteImport, thirdPartyImports = [], onReset }) => {
  const [cameraData, setCameraData] = useState<any[]>([]);
  const [accessData, setAccessData] = useState<any[]>([]);
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

                const eventType = (row['Tipo de evento'] || row['Eventos'] || '').toUpperCase();
                const status = (row['Status de Entrada/Saída'] || '').toUpperCase();
                const isEntry = eventType.includes('ENTRADA') || eventType.includes('DESBLOQUEIO') || eventType.includes('ACESSO LIBERADO') || status.includes('ENTRADA');

                if (!isEntry) return;
                const locationString = [row['Ambiente'], row['Ponto de Acesso'], row['Tipo de ponto de acesso'], row['Local'], row['Nome do dispositivo'], row['Device']].join(' ').toUpperCase();
                const unit = detectUnit(locationString);
                if (!unit) return; 

                const fullSearchString = [locationString, row['Grupo de pessoas'], row['Pessoa'], row['Nome']].join(' ').toUpperCase();
                let company = row['Grupo de pessoas'] ? row['Grupo de pessoas'].trim().toUpperCase() : detectCompany(fullSearchString);
                if (!company) company = 'NÃO IDENTIFICADO';

                const dateNormalized = parseRowDate(row);
                let timeStr = row['Hora'] || '-';
                if (typeof timeStr === 'string' && timeStr.includes(' ')) timeStr = timeStr.split(' ')[1]; 

                newWorkers.push({
                    id: `w-${index}-${Date.now()}`,
                    name: rawName.trim(),
                    company, unit, date: dateNormalized, time: timeStr, accessPoint: row['Ponto de Acesso'] || row['Ambiente'] || '-', eventType: eventType
                });
            });

            if (newWorkers.length > 0) onImportThirdParty(newWorkers, fileName);
            else alert("Nenhum dado válido encontrado.");
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

  // --- FUNÇÃO PARA GERAR O MANUAL PDF (POP) COMPLETO ---
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

    // --- PÁGINA 1: CAPA PROFISSIONAL ---
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

    // --- PÁGINA 2: INTRODUÇÃO E PERFIS ---
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

    // Diagrama Perfis
    doc.setDrawColor(200);
    doc.rect(margin, y, 170, 40);
    doc.text("Fluxo de Dados", 105, y + 10, { align: "center" });
    doc.line(margin + 10, y + 25, 200, y + 25);
    doc.text("Admin -> Gestor -> Operador", 105, y + 33, { align: "center" });
    addFooter(2);

    // --- PÁGINA 3: DASHBOARD E MONITORAMENTO ---
    doc.addPage();
    y = 25;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("2. DASHBOARD E MONITORAMENTO", margin, y);
    y += 15;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("2.1 Painel de KPIs (Indicadores)", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    const dash = "O Dashboard traduz dados brutos em indicadores em tempo real. As cores indicam a saúde do sistema: Verde (Ótimo), Azul (Normal), Amarelo (Regular) e Vermelho (Crítico).";
    doc.text(doc.splitTextToSize(dash, 170), margin, y);
    y += 15;

    doc.setFont("helvetica", "bold");
    doc.text("2.2 Gestão de Ocorrências (Offline)", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text("Sempre que um dispositivo cai, o sistema o move para a 'Lista de Incidentes'. Operadores devem inserir o número do chamado e a justificativa técnica.", margin, y);
    y += 10;

    // Representação Visual do Status
    doc.setFillColor(232, 245, 233); doc.rect(margin, y, 50, 10, 'F'); doc.setTextColor(0, 100, 0); doc.text("ONLINE", margin + 15, y + 7);
    doc.setFillColor(255, 235, 238); doc.rect(margin + 60, y, 50, 10, 'F'); doc.setTextColor(150, 0, 0); doc.text("OFFLINE", margin + 75, y + 7);
    y += 20;

    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.text("2.3 Monitoramento Individual", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text("Nas abas Câmeras, Alarmes e Acesso, o usuário pode filtrar por Galpão ou Módulo. Admins podem forçar o status manualmente via 'Flags' de sincronismo.", margin, y);
    addFooter(3);

    // --- PÁGINA 4: GESTÃO DE FLUXO E TERCEIROS ---
    doc.addPage();
    y = 25;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("3. GESTÃO DE FLUXO (TERCEIRIZADOS)", margin, y);
    y += 15;
    doc.setFontSize(10);
    doc.text("Este módulo gerencia exclusivamente empresas como B11, MULT, MPI, etc.", margin, y);
    y += 10;

    const sections = [
        { t: "Status Geral", d: "Exibe o volume nominal de pessoas presentes por unidade. Inclui filtros de data retroativa para auditoria de presença." },
        { t: "Mapa de Calor (Heatmap)", d: "Análise estatística da densidade de acessos por hora do dia e dia da semana. Essencial para identificar picos de carga em portarias." },
        { t: "Relatórios Exportáveis", d: "Permite selecionar acessos específicos de uma pessoa e gerar uma mensagem formatada para envio imediato via WhatsApp ou E-mail." }
    ];

    sections.forEach(s => {
        doc.setFont("helvetica", "bold");
        doc.text(s.t, margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.text(doc.splitTextToSize(s.d, 165), margin + 5, y);
        y += 15;
    });

    // Gráfico esquemático Heatmap
    doc.setDrawColor(200);
    for(let i=0; i<7; i++) doc.rect(margin + (i*15), y, 14, 14);
    doc.setFontSize(8);
    doc.text("Exemplo Visual: Grade de Acessos", margin, y + 20);
    addFooter(4);

    // --- PÁGINA 5: OPERACIONAL E TAREFAS ---
    doc.addPage();
    y = 25;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("4. MÓDULO OPERACIONAL", margin, y);
    y += 15;
    doc.setFontSize(10);
    doc.text("4.1 Sistema de Tarefas Delegadas", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text("Supervisores criam tarefas anexando prazos e operadores específicos. O sistema notifica o operador com sinal sonoro.", margin, y);
    y += 10;
    doc.text("O operador deve obrigatoriamente:", margin, y);
    y += 6;
    doc.text("• Anexar evidência fotográfica (Checklist)", margin + 5, y); y += 5;
    doc.text("• Escrever o relatório de resolução", margin + 5, y); y += 5;
    doc.text("• Marcar como Concluída para arquivamento", margin + 5, y); y += 15;

    doc.setFont("helvetica", "bold");
    doc.text("4.2 Relatório de Plantão", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text("Substitui o livro de ocorrências físico. Registros imutáveis com data, hora e autor, visíveis para toda a equipe logada.", margin, y);
    addFooter(5);

    // --- PÁGINA 6: CADASTRO E OCR ---
    doc.addPage();
    y = 25;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("5. CENTRAL DE CADASTRO E IA", margin, y);
    y += 15;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("5.1 Motor de Extração OCR (Gemini AI)", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text("O sistema utiliza Inteligência Artificial para ler listas de presença físicas via câmera do celular ou upload de imagem. A IA separa automaticamente Nomes e CPFs.", margin, y);
    y += 10;
    
    doc.setFont("helvetica", "bold");
    doc.text("5.2 Gestão de Documentos", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text("Controle de vencimentos de AVCB, Alvarás e Licenças. O sistema dispara alertas visuais no cabeçalho quando a data de validade está próxima.", margin, y);
    addFooter(6);

    // --- PÁGINA 7: FONTE DE DADOS E SINCRONISMO ---
    doc.addPage();
    y = 25;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("6. FONTE DE DADOS (CORE)", margin, y);
    y += 15;
    doc.setFontSize(10);
    const coreDesc = "Esta aba é o cérebro do sistema. Ela recebe exportações em Excel (.xlsx) de sistemas externos (IVMS-4200 / HikCentral) e as converte em dados relacionais.";
    doc.text(doc.splitTextToSize(coreDesc, 170), margin, y);
    y += 15;

    doc.setFont("helvetica", "bold");
    doc.text("Regras de Mapeamento Automático:", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text("• 'G216LF' -> Identificado automaticamente como GALPÃO G2.", margin + 5, y); y += 5;
    doc.text("• 'SJM' / 'MERITI' -> Unificados sob a bandeira MERITI.", margin + 5, y); y += 5;
    doc.text("• 'Última alteraçãoStatus' -> Atribui o contador de tempo de queda.", margin + 5, y); y += 15;

    doc.setFillColor(255, 0, 0, 0.1); doc.rect(margin, y, 170, 20, 'F');
    doc.setTextColor(150, 0, 0); doc.setFont("helvetica", "bold");
    doc.text("AVISO DE SEGURANÇA: O botão 'Limpar Banco' é irreversível.", margin + 5, y + 12);
    addFooter(7);

    // --- PÁGINA 8: COMUNICAÇÃO E FEEDBACK ---
    doc.addPage();
    y = 25;
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("7. COMUNICAÇÃO INTERNA", margin, y);
    y += 15;
    doc.setFontSize(10);
    doc.text("7.1 Central de Mensagens", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text("O Chat permite troca de mensagens em tempo real com confirmação de leitura. Membros podem fixar mensagens importantes e anexar arquivos técnicos.", margin, y);
    y += 15;

    doc.setFont("helvetica", "bold");
    doc.text("7.2 Melhoria Contínua", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text("Qualquer usuário pode enviar feedbacks (Bug, Sugestão ou Elogio). Administradores recebem alertas imediatos e podem responder diretamente ao usuário.", margin, y);
    addFooter(8);

    // --- PÁGINA 9: CHECKLIST DE MANUTENÇÃO ---
    doc.addPage();
    y = 25;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("8. CHECKLIST DE MANUTENÇÃO", margin, y);
    y += 15;
    doc.setFontSize(10);
    doc.text("AÇÕES RECOMENDADAS DIARIAMENTE:", margin, y);
    y += 10;
    const actions = [
        "1. Realizar o Sincronismo de Câmeras/Acessos via Fonte de Dados.",
        "2. Conferir a 'Lista de Incidentes' e atualizar chamados pendentes.",
        "3. Validar se há novas tarefas atribuídas pela supervisão.",
        "4. Registrar o Relatório de Plantão ao final do turno.",
        "5. Verificar notificações de documentos vencidos."
    ];
    actions.forEach(a => { doc.text(a, margin + 5, y); y += 8; });
    addFooter(9);

    // --- PÁGINA 10: CONCLUSÃO E CONTATOS ---
    doc.addPage();
    y = 25;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("9. DISPOSIÇÕES FINAIS", margin, y);
    y += 15;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const fin = "Este documento serve como guia mestre para todos os colaboradores. O uso correto das ferramentas garante a segurança das unidades e a eficiência da operação ControlVision.";
    doc.text(doc.splitTextToSize(fin, 170), margin, y);
    y += 20;

    doc.setFont("helvetica", "bold");
    doc.text("Suporte Técnico:", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text("Em caso de falha no sistema ou erro de OCR, utilize a aba 'Feedback' para abertura imediata de ticket com o time de engenharia.", margin, y);

    y += 40;
    doc.setDrawColor(amberColor[0], amberColor[1], amberColor[2]);
    doc.line(70, y, 140, y);
    doc.setFontSize(12);
    doc.text("EQUIPE DE ENGENHARIA CCOS", 105, y + 10, { align: "center" });
    doc.setFontSize(8);
    doc.text("Documento Classificado como Estritamente Confidencial", 105, y + 18, { align: "center" });
    addFooter(10);

    doc.save("POP_COMPLETO_ControlVision_3.5.pdf");
  };

  return (
    <div className="space-y-8 animate-fade-in mx-auto pb-20 max-w-6xl">
        {/* HEADER SECTION */}
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
                    Interface central de sincronismo. Carregue as planilhas oficiais extraídas do IVMS/HikCentral para atualizar o ecossistema de monitoramento.
                </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto relative z-10">
                <button onClick={handleProcess} className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-900/40 transition-all font-black uppercase text-xs tracking-widest active:scale-95 group">
                    <Save size={20} className="group-hover:scale-110 transition-transform" /> 
                    ATUALIZAR SISTEMA
                </button>
                <button onClick={() => setShowResetConfirm(true)} className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all text-xs font-black uppercase tracking-widest">
                    <RotateCcw size={18} /> Limpar Banco
                </button>
            </div>
        </div>

        {/* UPLOAD CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button onClick={() => cameraInputRef.current?.click()} className="w-full bg-slate-900 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all rounded-2xl p-8 flex flex-col items-center justify-center gap-4 group min-h-[220px] shadow-lg">
                <div className="p-5 bg-slate-800 rounded-full group-hover:bg-emerald-500/20 transition-all group-hover:scale-110 shadow-inner"><Video className="w-10 h-10 text-slate-400 group-hover:text-emerald-500" /></div>
                <div className="text-center"><h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">Câmeras / Alarmes</h3><p className="text-slate-500 text-xs mt-2 font-medium">{cameraData.length > 0 ? `${cameraData.length} linhas em espera` : 'Selecionar .xlsx oficial'}</p></div>
                <input type="file" accept=".xlsx, .xls" ref={cameraInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'camera')} />
                {cameraData.length > 0 && <div className="mt-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-full border border-emerald-500/20 animate-pulse uppercase">Arquivo Pronto</div>}
            </button>

            <button onClick={() => accessInputRef.current?.click()} className="w-full bg-slate-900 border-2 border-dashed border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all rounded-2xl p-8 flex flex-col items-center justify-center gap-4 group min-h-[220px] shadow-lg">
                <div className="p-5 bg-slate-800 rounded-full group-hover:bg-blue-500/20 transition-all group-hover:scale-110 shadow-inner"><DoorClosed className="w-10 h-10 text-slate-400 group-hover:text-blue-500" /></div>
                <div className="text-center"><h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">Controle de Acesso</h3><p className="text-slate-500 text-xs mt-2 font-medium">{accessData.length > 0 ? `${accessData.length} linhas em espera` : 'Selecionar .xlsx oficial'}</p></div>
                <input type="file" accept=".xlsx, .xls" ref={accessInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'access')} />
                {accessData.length > 0 && <div className="mt-2 px-3 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-black rounded-full border border-blue-500/20 animate-pulse uppercase">Arquivo Pronto</div>}
            </button>

            <button onClick={() => thirdPartyInputRef.current?.click()} className="w-full bg-slate-900 border-2 border-dashed border-slate-700 hover:border-amber-500/50 hover:bg-slate-800/50 transition-all rounded-2xl p-8 flex flex-col items-center justify-center gap-4 group min-h-[220px] shadow-lg">
                <div className="p-5 bg-slate-800 rounded-full group-hover:bg-amber-500/20 transition-all group-hover:scale-110 shadow-inner"><Briefcase className="w-10 h-10 text-slate-400 group-hover:text-amber-500" /></div>
                <div className="text-center"><h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors uppercase tracking-tight">Terceirizados</h3><p className="text-slate-500 text-xs mt-2 font-medium">Acumular ao histórico de fluxo</p></div>
                <input type="file" accept=".xlsx, .xls" ref={thirdPartyInputRef} className="hidden" onChange={handleThirdPartyUpload} />
                <div className="mt-2 px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black rounded-full border border-amber-500/20 uppercase tracking-widest">Acumulativo</div>
            </button>
        </div>

        {/* HISTORY SECTION */}
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
                        <AlertTriangle size={48} className="opacity-20" />
                        <p className="italic text-sm font-medium">Nenhum histórico de importação encontrado no banco de dados.</p>
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

        {/* DETAILED MANUAL SECTION - NOW AT THE BOTTOM */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-1 animate-fade-in">
             <div className="bg-[#0a0c10] rounded-[22px] overflow-hidden">
                <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h3 className="text-2xl font-black text-white flex items-center gap-3 italic uppercase tracking-tighter">
                            <FileText className="text-blue-500" size={28} />
                            MANUAL MESTRE OPERACIONAL (POP)
                        </h3>
                        <p className="text-slate-500 text-sm mt-1">Gere o documento oficial completo com todas as diretrizes de uso do sistema.</p>
                    </div>
                    <button 
                        onClick={generatePDFReport}
                        className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-2xl shadow-blue-900/40 transition-all font-black text-sm uppercase tracking-widest active:scale-95 group"
                    >
                        <Download size={22} className="group-hover:translate-y-0.5 transition-transform" /> 
                        BAIXAR POP COMPLETO (PDF)
                    </button>
                </div>

                <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Visual Guide: Step by Step */}
                    <div className="space-y-8">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 mb-6">
                            <Layers size={14} /> Ciclo de Operação ControlVision
                        </h4>
                        
                        <div className="relative space-y-12 pl-8 border-l-2 border-slate-800/50 ml-4">
                            {[
                                { icon: <Table className="text-blue-500" />, title: "Extração de Dados", desc: "Acesse o IVMS ou HikCentral. Exportar lista de câmeras e acessos para Excel (.xlsx)." },
                                { icon: <Upload className="text-emerald-500" />, title: "Carregamento Web", desc: "Arraste os arquivos para os cards acima. O sistema fará o 'parsing' instantâneo na memória local." },
                                { icon: <Database className="text-amber-500" />, title: "Mapeamento Inteligente", desc: "Ao clicar em Atualizar, o CCOS normaliza os nomes dos galpões e atribui os responsáveis técnicos." },
                                { icon: <Check className="text-indigo-500" />, title: "Deploy em Produção", desc: "Os novos status são propagados para todos os usuários conectados em tempo real via Firebase." }
                            ].map((step, idx) => (
                                <div key={idx} className="relative group">
                                    <div className="absolute -left-12 top-0 w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center z-10 shadow-lg transition-transform group-hover:scale-110">
                                        {step.icon}
                                    </div>
                                    <h5 className="text-white font-bold text-sm mb-1 uppercase tracking-tight">{step.title}</h5>
                                    <p className="text-slate-500 text-xs leading-relaxed">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tech Details / Column Info */}
                    <div className="bg-slate-950/50 rounded-2xl border border-slate-800 p-8 flex flex-col gap-6">
                        <h4 className="text-xs font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2">
                             <Info size={14} /> Notas Técnicas de Versão
                        </h4>
                        
                        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 space-y-4">
                            <p className="text-[11px] text-slate-400 leading-relaxed italic">
                                "O manual em anexo detalha o funcionamento de todas as 8 abas do sistema, incluindo o motor de OCR para listas físicas e a gestão de tarefas da supervisão."
                            </p>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                                    <span className="block text-[10px] text-slate-600 font-bold uppercase mb-1">Mapeamento Auto</span>
                                    <span className="text-[10px] text-emerald-500 font-black">UNIDADE MERITI</span>
                                    <span className="block text-[8px] text-slate-500">Slug: SJM, MERITI, EXPRESSA</span>
                                </div>
                                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                                    <span className="block text-[10px] text-slate-600 font-bold uppercase mb-1">Mapeamento Auto</span>
                                    <span className="text-[10px] text-blue-500 font-black">SP (ITAPEVI)</span>
                                    <span className="block text-[8px] text-slate-500">Slug: IP0, SP, ITAPEVI</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                             <div className="flex items-center gap-3 p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                                 <AlertTriangle className="text-rose-500 shrink-0" size={20} />
                                 <p className="text-[11px] text-rose-300 leading-tight">
                                     <strong>Aviso de Auditoria:</strong> O manual descreve as permissões de cada perfil (Admin, Gestor e Operador). Recomendamos a leitura obrigatória para novos colaboradores.
                                 </p>
                             </div>
                        </div>
                    </div>
                </div>
             </div>
        </div>

        {/* MODAL DE CONFIRMAÇÃO DE RESET */}
        {showResetConfirm && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
                    <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/20 mx-auto shadow-lg shadow-rose-900/20">
                        <AlertTriangle className="text-rose-500 w-10 h-10 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Apagar Banco de Dados?</h3>
                        <p className="text-slate-400 text-sm mt-3 leading-relaxed">Esta ação irá remover permanentemente todas as memórias de câmeras, acessos e históricos de importação. <strong>Não pode ser desfeito.</strong></p>
                    </div>
                    <div className="flex gap-4 pt-2">
                        <button onClick={() => setShowResetConfirm(false)} className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black uppercase text-xs tracking-widest transition-all">Cancelar</button>
                        <button onClick={() => { onReset(); setShowResetConfirm(false); }} className="flex-1 px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-rose-900/40 transition-all active:scale-95">Sim, Limpar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Importer;
