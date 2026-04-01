
import React, { useState, useMemo } from 'react';
import { AlertTriangle, Info, Edit, CheckCircle2, Loader2, DoorClosed, Warehouse, MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import { Camera, AccessPoint } from '../../types';

interface OfflineDevicesSectionProps {
    offlineDevices: (Camera & { priority: string })[];
    offlineAccessPoints: (AccessPoint & { priority: string })[];
    openInfoModal: (device: Camera | AccessPoint, editMode?: boolean) => void;
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
    const [expandedWarehouses, setExpandedWarehouses] = useState<Set<string>>(new Set());

    const toggleWarehouse = (warehouse: string) => {
        const newExpanded = new Set(expandedWarehouses);
        if (newExpanded.has(warehouse)) {
            newExpanded.delete(warehouse);
        } else {
            newExpanded.add(warehouse);
        }
        setExpandedWarehouses(newExpanded);
    };

    const groupedItems = useMemo(() => {
        const groups: { 
            [key: string]: { 
                cameras: (Camera & { priority: string })[], 
                accessPoints: (AccessPoint & { priority: string })[] 
            } 
        } = {};

        offlineDevices.forEach(device => {
            const w = device.warehouse || 'Sem Galpão';
            if (!groups[w]) groups[w] = { cameras: [], accessPoints: [] };
            groups[w].cameras.push(device);
        });

        offlineAccessPoints.forEach(ap => {
            const w = ap.warehouse || 'Sem Galpão';
            if (!groups[w]) groups[w] = { cameras: [], accessPoints: [] };
            groups[w].accessPoints.push(ap);
        });

        // Sort warehouses alphabetically
        return Object.keys(groups).sort().reduce((acc, key) => {
            acc[key] = groups[key];
            return acc;
        }, {} as typeof groups);
    }, [offlineDevices, offlineAccessPoints]);

    if (offlineDevices.length === 0 && offlineAccessPoints.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
                <div className="w-12 h-12 rounded-full bg-emerald-500/5 flex items-center justify-center">
                    <CheckCircle2 size={24} className="text-emerald-500/40" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tudo em ordem no sistema</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {Object.entries(groupedItems).map(([warehouse, items]) => {
                const isExpanded = expandedWarehouses.has(warehouse);
                const totalCount = items.cameras.length + items.accessPoints.length;

                return (
                    <div key={warehouse} className="bg-white dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/50 rounded-2xl overflow-hidden transition-all">
                        {/* Warehouse Header */}
                        <button 
                            onClick={() => toggleWarehouse(warehouse)}
                            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${warehouse === 'Sem Galpão' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                    <Warehouse size={16} />
                                </div>
                                <div className="text-left">
                                    <h4 className="text-[12px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">{warehouse}</h4>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                        {totalCount} {totalCount === 1 ? 'Dispositivo Offline' : 'Dispositivos Offline'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                    {items.cameras.length > 0 && (
                                        <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-black text-white">
                                            {items.cameras.length}
                                        </div>
                                    )}
                                    {items.accessPoints.length > 0 && (
                                        <div className="w-6 h-6 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-black text-white">
                                            {items.accessPoints.length}
                                        </div>
                                    )}
                                </div>
                                {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                            </div>
                        </button>

                        {/* Collapsible Content */}
                        {isExpanded && (
                            <div className="border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/10">
                                {/* Cameras and Alarms Table */}
                                {items.cameras.length > 0 && (
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/30">
                                                    <th className="px-6 py-3">Dispositivo</th>
                                                    <th className="px-6 py-3">Local</th>
                                                    <th className="px-6 py-3">Prioridade</th>
                                                    <th className="px-6 py-3 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/20">
                                                {items.cameras.map(device => (
                                                    <tr key={device.uuid} className="hover:bg-white dark:hover:bg-slate-800/40 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${device.channelType === 'alarm' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                                    <AlertTriangle size={12} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase leading-none truncate">{device.name}</p>
                                                                    <p className="text-[8px] text-slate-400 font-black uppercase mt-1 tracking-tighter">{device.channelType === 'alarm' ? 'Alarme' : 'Câmera'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                                <MapPin size={10} className="shrink-0" />
                                                                <span className="text-[9px] font-bold uppercase truncate max-w-[120px]">{device.location}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${device.priority === 'CRÍTICO' ? 'text-rose-500 bg-rose-500/10 border border-rose-500/20' : 'text-amber-500 bg-amber-500/10 border border-amber-500/20'}`}>
                                                                {device.priority}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => openInfoModal(device)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"><Info size={12} /></button>
                                                                <button onClick={() => openInfoModal(device, true)} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"><Edit size={12} /></button>
                                                                <button 
                                                                    onClick={() => handleResolveIssue(device.uuid)} 
                                                                    disabled={savingId === device.uuid}
                                                                    className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                                                                >
                                                                    {savingId === device.uuid ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Access Points Grid */}
                                {items.accessPoints.length > 0 && (
                                    <div className={`p-6 ${items.cameras.length > 0 ? 'border-t border-slate-100 dark:border-slate-800/30' : ''}`}>
                                        <div className="flex items-center gap-2 mb-4">
                                            <DoorClosed size={12} className="text-indigo-500" />
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pontos de Acesso Offline</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {items.accessPoints.map(ap => (
                                                <div key={ap.uuid} className="group relative flex flex-col p-4 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 hover:border-indigo-500/30 transition-all">
                                                    <div className="flex items-start justify-between mb-3 gap-2">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                                                                <DoorClosed size={14} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase block truncate leading-none" title={ap.name}>{ap.name}</span>
                                                                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter mt-1 block">Acesso Restrito</span>
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0 text-[8px] font-black text-rose-500 bg-rose-500/10 px-2 py-1 rounded-xl uppercase border border-rose-500/10 text-center leading-tight">
                                                            CONTROLE<br/>DE<br/>ACESSO
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 pt-3 border-t border-slate-50 dark:border-slate-800/30">
                                                        <button 
                                                            onClick={() => openInfoModal(ap)} 
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-500 hover:bg-blue-500/5 rounded-lg transition-all"
                                                        >
                                                            <Info size={12} />
                                                            Info
                                                        </button>
                                                        <button 
                                                            onClick={() => openInfoModal(ap, true)} 
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-amber-500 hover:bg-amber-500/5 rounded-lg transition-all"
                                                        >
                                                            <Edit size={12} />
                                                            Editar
                                                        </button>
                                                        <button 
                                                            onClick={() => handleResolveIssue(ap.uuid)} 
                                                            disabled={savingId === ap.uuid}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/5 rounded-lg transition-all"
                                                        >
                                                            {savingId === ap.uuid ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                                            OK
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default OfflineDevicesSection;
