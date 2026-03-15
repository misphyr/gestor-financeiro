import React, { useState, useEffect } from 'react';
import { storage, calculateMonthlyForecast } from '../utils/storage';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Download } from 'lucide-react';

export default function Reports() {
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  useEffect(() => {
    window.addEventListener('expenseAdded', () => {});
    window.addEventListener('subscriptionAdded', () => {});
  }, []);

  const expenses = storage.expenses.getAll();
  const subscriptions = storage.subscriptions.getAll().filter(s => s.active);
  const forecast = calculateMonthlyForecast(reportYear, reportMonth);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = [
    new Date().getFullYear() - 1,
    new Date().getFullYear(),
    new Date().getFullYear() + 1
  ];

  const getMonthExpenses = () => {
    const targetDate = new Date(reportYear, reportMonth, 1);
    const nextMonthDate = new Date(reportYear, reportMonth + 1, 1);
    return expenses.filter(e => {
      const eDate = new Date(e.date);
      return eDate >= targetDate && eDate < nextMonthDate;
    });
  };

  const expensesByCategory = () => {
    const monthExpenses = getMonthExpenses();
    const result = [];
    const categories = storage.categories.getAll();
    const catMap = {};
    categories.forEach(c => catMap[c.name] = c);

    const grouped = {};
    monthExpenses.forEach(e => {
      if (!grouped[e.category]) grouped[e.category] = 0;
      grouped[e.category] += parseFloat(e.amount || 0);
    });

    Object.entries(grouped).forEach(([cat, amount]) => {
      result.push({ name: cat, value: amount });
    });

    return result;
  };

  const handleExport = () => {
    const data = {
      period: `${months[reportMonth]} / ${reportYear}`,
      forecast,
      expenses: getMonthExpenses(),
      subscriptions,
      timestamp: new Date().toISOString()
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${reportYear}-${String(reportMonth + 1).padStart(2, '0')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const monthExpenses = getMonthExpenses();
    let csv = 'Data,Categoria,Descrição,Valor\n';
    
    monthExpenses.forEach(e => {
      csv += `${e.date},"${e.category}","${e.description || ''}",${e.amount}\n`;
    });

    subscriptions.forEach(s => {
      csv += `,"${s.name}","${s.frequency === 'monthly' ? 'Mensal' : 'Anual'}",${s.amount}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${reportYear}-${String(reportMonth + 1).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categoryData = expensesByCategory();
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="grid grid-cols-2 gap-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mês
              </label>
              <select
                value={reportMonth}
                onChange={(e) => setReportMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {months.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ano
              </label>
              <select
                value={reportYear}
                onChange={(e) => setReportYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={handleExport}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
            >
              <Download size={18} /> JSON
            </button>
            <button
              onClick={handleExportCSV}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
            >
              <Download size={18} /> CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-1">Total Previsto</p>
          <p className="text-3xl font-bold">R$ {forecast.total.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-1">Gastos Registrados</p>
          <p className="text-3xl font-bold">R$ {forecast.expenses.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-1">Assinaturas</p>
          <p className="text-3xl font-bold">R$ {(forecast.subscriptions + forecast.annual).toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-1">Diff. Previsto</p>
          <p className={`text-3xl font-bold ${forecast.total >= forecast.expenses ? 'text-green-300' : 'text-red-300'}`}>
            R$ {(forecast.total - forecast.expenses).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Charts */}
      {categoryData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Gastos por Categoria</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Distribuição por Categoria</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: R$ ${value.toFixed(2)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detailed List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold mb-4 text-gray-800">Detalhamento do Período</h3>
        
        <div className="space-y-4">
          {/* Expenses */}
          {getMonthExpenses().length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Gastos Variáveis</h4>
              <div className="space-y-1 text-sm">
                {getMonthExpenses().map(e => (
                  <div key={e.id} className="flex justify-between text-gray-600">
                    <span>{e.date} - {e.category}</span>
                    <span>R$ {parseFloat(e.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subscriptions */}
          {subscriptions.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-700 mb-2">Assinaturas</h4>
              <div className="space-y-1 text-sm">
                {subscriptions.map(s => (
                  <div key={s.id} className="flex justify-between text-gray-600">
                    <span>{s.name} ({s.frequency === 'monthly' ? 'Mês' : 'Ano'})</span>
                    <span>R$ {parseFloat(s.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
