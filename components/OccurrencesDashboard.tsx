import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Upload, FileSpreadsheet, Search, AlertCircle, CheckCircle2, Clock, BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon, Calendar, Users, Briefcase, AlertTriangle, Timer, Filter, Download, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, X, Paperclip, Image as ImageIcon, Trash2, ExternalLink } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Occurrence, User } from '../types';
import { monitoringService } from '../services/monitoring';

interface OccurrencesDashboardProps {
    occurrencesData: any[];
    currentUser: User;
    type?: 'occurrence' | 'request';
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

const ExpandedDetails = ({ text, id }: { text: string, id: string }) => {
    const details = useMemo(() => {
        if (!text) return null;
        
        const extract = (key: string, nextKeys: string[]) => {
            const keyIndex = text.toLowerCase().indexOf(key.toLowerCase());
            if (keyIndex === -1) return '';
            
            const start = keyIndex + key.length;
            let end = text.length;
            nextKeys.forEach(nk => {
                const nkIndex = text.toLowerCase().indexOf(nk.toLowerCase(), start);
                if (nkIndex !== -1 && nkIndex < end) {
                    end = nkIndex;
                }
            });
            
            let val = text.substring(start, end).trim();
            if (val.startsWith(':')) val = val.substring(1).trim();
            return val;
        };

        const keys = ['Empresa', 'Cliente', 'Tipo de Ocorrência', 'Descrição da ocorrência', 'Desconformidade', 'Data', 'Horário', 'Imagens', 'Anexos'];
        const result: Record<string, string> = {};
        
        keys.forEach(k => {
            const otherKeys = keys.filter(ok => ok !== k);
            const val = extract(k, otherKeys);
            if (val) result[k] = val;
        });

        if (Object.keys(result).length === 0) {
            return { 'Detalhes': text };
        }
        return result;
    }, [text]);

    if (!details) return <div className="text-slate-500 text-sm p-4">Sem detalhes disponíveis.</div>;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-start">
                <a 
                    href={`https://unielo.bitrix24.com.br/company/personal/user/1021/tasks/task/view/${id}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/30"
                >
                    <ExternalLink size={16} />
                    Abrir Ocorrência no Bitrix24
                </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                {Object.entries(details).map(([key, value]) => {
                    const isAttachment = key === 'Imagens' || key === 'Anexos';
                    
                    return (
                        <div key={key} className={`${key === 'Descrição da ocorrência' || key === 'Detalhes' || isAttachment ? 'md:col-span-2' : ''}`}>
                            <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
                                {isAttachment ? <Paperclip size={12} /> : null}
                                {key}
                            </span>
                            {isAttachment ? (
                                <div className="flex flex-col gap-2 mt-2">
                                    {value.split(',').map((item, idx) => {
                                        const cleanItem = item.trim();
                                        if (!cleanItem) return null;
                                        const isImage = cleanItem.toLowerCase().endsWith('.jpg') || cleanItem.toLowerCase().endsWith('.png') || cleanItem.toLowerCase().endsWith('.jpeg');
                                        return (
                                            <div key={idx} className="flex items-center gap-2 bg-slate-800/50 p-2 rounded border border-slate-700/50 text-slate-300 text-xs">
                                                {isImage ? <ImageIcon size={14} className="text-blue-400" /> : <Paperclip size={14} className="text-slate-400" />}
                                                <span className="break-all">{cleanItem}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <span className="text-slate-200 whitespace-pre-wrap">{value}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const OccurrencesDashboard: React.FC<OccurrencesDashboardProps> = ({ occurrencesData, currentUser, type = 'occurrence' }) => {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [showImportsModal, setShowImportsModal] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    
    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [responsavelFilter, setResponsavelFilter] = useState('ALL');
    const [tipoOcorrenciaFilter, setTipoOcorrenciaFilter] = useState('ALL');
    const [empresaFilter, setEmpresaFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [clienteFilter, setClienteFilter] = useState('ALL');

    // Interactive Chart Filters
    const [chartStatusFilter, setChartStatusFilter] = useState<string | null>(null);
    const [chartResponsavelFilter, setChartResponsavelFilter] = useState<string | null>(null);
    const [selectedOccurrencesForBox, setSelectedOccurrencesForBox] = useState<Occurrence[] | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, startDate, endDate, responsavelFilter, tipoOcorrenciaFilter, empresaFilter, statusFilter, clienteFilter, chartStatusFilter, chartResponsavelFilter]);

    // Extract all occurrences
    const allOccurrences = useMemo(() => {
        if (!Array.isArray(occurrencesData)) return [];
        let list: Occurrence[] = [];
        occurrencesData.forEach(imp => {
            if (imp.occurrences) {
                list = [...list, ...imp.occurrences];
            }
        });
        return list;
    }, [occurrencesData]);

    // Unique values for filters
    const uniqueResponsaveis = useMemo(() => Array.from(new Set(allOccurrences.map(o => o.responsaveis).filter(Boolean))), [allOccurrences]);
    const uniqueTiposOcorrencia = useMemo(() => Array.from(new Set(allOccurrences.map(o => o.tipoOcorrencia).filter(Boolean))), [allOccurrences]);
    const uniqueEmpresas = useMemo(() => Array.from(new Set(allOccurrences.map(o => o.empresa).filter(Boolean))), [allOccurrences]);
    const uniqueStatus = useMemo(() => Array.from(new Set(allOccurrences.map(o => o.status).filter(Boolean))), [allOccurrences]);
    const uniqueClientes = useMemo(() => Array.from(new Set(allOccurrences.map(o => o.cliente).filter(Boolean))), [allOccurrences]);

    const parseDate = (dateStr?: string) => {
        if (!dateStr) return null;
        // Handle DD/MM/YYYY HH:mm:ss
        const brMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
        if (brMatch) {
            return new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]), Number(brMatch[4] || 0), Number(brMatch[5] || 0), Number(brMatch[6] || 0));
        }
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
    };

    const isAtrasada = (o: Occurrence) => {
        if (o.status === 'Concluída' || o.status?.toLowerCase().includes('fechad')) return false;
        if (!o.prazoFinal) return false;
        const prazo = parseDate(o.prazoFinal);
        return prazo ? prazo < new Date() : false;
    };

    const isVencendoHoje = (o: Occurrence) => {
        if (o.status === 'Concluída' || o.status?.toLowerCase().includes('fechad')) return false;
        if (!o.prazoFinal) return false;
        const prazo = parseDate(o.prazoFinal);
        const hoje = new Date();
        return prazo ? prazo.toDateString() === hoje.toDateString() : false;
    };

    const isParada = (o: Occurrence) => {
        if (o.status === 'Concluída' || o.status?.toLowerCase().includes('fechad')) return false;
        const modDate = parseDate(o.modificadaEm || o.criadoEm);
        if (!modDate) return false;
        const diffDays = (new Date().getTime() - modDate.getTime()) / (1000 * 3600 * 24);
        return diffDays > 5; // 5 dias sem modificação
    };

    const filteredOccurrences = useMemo(() => {
        return allOccurrences.filter(o => {
            const matchesSearch = o.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  o.tarefa?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesResp = responsavelFilter === 'ALL' || o.responsaveis === responsavelFilter;
            const matchesProj = tipoOcorrenciaFilter === 'ALL' || o.tipoOcorrencia === tipoOcorrenciaFilter;
            const matchesEmp = empresaFilter === 'ALL' || o.empresa === empresaFilter;
            const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
            const matchesCliente = clienteFilter === 'ALL' || o.cliente === clienteFilter;
            
            const matchesChartStatus = !chartStatusFilter || o.status === chartStatusFilter;
            const matchesChartResp = !chartResponsavelFilter || o.responsaveis === chartResponsavelFilter;

            let matchesDate = true;
            if (startDate || endDate) {
                const occDate = parseDate(o.data || o.criadoEm);
                if (occDate) {
                    if (startDate && occDate < new Date(startDate)) matchesDate = false;
                    if (endDate && occDate > new Date(endDate)) matchesDate = false;
                }
            }

            return matchesSearch && matchesResp && matchesProj && matchesEmp && matchesStatus && matchesCliente && matchesDate && matchesChartStatus && matchesChartResp;
        });
    }, [allOccurrences, searchTerm, responsavelFilter, tipoOcorrenciaFilter, empresaFilter, statusFilter, clienteFilter, startDate, endDate, chartStatusFilter, chartResponsavelFilter]);

    // 1. Resumo Executivo KPIs & Trends
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const totalAbertas = filteredOccurrences.filter(o => o.status !== 'Concluída' && !o.status?.toLowerCase().includes('fechad')).length;
    const concluidasPeriodo = filteredOccurrences.filter(o => o.status === 'Concluída' || o.status?.toLowerCase().includes('fechad')).length;
    const atrasadas = filteredOccurrences.filter(isAtrasada).length;
    const vencendoHoje = filteredOccurrences.filter(isVencendoHoje).length;
    
    // Trend Calculations (Mock logic comparing all time vs last 30 days for demonstration, ideally compare periods)
    const abertasLast30 = filteredOccurrences.filter(o => o.status !== 'Concluída' && parseDate(o.criadoEm) && parseDate(o.criadoEm)! > thirtyDaysAgo).length;
    const abertasPrev30 = filteredOccurrences.filter(o => o.status !== 'Concluída' && parseDate(o.criadoEm) && parseDate(o.criadoEm)! > sixtyDaysAgo && parseDate(o.criadoEm)! <= thirtyDaysAgo).length;
    const trendAbertas = abertasPrev30 === 0 ? 0 : Math.round(((abertasLast30 - abertasPrev30) / abertasPrev30) * 100);

    // Tempo médio
    const tempoMedioCalc = useMemo(() => {
        const concluidas = filteredOccurrences.filter(o => (o.status === 'Concluída' || o.fechadoEm) && o.criadoEm);
        if (concluidas.length === 0) return "N/A";
        
        let totalHours = 0;
        let validCount = 0;

        concluidas.forEach(o => {
            const start = parseDate(o.criadoEm);
            const end = parseDate(o.fechadoEm || o.modificadaEm);
            if (start && end && end > start) {
                totalHours += (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                validCount++;
            }
        });

        if (validCount === 0) return "N/A";
        const avgHours = totalHours / validCount;
        if (avgHours < 24) return `${Math.round(avgHours)}h`;
        return `${Math.round(avgHours / 24)} dias`;
    }, [filteredOccurrences]);

    // Responsável com mais tarefas
    const respCounts: Record<string, number> = {};
    filteredOccurrences.forEach(o => {
        if (o.responsaveis) respCounts[o.responsaveis] = (respCounts[o.responsaveis] || 0) + 1;
    });
    const topResponsavel = Object.entries(respCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Nenhum';

    // 3. Gráficos Principais
    const chartTipoOcorrencia = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredOccurrences.forEach(o => {
            const t = o.tipoOcorrencia || 'Sem Tipo';
            counts[t] = (counts[t] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [filteredOccurrences]);

    const chartResponsavel = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredOccurrences.forEach(o => {
            if (o.responsaveis) counts[o.responsaveis] = (counts[o.responsaveis] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    }, [filteredOccurrences]);

    const funilFluxo = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredOccurrences.forEach(o => {
            if (o.fluxo) counts[o.fluxo] = (counts[o.fluxo] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredOccurrences]);

    // NOVO: Gráfico de Ocorrências por Dia (Coluna L - Criado em)
    const chartOcorrenciasPorDia = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredOccurrences.forEach(o => {
            const dateObj = parseDate(o.criadoEm);
            if (dateObj) {
                // Format as DD/MM for the chart X-axis
                const dateKey = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
                counts[dateKey] = (counts[dateKey] || 0) + 1;
            }
        });
        
        // Sort by date chronologically
        return Object.entries(counts).map(([date, count]) => {
            const [day, month] = date.split('/');
            return { 
                date, 
                count, 
                sortKey: new Date(new Date().getFullYear(), Number(month) - 1, Number(day)).getTime() 
            };
        }).sort((a, b) => a.sortKey - b.sortKey).map(({date, count}) => ({ date, count }));
    }, [filteredOccurrences]);

    // Export to CSV
    const exportToCSV = () => {
        if (filteredOccurrences.length === 0) return;
        
        const headers = ['ID', 'Tarefa', 'Descrição', 'Responsável', 'Projeto', 'Empresa', 'Status', 'Fluxo', 'Criado Em', 'Prazo Final'];
        const csvRows = [headers.join(',')];
        
        filteredOccurrences.forEach(o => {
            const row = [
                `"${o.id || ''}"`,
                `"${(o.tarefa || '').replace(/"/g, '""')}"`,
                `"${(o.descricao || '').replace(/"/g, '""')}"`,
                `"${o.responsaveis || ''}"`,
                `"${o.tipoOcorrencia || ''}"`,
                `"${o.empresa || ''}"`,
                `"${o.status || ''}"`,
                `"${o.fluxo || ''}"`,
                `"${o.criadoEm || ''}"`,
                `"${o.prazoFinal || ''}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio_ocorrencias_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const data = await file.arrayBuffer();
            let rows: any[][] = [];

            // 1. Try standard XLSX/XLS parsing first
            try {
                const workbook = (window as any).XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                if (worksheet) {
                    rows = (window as any).XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                }
            } catch (e) {
                console.warn("XLSX read failed:", e);
            }

            // 2. Check if SheetJS failed to parse HTML properly (e.g., returned raw HTML tags as cell values)
            const isBadHtmlParse = rows.length > 0 && rows.some(r => r && r[0] && typeof r[0] === 'string' && 
                (r[0].toLowerCase().includes('<thead') || r[0].toLowerCase().includes('<tbody') || r[0].toLowerCase().includes('<tr') || r[0].toLowerCase().includes('<table')));

            if (rows.length === 0 || isBadHtmlParse) {
                // Try manual text parsing
                let text = '';
                try {
                    text = new TextDecoder('utf-8').decode(data);
                } catch (e) {
                    console.warn("UTF-8 decode failed", e);
                }

                // If text looks like mojibake or doesn't have HTML/CSV chars, try Windows-1252
                if (text && !text.includes('<') && !text.includes(';') && !text.includes(',')) {
                    try {
                        text = new TextDecoder('windows-1252').decode(data);
                    } catch (e) {}
                }

                if (text) {
                    if (text.toLowerCase().includes('<tr') || text.toLowerCase().includes('<table')) {
                        // Parse HTML
                        const parser = new DOMParser();
                        // Wrap in table just in case it's just a list of <tr>s
                        const doc = parser.parseFromString(`<table>${text}</table>`, 'text/html');
                        const trs = Array.from(doc.querySelectorAll('tr'));
                        if (trs.length > 0) {
                            rows = trs.map(tr => {
                                const tds = Array.from(tr.querySelectorAll('th, td'));
                                return tds.map(td => td.textContent?.trim() || '');
                            });
                        }
                    } else if (text.includes(';') || text.includes(',')) {
                        // Parse CSV
                        const lines = text.split('\n').filter(l => l.trim().length > 0);
                        const separator = text.includes(';') ? ';' : ',';
                        rows = lines.map(line => line.split(separator).map(cell => cell.trim().replace(/^"|"$/g, '')));
                    }
                }
            }

            // Clean up empty rows
            rows = rows.filter(row => row && Array.isArray(row) && row.length > 0 && row.some(cell => cell !== '' && cell !== null && cell !== undefined));

            if (rows.length === 0) {
                throw new Error("Nenhum dado encontrado na planilha.");
            }

            // Find header row and map columns dynamically
            let headerRowIndex = -1;
            let colMap: Record<string, number> = {};

            for (let i = 0; i < Math.min(rows.length, 20); i++) {
                const row = rows[i];
                if (!row || !Array.isArray(row)) continue;
                
                const rowStrings = row.map(c => c?.toString().toLowerCase().trim() || '');
                
                // Look for common headers
                if (rowStrings.some(s => s === 'tarefa' || s === 'descrição' || s === 'descricao' || s === 'título' || s === 'nome' || s === 'id' || s === 'status')) {
                    headerRowIndex = i;
                    rowStrings.forEach((colName, index) => {
                        if (colMap['id'] === undefined && (colName === 'id' || colName === 'código')) colMap['id'] = index;
                        else if (colMap['tarefa'] === undefined && (colName === 'tarefa' || colName === 'nome da tarefa' || colName.includes('título') || colName.includes('tarefa'))) colMap['tarefa'] = index;
                        else if (colMap['descricao'] === undefined && (colName.includes('descrição') || colName.includes('descricao'))) colMap['descricao'] = index;
                        else if (colMap['ativo'] === undefined && colName.includes('ativo')) colMap['ativo'] = index;
                        else if (colMap['prazoFinal'] === undefined && colName.includes('prazo')) colMap['prazoFinal'] = index;
                        else if (colMap['criadoPor'] === undefined && colName.includes('criado por')) colMap['criadoPor'] = index;
                        else if (colMap['responsavel'] === undefined && (colName.includes('responsável') || colName.includes('responsavel'))) colMap['responsavel'] = index;
                        else if (colMap['participantes'] === undefined && colName.includes('participantes')) colMap['participantes'] = index;
                        else if (colMap['observadores'] === undefined && colName.includes('observadores')) colMap['observadores'] = index;
                        else if (colMap['status'] === undefined && colName.includes('status')) colMap['status'] = index;
                        else if (colMap['tipoOcorrencia'] === undefined && (colName.includes('tipo de ocorrência') || colName.includes('tipo de ocorrencia'))) colMap['tipoOcorrencia'] = index;
                        else if (colMap['criadoEm'] === undefined && (colName.includes('criado em') || colName.includes('data de criação'))) colMap['criadoEm'] = index;
                        else if (colMap['dataInicio'] === undefined && (colName.includes('data de início') || colName.includes('data de inicio'))) colMap['dataInicio'] = index;
                        else if (colMap['modificadaEm'] === undefined && colName.includes('modificada em')) colMap['modificadaEm'] = index;
                        else if (colMap['fechadoEm'] === undefined && (colName.includes('fechado em') || colName.includes('concluído em'))) colMap['fechadoEm'] = index;
                        else if (colMap['duracaoPrevista'] === undefined && (colName.includes('duração') || colName.includes('duracao'))) colMap['duracaoPrevista'] = index;
                        else if (colMap['tempoGasto'] === undefined && colName.includes('tempo gasto')) colMap['tempoGasto'] = index;
                        else if (colMap['marcadores'] === undefined && (colName.includes('marcadores') || colName.includes('tags'))) colMap['marcadores'] = index;
                        else if (colMap['lead'] === undefined && colName.includes('lead')) colMap['lead'] = index;
                        else if (colMap['contato'] === undefined && (colName.includes('contato') || colName.includes('cliente'))) colMap['contato'] = index;
                        else if (colMap['empresa'] === undefined && colName.includes('empresa')) colMap['empresa'] = index;
                        else if (colMap['negocio'] === undefined && (colName.includes('negócio') || colName.includes('negocio'))) colMap['negocio'] = index;
                        else if (colMap['fluxo'] === undefined && (colName.includes('fluxo') || colName.includes('fase'))) colMap['fluxo'] = index;
                    });
                    break;
                }
            }

            // Fallback if header not found
            if (headerRowIndex === -1) {
                headerRowIndex = 0; // Assume first row is header
                colMap = {
                    id: 0, tarefa: 1, descricao: 2, ativo: 3, prazoFinal: 4, criadoPor: 5,
                    responsavel: 6, participantes: 7, observadores: 8, status: 9, tipoOcorrencia: 10,
                    criadoEm: 11, dataInicio: 12, modificadaEm: 13, fechadoEm: 14, duracaoPrevista: 15,
                    tempoGasto: 19, marcadores: 20, lead: 21, contato: 22, empresa: 23, negocio: 24,
                    fluxo: 30
                };
            }

            const formatExcelDate = (excelDate: string | number) => {
                if (!excelDate) return '';
                const num = Number(excelDate);
                if (!isNaN(num) && num > 20000) {
                    // Excel dates are days since Dec 30, 1899
                    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
                    return date.toLocaleString('pt-BR', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });
                }
                return String(excelDate);
            };

            const parsedOccurrences: Occurrence[] = [];

            for (let i = headerRowIndex + 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || !Array.isArray(row) || row.length === 0) continue;

                const getCol = (key: string) => {
                    const idx = colMap[key];
                    return idx !== undefined && row[idx] !== undefined ? row[idx].toString().trim() : '';
                };

                const idCol = getCol('id') || Math.random().toString(36).substr(2, 9);
                const tarefaCol = getCol('tarefa');
                const descricaoRaw = getCol('descricao');
                const ativoCol = getCol('ativo');
                const prazoFinalCol = getCol('prazoFinal');
                const criadoPorCol = getCol('criadoPor');
                const responsaveisCol = getCol('responsavel');
                const participantesCol = getCol('participantes');
                const observadoresCol = getCol('observadores');
                const statusCol = getCol('status');
                const tipoOcorrenciaCol = getCol('tipoOcorrencia');
                const criadoEmCol = formatExcelDate(getCol('criadoEm'));
                const dataInicioCol = getCol('dataInicio');
                const modificadaEmCol = getCol('modificadaEm');
                const fechadoEmCol = formatExcelDate(getCol('fechadoEm'));
                const duracaoPrevistaCol = getCol('duracaoPrevista');
                const tempoGastoCol = getCol('tempoGasto');
                const marcadoresCol = getCol('marcadores');
                const leadCol = getCol('lead');
                const contatoCol = getCol('contato');
                const empresaCol = getCol('empresa');
                const negocioCol = getCol('negocio');
                const fluxoCol = getCol('fluxo');

                if (descricaoRaw || tarefaCol) {
                    const isConcluida = statusCol.toLowerCase().includes('concluíd') || statusCol.toLowerCase().includes('fechad') || fechadoEmCol !== '';

                    // Extract details from description if available
                    let extractedEmpresa = '';
                    let extractedCliente = '';
                    let extractedTipo = '';
                    if (descricaoRaw) {
                        const extract = (key: string, nextKeys: string[]) => {
                            const keyIndex = descricaoRaw.toLowerCase().indexOf(key.toLowerCase());
                            if (keyIndex === -1) return '';
                            const start = keyIndex + key.length;
                            let end = descricaoRaw.length;
                            nextKeys.forEach(nk => {
                                const nkIndex = descricaoRaw.toLowerCase().indexOf(nk.toLowerCase(), start);
                                if (nkIndex !== -1 && nkIndex < end) end = nkIndex;
                            });
                            let val = descricaoRaw.substring(start, end).trim();
                            if (val.startsWith(':')) val = val.substring(1).trim();
                            return val;
                        };
                        const keys = ['Empresa', 'Cliente', 'Tipo de Ocorrência', 'Descrição da ocorrência', 'Desconformidade', 'Data', 'Horário', 'Imagens', 'Anexos'];
                        extractedEmpresa = extract('Empresa', keys.filter(k => k !== 'Empresa'));
                        extractedCliente = extract('Cliente', keys.filter(k => k !== 'Cliente'));
                        extractedTipo = extract('Tipo de Ocorrência', keys.filter(k => k !== 'Tipo de Ocorrência'));
                    }

                    parsedOccurrences.push({
                        id: idCol,
                        tarefa: tarefaCol,
                        empresa: extractedEmpresa || empresaCol || 'N/A',
                        cliente: extractedCliente || contatoCol || tipoOcorrenciaCol || 'N/A',
                        tipo: extractedTipo || marcadoresCol || 'N/A',
                        data: criadoEmCol || 'N/A',
                        descricao: descricaoRaw,
                        iniciada: dataInicioCol,
                        concluida: fechadoEmCol,
                        responsaveis: responsaveisCol,
                        status: isConcluida ? 'Concluída' : (statusCol || 'Pendente'),
                        ativo: ativoCol,
                        prazoFinal: prazoFinalCol,
                        criadoPor: criadoPorCol,
                        participantes: participantesCol,
                        observadores: observadoresCol,
                        tipoOcorrencia: tipoOcorrenciaCol || extractedTipo || 'N/A',
                        criadoEm: criadoEmCol,
                        modificadaEm: modificadaEmCol,
                        fechadoEm: fechadoEmCol,
                        duracaoPrevista: duracaoPrevistaCol,
                        tempoGasto: tempoGastoCol,
                        marcadores: marcadoresCol,
                        lead: leadCol,
                        contato: contatoCol,
                        negocio: negocioCol,
                        fluxo: fluxoCol
                    });
                }
            }

            if (parsedOccurrences.length > 0) {
                await monitoringService.addOccurrenceImport(parsedOccurrences, file.name, type);
                alert(`Sucesso! ${parsedOccurrences.length} tarefas importadas.`);
            } else {
                alert("Nenhuma tarefa válida encontrada na planilha.");
            }

        } catch (error) {
            console.error("Erro ao processar planilha:", error);
            alert("Erro ao processar a planilha. Verifique o formato.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Top Ocorrências por Cliente
    const topOccurrencesByCliente = useMemo(() => {
        const counts: { [key: string]: number } = {};
        allOccurrences.forEach(o => {
            const cliente = o.cliente || 'N/A';
            counts[cliente] = (counts[cliente] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    }, [allOccurrences]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredOccurrences.length / itemsPerPage);
    const paginatedOccurrences = filteredOccurrences.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <BarChart3 className="text-blue-500" />
                        Dashboard de Tarefas
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Monitoramento inteligente de tarefas e tipos de ocorrência</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button onClick={exportToCSV} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-slate-700">
                        <Download size={18} />
                        Exportar
                    </button>
                    {currentUser.role === 'admin' && (
                        <>
                            <button onClick={() => setShowImportsModal(true)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-slate-700">
                                <FileSpreadsheet size={18} />
                                Planilhas Importadas
                            </button>
                            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/30 disabled:opacity-50">
                                {isUploading ? <Clock className="animate-spin" size={18} /> : <Upload size={18} />}
                                {isUploading ? 'Processando...' : 'Importar Planilha'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Active Chart Filters Indicator */}
            {(chartStatusFilter || chartResponsavelFilter) && (
                <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                    <span className="text-sm text-blue-400 font-medium">Filtros de Gráfico Ativos:</span>
                    {chartStatusFilter && (
                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            Status: {chartStatusFilter}
                            <X size={12} className="cursor-pointer hover:text-blue-200" onClick={() => setChartStatusFilter(null)} />
                        </span>
                    )}
                    {chartResponsavelFilter && (
                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            Responsável: {chartResponsavelFilter}
                            <X size={12} className="cursor-pointer hover:text-blue-200" onClick={() => setChartResponsavelFilter(null)} />
                        </span>
                    )}
                    <button onClick={() => { setChartStatusFilter(null); setChartResponsavelFilter(null); }} className="text-xs text-slate-400 hover:text-white ml-auto underline">
                        Limpar Todos
                    </button>
                </div>
            )}

            {/* 1. Resumo Executivo */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-blue-400"><Briefcase size={16} /><span className="text-xs font-bold uppercase">Abertas</span></div>
                        {trendAbertas !== 0 && (
                            <span className={`text-xs flex items-center ${trendAbertas > 0 ? 'text-rose-400' : 'text-emerald-400'}`} title="vs últimos 30 dias">
                                {trendAbertas > 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>} {Math.abs(trendAbertas)}%
                            </span>
                        )}
                    </div>
                    <p className="text-2xl font-black text-white">{totalAbertas}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-2 mb-2 text-emerald-400"><CheckCircle2 size={16} /><span className="text-xs font-bold uppercase">Concluídas</span></div>
                    <p className="text-2xl font-black text-emerald-500">{concluidasPeriodo}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-2 mb-2 text-rose-400"><AlertCircle size={16} /><span className="text-xs font-bold uppercase">Atrasadas</span></div>
                    <p className="text-2xl font-black text-rose-500">{atrasadas}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-2 mb-2 text-amber-400"><AlertTriangle size={16} /><span className="text-xs font-bold uppercase">Vencendo Hoje</span></div>
                    <p className="text-2xl font-black text-amber-500">{vencendoHoje}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-2 mb-2 text-purple-400"><Timer size={16} /><span className="text-xs font-bold uppercase">Tempo Médio</span></div>
                    <p className="text-xl font-black text-purple-500">{tempoMedioCalc}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-2 mb-2 text-cyan-400"><Users size={16} /><span className="text-xs font-bold uppercase">Top Resp.</span></div>
                    <p className="text-sm font-bold text-cyan-500 truncate" title={topResponsavel}>{topResponsavel}</p>
                </div>
            </div>

            {/* Top Ocorrências por Cliente */}
            <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4">Top Ocorrências por Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {topOccurrencesByCliente.map(([cliente, count]) => (
                        <div key={cliente} className="bg-slate-800 rounded-lg p-4">
                            <p className="text-sm text-slate-400">{cliente}</p>
                            <p className="text-2xl font-bold text-white">{count}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. Filtros */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-slate-400 mb-2"><Filter size={16}/> <span className="text-sm font-bold">Filtros Gerais</span></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-blue-500" title="Data Início" />
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-blue-500" title="Data Fim" />
                    <select value={responsavelFilter} onChange={(e) => setResponsavelFilter(e.target.value)} className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-blue-500">
                        <option value="ALL">Responsável</option>
                        {uniqueResponsaveis.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select value={tipoOcorrenciaFilter} onChange={(e) => setTipoOcorrenciaFilter(e.target.value)} className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-blue-500">
                        <option value="ALL">Tipo de Ocorrência</option>
                        {uniqueTiposOcorrencia.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={empresaFilter} onChange={(e) => setEmpresaFilter(e.target.value)} className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-blue-500">
                        <option value="ALL">Empresa</option>
                        {uniqueEmpresas.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-blue-500">
                        <option value="ALL">Status</option>
                        {uniqueStatus.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={clienteFilter} onChange={(e) => setClienteFilter(e.target.value)} className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-blue-500">
                        <option value="ALL">Cliente</option>
                        {uniqueClientes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* 3. Gráficos Principais */}
            <div className="flex flex-col gap-6">
                
                {/* Gráfico 1: Ocorrências por Dia */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg w-full">
                    <h3 className="text-slate-300 font-bold mb-6 flex items-center gap-2"><Calendar size={18} className="text-indigo-500"/> Ocorrências</h3>
                    <div className="h-[430px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartOcorrenciasPorDia} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickMargin={10} />
                                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px' }}
                                    cursor={{fill: '#1e293b'}}
                                />
                                <Bar 
                                    dataKey="count" 
                                    fill="#6366f1" 
                                    radius={[4, 4, 0, 0]} 
                                    name="Ocorrências" 
                                    onClick={(data) => {
                                        const dateKey = data.date;
                                        setSelectedOccurrencesForBox(allOccurrences.filter(o => {
                                            const occDate = parseDate(o.criadoEm);
                                            if (!occDate) return false;
                                            const occDateKey = `${occDate.getDate().toString().padStart(2, '0')}/${(occDate.getMonth() + 1).toString().padStart(2, '0')}`;
                                            return occDateKey === dateKey;
                                        }));
                                    }}
                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Gráfico 2: Top Ocorrências */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex-1">
                        <h3 className="text-slate-300 font-bold mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-blue-500"/> Top Ocorrências</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartTipoOcorrencia} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                                    <XAxis type="number" stroke="#64748b" fontSize={12} allowDecimals={false} />
                                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={80} tick={{fill: '#94a3b8'}} />
                                    <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px' }} />
                                    <Bar 
                                        dataKey="value" 
                                        fill="#3b82f6" 
                                        radius={[0, 4, 4, 0]} 
                                        onClick={(data) => {
                                            setSelectedOccurrencesForBox(allOccurrences.filter(o => o.tipoOcorrencia === data.name));
                                        }}
                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Gráfico 3: Responsável */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex-1">
                        <h3 className="text-slate-300 font-bold mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-amber-500"/> Top Responsáveis</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartResponsavel} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                                    <XAxis type="number" stroke="#64748b" fontSize={12} allowDecimals={false} />
                                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={80} tick={{fill: '#94a3b8'}} />
                                    <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px' }} />
                                    <Bar 
                                        dataKey="value" 
                                        fill="#f59e0b" 
                                        radius={[0, 4, 4, 0]} 
                                        onClick={(data) => setChartResponsavelFilter(chartResponsavelFilter === data.name ? null : data.name)}
                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                    >
                                        {chartResponsavel.map((entry, index) => (
                                            <Cell key={`cell-${index}`} opacity={chartResponsavelFilter && chartResponsavelFilter !== entry.name ? 0.3 : 1} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* 5. Tabela de Detalhes com Paginação */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950">
                    <h3 className="text-slate-300 font-bold flex items-center gap-2"><FileSpreadsheet size={18} className="text-blue-500"/> Lista de Tarefas</h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input type="text" className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm" placeholder="Buscar tarefa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-950/50 border-b border-slate-800">
                            <tr>
                                <th className="px-4 py-3 font-medium">Nome da Tarefa</th>
                                <th className="px-4 py-3 font-medium">Criada Em</th>
                                <th className="px-4 py-3 font-medium">Concluída</th>
                                <th className="px-4 py-3 font-medium">Responsável</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedOccurrences.map((occ) => {
                                const isExpanded = expandedRow === occ.id;

                                return (
                                    <React.Fragment key={occ.id}>
                                        <tr 
                                            className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors cursor-pointer"
                                            onClick={() => setExpandedRow(isExpanded ? null : occ.id)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-200" title={occ.tarefa}>{occ.tarefa || 'Sem título'}</div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{occ.criadoEm || '-'}</td>
                                            <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{occ.fechadoEm || '-'}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-700 shrink-0">
                                                        {occ.responsaveis ? occ.responsaveis.charAt(0).toUpperCase() : '?'}
                                                    </div>
                                                    <span>{occ.responsaveis || 'Não atribuído'}</span>
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-slate-800/20 border-b border-slate-800/50">
                                                <td colSpan={4} className="px-4 py-4">
                                                    <ExpandedDetails text={occ.descricao || ''} id={occ.id} />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {paginatedOccurrences.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Search size={32} className="text-slate-700" />
                                            <p>Nenhuma tarefa encontrada com os filtros atuais.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950">
                        <span className="text-sm text-slate-400">
                            Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredOccurrences.length)} de {filteredOccurrences.length}
                        </span>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1 rounded-md bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <span className="text-sm font-medium text-slate-300 px-2">
                                {currentPage} / {totalPages}
                            </span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1 rounded-md bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {/* Modal de Planilhas Importadas */}
            {showImportsModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FileSpreadsheet className="text-blue-500" />
                                Planilhas Importadas
                            </h3>
                            <button onClick={() => setShowImportsModal(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            {occurrencesData.length === 0 ? (
                                <div className="text-center text-slate-500 py-8">
                                    <FileSpreadsheet size={48} className="mx-auto mb-3 opacity-20" />
                                    <p>Nenhuma planilha importada ainda.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {occurrencesData.map((imp) => (
                                        <div key={imp.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div>
                                                <h4 className="font-bold text-slate-200">{imp.fileName || 'Planilha sem nome'}</h4>
                                                <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                                                    <span className="flex items-center gap-1"><Clock size={12}/> {new Date(imp.importedAt).toLocaleString('pt-BR')}</span>
                                                    <span className="flex items-center gap-1"><Briefcase size={12}/> {imp.count || (imp.occurrences ? imp.occurrences.length : 0)} tarefas</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setDeleteConfirmId(imp.id)}
                                                className="text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
                                            >
                                                <Trash2 size={16} />
                                                Excluir
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
            {deleteConfirmId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Excluir Planilha?</h3>
                            <p className="text-slate-400 text-sm mb-6">
                                Tem certeza que deseja excluir esta planilha? Todas as tarefas importadas através dela serão removidas permanentemente. Esta ação não pode ser desfeita.
                            </p>
                            <div className="flex items-center gap-3 justify-center">
                                <button 
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={async () => {
                                        if (deleteConfirmId) {
                                            await monitoringService.deleteOccurrenceImport(deleteConfirmId, type);
                                            setDeleteConfirmId(null);
                                        }
                                    }}
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 text-white hover:bg-rose-500 transition-colors shadow-lg shadow-rose-900/20"
                                >
                                    Sim, Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {selectedOccurrencesForBox && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">Ocorrências Selecionadas</h2>
                            <button onClick={() => setSelectedOccurrencesForBox(null)} className="text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {selectedOccurrencesForBox.map((o, idx) => (
                                <div key={idx} className="bg-slate-800 p-4 rounded-lg text-sm text-slate-300 border border-slate-700">
                                    <p className="font-bold text-white mb-1">{o.tarefa || 'Sem título'}</p>
                                    <p className="text-xs text-slate-400">{o.descricao}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(OccurrencesDashboard);
