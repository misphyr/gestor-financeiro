import React, { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { getIconComponent } from '../utils/icons';
import { Trash2, RotateCcw, AlertCircle, Users, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import CategorySelect from './CategorySelect';
import ShareModal from './ShareModal';
import AlertModal from './AlertModal';

export default function SubscriptionManager() {
  const [formOpen, setFormOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [category, setCategory] = useState('Outras');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isShared, setIsShared] = useState(false);
  const [sharedWith, setSharedWith] = useState([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);

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

    if (isShared && sharedWith.length === 0) {
      setError('Defina as pessoas para dividir');
      return;
    }

    try {
      storage.subscriptions.add({
        name,
        amount: parseFloat(amount),
        frequency,
        category,
        startDate,
        description,
        isShared,
        sharedWith: isShared ? sharedWith : []
      });
      setName('');
      setAmount('');
      setFrequency('monthly');
      setCategory('Outras');
      setStartDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setIsShared(false);
      setSharedWith([]);
      setError('');
      loadSubscriptions();
      window.dispatchEvent(new Event('subscriptionAdded'));
    } catch (err) {
      setError('Erro ao adicionar assinatura');
    }
  };

  const handleDelete = (id) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      storage.subscriptions.delete(deleteConfirm);
      loadSubscriptions();
      window.dispatchEvent(new Event('subscriptionAdded'));
      setDeleteConfirm(null);
    }
  };

  const handleCancel = (id) => {
    const today = new Date().toISOString().split('T')[0];
    storage.subscriptions.update(id, { canceledDate: today });
    loadSubscriptions();
    setCancelConfirm(null);
    window.dispatchEvent(new Event('subscriptionAdded'));
  };

  const handleRestore = (id) => {
    storage.subscriptions.update(id, { canceledDate: null });
    loadSubscriptions();
    window.dispatchEvent(new Event('subscriptionAdded'));
  };

  const monthlyTotal = subscriptions
    .filter(s => !s.canceledDate && s.frequency === 'monthly')
    .reduce((acc, s) => acc + parseFloat(s.amount || 0), 0);

  const annualTotal = subscriptions
    .filter(s => !s.canceledDate && s.frequency === 'annual')
    .reduce((acc, s) => acc + parseFloat(s.amount || 0), 0);

  const activeSubscriptions = subscriptions.filter(s => !s.canceledDate);
  const canceledSubscriptions = subscriptions.filter(s => s.canceledDate);

  return (
    <div className="w-full space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-2">Mensalidades</p>
          <p className="text-3xl font-bold">R$ {monthlyTotal.toFixed(2)}</p>
          <p className="text-xs opacity-75 mt-2">{subscriptions.filter(s => !s.canceledDate && s.frequency === 'monthly').length} assinaturas</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-2">Anuidades (por mês)</p>
          <p className="text-3xl font-bold">R$ {(annualTotal / 12).toFixed(2)}</p>
          <p className="text-xs opacity-75 mt-2">{subscriptions.filter(s => !s.canceledDate && s.frequency === 'annual').length} assinaturas</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-2">Total Mensal</p>
          <p className="text-3xl font-bold">R$ {(monthlyTotal + annualTotal / 12).toFixed(2)}</p>
          <p className="text-xs opacity-75 mt-2">{activeSubscriptions.length} assinaturas ativas</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <button
          onClick={() => setFormOpen(!formOpen)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <Plus size={20} />
            Adicionar Assinatura
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
                Categoria
              </label>
              <CategorySelect 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Início
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* Shared Subscription Section */}
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
            Adicionar Assinatura
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

      {/* List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Assinaturas Ativas</h3>

        {activeSubscriptions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma assinatura ativa</p>
        ) : (
          <div className="space-y-2 mb-6">
            {activeSubscriptions.map(sub => {
              const cat = storage.categories.getAll().find(c => c.name === sub.category);
              const IconComponent = getIconComponent(cat?.icon || 'MoreHorizontal');
              return (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <IconComponent
                      size={24}
                      color={cat?.color || '#6B7280'}
                      strokeWidth={1.5}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{sub.name}</p>
                      <p className="text-sm text-gray-500">
                      {sub.description || sub.category}
                    </p>
                    <p className="text-xs text-gray-400">
                      {sub.frequency === 'monthly' ? 'Mensal' : 'Anual'} • Desde {new Date(sub.startDate).toLocaleDateString('pt-BR')}
                    </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">
                      R$ {parseFloat(sub.amount).toFixed(2)}
                    </span>
                    <button
                      onClick={() => setCancelConfirm(sub.id)}
                      className="p-1 text-orange-500 hover:bg-orange-50 rounded transition-colors"
                      title="Cancelar assinatura"
                    >
                      <AlertCircle size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Deletar permanentemente"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Canceled Subscriptions */}
        {canceledSubscriptions.length > 0 && (
          <>
            <h3 className="text-xl font-bold mb-4 text-gray-800 mt-8">Assinaturas Canceladas</h3>
            <div className="space-y-2">
              {canceledSubscriptions.map(sub => {
                const cat = storage.categories.getAll().find(c => c.name === sub.category);
                const IconComponent = getIconComponent(cat?.icon || 'MoreHorizontal');
                return (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50 opacity-60"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <IconComponent
                        size={24}
                        color={cat?.color || '#6B7280'}
                        strokeWidth={1.5}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-700 line-through">{sub.name}</p>
                        <p className="text-sm text-gray-500">
                          {sub.description || sub.category}
                        </p>
                        <p className="text-xs text-gray-400">
                          Cancelado em {new Date(sub.canceledDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-600">
                        R$ {parseFloat(sub.amount).toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleRestore(sub.id)}
                        className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                        title="Restaurar assinatura"
                      >
                        <RotateCcw size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Deletar permanentemente"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle size={24} className="text-orange-600" />
              <h3 className="text-xl font-bold text-gray-800">Cancelar Assinatura?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              A assinatura será marcada como cancelada, mantendo o histórico de gastos. Você pode restaurá-la a qualquer momento.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Manter Ativa
              </button>
              <button
                onClick={() => handleCancel(cancelConfirm)}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-md transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={deleteConfirm !== null}
        type="danger"
        title="Confirmar Exclusão"
        message="Tem certeza que deseja remover permanentemente esta assinatura? Esta ação não pode ser desfeita."
        confirmText="Remover"
        cancelText="Manter"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
