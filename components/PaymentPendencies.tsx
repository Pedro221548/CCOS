import React, { useState, useMemo } from 'react';
import { ProcessedWorker, ThirdPartyPayment } from '../types';
import { AlertTriangle, Search, Filter, CheckCircle2, Calendar, Building2, User } from 'lucide-react';

interface PaymentPendenciesProps {
  thirdPartyWorkers: ProcessedWorker[];
  payments: ThirdPartyPayment[];
}

interface Pendency {
  id: string;
  name: string;
  company: string;
  unit: string;
  date: string;
  accessCount: number;
}

const PaymentPendencies: React.FC<PaymentPendenciesProps> = ({ thirdPartyWorkers, payments }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  const pendencies = useMemo(() => {
    // Group accesses by worker and date
    const accessMap = new Map<string, Pendency>();

    thirdPartyWorkers.forEach(worker => {
      // Create a unique key for worker + date
      const key = `${worker.name.toLowerCase()}_${worker.date}`;
      
      if (!accessMap.has(key)) {
        accessMap.set(key, {
          id: key,
          name: worker.name,
          company: worker.company,
          unit: worker.unit,
          date: worker.date,
          accessCount: 1
        });
      } else {
        const existing = accessMap.get(key)!;
        existing.accessCount += 1;
      }
    });

    // Check against payments
    const pendencyList: Pendency[] = [];

    accessMap.forEach(access => {
      const hasPayment = payments.some(
        payment => 
          payment.workerName.toLowerCase() === access.name.toLowerCase() && 
          payment.date === access.date
      );

      if (!hasPayment) {
        pendencyList.push(access);
      }
    });

    // Sort by date descending
    return pendencyList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [thirdPartyWorkers, payments]);

  const companies = useMemo(() => {
    const unique = new Set(pendencies.map(p => p.company));
    return Array.from(unique).sort();
  }, [pendencies]);

  const filteredPendencies = useMemo(() => {
    return pendencies.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.company.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCompany = filterCompany === 'all' || p.company === filterCompany;
      const matchesDate = !filterDate || p.date === filterDate;
      
      return matchesSearch && matchesCompany && matchesDate;
    });
  }, [pendencies, searchTerm, filterCompany, filterDate]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800/50 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
            <AlertTriangle className="text-rose-500" size={28} />
            Auditoria Financeira
          </h2>
          <p className="text-slate-400 text-sm mt-1 font-medium">
            Identifique terceirizados com registro de acesso que não possuem lançamento financeiro no mesmo dia.
          </p>
        </div>
        
        <div className="bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl flex items-center gap-4">
          <div className="bg-rose-500/20 p-2 rounded-lg">
            <AlertTriangle className="text-rose-500" size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-rose-500 uppercase tracking-wider">Pendências Encontradas</p>
            <p className="text-2xl font-black text-white">{pendencies.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome ou empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1c1e26] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
        
        <div className="flex gap-4">
          <div className="relative min-w-[200px]">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="w-full bg-[#1c1e26] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors appearance-none"
            >
              <option value="all">Todas as Empresas</option>
              {companies.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="relative min-w-[160px]">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-[#1c1e26] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1c1e26] border-b border-slate-800">
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Nome do Terceirizado</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Empresa</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Unidade</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Data do Acesso</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Registros de Acesso</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredPendencies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <CheckCircle2 size={48} className="text-emerald-500/50" />
                      <p className="text-sm font-bold uppercase tracking-widest">Nenhuma pendência encontrada</p>
                      <p className="text-xs">Todos os acessos possuem lançamento financeiro correspondente.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPendencies.map((pendency) => (
                  <tr key={pendency.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                          <User size={14} className="text-slate-400" />
                        </div>
                        <span className="text-sm font-bold text-white">{pendency.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-300 font-medium">{pendency.company}</td>
                    <td className="p-4 text-sm text-slate-400">{pendency.unit}</td>
                    <td className="p-4 text-sm text-slate-300 font-mono">{new Date(pendency.date).toLocaleDateString('pt-BR')}</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-slate-800 text-xs font-bold text-slate-300">
                        {pendency.accessCount} {pendency.accessCount === 1 ? 'acesso' : 'acessos'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-500 uppercase tracking-wider">
                        <AlertTriangle size={12} />
                        Sem Lançamento
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentPendencies;
