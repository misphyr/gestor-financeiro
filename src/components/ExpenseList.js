import React, { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { getIconComponent } from '../utils/icons';
import { Trash2 } from 'lucide-react';

export default function ExpenseList() {
  const [expenses, setExpenses] = useState([]);
  const [filter, setFilter] = useState('all');

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
    if (filter === 'all') return expenses;
    
    const today = new Date();
    const currentMonth = today.getFullYear() * 100 + (today.getMonth() + 1);

    return expenses.filter(e => {
      const eDate = new Date(e.date);
      const eMonth = eDate.getFullYear() * 100 + (eDate.getMonth() + 1);
      
      if (filter === 'month') return eMonth === currentMonth;
      if (filter === 'last30') {
        const diff = today - eDate;
        return diff <= 30 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  };

  const categories = storage.categories.getAll();
  const categoryMap = {};
  categories.forEach(cat => {
    categoryMap[cat.name] = cat;
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Gastos Recentes</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todos</option>
          <option value="month">Este mês</option>
          <option value="last30">Últimos 30 dias</option>
        </select>
      </div>

      {getFilteredExpenses().length === 0 ? (
        <p className="text-gray-500 text-center py-8">Nenhum gasto registrado</p>
      ) : (
        <div className="space-y-2">
          {getFilteredExpenses().map(expense => {
            const cat = categoryMap[expense.category];
            const IconComponent = getIconComponent(cat?.icon || 'MoreHorizontal');
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
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(expense.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">
                    R$ {parseFloat(expense.amount).toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
