import React, { useState, useEffect } from 'react';
import { calculateMonthlyForecast, storage } from '../utils/storage';
import { getIconComponent } from '../utils/icons';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { TrendingDown, DollarSign, Zap } from 'lucide-react';

export default function Dashboard() {
  const [dashboard, setDashboard] = useState({
    currentMonth: null,
    nextMonth: null,
    totalExpenses: 0,
    totalSubscriptions: 0
  });

  useEffect(() => {
    loadDashboard();
    window.addEventListener('expenseAdded', loadDashboard);
    window.addEventListener('subscriptionAdded', loadDashboard);
    return () => {
      window.removeEventListener('expenseAdded', loadDashboard);
      window.removeEventListener('subscriptionAdded', loadDashboard);
    };
  }, []);

  const loadDashboard = () => {
    const now = new Date();
    const currentMonth = calculateMonthlyForecast(now.getFullYear(), now.getMonth());
    const nextMonth = calculateMonthlyForecast(now.getFullYear(), now.getMonth() + 1);

    const subs = storage.subscriptions.getAll().filter(s => s.active);
    const totalSubs = subs.reduce((acc, s) => acc + parseFloat(s.amount || 0), 0);

    const expenses = storage.expenses.getAll();
    const totalExpenses = expenses.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);

    setDashboard({
      currentMonth,
      nextMonth,
      totalExpenses,
      totalSubscriptions: totalSubs
    });
  };

  const getMonthExpenses = () => {
    const now = new Date();
    const expenses = storage.expenses.getAll();
    const targetDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return expenses
      .filter(e => {
        const eDate = new Date(e.date);
        return eDate >= targetDate && eDate < nextMonthDate;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  };

  const getMonthlyChart = () => {
    const data = [];
    for (let i = -2; i <= 2; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      const f = calculateMonthlyForecast(d.getFullYear(), d.getMonth());
      data.push({
        month: d.toLocaleDateString('pt-BR', { month: 'short' }),
        Total: f.total
      });
    }
    return data;
  };

  if (!dashboard.currentMonth) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Main Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">Mês Atual</p>
              <p className="text-3xl font-bold">R$ {dashboard.currentMonth.total.toFixed(2)}</p>
            </div>
            <DollarSign size={40} className="opacity-20" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">Próximo Mês</p>
              <p className="text-3xl font-bold">R$ {dashboard.nextMonth.total.toFixed(2)}</p>
            </div>
            <TrendingDown size={40} className="opacity-20" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">Total Gastos</p>
              <p className="text-3xl font-bold">R$ {dashboard.totalExpenses.toFixed(2)}</p>
            </div>
            <Zap size={40} className="opacity-20" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">Assinaturas</p>
              <p className="text-3xl font-bold">R$ {dashboard.totalSubscriptions.toFixed(2)}</p>
            </div>
            <DollarSign size={40} className="opacity-20" />
          </div>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Gastos Variáveis</h3>
          <p className="text-4xl font-bold text-blue-600">
            R$ {dashboard.currentMonth.expenses.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Gastos do mês atual
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Mensalidades</h3>
          <p className="text-4xl font-bold text-green-600">
            R$ {dashboard.currentMonth.subscriptions.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Recorrentes mensais
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Anuidades (mês)</h3>
          <p className="text-4xl font-bold text-yellow-600">
            R$ {dashboard.currentMonth.annual.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Anuidades divididas/12
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Tendência de Gastos</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={getMonthlyChart()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
              <Bar dataKey="Total" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Expenses */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Gastos Recentes</h3>
          <div className="space-y-2">
            {getMonthExpenses().length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhum gasto este mês</p>
            ) : (
              getMonthExpenses().map(expense => {
                const cat = storage.categories.getAll().find(c => c.name === expense.category);
                const IconComponent = getIconComponent(cat?.icon || 'MoreHorizontal');
                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-2 border-b border-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      <IconComponent
                        size={24}
                        color={cat?.color || '#6B7280'}
                        strokeWidth={1.5}
                      />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{expense.category}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(expense.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900">
                      R$ {parseFloat(expense.amount).toFixed(2)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg shadow-md p-6 border border-indigo-200">
          <h4 className="font-bold text-indigo-900 mb-2">💡 Dica</h4>
          <p className="text-sm text-indigo-800">
            Use o formulário de gastos para registrar todas as suas despesas variáveis. 
            As assinaturas e anuidades aparecem automaticamente na previsão.
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-md p-6 border border-green-200">
          <h4 className="font-bold text-green-900 mb-2">⚙️ Personalização</h4>
          <p className="text-sm text-green-800">
            Todos os seus dados são armazenados localmente no seu dispositivo. 
            Use a aba Relatórios para exportar seus dados em JSON ou CSV.
          </p>
        </div>
      </div>
    </div>
  );
}
