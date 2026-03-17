import React, { useState, useEffect } from 'react';
import { storage, calculateMonthlyForecast } from '../utils/storage';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Download, Copy, Check } from 'lucide-react';
import { jsPDF } from 'jspdf';
import CategorySelect from './CategorySelect';

export default function Reports() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.addEventListener('expenseAdded', () => {});
    window.addEventListener('subscriptionAdded', () => {});
  }, []);

  const expenses = storage.expenses.getAll();
  const subscriptions = storage.subscriptions.getAll().filter(s => !s.canceledDate);
  
  // Parse dates for range query
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  // Get active forecast month from startDate
  const reportYear = start.getFullYear();
  const reportMonth = start.getMonth();
  const forecast = calculateMonthlyForecast(reportYear, reportMonth);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const getMonthExpenses = () => {
    let result = expenses.filter(e => {
      const eDate = new Date(e.date);
      return eDate >= start && eDate <= end;
    });

    if (categoryFilter !== 'all') {
      result = result.filter(e => e.category === categoryFilter);
    }

    return result;
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

  const getExpandedExpenses = () => {
    // Get base expenses and expand shared ones into individual charges
    const baseExpenses = getMonthExpenses();
    const expanded = [];

    baseExpenses.forEach(expense => {
      if (expense.isShared && expense.sharedWith && expense.sharedWith.length > 0) {
        // This is a shared expense - create a line for each person who needs to pay
        const amountPerPerson = parseFloat(expense.amount) / expense.sharedWith.length;
        
        expense.sharedWith.forEach(person => {
          if (!person.isMe) {
            // Format description: "Description - Category" or just display the person's share info
            const personDesc = expense.description 
              ? `Cobrança: ${person.name} - ${expense.description}`
              : `Cobrança: ${person.name}`;
            
            expanded.push({
              date: expense.date,
              category: expense.category,
              description: personDesc,
              amount: amountPerPerson
            });
          }
        });
      } else {
        // Regular expense - format as "Description - Category" or just category
        const desc = expense.description 
          ? `${expense.description} - ${expense.category}`
          : expense.category;
        
        expanded.push({
          date: expense.date,
          category: expense.category,
          description: desc,
          amount: expense.amount
        });
      }
    });

    return expanded;
  };

  const handleExport = () => {
    const data = {
      period: `${startDate} até ${endDate}`,
      forecast,
      expenses: getExpandedExpenses(),
      subscriptions,
      timestamp: new Date().toISOString()
    };

    const json = JSON.stringify(data, null, 2);
    const filename = `relatorio-${startDate}_${endDate}.json`;
    
    // Tenta usar download nativo primeiro (desktop)
    if (typeof navigator !== 'undefined' && navigator.msSaveBlob) {
      const blob = new Blob([json], { type: 'application/json' });
      navigator.msSaveBlob(blob, filename);
    } else if (typeof document !== 'undefined') {
      const element = document.createElement('a');
      element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(json));
      element.setAttribute('download', filename);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    let csv = 'Data,Categoria,Descrição,Valor\n';
    
    getExpandedExpenses().forEach(e => {
      csv += `${e.date},"${e.category}","${e.description || ''}",${e.amount}\n`;
    });

    subscriptions.forEach(s => {
      csv += `,"${s.name}","${s.frequency === 'monthly' ? 'Mensal' : 'Anual'}",${s.amount}\n`;
    });

    const filename = `relatorio-${startDate}_${endDate}.csv`;
    if (typeof navigator !== 'undefined' && navigator.msSaveBlob) {
      const blob = new Blob([csv], { type: 'text/csv' });
      navigator.msSaveBlob(blob, filename);
    } else if (typeof document !== 'undefined') {
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
      element.setAttribute('download', filename);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    let yPosition = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    
    // Title
    doc.setFontSize(16);
    doc.text('Relatório Financeiro', margin, yPosition);
    yPosition += 10;
    
    // Period
    doc.setFontSize(10);
    doc.text(`Período: ${startDate} até ${endDate}`, margin, yPosition);
    yPosition += 8;
    
    // Summary
    const expandedExpenses = getExpandedExpenses();
    const totalExpenses = expandedExpenses.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);
    const totalSubscriptions = subscriptions.reduce((acc, s) => acc + parseFloat(s.amount || 0), 0);
    
    doc.setFontSize(11);
    doc.text('Resumo:', margin, yPosition);
    yPosition += 6;
    
    doc.setFontSize(9);
    doc.text(`Total de Gastos: R$ ${totalExpenses.toFixed(2)}`, margin + 5, yPosition);
    yPosition += 5;
    doc.text(`Total de Assinaturas: R$ ${totalSubscriptions.toFixed(2)}`, margin + 5, yPosition);
    yPosition += 5;
    doc.text(`Total: R$ ${(totalExpenses + totalSubscriptions).toFixed(2)}`, margin + 5, yPosition);
    yPosition += 8;
    
    // Expenses table
    if (expandedExpenses.length > 0) {
      doc.setFontSize(11);
      doc.text('Gastos:', margin, yPosition);
      yPosition += 6;
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text('Data', margin, yPosition);
      doc.text('Descrição', margin + 20, yPosition);
      doc.text('Categoria', margin + 80, yPosition);
      doc.text('Valor', pageWidth - margin - 20, yPosition);
      yPosition += 5;
      
      doc.setFont(undefined, 'normal');
      expandedExpenses.forEach(e => {
        if (yPosition > pageHeight - 15) {
          doc.addPage();
          yPosition = 10;
        }
        doc.text(e.date, margin, yPosition);
        const desc = (e.description || '').substring(0, 40);
        doc.text(desc, margin + 20, yPosition);
        doc.text(e.category, margin + 80, yPosition);
        doc.text(`R$ ${parseFloat(e.amount).toFixed(2)}`, pageWidth - margin - 20, yPosition);
        yPosition += 5;
      });
    }
    
    // Save PDF
    doc.save(`relatorio-${startDate}_${endDate}.pdf`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categoryData = expensesByCategory();
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <CategorySelect 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
                includeAll={true}
              />
            </div>
          </div>

          <div className="flex gap-2 w-full flex-wrap">
            <button
              onClick={handleExport}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md transition-colors text-sm"
              title="Baixar como JSON"
            >
              <Download size={16} /> JSON
            </button>
            <button
              onClick={handleExportCSV}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-md transition-colors text-sm"
              title="Baixar como CSV"
            >
              <Download size={16} /> CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-md transition-colors text-sm"
              title="Baixar como PDF"
            >
              <Download size={16} /> PDF
            </button>
            {copied && (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                <Check size={16} /> Exportado!
              </div>
            )}
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
          {getExpandedExpenses().length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Gastos Variáveis</h4>
              <div className="space-y-1 text-sm">
                {getExpandedExpenses().map((e, idx) => (
                  <div key={idx} className="flex justify-between text-gray-600">
                    <span>{e.date} - {e.description ? `${e.description} (${e.category})` : e.category}</span>
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
