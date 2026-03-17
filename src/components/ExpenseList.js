import React, { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { getIconComponent } from '../utils/icons';
import { Trash2 } from 'lucide-react';
import CategorySelect from './CategorySelect';
import ExpenseForm from './ExpenseForm';
import AlertModal from './AlertModal';

export default function ExpenseList() {
  const [expenses, setExpenses] = useState([]);
  const [filter, setFilter] = useState('month');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [groupInstallments, setGroupInstallments] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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

  const handleDelete = (id, groupedIds = null) => {
    setDeleteConfirm({ id, groupedIds });
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      // If it's a grouped expense, delete all expenses in the group
      if (deleteConfirm.groupedIds && deleteConfirm.groupedIds.length > 0) {
        deleteConfirm.groupedIds.forEach(expenseId => {
          storage.expenses.delete(expenseId);
        });
      } else {
        // Single expense
        storage.expenses.delete(deleteConfirm.id);
      }
      loadExpenses();
      setDeleteConfirm(null);
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
        // Include category and description in the key to avoid grouping different expenses
        const key = (e.originalDate || e.date) + '|' + e.category + '|' + (e.description || '');
        if (!groupedMap[key]) {
          groupedMap[key] = {
            ...e,
            isGrouped: true,
            installmentCount: e.totalInstallments || 1,
            totalAmount: 0,
            groupedIds: [] // Track all IDs in this group
          };
        }
        groupedMap[key].totalAmount += parseFloat(e.amount || 0);
        groupedMap[key].groupedIds.push(e.id); // Add all IDs to the group
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

  // Calculate summary statistics for current month
  const today = new Date();
  const currentMonth = today.getFullYear() * 100 + (today.getMonth() + 1);
  
  const monthExpenses = expenses.filter(e => {
    const eDate = new Date(e.date);
    const eMonth = eDate.getFullYear() * 100 + (eDate.getMonth() + 1);
    return eMonth === currentMonth;
  });

  const totalExpensesMonth = monthExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const averageExpense = monthExpenses.length > 0 ? totalExpensesMonth / monthExpenses.length : 0;
  const maxExpense = monthExpenses.length > 0 ? Math.max(...monthExpenses.map(e => parseFloat(e.amount || 0))) : 0;

  return (
    <div className="w-full space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-2">Total do Mês</p>
          <p className="text-3xl font-bold">R$ {totalExpensesMonth.toFixed(2)}</p>
          <p className="text-xs opacity-75 mt-2">{monthExpenses.length} gastos</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-2">Média de Gastos</p>
          <p className="text-3xl font-bold">R$ {averageExpense.toFixed(2)}</p>
          <p className="text-xs opacity-75 mt-2">Por transação</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-2">Maior Gasto</p>
          <p className="text-3xl font-bold">R$ {maxExpense.toFixed(2)}</p>
          <p className="text-xs opacity-75 mt-2">Neste mês</p>
        </div>
      </div>

      {/* Add Expense Form */}
      <ExpenseForm />

      {/* Expenses List */}
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
                  <button
                    onClick={() => handleDelete(expense.id, isGrouped ? expense.groupedIds : null)}
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

      <AlertModal
        isOpen={deleteConfirm !== null}
        type="danger"
        title="Confirmar Exclusão"
        message={deleteConfirm?.groupedIds && deleteConfirm.groupedIds.length > 1
          ? `Tem certeza que deseja remover todas as ${deleteConfirm.groupedIds.length} parcelas deste gasto? Esta ação não pode ser desfeita.`
          : "Tem certeza que deseja remover este gasto? Esta ação não pode ser desfeita."
        }
        confirmText="Remover"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
