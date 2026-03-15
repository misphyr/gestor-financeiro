import React, { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { Trash2 } from 'lucide-react';

export default function SubscriptionManager() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSubscriptions();
    window.addEventListener('subscriptionAdded', loadSubscriptions);
    return () => window.removeEventListener('subscriptionAdded', loadSubscriptions);
  }, []);

  const loadSubscriptions = () => {
    setSubscriptions(storage.subscriptions.getAll());
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name || !amount || parseFloat(amount) <= 0) {
      setError('Preencha todos os campos corretamente');
      return;
    }

    try {
      storage.subscriptions.add({
        name,
        amount: parseFloat(amount),
        frequency,
        description
      });
      setName('');
      setAmount('');
      setFrequency('monthly');
      setDescription('');
      setError('');
      loadSubscriptions();
      window.dispatchEvent(new Event('subscriptionAdded'));
    } catch (err) {
      setError('Erro ao adicionar assinatura');
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza?')) {
      storage.subscriptions.delete(id);
      loadSubscriptions();
      window.dispatchEvent(new Event('subscriptionAdded'));
    }
  };

  const handleToggle = (id) => {
    const sub = subscriptions.find(s => s.id === id);
    storage.subscriptions.update(id, { active: !sub.active });
    loadSubscriptions();
    window.dispatchEvent(new Event('subscriptionAdded'));
  };

  const monthlyTotal = subscriptions
    .filter(s => s.active && s.frequency === 'monthly')
    .reduce((acc, s) => acc + parseFloat(s.amount || 0), 0);

  const annualTotal = subscriptions
    .filter(s => s.active && s.frequency === 'annual')
    .reduce((acc, s) => acc + parseFloat(s.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Adicionar Assinatura</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Netflix"
              />
            </div>

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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequência
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Mensal</option>
                <option value="annual">Anual</option>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Notas adicionais..."
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
          >
            Adicionar Assinatura
          </button>
        </form>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-1">Mensalidades</p>
          <p className="text-3xl font-bold">R$ {monthlyTotal.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-1">Anuidades (por mês)</p>
          <p className="text-3xl font-bold">R$ {(annualTotal / 12).toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-1">Total Mensal</p>
          <p className="text-3xl font-bold">R$ {(monthlyTotal + annualTotal / 12).toFixed(2)}</p>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Assinaturas Ativas</h3>

        {subscriptions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma assinatura cadastrada</p>
        ) : (
          <div className="space-y-2">
            {subscriptions.map(sub => (
              <div
                key={sub.id}
                className={`flex items-center justify-between p-4 border border-gray-200 rounded-lg ${
                  !sub.active ? 'bg-gray-100 opacity-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={sub.active}
                    onChange={() => handleToggle(sub.id)}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{sub.name}</p>
                    <p className="text-sm text-gray-500">
                      {sub.frequency === 'monthly' ? 'Mensal' : 'Anual'} • {sub.description || 'Sem descrição'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900">
                    R$ {parseFloat(sub.amount).toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleDelete(sub.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
