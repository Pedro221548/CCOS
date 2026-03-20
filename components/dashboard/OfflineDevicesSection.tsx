
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
                        <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <th className="px-4 py-3">Dispositivo</th>
                            <th className="px-4 py-3">Local</th>
                            <th className="px-4 py-3">Prioridade</th>
                            <th className="px-4 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {offlineDevices.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center">
                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                        <CheckCircle2 size={24} className="text-emerald-500/30" />
                                        <p className="text-[9px] font-black uppercase tracking-widest">Tudo em ordem</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            offlineDevices.map(device => (
                                <tr key={device.uuid} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded flex items-center justify-center ${device.channelType === 'alarm' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                <AlertTriangle size={12} />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase leading-none">{device.name}</p>
                                                <p className="text-[8px] text-slate-400 font-black uppercase mt-0.5">{device.channelType === 'alarm' ? 'Alarme' : 'Câmera'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{device.location}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${device.priority === 'CRÍTICO' ? 'text-rose-500 bg-rose-500/10' : 'text-amber-500 bg-amber-500/10'}`}>
                                            {device.priority}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openInfoModal(device)} className="p-1.5 text-slate-400 hover:text-blue-500 transition-all"><Info size={14} /></button>
                                            <button onClick={() => openInfoModal(device, true)} className="p-1.5 text-slate-400 hover:text-amber-500 transition-all"><Edit size={14} /></button>
                                            <button 
                                                onClick={() => handleResolveIssue(device.uuid)} 
                                                disabled={savingId === device.uuid}
                                                className="p-1.5 text-slate-400 hover:text-emerald-500 transition-all"
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
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 px-4">Pontos de Acesso Offline</p>
                    <div className="space-y-2 px-4">
                        {offlineAccessPoints.map(ap => (
                            <div key={ap.uuid} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-800/50">
                                <div className="flex items-center gap-2">
                                    <DoorClosed size={14} className="text-indigo-500" />
                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">{ap.name}</span>
                                </div>
                                <span className="text-[8px] font-black text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded uppercase">{ap.location}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfflineDevicesSection;
