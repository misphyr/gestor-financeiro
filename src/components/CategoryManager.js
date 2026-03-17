import React, { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { AVAILABLE_ICONS, AVAILABLE_COLORS, getIconComponent } from '../utils/icons';
import { Trash2, Plus, Info, ChevronUp, ChevronDown } from 'lucide-react';
import AlertModal from './AlertModal';

export default function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [selectedIcon, setSelectedIcon] = useState('ShoppingCart');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadCategories();
    window.addEventListener('categoryAdded', loadCategories);
    return () => window.removeEventListener('categoryAdded', loadCategories);
  }, []);

  const loadCategories = () => {
    setCategories(storage.categories.getAll());
  };

  const canDeleteCategory = (categoryName) => {
    const expenses = storage.expenses.getAll();
    return !expenses.some(e => e.category === categoryName);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Nome da categoria é obrigatório');
      return;
    }

    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      setError('Essa categoria já existe');
      return;
    }

    try {
      storage.categories.add({
        name: name.trim(),
        color: selectedColor,
        icon: selectedIcon
      });
      
      setName('');
      setSelectedColor('#3B82F6');
      setSelectedIcon('ShoppingCart');
      setShowForm(false);
      setSuccess('Categoria adicionada com sucesso!');
      loadCategories();
      window.dispatchEvent(new Event('categoryAdded'));
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erro ao adicionar categoria');
    }
  };

  const handleDelete = (categoryId, categoryName) => {
    if (!canDeleteCategory(categoryName)) {
      setError('Não é possível remover uma categoria com gastos associados');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setDeleteConfirm({ id: categoryId, name: categoryName });
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      storage.categories.delete(deleteConfirm.id);
      loadCategories();
      window.dispatchEvent(new Event('categoryAdded'));
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <Plus size={20} />
            Nova Categoria
          </div>
          {showForm ? <ChevronUp size={20} className="text-gray-600" /> : <ChevronDown size={20} className="text-gray-600" />}
        </button>

        {showForm && (
          <div className="px-6 pb-6 border-t border-gray-200">
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Categoria
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Streaming"
              />
            </div>

            <div className="space-y-4">
              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor do Ícone
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {AVAILABLE_COLORS.map(color => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setSelectedColor(color.name)}
                      className={`w-10 h-10 rounded border-2 transition-all ${
                        selectedColor === color.name ? 'border-gray-800 scale-110' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color.name }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Picker Grid */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Ícone
                </label>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {AVAILABLE_ICONS.map(iconObj => {
                    const IconComponent = iconObj.icon;
                    return (
                      <button
                        key={iconObj.name}
                        type="button"
                        onClick={() => setSelectedIcon(iconObj.name)}
                        className={`p-3 border-2 rounded-lg transition-all flex items-center justify-center ${
                          selectedIcon === iconObj.name
                            ? 'border-blue-500 bg-blue-50 scale-105'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        title={iconObj.label}
                      >
                        <IconComponent size={24} color={selectedColor} strokeWidth={1.5} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 p-3 bg-white rounded border border-gray-300">
              <span className="text-sm text-gray-600">Prévia:</span>
              {React.createElement(getIconComponent(selectedIcon), {
                size: 32,
                color: selectedColor,
                strokeWidth: 1.5
              })}
              <span className="font-medium text-gray-900">{name || 'Nova categoria'}</span>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
              >
                Criar Categoria
              </button>
            </div>
            </form>
          </div>
        )}
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Categorias Disponíveis</h3>

        {categories.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma categoria</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(category => {
              const IconComponent = getIconComponent(category.icon);
              const canDelete = canDeleteCategory(category.name);
              
              return (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <IconComponent
                      size={32}
                      color={category.color}
                      strokeWidth={1.5}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{category.name}</p>
                      <p className="text-xs text-gray-500">{category.icon}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(category.id, category.name)}
                    disabled={!canDelete}
                    className={`p-2 rounded transition-colors ${
                      canDelete
                        ? 'text-red-500 hover:bg-red-50'
                        : 'text-gray-300 cursor-not-allowed'
                    }`}
                    title={canDelete ? 'Remover' : 'Não pode remover: há gastos com esta categoria'}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Info size={18} className="text-blue-600" />
          <p className="text-sm text-blue-900">
            <strong>Nota:</strong> Você só pode remover uma categoria se não houver gastos associados a ela.
          </p>
        </div>
      </div>

      <AlertModal
        isOpen={deleteConfirm !== null}
        type="danger"
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja remover a categoria "${deleteConfirm?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Remover"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
