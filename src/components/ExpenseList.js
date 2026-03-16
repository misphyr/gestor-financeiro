import React, { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { getIconComponent } from '../utils/icons';
import { Trash2 } from 'lucide-react';
import CategorySelect from './CategorySelect';

export default function ExpenseList() {
  const [expenses, setExpenses] = useState([]);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [groupInstallments, setGroupInstallments] = useState(true);

  useEffect(() => {
    loadExpenses();
    window.addEventListener('expenseAdded', loadExpenses);
    window.addEventListener('subscriptionAdded', loadExpenses);
    return () => {
      window.removeEventListener('expenseAdded', loadExpenses);
      window.removeEventListener('subscriptionAdded', loadExpenses);
    };
  }, []);

  const loadExpenses = () => {
    setExpenses(storage.expenses.getAll().sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    ));
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza?')) {
      storage.expenses.delete(id);
      loadExpenses();
    }
  };

  const getFilteredExpenses = () => {
    let result = expenses;
    
    if (filter === 'all') {
      // No time filter
    } else {
      const today = new Date();
      const currentMonth = today.getFullYear() * 100 + (today.getMonth() + 1);

      result = result.filter(e => {
        const eDate = new Date(e.date);
        const eMonth = eDate.getFullYear() * 100 + (eDate.getMonth() + 1);
        
        if (filter === 'month') return eMonth === currentMonth;
        if (filter === 'last30') {
          const diff = today - eDate;
          return diff <= 30 * 24 * 60 * 60 * 1000;
        }
        return true;
      });
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(e => e.category === categoryFilter);
    }

    // Group installments if enabled
    if (groupInstallments) {
      const groupedMap = {};
      result.forEach(e => {
        const key = e.originalDate || e.date + e.description;
        if (!groupedMap[key]) {
          groupedMap[key] = {
            ...e,
            isGrouped: true,
            installmentCount: e.totalInstallments || 1,
            totalAmount: 0
          };
        }
        groupedMap[key].totalAmount += parseFloat(e.amount || 0);
      });
      return Object.values(groupedMap).sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
    }

    return result;
  };

  const categories = storage.categories.getAll();
  const categoryMap = {};
  categories.forEach(cat => {
    categoryMap[cat.name] = cat;
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Gastos Recentes</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos</option>
            <option value="month">Este mês</option>
            <option value="last30">Últimos 30 dias</option>
          </select>
          <div className="flex-1">
            <CategorySelect 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              includeAll={true}
            />
          </div>
          <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white cursor-pointer hover:bg-gray-50 whitespace-nowrap">
            <input
              type="checkbox"
              checked={groupInstallments}
              onChange={(e) => setGroupInstallments(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="hidden sm:inline">Agrupar parcelas</span>
            <span className="sm:hidden">Agrupar</span>
          </label>
        </div>
      </div>

      {getFilteredExpenses().length === 0 ? (
        <p className="text-gray-500 text-center py-8">Nenhum gasto registrado</p>
      ) : (
        <div className="space-y-2">
          {getFilteredExpenses().map(expense => {
            const cat = categoryMap[expense.category];
            const IconComponent = getIconComponent(cat?.icon || 'MoreHorizontal');
            const isGrouped = expense.isGrouped;
            const displayAmount = isGrouped ? expense.totalAmount : expense.amount;
            const installmentInfo = isGrouped ? 
              `${expense.installmentCount} parcelas` : 
              (expense.totalInstallments ? `${expense.installmentNumber}/${expense.totalInstallments}` : '');

            return (
              <div
                key={expense.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3 flex-1">
                  <IconComponent
                    size={24}
                    color={cat?.color || '#6B7280'}
                    strokeWidth={1.5}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{expense.category}</p>
                    <p className="text-sm text-gray-500">
                      {expense.description || 'Sem descrição'}
                      {installmentInfo && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">({installmentInfo})</span>}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(expense.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">
                    R$ {parseFloat(displayAmount).toFixed(2)}
                  </span>
                  {!isGrouped && (
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
