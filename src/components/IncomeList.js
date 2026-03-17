import React, { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { Trash2, Edit2 } from 'lucide-react';
import IncomeForm from './IncomeForm';
import AlertModal from './AlertModal';

export default function IncomeList() {
  const [incomes, setIncomes] = useState([]);
  const [recurringIncomes, setRecurringIncomes] = useState([]);
  const [filter, setFilter] = useState('month');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editRecurring, setEditRecurring] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editError, setEditError] = useState('');

  useEffect(() => {
    loadIncomes();
    window.addEventListener('incomeAdded', loadIncomes);
    return () => window.removeEventListener('incomeAdded', loadIncomes);
  }, []);

  const loadIncomes = () => {
    const all = storage.incomes.getAll();
    setRecurringIncomes(all.filter(i => i.isRecurring));
    setIncomes(all.sort((a, b) => new Date(b.date) - new Date(a.date)));
  };

  const handleDelete = (id) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      storage.incomes.delete(deleteConfirm);
      loadIncomes();
      setDeleteConfirm(null);
      window.dispatchEvent(new Event('incomeAdded'));
    }
  };

  const handleEditRecurring = (income) => {
    setEditRecurring(income);
    setEditAmount(income.amount.toString());
    setEditError('');
  };

  const handleSaveRecurringEdit = () => {
    if (!editAmount || parseFloat(editAmount) <= 0) {
      setEditError('Valor inválido');
      return;
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Update the current recurring income
    storage.incomes.update(editRecurring.id, {
      amount: parseFloat(editAmount)
    });

    setEditRecurring(null);
    setEditAmount('');
    setEditError('');
    loadIncomes();
    window.dispatchEvent(new Event('incomeAdded'));
  };

  const getFilteredIncomes = () => {
    let result = storage.incomes.getExpandedIncomes().sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    if (filter === 'month') {
      const today = new Date();
      const currentMonth = today.getFullYear() * 100 + (today.getMonth() + 1);

      result = result.filter(i => {
        const iDate = new Date(i.date);
        const iMonth = iDate.getFullYear() * 100 + (iDate.getMonth() + 1);
        return iMonth === currentMonth;
      });
    } else if (filter === 'last30') {
      const today = new Date();
      result = result.filter(i => {
        const iDate = new Date(i.date);
        const diff = today - iDate;
        return diff <= 30 * 24 * 60 * 60 * 1000;
      });
    }

    return result;
  };

  // Calculate summary for current month
  const today = new Date();
  const currentMonth = today.getFullYear() * 100 + (today.getMonth() + 1);
  
  const monthIncomes = storage.incomes.getExpandedIncomes().filter(i => {
    const iDate = new Date(i.date);
    const iMonth = iDate.getFullYear() * 100 + (iDate.getMonth() + 1);
    return iMonth === currentMonth;
  });

  const totalIncomesMonth = monthIncomes.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
  const averageIncome = monthIncomes.length > 0 ? totalIncomesMonth / monthIncomes.length : 0;

  const incomeTypeLabels = {
    'salary': 'Salário',
    'bonus': 'Bônus',
    'other': 'Outro',
    'recurring': 'Renda Recorrente'
  };

  return (
    <div className="w-full space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-2">Total do Mês</p>
          <p className="text-3xl font-bold">R$ {totalIncomesMonth.toFixed(2)}</p>
          <p className="text-xs opacity-75 mt-2">{monthIncomes.length} entradas</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-2">Média de Entradas</p>
          <p className="text-3xl font-bold">R$ {averageIncome.toFixed(2)}</p>
          <p className="text-xs opacity-75 mt-2">Por transação</p>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-2">Total de Entradas</p>
          <p className="text-3xl font-bold">R$ {incomes.reduce((acc, i) => acc + parseFloat(i.amount || 0), 0).toFixed(2)}</p>
          <p className="text-xs opacity-75 mt-2">Todas as entradas</p>
        </div>
      </div>

      {/* Add Income Form */}
      <IncomeForm />

      {/* Recurring Incomes Section */}
      {recurringIncomes.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Rendas Recorrentes</h3>
          <div className="space-y-2">
            {recurringIncomes.map(income => (
              <div
                key={income.id}
                className="flex items-center justify-between p-3 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{income.description || `Renda ${income.frequency === 'monthly' ? 'Mensal' : 'Anual'}`}</p>
                  <p className="text-sm text-gray-500">
                    {income.frequency === 'monthly' ? 'Mensal' : 'Anual'} • Desde {new Date(income.baseDate).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs text-gray-400">
                    Criado em {new Date(income.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-green-600">
                    R$ {parseFloat(income.amount).toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleEditRecurring(income)}
                    className="p-1 text-blue-500 hover:bg-blue-200 rounded transition-colors"
                    title="Editar valor"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(income.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incomes List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Entradas Recentes</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="month">Este mês</option>
            <option value="last30">Últimos 30 dias</option>
            <option value="all">Todas</option>
          </select>
        </div>

        {getFilteredIncomes().length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma entrada registrada</p>
        ) : (
          <div className="space-y-2">
            {getFilteredIncomes().map(income => (
              <div
                key={`${income.id}-${income.date}`}
                className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 ${income.generatedFromRecurring ? 'border-blue-100 bg-blue-50' : 'border-gray-200'}`}
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {incomeTypeLabels[income.type] || income.type}
                    {income.generatedFromRecurring && <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">Recorrente</span>}
                  </p>
                  <p className="text-sm text-gray-500">
                    {income.description || 'Sem descrição'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(income.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-green-600">
                    + R$ {parseFloat(income.amount).toFixed(2)}
                  </span>
                  {!income.generatedFromRecurring && (
                    <button
                      onClick={() => handleDelete(income.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Recurring Modal */}
      {editRecurring && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Editar Renda Recorrente</h3>
            <p className="text-sm text-gray-600 mb-4">
              Alterar o valor afetará apenas os períodos futuros. Os períodos anteriores não serão modificados.
            </p>
            {editError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
                {editError}
              </div>
            )}
            <input
              type="number"
              step="0.01"
              min="0"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="0.00"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditRecurring(null);
                  setEditAmount('');
                  setEditError('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRecurringEdit}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={deleteConfirm !== null}
        type="danger"
        title="Confirmar Exclusão"
        message="Tem certeza que deseja remover esta entrada? Esta ação não pode ser desfeita."
        confirmText="Remover"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
