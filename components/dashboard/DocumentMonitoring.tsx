
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
                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                        <th className="px-4 py-3">Documento</th>
                        <th className="px-4 py-3">Vencimento</th>
                        <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {documents.length === 0 ? (
                        <tr>
                            <td colSpan={3} className="px-4 py-8 text-center">
                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                    <FileText size={24} className="text-slate-500/30" />
                                    <p className="text-[9px] font-black uppercase tracking-widest">Nenhum documento</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        documents.map((doc, idx) => {
                            const status = getDocStatus(doc.expirationDate);
                            return (
                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded flex items-center justify-center bg-purple-500/10 text-purple-500">
                                                <FileText size={12} />
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase leading-none">{doc.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <Calendar size={10} />
                                            <span className="text-[10px] font-bold uppercase">{new Date(doc.expirationDate).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${status.color.replace('border', '')}`}>
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
