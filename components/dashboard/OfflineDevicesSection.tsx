
import React from 'react';
import { AlertTriangle, Info, Edit, CheckCircle2, Loader2, DoorClosed, Warehouse, MapPin } from 'lucide-react';
import { Camera, AccessPoint } from '../../types';

interface OfflineDevicesSectionProps {
    offlineDevices: (Camera & { priority: string })[];
    offlineAccessPoints: (AccessPoint & { priority: string })[];
    openInfoModal: (cam: Camera, editMode?: boolean) => void;
    handleResolveIssue: (uuid: string) => void;
    savingId: string | null;
}

const OfflineDevicesSection: React.FC<OfflineDevicesSectionProps> = ({
    offlineDevices,
    offlineAccessPoints,
    openInfoModal,
    handleResolveIssue,
    savingId
}) => {
    return (
        <div className="space-y-4">
            {/* Câmeras e Alarmes Offline */}
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/50">
                            <th className="px-4 py-4">Dispositivo</th>
                            <th className="px-4 py-4">Local</th>
                            <th className="px-4 py-4">Prioridade</th>
                            <th className="px-4 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
                        {offlineDevices.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-12 text-center">
                                    <div className="flex flex-col items-center gap-3 text-slate-400">
                                        <div className="w-12 h-12 rounded-full bg-emerald-500/5 flex items-center justify-center">
                                            <CheckCircle2 size={24} className="text-emerald-500/40" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tudo em ordem no sistema</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            offlineDevices.map(device => (
                                <tr key={device.uuid} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${device.channelType === 'alarm' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                <AlertTriangle size={14} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase leading-none truncate">{device.name}</p>
                                                <p className="text-[8px] text-slate-400 font-black uppercase mt-1 tracking-tighter">{device.channelType === 'alarm' ? 'Alarme' : 'Câmera'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <MapPin size={10} className="shrink-0" />
                                            <span className="text-[10px] font-bold uppercase truncate max-w-[100px]">{device.location}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${device.priority === 'CRÍTICO' ? 'text-rose-500 bg-rose-500/10 border border-rose-500/20' : 'text-amber-500 bg-amber-500/10 border border-amber-500/20'}`}>
                                            {device.priority}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openInfoModal(device)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"><Info size={14} /></button>
                                            <button onClick={() => openInfoModal(device, true)} className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"><Edit size={14} /></button>
                                            <button 
                                                onClick={() => handleResolveIssue(device.uuid)} 
                                                disabled={savingId === device.uuid}
                                                className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                                            >
                                                {savingId === device.uuid ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pontos de Acesso Offline - Simplified */}
            {offlineAccessPoints.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center justify-between mb-4 px-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pontos de Acesso Offline</p>
                        <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 text-[9px] font-black rounded-full">{offlineAccessPoints.length}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-4">
                        {offlineAccessPoints.map(ap => (
                            <div key={ap.uuid} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/50 hover:border-rose-500/20 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                        <DoorClosed size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase block truncate leading-none">{ap.name}</span>
                                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter mt-1 block">Acesso Restrito</span>
                                    </div>
                                </div>
                                <span className="text-[8px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full uppercase border border-rose-500/10">{ap.location}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfflineDevicesSection;
