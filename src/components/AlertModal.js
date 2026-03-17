import React from 'react';
import { X } from 'lucide-react';

export default function AlertModal({ isOpen, type = 'info', title, message, onConfirm, onCancel, confirmText = 'Confirmar', cancelText = 'Cancelar' }) {
  if (!isOpen) return null;

  const isConfirm = type === 'confirm';
  const isDanger = type === 'danger';

  const bgColor = isDanger ? 'from-red-50 to-red-100' : 'from-blue-50 to-blue-100';
  const borderColor = isDanger ? 'border-red-200' : 'border-blue-200';
  const titleColor = isDanger ? 'text-red-900' : 'text-gray-800';
  const buttonColor = isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`bg-gradient-to-br ${bgColor} rounded-lg shadow-xl max-w-md w-full p-6 border ${borderColor}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-xl font-bold ${titleColor}`}>{title}</h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <p className="text-gray-700 mb-6">{message}</p>

        <div className="flex gap-3">
          {isConfirm && (
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`${isConfirm ? 'flex-1' : 'w-full'} ${buttonColor} text-white font-bold py-2 px-4 rounded-md transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
