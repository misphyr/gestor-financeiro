import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import SubscriptionManager from './components/SubscriptionManager';
import ForecastChart from './components/ForecastChart';
import Reports from './components/Reports';
import CategoryManager from './components/CategoryManager';
import { Menu, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'expenses', label: 'Gastos' },
    { id: 'subscriptions', label: 'Assinaturas' },
    { id: 'categories', label: 'Categorias' },
    { id: 'forecast', label: 'Previsão' },
    { id: 'reports', label: 'Relatórios' }
  ];

  return (
    <div className="pwa-container min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Gestor Financeiro</h1>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-blue-700 rounded"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden overflow-hidden transition-all ${mobileMenuOpen ? 'max-h-96' : 'max-h-0'}`}>
          <nav className="flex flex-col bg-blue-700">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`px-4 py-3 text-left ${activeTab === tab.id ? 'bg-blue-800' : 'hover:bg-blue-600'}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Desktop Menu */}
      <nav className="hidden md:flex sticky top-16 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto w-full flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-4 font-medium transition-all border-b-2 text-center ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-blue-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <ExpenseForm />
            <ExpenseList />
          </div>
        )}
        {activeTab === 'subscriptions' && <SubscriptionManager />}
        {activeTab === 'categories' && <CategoryManager />}
        {activeTab === 'forecast' && <ForecastChart />}
        {activeTab === 'reports' && <Reports />}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 text-center py-4 mt-12">
        <p>© 2026 Gestor Financeiro • Seu controle financeiro na palma da mão</p>
      </footer>
    </div>
  );
}
