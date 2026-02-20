import React, { useState, useMemo } from 'react';
import { ProcessedWorker, ThirdPartyPayment } from '../types';
import { AlertTriangle, Calendar, Search, Filter, CheckCircle2 } from 'lucide-react';

interface FinancialPendenciesProps {
  workers: ProcessedWorker[];
  payments: ThirdPartyPayment[];
}

interface Pendency {
  id: string;
  date: string;
  workerName: string;
  company: string;
  unit: string;
  accesses: number;
}

const FinancialPendencies: React.FC<FinancialPendenciesProps> = ({ workers, payments }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const pendencies = useMemo(() => {
    // Group workers by date and name
    const attendanceMap = new Map<string, ProcessedWorker[]>();
    
    workers.forEach(worker => {
      // Normalize date to DD/MM/YYYY if needed, assuming they are consistent or we just use the string
      // Let's assume worker.date is DD/MM/YYYY or YYYY-MM-DD, we'll use it directly for grouping
      const key = `${worker.date}_${worker.name.trim().toLowerCase()}`;
      if (!attendanceMap.has(key)) {
        attendanceMap.set(key, []);
      }
      attendanceMap.get(key)!.push(worker);
    });

    // Create a set of payment keys
    const paymentSet = new Set<string>();
    payments.forEach(payment => {
      const key = `${payment.date}_${payment.workerName.trim().toLowerCase()}`;
      paymentSet.add(key);
    });

    const missing: Pendency[] = [];

    attendanceMap.forEach((workerAccesses, key) => {
      if (!paymentSet.has(key)) {
        const firstAccess = workerAccesses[0];
        missing.push({
          id: key,
          date: firstAccess.date,
          workerName: firstAccess.name,
          company: firstAccess.company,
          unit: firstAccess.unit,
          accesses: workerAccesses.length
        });
      }
    });

    // Sort by date descending, then name
    return missing.sort((a, b) => {
      const dateA = a.date.split('/').reverse().join('-');
      const dateB = b.date.split('/').reverse().join('-');
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return a.workerName.localeCompare(b.workerName);
    });
  }, [workers, payments]);

  const filteredPendencies = useMemo(() => {
    return pendencies.filter(p => {
      const matchesSearch = p.workerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.company.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = dateFilter ? p.date === dateFilter || p.date.includes(dateFilter) : true;
      return matchesSearch && matchesDate;
    });
  }, [pendencies, searchTerm, dateFilter]);

  // Get unique dates for filter
  const uniqueDates = useMemo(() => {
    const dates = new Set(pendencies.map(p => p.date));
    return Array.from(dates).sort((a, b) => {
      const dateA = a.split('/').reverse().join('-');
      const dateB = b.split('/').reverse().join('-');
      return dateB.localeCompare(dateA);
    });
  }, [pendencies]);

  return (
    <div className="h-full flex flex-col space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Divergências Financeiras
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Terceirizados com registro de acesso mas sem lançamento financeiro no dia.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 px-3 border-r border-gray-200 dark:border-gray-700">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pendências</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{pendencies.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:text-white"
            />
          </div>
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:text-white appearance-none"
            >
              <option value="">Todas as datas</option>
              {uniqueDates.map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {filteredPendencies.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">Nenhuma divergência encontrada</p>
              <p className="text-sm text-center max-w-md">
                Todos os terceirizados que acessaram a unidade possuem registro financeiro correspondente para os dias filtrados.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredPendencies.map((pendency) => (
                <div 
                  key={pendency.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0 mt-1 sm:mt-0">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{pendency.workerName}</h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {pendency.date}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                        <span>{pendency.company}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                        <span>{pendency.unit}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400">
                      Falta Lançamento
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      {pendency.accesses} registro(s) de acesso no dia
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialPendencies;
