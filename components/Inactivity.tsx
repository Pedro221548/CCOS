import React, { useState } from 'react';
import { Upload, FileUp, Play, Calendar, AlertCircle, Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface InactivityResult {
    name: string;
    lastAppearance: Date | null;
    daysInactive: number | null;
}

interface FileData {
    name: string;
    buffer: ArrayBuffer;
}

const Inactivity: React.FC = () => {
    const [nameFile, setNameFile] = useState<FileData | null>(null);
    const [accessFiles, setAccessFiles] = useState<(FileData | null)[]>([null, null, null]);
    const [results, setResults] = useState<InactivityResult[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const normalizeName = (name: string) => {
        return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
    };

    const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result instanceof ArrayBuffer) {
                    resolve(e.target.result);
                } else {
                    reject(new Error("Failed to read file as ArrayBuffer"));
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    };

    const handleAccessFileChange = async (index: number, file: File | null) => {
        if (!file) {
            const newFiles = [...accessFiles];
            newFiles[index] = null;
            setAccessFiles(newFiles);
            return;
        }
        try {
            const buffer = await readFileAsArrayBuffer(file);
            const newFiles = [...accessFiles];
            newFiles[index] = { name: file.name, buffer };
            setAccessFiles(newFiles);
        } catch (err: any) {
            setError(`Erro ao ler arquivo: ${err.message}`);
        }
    };
    
    const handleNameFileChange = async (file: File | null) => {
        if (!file) {
            setNameFile(null);
            return;
        }
        try {
            const buffer = await readFileAsArrayBuffer(file);
            setNameFile({ name: file.name, buffer });
        } catch (err: any) {
            setError(`Erro ao ler arquivo: ${err.message}`);
        }
    };

    const processFiles = async () => {
        if (!nameFile) {
            setError('Por favor, faça upload da planilha de Nomes (Planilha 1).');
            return;
        }

        const validAccessFiles = accessFiles.filter(f => f !== null) as FileData[];
        if (validAccessFiles.length === 0) {
            setError('Por favor, faça upload de pelo menos uma planilha de fluxo de acesso.');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // 1. Process Name Sheet
            const nameBuffer = nameFile.buffer;

            const nameWb = (window as any).XLSX.read(nameBuffer, { type: 'array' });
            const nameData = (window as any).XLSX.utils.sheet_to_json(nameWb.Sheets[nameWb.SheetNames[0]], { header: 'A' });
            
            // Extract column A
            const targetNames = Array.from(new Set(
                (nameData as any[])
                    .map((row: any) => String(row['A'] || '').trim().toUpperCase())
                    .filter((n: string) => n && n !== 'NOME' && n !== 'NOME (NOME)' && n.length > 2)
            )) as string[];

            if (targetNames.length === 0) {
                throw new Error('Nenhum nome encontrado na Coluna A da Planilha 1.');
            }

            // 2. Load access data into memory
            const accessRecords: { fileIndex: number, originalName: string, normalizedName: string, date: Date | null }[] = [];
            
            for (let fIndex = 0; fIndex < validAccessFiles.length; fIndex++) {
                setProcessingStep(`Lendo planilha ${fIndex + 1} de acesso...`);
                await new Promise(resolve => setTimeout(resolve, 100));

                const buffer = validAccessFiles[fIndex].buffer;
                const wb = (window as any).XLSX.read(buffer, { type: 'array', cellDates: true });
                const data = (window as any).XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 'A' }) as any[];
                
                const firstRow = data.slice(0, 5).find((r: any) => Object.keys(r).length > 2) || {};
                let dateCol = 'A';
                for (const k of Object.keys(firstRow)) {
                    const headerVal = String(firstRow[k]).toLowerCase().trim();
                    if (headerVal === 'data' || headerVal === 'date' || headerVal === 'dia') {
                        dateCol = k;
                        break;
                    }
                }

                const tryParseDate = (val: any): Date | null => {
                    if (!val) return null;
                    if (val instanceof Date) {
                        return isNaN(val.getTime()) ? null : val;
                    }
                    if (typeof val === 'number') {
                        if (val > 20000 && val < 60000) {
                            const d = new Date(Math.round((val - 25569) * 86400 * 1000));
                            d.setMinutes(d.getMinutes() + 1);
                            return isNaN(d.getTime()) ? null : d;
                        }
                    }
                    if (typeof val === 'string') {
                        const dateStr = val.trim();
                        // DD/MM/YYYY or DD-MM-YYYY
                        const matchBR = dateStr.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
                        if (matchBR) {
                            const d = new Date(`${matchBR[3]}-${matchBR[2]}-${matchBR[1]}T12:00:00Z`);
                            if (!isNaN(d.getTime())) return d;
                        }
                        // YYYY/MM/DD or YYYY-MM-DD
                        const matchEN = dateStr.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
                        if (matchEN) {
                            const d = new Date(`${matchEN[1]}-${matchEN[2]}-${matchEN[3]}T12:00:00Z`);
                            if (!isNaN(d.getTime())) return d;
                        }
                    }
                    return null;
                };

                data.forEach((row: any) => {
                    const nameRaw = row['G'] || row['F'] || row['H']; // Fallback for nearby columns just in case
                    if (!nameRaw) return;
                    
                    const name = String(nameRaw).trim().toUpperCase();
                    // Ignora cabeçalhos comuns
                    if (name === 'NOME' || name === 'NOMES' || name.includes('COLABORADOR')) return;

                    const normalized = normalizeName(name);

                    let parsedDate: Date | null = tryParseDate(row[dateCol]);
                    if (!parsedDate) parsedDate = tryParseDate(row['A']);
                    if (!parsedDate) parsedDate = tryParseDate(row['B']);
                    if (!parsedDate) parsedDate = tryParseDate(row['C']);
                    if (!parsedDate) parsedDate = tryParseDate(row['D']);
                    
                    if (!parsedDate) {
                        for (const k of Object.keys(row)) {
                            if (k === 'G') continue;
                            parsedDate = tryParseDate(row[k]);
                            if (parsedDate) break;
                        }
                    }

                    if (name && parsedDate) {
                        accessRecords.push({ fileIndex: fIndex, originalName: name, normalizedName: normalized, date: parsedDate });
                    }
                });
            }

            // 3. Perform 9 Extensive Conferences (3 passes x 3 files = 9 conferences)
            let conferenceCount = 0;
            const totalConferences = validAccessFiles.length * 3;
            // Prep target names
            const normalizedTargets = targetNames.map(name => ({ original: name, normalized: normalizeName(name) }));
            const appearances: { [name: string]: Date[] } = {};

            for (let pass = 1; pass <= 3; pass++) {
                for (let fIndex = 0; fIndex < validAccessFiles.length; fIndex++) {
                    conferenceCount++;
                    setProcessingStep(`Realizando conferência ${conferenceCount}/${totalConferences}...`);
                    await new Promise(resolve => setTimeout(resolve, 600));

                    const recordsForFile = accessRecords.filter(r => r.fileIndex === fIndex);

                    if (pass === 1) {
                        // Pass 1: Strict Match
                        for (const target of normalizedTargets) {
                            const exactMatches = recordsForFile.filter(r => r.originalName === target.original);
                            exactMatches.forEach(m => {
                                if (!appearances[target.original]) appearances[target.original] = [];
                                if (m.date) appearances[target.original].push(m.date);
                            });
                        }
                    } else if (pass === 2) {
                        // Pass 2: Normalized Match
                        for (const target of normalizedTargets) {
                            const normMatches = recordsForFile.filter(r => r.normalizedName === target.normalized && r.originalName !== target.original);
                            normMatches.forEach(m => {
                                if (!appearances[target.original]) appearances[target.original] = [];
                                if (m.date) appearances[target.original].push(m.date);
                            });
                        }
                    } else if (pass === 3) {
                        // Pass 3: Fuzzy / Substring Match
                        for (const target of normalizedTargets) {
                            const targetParts = target.normalized.split(' ').filter(p => p.length > 2);
                            if (targetParts.length >= 2) {
                                const fuzzyMatches = recordsForFile.filter(r => {
                                    if (r.normalizedName === target.normalized) return false;
                                    return targetParts.every(part => r.normalizedName.includes(part));
                                });
                                fuzzyMatches.forEach(m => {
                                    if (!appearances[target.original]) appearances[target.original] = [];
                                    if (m.date) appearances[target.original].push(m.date);
                                });
                            }
                        }
                    }
                }
            }

            setProcessingStep('Consolidando resultados...');
            await new Promise(resolve => setTimeout(resolve, 400));

            // 4. Calculate inactivity
            const currentDate = new Date();
            const finalResults: InactivityResult[] = targetNames.map((name: string) => {
                const dates = appearances[name] || [];
                if (dates.length === 0) {
                    return { name, lastAppearance: null, daysInactive: null };
                }

                const maxDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
                const diffTime = Math.abs(currentDate.getTime() - maxDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                return { name, lastAppearance: maxDate, daysInactive: diffDays };
            });

            // Sort: highest inactivity first, then those with missing records
            finalResults.sort((a: InactivityResult, b: InactivityResult) => {
                if (a.daysInactive === null && b.daysInactive === null) return 0;
                if (a.daysInactive === null) return -1;
                if (b.daysInactive === null) return 1;
                return b.daysInactive - a.daysInactive;
            });

            setResults(finalResults);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro ao processar as planilhas.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExportToExcel = async () => {
        if (results.length === 0) return;
        
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Inatividade');

            worksheet.columns = [
                { header: 'Nome da Pessoa', key: 'name', width: 45 },
                { header: 'Última Presença', key: 'lastAppearance', width: 25 },
                { header: 'Tempo de Inatividade (Dias)', key: 'daysInactive', width: 30 },
            ];

            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF475569' } // slate-600
            };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

            results.forEach(r => {
                let statusText = '';
                if (r.daysInactive === null) statusText = 'Sem Registro';
                else statusText = `${r.daysInactive} dias`;

                worksheet.addRow({
                    name: r.name,
                    lastAppearance: r.lastAppearance ? r.lastAppearance.toLocaleDateString('pt-BR') : '-',
                    daysInactive: statusText
                });
            });

            worksheet.autoFilter = 'A1:C1';

            const borderStyle: Partial<ExcelJS.Borders> = {
                top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
            };

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) {
                    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
                    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
                    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };
                    
                    row.eachCell(cell => {
                        cell.border = borderStyle;
                    });
                }
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Relatorio_Inatividade_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
        } catch (err: any) {
            console.error('Export Error:', err);
            setError('Erro ao exportar para Excel.');
        }
    };

    return (
        <div className="p-6 max-w-full space-y-6">
            <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
                <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-3">
                    <Calendar className="text-amber-500" />
                    Validação de Inatividade
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm uppercase tracking-wider font-bold">
                    Verifique o tempo de inatividade cruzando sua Planilha de Nomes com as Planilhas de Acesso.
                </p>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 mb-6 border border-red-200 dark:border-red-800 font-bold uppercase text-xs tracking-wider">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Planilha 1 - Nomes */}
                <div className="bg-white dark:bg-[#1c1e26] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/50 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                        Planilha 1
                    </h2>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 h-10">
                        Planilha de Nomes<br/>
                        <span className="text-[10px] text-slate-500 font-normal">Lê a Coluna A</span>
                    </p>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <FileUp className="w-8 h-8 mb-3 text-slate-400 group-hover:text-amber-500 transition-colors" />
                            <p className="text-xs text-slate-500 font-bold px-4 text-center">
                                {nameFile ? nameFile.name : 'Clique para selecionar'}
                            </p>
                        </div>
                        <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => handleNameFileChange(e.target.files?.[0] || null)} />
                    </label>
                </div>

                {/* Planilhas de Acesso Mês Atual, Passado e Retrasado */}
                {[
                    { label: 'Mês Atual', index: 0 },
                    { label: 'Mês Passado', index: 1 },
                    { label: 'Mês Retrasado', index: 2 }
                ].map((item) => (
                    <div key={item.index} className="bg-white dark:bg-[#1c1e26] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/50 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                            Acesso - {item.label}
                        </h2>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 h-10">
                            Fluxo de Acesso<br/>
                            <span className="text-[10px] text-slate-500 font-normal">Lê a Coluna G (Nomes)</span>
                        </p>
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <FileUp className="w-8 h-8 mb-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                <p className="text-xs text-slate-500 font-bold px-4 text-center">
                                    {accessFiles[item.index] ? accessFiles[item.index]!.name : 'Clique para selecionar'}
                                </p>
                            </div>
                            <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => handleAccessFileChange(item.index, e.target.files?.[0] || null)} />
                        </label>
                    </div>
                ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800/50">
                <button
                    onClick={processFiles}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 checked:bg-amber-700 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg shadow-amber-500/20 w-full md:w-auto min-w-[300px]"
                >
                    {isProcessing ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                            {processingStep || 'Processando...'}
                        </>
                    ) : (
                        <>
                            <Play size={16} /> Processar Dados (Verificação Profunda)
                        </>
                    )}
                </button>
            </div>

            {results.length > 0 && (
                <div className="bg-white dark:bg-[#1c1e26] rounded-2xl border border-slate-200 dark:border-slate-800/50 shadow-xl overflow-hidden mt-8 animate-fade-in">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">
                            Resultados do Cruzamento
                        </h2>
                        <button
                            onClick={handleExportToExcel}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                        >
                            <Download size={14} /> Exportar Excel
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 text-[10px] uppercase tracking-widest text-slate-500">
                                    <th className="p-4 font-black">Pessoa (Coluna A)</th>
                                    <th className="p-4 font-black text-center">Última Presença</th>
                                    <th className="p-4 font-black text-right">Inatividade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((r, idx) => (
                                    <tr key={idx} className="border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4">
                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{r.name}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="text-sm text-slate-600 dark:text-slate-400 font-mono">
                                                {r.lastAppearance ? r.lastAppearance.toLocaleDateString('pt-BR') : '-'}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            {r.daysInactive === null ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 text-xs font-bold uppercase tracking-wider">
                                                    Sem Registro
                                                </span>
                                            ) : (
                                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                                                    r.daysInactive > 90 
                                                        ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' 
                                                        : r.daysInactive > 30 
                                                            ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                                            : 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                                                }`}>
                                                    {r.daysInactive} dias
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inactivity;
