
import React, { useState, useMemo, useCallback } from 'react';
import { Camera, Status } from '../types';
import { Video, MapPin, User, AlertCircle, Search, X, Filter, Warehouse, Plus, Edit2, Trash2, PowerOff, Power, Clock, Download, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import Checkbox from './ui/Checkbox';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface CameraListProps {
  cameras: Camera[];
  onToggleStatus: (uuid: string) => void;
  onSetWarehouseStatus?: (warehouse: string, status: Status) => void;
  onAdd?: (cam: Camera) => void;
  onEdit?: (cam: Camera) => void;
  onDelete?: (uuid: string) => void;
  onImportCameraData?: (updates: { name: string; recordingTime?: string; warehouse?: string }[]) => void;
  readOnly?: boolean;
  allowedWarehouses?: string[]; // New prop for filtering
  userRole?: string;
}

// Reuse logic (should ideally be in a util)
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

const CameraList: React.FC<CameraListProps> = ({ cameras, onToggleStatus, onSetWarehouseStatus, onAdd, onEdit, onDelete, onImportCameraData, readOnly = false, allowedWarehouses, userRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [moduleFilter, setModuleFilter] = useState<string>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCam, setEditingCam] = useState<Camera | null>(null);
  const [formData, setFormData] = useState<Partial<Camera>>({});

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isAlarm = useMemo(() => cameras.length > 0 && cameras[0].channelType === 'alarm', [cameras]);
  const itemLabel = isAlarm ? 'Alarme' : 'Câmera';
  const itemLabelPlural = isAlarm ? 'Alarmes' : 'Câmeras';

  // 1. Initial Permission Filtering
  const permittedCameras = useMemo(() => {
      if (allowedWarehouses && allowedWarehouses.length > 0) {
          return cameras.filter(c => hasWarehousePermission(allowedWarehouses, c.warehouse));
      }
      return cameras;
  }, [cameras, allowedWarehouses]);

  // Unique lists for dropdowns based on PERMITTED cameras
  const uniqueModules = useMemo(() => Array.from(new Set(permittedCameras.map(c => c.module))).sort(), [permittedCameras]);
  const uniqueWarehouses = useMemo(() => Array.from(new Set(permittedCameras.map(c => c.warehouse))).sort(), [permittedCameras]);

  // Filter & Sort Logic - Memoized
  const filteredCameras = useMemo(() => {
    return permittedCameras
        .filter(cam => {
            const lowerTerm = searchTerm.toLowerCase();
            const matchesSearch = (
                cam.name.toLowerCase().includes(lowerTerm) ||
                cam.id.toLowerCase().includes(lowerTerm) ||
                cam.location.toLowerCase().includes(lowerTerm) ||
                cam.module.toLowerCase().includes(lowerTerm) ||
                cam.warehouse.toLowerCase().includes(lowerTerm) ||
                cam.responsible.toLowerCase().includes(lowerTerm)
            );

            const matchesStatus = statusFilter === 'ALL' || cam.status === statusFilter;
            const matchesModule = moduleFilter === 'ALL' || cam.module === moduleFilter;
            const matchesWarehouse = warehouseFilter === 'ALL' || cam.warehouse === warehouseFilter;

            return matchesSearch && matchesStatus && matchesModule && matchesWarehouse;
        })
        .sort((a, b) => {
            if (a.status === 'OFFLINE' && b.status === 'ONLINE') return -1;
            if (a.status === 'ONLINE' && b.status === 'OFFLINE') return 1;
            return a.name.localeCompare(b.name);
        });
  }, [permittedCameras, searchTerm, statusFilter, moduleFilter, warehouseFilter]);

  const totalOnline = useMemo(() => permittedCameras.filter(c => c.status === 'ONLINE').length, [permittedCameras]);
  const totalOffline = useMemo(() => permittedCameras.filter(c => c.status === 'OFFLINE').length, [permittedCameras]);

  // State for expanded warehouses
  const [expandedWarehouses, setExpandedWarehouses] = useState<Set<string>>(new Set());

  // Group by Warehouse logic
  const groupedByWarehouse = useMemo(() => {
    const groups: { [key: string]: Camera[] } = {};
    filteredCameras.forEach(cam => {
      const w = cam.warehouse || 'Sem Galpão';
      if (!groups[w]) groups[w] = [];
      groups[w].push(cam);
    });
    // Sort warehouses alphabetically
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {} as { [key: string]: Camera[] });
  }, [filteredCameras]);

  const toggleWarehouse = (warehouse: string) => {
    const newExpanded = new Set(expandedWarehouses);
    if (newExpanded.has(warehouse)) {
      newExpanded.delete(warehouse);
    } else {
      newExpanded.add(warehouse);
    }
    setExpandedWarehouses(newExpanded);
  };

  // CRUD Handlers - Memoized
  const openAddModal = useCallback(() => {
      setEditingCam(null);
      setFormData({ status: 'ONLINE', warehouse: 'Geral', module: 'Geral' });
      setShowModal(true);
  }, []);

  const openEditModal = useCallback((cam: Camera) => {
      setEditingCam(cam);
      setFormData({ ...cam });
      setShowModal(true);
  }, []);

  const handleSave = useCallback((e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name || !formData.id) return;

      if (editingCam) {
          // Edit
          const updatedCam = { ...editingCam, ...formData };
          if (formData.warehouse !== undefined && formData.warehouse !== editingCam.warehouse) {
              updatedCam.warehouseManuallyEdited = true;
          }
          if (onEdit) onEdit(updatedCam as Camera);
      } else {
          // Add
          if (onAdd) onAdd({
              ...formData,
              uuid: `cam-${Date.now()}`,
              status: formData.status || 'ONLINE',
              warehouseManuallyEdited: !!(formData.warehouse && formData.warehouse !== 'Geral' && formData.warehouse !== 'Sem Galpão')
          } as Camera);
      }
      setShowModal(false);
  }, [formData, editingCam, onEdit, onAdd]);

  const handleExportExcel = async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(itemLabelPlural);

      worksheet.columns = [
          { header: 'NOME DA CAMERA', key: 'name', width: 40 },
          { header: 'GALPÃO', key: 'warehouse', width: 25 },
          { header: 'STATUS ON/OFF', key: 'status', width: 20 },
          { header: 'TEMPO DE GRAVAÇÃO', key: 'recordingTime', width: 25 },
          { header: 'RESPONSAVEL', key: 'responsible', width: 30 }
      ];

      filteredCameras.forEach(cam => {
          worksheet.addRow({
              name: cam.name,
              warehouse: cam.warehouse,
              status: cam.status,
              recordingTime: cam.recordingTime || '-',
              responsible: cam.responsible || '-'
          });
      });

      worksheet.eachRow((row, rowNumber) => {
          row.eachCell((cell) => {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
              if (rowNumber === 1) {
                  cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                  cell.fill = {
                      type: 'pattern',
                      pattern: 'solid',
                      fgColor: { argb: 'FF1E293B' } // slate-800
                  };
              }
          });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'Lista_Cameras.xlsx');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(await file.arrayBuffer());
          const worksheet = workbook.getWorksheet(1);
          
          if (!worksheet) throw new Error("Planilha vazia");

          const updates: { name: string; recordingTime?: string; warehouse?: string }[] = [];

          worksheet.eachRow((row, rowNumber) => {
              if (rowNumber === 1) return; // Skip header
              const name = row.getCell(1).value?.toString() || '';
              const warehouse = row.getCell(2).value?.toString() || '';
              const recordingTime = row.getCell(4).value?.toString() || '';
              
              if (name) {
                  updates.push({ 
                      name, 
                      recordingTime: (recordingTime && recordingTime !== '-') ? recordingTime : undefined,
                      warehouse: (warehouse && warehouse !== '-') ? warehouse : undefined
                  });
              }
          });

          if (onImportCameraData && updates.length > 0) {
              onImportCameraData(updates);
          }
      } catch (err) {
          console.error("Erro ao importar planilha:", err);
          alert("Erro ao importar planilha. Verifique o formato.");
      } finally {
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header Area */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Video className="text-blue-500" />
                        Lista de {itemLabelPlural}
                    </h2>
                    {allowedWarehouses && (
                        <p className="text-xs text-slate-400 mt-1">
                            Visualizando apenas galpões permitidos.
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleExportExcel}
                        className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        title="Exportar para Excel"
                    >
                        <Download size={16} /> Exportar
                    </button>
                    {!readOnly && onImportCameraData && (
                        <>
                            <input 
                                type="file" 
                                accept=".xlsx"
                                ref={fileInputRef}
                                onChange={handleImportExcel}
                                className="hidden"
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                title="Importar Dados (Excel)"
                            >
                                <Upload size={16} /> Importar
                            </button>
                        </>
                    )}
                </div>
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
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col xl:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                    placeholder="Pesquisar por nome, ID, local, módulo ou responsável..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                 {/* Status Filter */}
                 <div className="relative flex-1 sm:flex-none">
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
                 
                 {/* Warehouse Filter */}
                 <div className="relative flex-1 sm:flex-none">
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

                 {/* Module Filter */}
                 <div className="relative flex-1 sm:flex-none">
                    <select 
                        value={moduleFilter}
                        onChange={(e) => setModuleFilter(e.target.value)}
                        className="w-full sm:w-48 pl-3 pr-8 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
                    >
                        <option value="ALL">Todos Módulos</option>
                        {uniqueModules.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                 </div>

                 {/* Bulk Actions - Warehouse */}
                 {warehouseFilter !== 'ALL' && !readOnly && onSetWarehouseStatus && (
                     <div className="flex items-center gap-2">
                         <button
                            onClick={() => {
                                if (window.confirm(`Deseja LIGAR todos os ${itemLabelPlural.toLowerCase()} de "${warehouseFilter}"?`)) {
                                    onSetWarehouseStatus(warehouseFilter, 'ONLINE');
                                }
                            }}
                            className="px-3 py-2 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 hover:text-white border border-emerald-800 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 whitespace-nowrap"
                            title={`Ligar todos os ${itemLabelPlural.toLowerCase()} de ${warehouseFilter}`}
                         >
                            <Power size={16} /> <span className="hidden xl:inline">Ligar Galpão</span>
                         </button>
                         <button
                            onClick={() => {
                                if (window.confirm(`ATENÇÃO: Deseja realmente mudar TODOS os ${itemLabelPlural.toLowerCase()} de "${warehouseFilter}" para OFFLINE?`)) {
                                    onSetWarehouseStatus(warehouseFilter, 'OFFLINE');
                                }
                            }}
                            className="px-3 py-2 bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 hover:text-white border border-rose-800 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 whitespace-nowrap"
                            title={`Desligar todos os ${itemLabelPlural.toLowerCase()} de ${warehouseFilter}`}
                         >
                            <PowerOff size={16} /> <span className="hidden xl:inline">Desligar Galpão</span>
                         </button>
                     </div>
                 )}

                 {/* Reset Filters */}
                 {(searchTerm || statusFilter !== 'ALL' || moduleFilter !== 'ALL' || warehouseFilter !== 'ALL') && (
                     <button 
                        onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('ALL');
                            setModuleFilter('ALL');
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

      {cameras.length === 0 ? (
            <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-800 rounded-xl">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-900 mb-4">
                    {isAlarm ? <AlertCircle className="text-slate-600" size={32} /> : <Video className="text-slate-600" size={32} />}
                </div>
                <p className="text-slate-400 text-lg">Nenhum {itemLabel.toLowerCase()} cadastrado</p>
                {readOnly && <p className="text-slate-600 text-sm mt-1">Aguarde o cadastro pelo administrador.</p>}
            </div>
      ) : filteredCameras.length === 0 ? (
            <div className="col-span-full p-12 text-center border border-slate-800 rounded-xl bg-slate-900/50">
                <p className="text-slate-300 font-medium">Nenhum resultado encontrado</p>
            </div>
      ) : (
        <div className="space-y-6">
            {Object.entries(groupedByWarehouse).map(([warehouse, cams]) => {
                const isExpanded = expandedWarehouses.has(warehouse);
                const isUnassigned = !warehouse || warehouse === 'Sem Galpão' || warehouse === 'Geral';
                
                return (
                    <div key={warehouse} className={`border rounded-xl overflow-hidden transition-all duration-300 ${isUnassigned ? 'border-rose-500/30 bg-rose-500/5 shadow-[0_0_15px_rgba(239,68,68,0.05)]' : 'bg-slate-900/40 border-slate-800'}`}>
                        <button 
                            onClick={() => toggleWarehouse(warehouse)}
                            className={`w-full flex items-center justify-between p-4 transition-colors group ${isUnassigned ? 'hover:bg-rose-500/10' : 'hover:bg-slate-800/50'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${isUnassigned ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                    <Warehouse size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className={`text-lg font-bold flex items-center gap-2 ${isUnassigned ? 'text-rose-500' : 'text-slate-200'}`}>
                                        {warehouse}
                                        {isUnassigned && (
                                            <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] rounded-full animate-pulse font-black uppercase tracking-widest">
                                                Ação Necessária
                                            </span>
                                        )}
                                    </h3>
                                    <span className="text-xs font-medium text-slate-500">
                                        {cams.length} {cams.length === 1 ? itemLabel : itemLabelPlural}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex gap-2">
                                    <div className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                                        ON: {cams.filter(c => c.status === 'ONLINE').length}
                                    </div>
                                    <div className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20">
                                        OFF: {cams.filter(c => c.status === 'OFFLINE').length}
                                    </div>
                                </div>
                                {isExpanded ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
                            </div>
                        </button>

                        {isExpanded && (
                            <div className="p-4 pt-0 border-t border-slate-800/50">
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 mt-4">
                                    {cams.map((cam) => (
                                        <div key={cam.uuid} className={`bg-slate-950/50 border rounded-xl p-5 hover:shadow-lg transition-all relative overflow-hidden group flex flex-col
                                            ${cam.status === 'ONLINE' ? 'border-slate-800 hover:border-emerald-500/30' : 'border-rose-900/50 hover:border-rose-500/50'}
                                        `}>
                                            <div className={`absolute top-0 left-0 w-1 h-full transition-colors ${cam.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                                            <div className="pl-3 flex-1">
                                                <div className="flex justify-between items-start mb-3 gap-2">
                                                    <div className="overflow-hidden">
                                                        <h3 className="font-semibold text-white text-base leading-tight truncate" title={cam.name}>{cam.name}</h3>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono border border-slate-700">
                                                                {cam.id}
                                                            </div>
                                                            {cam.recordingTime && (
                                                                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20 uppercase tracking-widest" title="Tempo de Gravação">
                                                                    <Clock size={10} />
                                                                    {cam.recordingTime}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Actions or Status */}
                                                    <div className="flex flex-col items-end gap-2">
                                                        <div className={`px-2 py-1 rounded text-[10px] font-bold border flex items-center gap-1.5 shrink-0 uppercase tracking-wider
                                                            ${cam.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}
                                                        `}>
                                                            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${cam.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                            {cam.status}
                                                        </div>
                                                        
                                                        {(!readOnly || userRole === 'operator') && (
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => openEditModal(cam)} className="p-1 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded">
                                                                    <Edit2 size={12} />
                                                                </button>
                                                                {!readOnly && (
                                                                    <button onClick={() => onDelete && onDelete(cam.uuid)} className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded">
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-2 mt-2 pt-2 border-t border-slate-800/50">
                                                    <div className="flex items-start gap-2 text-xs text-slate-400">
                                                        <MapPin size={14} className="text-slate-600 mt-0.5 shrink-0" />
                                                        <span className="line-clamp-2 leading-relaxed font-bold text-slate-200" title={cam.location}>{cam.location}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                                        <User size={14} className="text-slate-600 shrink-0" />
                                                        <span className="truncate">Resp: <span className="text-slate-300 font-medium">{cam.responsible}</span></span>
                                                    </div>
                                                    {/* EXIBIÇÃO DA ÚLTIMA ALTERAÇÃO - TIMESTAMP COMPLETO */}
                                                    <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/50 p-2 rounded border border-slate-800/50 mt-1">
                                                        <Clock size={14} className="text-amber-500 shrink-0" />
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] uppercase font-bold text-slate-500">Última alteração Status</span>
                                                            <span className="text-amber-200/90 font-mono text-[11px]">{cam.lastLog || 'Aguardando Sinc.'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-slate-800/50 pl-3 flex justify-between items-center">
                                                <div className="flex-1">
                                                     {cam.status === 'OFFLINE' && (
                                                         <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-medium">
                                                            <AlertCircle size={12} />
                                                            <span>Verificar conexão</span>
                                                         </div>
                                                     )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {!readOnly && (
                                                        <span className="text-[10px] text-slate-500 group-hover:text-slate-300 transition-colors select-none">
                                                            Flag Off
                                                        </span>
                                                    )}
                                                    <Checkbox 
                                                        checked={cam.status === 'OFFLINE'}
                                                        onChange={() => !readOnly && onToggleStatus(cam.uuid)}
                                                        disabled={readOnly}
                                                        size="sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      )}

      {/* Modal */}
      {showModal && (!readOnly || userRole === 'operator') && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                      <h3 className="text-xl font-bold text-white">
                          {editingCam ? `Editar ${itemLabel}` : `Adicionar ${itemLabel}`}
                      </h3>
                      <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white">
                          <X size={20} />
                      </button>
                  </div>
                  <form onSubmit={handleSave} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                              <label className="block text-xs text-slate-400 mb-1">Nome</label>
                              <input type="text" required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} disabled={readOnly && userRole === 'operator'} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm disabled:opacity-50" />
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">ID / IP</label>
                              <input type="text" required value={formData.id || ''} onChange={e => setFormData({...formData, id: e.target.value})} disabled={readOnly && userRole === 'operator'} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm disabled:opacity-50" />
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">Galpão</label>
                              <input type="text" value={formData.warehouse || ''} onChange={e => setFormData({...formData, warehouse: e.target.value})} disabled={readOnly && userRole === 'operator'} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm disabled:opacity-50" />
                          </div>
                          <div className="col-span-2">
                              <label className="block text-xs text-slate-400 mb-1">Localização Detalhada</label>
                              <input type="text" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} disabled={readOnly && userRole === 'operator'} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm disabled:opacity-50" />
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">Módulo</label>
                              <input type="text" value={formData.module || ''} onChange={e => setFormData({...formData, module: e.target.value})} disabled={readOnly && userRole === 'operator'} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm disabled:opacity-50" />
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">Responsável</label>
                              <input type="text" value={formData.responsible || ''} onChange={e => setFormData({...formData, responsible: e.target.value})} disabled={readOnly && userRole === 'operator'} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm disabled:opacity-50" />
                          </div>
                          <div className="col-span-2">
                              <label className="block text-xs text-slate-400 mb-1">Tempo de Gravação (ex: 30 DIAS)</label>
                              <input type="text" value={formData.recordingTime || ''} onChange={e => setFormData({...formData, recordingTime: e.target.value})} placeholder="Ex: 30 DIAS" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm" />
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

export default React.memo(CameraList);
