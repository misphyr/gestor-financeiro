import React, { useState } from 'react';
import { storage } from '../utils/storage';
import CategorySelect from './CategorySelect';
import ShareModal from './ShareModal';
import { Users, ChevronUp, ChevronDown, Plus } from 'lucide-react';

export default function ExpenseForm() {
  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Alimentação');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [installments, setInstallments] = useState(1);
  const [error, setError] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [sharedWith, setSharedWith] = useState([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const categories = storage.categories.getAll();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Valor inválido');
      return;
    }

    if (isShared && sharedWith.length === 0) {
      setError('Defina as pessoas para dividir');
      return;
    }

    try {
      storage.expenses.add({
        amount: parseFloat(amount),
        category,
        description,
        date,
        installments: parseInt(installments),
        isShared,
        sharedWith: isShared ? sharedWith : []
      });
      setAmount('');
      setCategory('Alimentação');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setInstallments(1);
      setIsShared(false);
      setSharedWith([]);
      setError('');
      // Trigger re-render
      window.dispatchEvent(new Event('expenseAdded'));
    } catch (err) {
      setError('Erro ao adicionar gasto');
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
          Adicionar Gasto
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parcelas
            </label>
            <select
              value={installments}
              onChange={(e) => setInstallments(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 24 }, (_, i) => i + 1).map(num => (
                <option key={num} value={num}>
                  {num}x
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoria
          </label>
          <CategorySelect 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descrição
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Compra no mercado..."
          />
        </div>

        {/* Shared Expense Section */}
        <div className="border-t pt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isShared}
              onChange={(e) => {
                setIsShared(e.target.checked);
                if (!e.target.checked) {
                  setSharedWith([]);
                }
              }}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">É compartilhado?</span>
          </label>
          
          {isShared && (
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="mt-3 w-full flex items-center justify-center gap-2 border-2 border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium py-2 px-4 rounded-md transition-colors"
            >
              <Users size={18} /> 
              {sharedWith.length > 0 ? `${sharedWith.length} pessoas` : 'Definir pessoas'}
            </button>
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
        >
          Adicionar Gasto
        </button>
            </form>
        </div>
      )}

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onSave={setSharedWith}
        initialSharedWith={sharedWith}
      />
    </div>
  );
}
