
import React from 'react';
import { FileText, Calendar, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface DocumentMonitoringProps {
    documents: any[];
    getDocStatus: (expirationDate: string) => { label: string; color: string };
}

const DocumentMonitoring: React.FC<DocumentMonitoringProps> = ({
    documents,
    getDocStatus
}) => {
    return (
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/50">
                        <th className="px-4 py-4">Documento</th>
                        <th className="px-4 py-4">Vencimento</th>
                        <th className="px-4 py-4 text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
                    {documents.length === 0 ? (
                        <tr>
                            <td colSpan={3} className="px-4 py-12 text-center">
                                <div className="flex flex-col items-center gap-3 text-slate-400">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        <FileText size={24} className="text-slate-500/40" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nenhum documento pendente</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        documents.map((doc, idx) => {
                            const status = getDocStatus(doc.expirationDate);
                            return (
                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-500 shrink-0">
                                                <FileText size={14} />
                                            </div>
                                            <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase leading-none truncate max-w-[150px]">{doc.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <Calendar size={10} className="shrink-0" />
                                            <span className="text-[10px] font-bold uppercase">{new Date(doc.expirationDate).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${status.color}`}>
                                            {status.label}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default DocumentMonitoring;
