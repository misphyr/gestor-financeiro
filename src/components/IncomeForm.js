import React, { useState } from 'react';
import { storage } from '../utils/storage';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';

export default function IncomeForm() {
  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('salary');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('monthly');
  const [error, setError] = useState('');

  const incomeTypes = [
    { id: 'salary', label: 'Salário' },
    { id: 'bonus', label: 'Bônus' },
    { id: 'other', label: 'Outro' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      setError('Valor inválido');
      return;
    }

    try {
      storage.incomes.add({
        amount: parseFloat(amount),
        type: isRecurring ? 'recurring' : type,
        description,
        date: isRecurring ? new Date().toISOString().split('T')[0] : date,
        isRecurring,
        frequency: isRecurring ? frequency : null,
        baseDate: isRecurring ? date : null
      });

      setAmount('');
      setType('salary');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setIsRecurring(false);
      setFrequency('monthly');
      setError('');
      window.dispatchEvent(new Event('incomeAdded'));
    } catch (err) {
      setError('Erro ao adicionar entrada');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <button
        onClick={() => setFormOpen(!formOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <Plus size={20} />
          Adicionar Entrada
        </div>
        {formOpen ? <ChevronUp size={20} className="text-gray-600" /> : <ChevronDown size={20} className="text-gray-600" />}
      </button>

      {formOpen && (
        <div className="px-6 pb-6 border-t border-gray-200">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isRecurring ? 'Data de Início' : 'Data'}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Entrada
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  disabled={isRecurring}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                >
                  {incomeTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ex: Salário mês de março"
                />
              </div>
            </div>

            {/* Recurring Income Section */}
            <div className="border-t pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">Renda Recorrente?</span>
              </label>

              {isRecurring && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequência
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="monthly">Mensal</option>
                    <option value="annual">Anual</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
              >
                Adicionar Entrada
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
