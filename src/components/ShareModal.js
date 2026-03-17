import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import AlertModal from './AlertModal';

export default function ShareModal({ isOpen, onClose, onSave, initialSharedWith }) {
  const [people, setPeople] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  
  useEffect(() => {
    if (initialSharedWith && initialSharedWith.length > 0) {
      setPeople(initialSharedWith);
    } else {
      // Initialize with "Eu" already added (but not required)
      setPeople([
        { id: Date.now(), name: 'Eu', isMe: true }
      ]);
    }
  }, [isOpen, initialSharedWith]);

  const handleAddPerson = () => {
    setPeople([
      ...people,
      { id: Date.now(), name: '', isMe: false }
    ]);
  };

  const handleRemovePerson = (id) => {
    setPeople(people.filter(p => p.id !== id));
  };

  const handleNameChange = (id, newName) => {
    setPeople(people.map(p => 
      p.id === id ? { ...p, name: newName } : p
    ));
  };

  const handleIsMeChange = (id) => {
    // Only one person can be 'me'
    setPeople(people.map(p => ({
      ...p,
      isMe: p.id === id ? !p.isMe : false
    })));
  };

  const handleSave = () => {
    // Validate - at least 2 people total (including if one is marked as "me")
    const validPeople = people.filter(p => p.name.trim());
    if (validPeople.length < 2) {
      setShowAlert(true);
      return;
    }
    
    onSave(validPeople);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Dividir entre pessoas</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Adicione as pessoas que vão dividir essa despesa. Você pode marcar "Eu" para incluir a si mesmo.
          </p>

          <div className="space-y-3">
            {people.map((person, index) => (
              <div key={person.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={person.isMe}
                  onChange={() => handleIsMeChange(person.id)}
                  className="w-4 h-4 cursor-pointer"
                  title="Marcar como você"
                />
                <input
                  type="text"
                  value={person.name}
                  onChange={(e) => handleNameChange(person.id, e.target.value)}
                  placeholder="Nome da pessoa"
                  className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    person.isMe 
                      ? 'bg-blue-50 border-blue-300 font-medium' 
                      : 'border-gray-300'
                  }`}
                />
                <button
                  onClick={() => handleRemovePerson(person.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddPerson}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-md py-2 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Plus size={18} /> Adicionar pessoa
          </button>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-700">
              <strong>Total de pessoas:</strong> {people.length}
            </p>
            {people.length > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                Cada pessoa pagará {(100 / people.length).toFixed(1)}% da despesa
              </p>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
          >
            Salvar
          </button>
        </div>

        <AlertModal
          isOpen={showAlert}
          type="info"
          title="Adicione Pessoas"
          message="Adicione no mínimo 2 pessoas para dividir (pode incluir você)."
          confirmText="Entendido"
          onConfirm={() => setShowAlert(false)}
        />
      </div>
    </div>
  );
}
