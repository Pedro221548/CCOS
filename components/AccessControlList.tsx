
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AccessPoint } from '../types';
import { ShieldCheck, MapPin, Clock, DoorClosed, AlertTriangle, Warehouse, Activity, RefreshCw, Filter, Search, X, Plus, Edit2, Trash2 } from 'lucide-react';

interface AccessControlListProps {
  accessPoints: AccessPoint[];
  onToggleStatus: (uuid: string) => void;
  onAdd?: (ap: AccessPoint) => void;
  onEdit?: (ap: AccessPoint) => void;
  onDelete?: (uuid: string) => void;
  readOnly?: boolean;
  allowedWarehouses?: string[]; // New prop for filtering
}

// Reuse logic
const hasWarehousePermission = (allowedList: string[] | undefined, targetWarehouse: string) => {
    if (!allowedList || allowedList.length === 0) return false;
    const normalizedTarget = (targetWarehouse || '').toUpperCase();
    return allowedList.some(allowed => {
        const normalizedAllowed = allowed.toUpperCase();
        if (normalizedAllowed === normalizedTarget) return true;
        if (normalizedAllowed.includes(normalizedTarget) || normalizedTarget.includes(normalizedAllowed)) return true;
        if (normalizedAllowed.includes('SP-IP') && normalizedTarget.includes('ITAPEVI')) return true;
        if (normalizedAllowed.includes('PAVUNA') && normalizedTarget.includes('PAVUNA')) return true;
        if (normalizedAllowed.includes('MERITI') && normalizedTarget.includes('MERITI')) return true;
        if (normalizedAllowed.includes('4 ELOS') && normalizedTarget.includes('ELOS')) return true;
        return false;
    });
};

const AccessControlList: React.FC<AccessControlListProps> = ({ accessPoints, onToggleStatus, onAdd, onEdit, onDelete, readOnly = false, allowedWarehouses }) => {
  const [countdown, setCountdown] = useState(30);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string>('-');

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingAp, setEditingAp] = useState<AccessPoint | null>(null);
  const [formData, setFormData] = useState<Partial<AccessPoint>>({});

  useEffect(() => {
    const timer = setInterval(() => {
        setCountdown((prev) => {
            if (prev <= 1) {
                setIsScanning(true);
                setTimeout(() => {
                    setIsScanning(false);
                    const now = new Date();
                    setLastScanTime(now.toLocaleTimeString('pt-BR'));
                }, 1500);
                return 30;
            }
            return prev - 1;
        });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getLatency = useCallback((status: string) => {
      if (status === 'OFFLINE') return 'Sem Resposta';
      return Math.floor(Math.random() * 13) + 2 + 'ms';
  }, []);

  // 1. Initial Permission Filtering
  const permittedPoints = useMemo(() => {
      if (allowedWarehouses && allowedWarehouses.length > 0) {
          return accessPoints.filter(ap => hasWarehousePermission(allowedWarehouses, ap.warehouse));
      }
      return accessPoints;
  }, [accessPoints, allowedWarehouses]);

  const uniqueWarehouses = useMemo(() => Array.from(new Set(permittedPoints.map(p => p.warehouse))).sort(), [permittedPoints]);

  const filteredPoints = useMemo(() => {
    return permittedPoints
        .filter(ap => {
            const matchesSearch = 
                ap.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ap.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ap.location.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === 'ALL' || ap.status === statusFilter;
            const matchesWarehouse = warehouseFilter === 'ALL' || ap.warehouse === warehouseFilter;

            return matchesSearch && matchesStatus && matchesWarehouse;
        })
        .sort((a, b) => {
            if (a.status === 'OFFLINE' && b.status === 'ONLINE') return -1;
            if (a.status === 'ONLINE' && b.status === 'OFFLINE') return 1;
            return a.name.localeCompare(b.name);
        });
  }, [permittedPoints, searchTerm, statusFilter, warehouseFilter]);

  const totalOnline = useMemo(() => permittedPoints.filter(p => p.status === 'ONLINE').length, [permittedPoints]);
  const totalOffline = useMemo(() => permittedPoints.filter(p => p.status === 'OFFLINE').length, [permittedPoints]);

  // CRUD Handlers
  const openAddModal = useCallback(() => {
      setEditingAp(null);
      setFormData({ status: 'ONLINE', warehouse: 'Geral', type: 'Controle de Acesso' });
      setShowModal(true);
  }, []);

  const openEditModal = useCallback((ap: AccessPoint) => {
      setEditingAp(ap);
      setFormData({ ...ap });
      setShowModal(true);
  }, []);

  const handleSave = useCallback((e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name || !formData.id) return;

      if (editingAp) {
          if (onEdit) onEdit({ ...editingAp, ...formData } as AccessPoint);
      } else {
          if (onAdd) onAdd({
              ...formData,
              uuid: `access-${Date.now()}`,
              status: formData.status || 'ONLINE',
              lastLog: new Date().toISOString()
          } as AccessPoint);
      }
      setShowModal(false);
  }, [formData, editingAp, onEdit, onAdd]);

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header with Stats */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <DoorClosed className="text-blue-500" />
                    Controle de Acesso
                </h2>
                {allowedWarehouses && (
                    <p className="text-xs text-slate-400 mt-1">
                        Visualizando apenas galpões permitidos.
                    </p>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="flex gap-2">
                    <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        ON: {totalOnline}
                    </div>
                    <div className="px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        OFF: {totalOffline}
                    </div>
                </div>
                {!readOnly && (
                    <button 
                        onClick={openAddModal}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/30"
                    >
                        <Plus size={16} /> Adicionar
                    </button>
                )}
            </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                    type="text" 
                    placeholder="Pesquisar dispositivo, ID ou local..." 
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                 <div className="relative">
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="w-full sm:w-40 pl-3 pr-8 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
                    >
                        <option value="ALL">Todos Status</option>
                        <option value="ONLINE">Online</option>
                        <option value="OFFLINE">Offline</option>
                    </select>
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                 </div>

                 <div className="relative">
                    <select 
                        value={warehouseFilter}
                        onChange={(e) => setWarehouseFilter(e.target.value)}
                        className="w-full sm:w-48 pl-3 pr-8 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
                    >
                        <option value="ALL">
                            {allowedWarehouses ? 'Meus Galpões' : 'Todos Galpões'}
                        </option>
                        {uniqueWarehouses.map(w => (
                            <option key={w} value={w}>{w}</option>
                        ))}
                    </select>
                    <Warehouse className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                 </div>

                 {(searchTerm || statusFilter !== 'ALL' || warehouseFilter !== 'ALL') && (
                     <button 
                        onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('ALL');
                            setWarehouseFilter('ALL');
                        }}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors text-sm flex items-center justify-center"
                        title="Limpar filtros"
                     >
                        <X size={18} />
                     </button>
                 )}
            </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-slate-400">
             <Activity size={16} className={isScanning ? 'animate-spin text-blue-500' : 'text-slate-600'} />
             <span>Status de Conexão: <span className="text-slate-200 font-medium">{isScanning ? 'Verificando...' : 'Monitorando'}</span></span>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-slate-500 hidden sm:inline">Próxima verificação em: <span className="text-blue-400 font-mono w-4 inline-block text-right">{countdown}s</span></span>
             <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                 <div 
                    className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${(countdown / 30) * 100}%` }}
                 ></div>
             </div>
          </div>
      </div>

      {accessPoints.length === 0 ? (
        <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-800 rounded-xl">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-900 mb-4">
                <DoorClosed className="text-slate-600" size={32} />
            </div>
            <p className="text-slate-400 text-lg">Nenhum controle de acesso cadastrado</p>
        </div>
      ) : filteredPoints.length === 0 ? (
        <div className="col-span-full p-12 text-center border border-slate-800 rounded-xl bg-slate-900/50">
            <p className="text-slate-300 font-medium">Nenhum resultado encontrado</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold">
                        <tr>
                            <th className="p-4 w-12 text-center">#</th>
                            <th className="p-4">Dispositivo / ID</th>
                            <th className="p-4">Galpão / Local</th>
                            <th className="p-4 text-center">Ping (ms)</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-slate-300">
                        {filteredPoints.map((ap, idx) => (
                            <tr key={ap.uuid} className="hover:bg-slate-800/30 transition-colors group">
                                <td className="p-4 text-center text-slate-600 font-mono text-xs">
                                    {idx + 1}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${ap.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                            <ShieldCheck size={20} />
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">{ap.name}</div>
                                            <div className="text-xs text-slate-500 font-mono mt-0.5">{ap.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                            <Warehouse size={12} className="text-indigo-400" />
                                            <span className="text-indigo-200">{ap.warehouse}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <MapPin size={12} />
                                            {ap.location}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`font-mono text-xs ${ap.status === 'ONLINE' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {getLatency(ap.status)}
                                    </span>
                                </td>
                                <td className="p-4 text-center">
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border justify-center min-w-[90px]
                                        ${ap.status === 'ONLINE' 
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}
                                    `}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${ap.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></span>
                                        {ap.status}
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        {!readOnly && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEditModal(ap)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => onDelete && onDelete(ap.uuid)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                        <label className={`relative inline-flex items-center ${readOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer"
                                                checked={ap.status === 'OFFLINE'}
                                                onChange={() => !readOnly && onToggleStatus(ap.uuid)}
                                                disabled={readOnly}
                                            />
                                            <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:bg-rose-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                                        </label>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Modal */}
      {showModal && !readOnly && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                      <h3 className="text-xl font-bold text-white">
                          {editingAp ? 'Editar Acesso' : 'Adicionar Acesso'}
                      </h3>
                      <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white">
                          <X size={20} />
                      </button>
                  </div>
                  <form onSubmit={handleSave} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                              <label className="block text-xs text-slate-400 mb-1">Nome</label>
                              <input type="text" required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm" />
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">ID / Serial</label>
                              <input type="text" required value={formData.id || ''} onChange={e => setFormData({...formData, id: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm" />
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">Galpão</label>
                              <input type="text" value={formData.warehouse || ''} onChange={e => setFormData({...formData, warehouse: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm" />
                          </div>
                          <div className="col-span-2">
                              <label className="block text-xs text-slate-400 mb-1">Localização</label>
                              <input type="text" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm" />
                          </div>
                      </div>
                      <div className="flex gap-3 pt-4 border-t border-slate-800">
                          <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700">Cancelar</button>
                          <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 font-bold">Salvar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default React.memo(AccessControlList);
