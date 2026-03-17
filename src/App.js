import React, { useState, useRef, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ExpenseList from './components/ExpenseList';
import IncomeList from './components/IncomeList';
import SubscriptionManager from './components/SubscriptionManager';
import ForecastChart from './components/ForecastChart';
import Reports from './components/Reports';
import Charges from './components/Charges';
import CategoryManager from './components/CategoryManager';

export default function App() {
  const [activePage, setActivePage] = useState('overview'); // overview | expenses | config
  const [activeTabs, setActiveTabs] = useState({
    overview: 'dashboard', // dashboard | forecast
    expenses: 'expenses', // expenses | subscriptions | charges
    config: 'categories' // categories | reports
  });
  const [exitMessage, setExitMessage] = useState('');
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const lastBackPress = useRef(0);
  const currentPageRef = useRef({ activePage: 'overview', activeTabs: { overview: 'dashboard', expenses: 'expenses', config: 'categories' } });

  // Update refs whenever state changes
  useEffect(() => {
    currentPageRef.current = { activePage, activeTabs };
  }, [activePage, activeTabs]);

  useEffect(() => {
    let unsubscribe = null;

    const initBackButton = async () => {
      try {
        const { App } = await import('@capacitor/app');
        
        // Tentar configurar a StatusBar para garantir que está visível
        try {
          const { StatusBar } = await import('@capacitor/status-bar');
          await StatusBar.setBackgroundColor({ color: '#2563eb' });
          await StatusBar.setStyle({ style: 1 }); // light style
        } catch (e) {
          // StatusBar pode não estar disponível
        }
        
        const handleBackButton = () => {
          const { activePage: current, activeTabs: currentTabs } = currentPageRef.current;
          
          // Se não está no dashboard, volta para dashboard
          if (current !== 'overview' || currentTabs.overview !== 'dashboard') {
            setActivePage('overview');
            setActiveTabs(prev => ({ ...prev, overview: 'dashboard' }));
            return;
          }
          
          // Se está no dashboard, mostra mensagem de saída
          const now = Date.now();
          if (lastBackPress.current && now - lastBackPress.current < 2000) {
            // Duplo clique em menos de 2 segundos - sair
            App.exitApp();
          } else {
            // Primeiro clique - mostrar mensagem
            setExitMessage('Clique voltar mais uma vez para sair');
            lastBackPress.current = now;
            setTimeout(() => setExitMessage(''), 2000);
          }
        };

        const listener = await App.addListener('backButton', handleBackButton);
        unsubscribe = () => listener.remove();
      } catch (e) {
        // Capacitor não disponível (navegador)
        unsubscribe = () => {};
      }
    };

    initBackButton();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const pages = [
    { id: 'overview', label: 'Dashboard' },
    { id: 'expenses', label: 'Finanças' },
    { id: 'config', label: 'Configurações' }
  ];

  const overviewTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'forecast', label: 'Previsão' }
  ];

  const expensesTabs = [
    { id: 'expenses', label: 'Gastos' },
    { id: 'subscriptions', label: 'Assinaturas' },
    { id: 'charges', label: 'Cobranças' },
    { id: 'incomes', label: 'Entradas' }
  ];

  const configTabs = [
    { id: 'categories', label: 'Categorias' },
    { id: 'reports', label: 'Relatórios' }
  ];

  const getTabsForPage = () => {
    if (activePage === 'overview') return overviewTabs;
    if (activePage === 'expenses') return expensesTabs;
    if (activePage === 'config') return configTabs;
    return [];
  };

  const getActiveTab = () => {
    if (activePage === 'overview') return activeTabs.overview;
    if (activePage === 'expenses') return activeTabs.expenses;
    if (activePage === 'config') return activeTabs.config;
    return '';
  };

  const handleTabChange = (tabId) => {
    setActiveTabs({
      ...activeTabs,
      [activePage]: tabId
    });
  };

  // Swipe to change tabs
  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].screenX;
    handleSwipe();
  };

  const handleSwipe = () => {
    const tabs = getTabsForPage();
    const currentTabIndex = tabs.findIndex(t => t.id === getActiveTab());
    const swipeThreshold = 80; // Reduzir sensibilidade (era 50)
    
    if (touchStartX.current - touchEndX.current > swipeThreshold) {
      // Swiped left (move to next tab)
      if (currentTabIndex < tabs.length - 1) {
        handleTabChange(tabs[currentTabIndex + 1].id);
      }
    }

    if (touchEndX.current - touchStartX.current > swipeThreshold) {
      // Swiped right (move to previous tab)
      if (currentTabIndex > 0) {
        handleTabChange(tabs[currentTabIndex - 1].id);
      }
    }
  };

  return (
    <div className="pwa-container min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="w-full px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Gestor Financeiro</h1>
        </div>
      </header>

      {/* Tabs Navigation (within page) */}
      <nav className="bg-white border-b border-gray-200 shadow-sm" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="w-full flex">
          {getTabsForPage().map((tab, index) => {
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 px-4 py-3 font-medium text-sm whitespace-nowrap transition-all border-b-2 text-center overflow-hidden ${
                  getActiveTab() === tab.id
                    ? 'border-indigo-600 text-indigo-600 scale-100'
                    : 'border-transparent text-gray-600 hover:text-indigo-600 scale-75'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main 
        key={`${activePage}-${getActiveTab()}`}
        className="w-full px-4 py-6 pb-40 md:pb-32 min-h-[calc(100vh-200px)] flex-1"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="max-w-7xl mx-auto">
        {/* Dashboard Page */}
        {activePage === 'overview' && (
          <>
            {getActiveTab() === 'dashboard' && <Dashboard />}
            {getActiveTab() === 'forecast' && <ForecastChart />}
          </>
        )}

        {/* Expenses Page */}
        {activePage === 'expenses' && (
          <>
            {getActiveTab() === 'expenses' && <ExpenseList />}
            {getActiveTab() === 'incomes' && <IncomeList />}
            {getActiveTab() === 'subscriptions' && <SubscriptionManager />}
            {getActiveTab() === 'charges' && <Charges />}
          </>
        )}

        {/* Config Page */}
        {activePage === 'config' && (
          <>
            {getActiveTab() === 'categories' && <CategoryManager />}
            {getActiveTab() === 'reports' && <Reports />}
          </>
        )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer-safe-area fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="w-full px-4">
          {/* Pages Navigation */}
          <nav className="hidden md:flex w-full">
            {pages.map((page, index) => {
              return (
                <button
                  key={page.id}
                  onClick={() => setActivePage(page.id)}
                  className={`flex-1 px-4 py-3 font-medium transition-all border-t-2 text-center overflow-hidden ${
                    activePage === page.id
                      ? 'border-blue-600 text-blue-600 scale-100'
                      : 'border-transparent text-gray-600 hover:text-blue-600 scale-75'
                  }`}
                >
                  {page.label}
                </button>
              );
            })}
          </nav>

          {/* Mobile Bottom Navigation */}
          <nav className="md:hidden flex w-full">
            {pages.map((page, index) => {
              return (
                <button
                  key={page.id}
                  onClick={() => setActivePage(page.id)}
                  className={`flex-1 px-2 py-3 font-medium text-center text-sm transition-all border-t-2 overflow-hidden ${
                    activePage === page.id
                      ? 'border-blue-600 text-blue-600 scale-100'
                      : 'border-transparent text-gray-600 scale-75'
                  }`}
                >
                  {page.label}
                </button>
              );
            })}
          </nav>


        </div>
      </footer>

      {/* Exit Message Toast */}
      {exitMessage && (
        <div className="fixed bottom-24 left-4 right-4 md:bottom-auto md:top-8 bg-gray-800 text-white rounded-lg p-4 shadow-lg text-center z-40">
          {exitMessage}
        </div>
      )}
    </div>
  );
}
