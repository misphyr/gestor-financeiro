import React, { useState, useEffect } from 'react';
import { calculateMonthlyForecast, storage } from '../utils/storage';
import { getIconComponent } from '../utils/icons';
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { TrendingDown, DollarSign, Zap, Lightbulb, Settings, X, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const [dashboard, setDashboard] = useState({
    currentMonth: null,
    nextMonth: null,
    totalExpenses: 0,
    yearExpenses: 0,
    totalSubscriptions: 0,
    monthIncomes: 0,
    monthBalance: 0
  });
  const [expensesModalOpen, setExpensesModalOpen] = useState(false);
  const [subscriptionsModalOpen, setSubscriptionsModalOpen] = useState(false);
  const [expensesSummary, setExpensesSummary] = useState({
    paid: 0,
    pending: 0,
    total: 0
  });

  useEffect(() => {
    loadDashboard();
    window.addEventListener('expenseAdded', loadDashboard);
    window.addEventListener('subscriptionAdded', loadDashboard);
    window.addEventListener('incomeAdded', loadDashboard);
    return () => {
      window.removeEventListener('expenseAdded', loadDashboard);
      window.removeEventListener('subscriptionAdded', loadDashboard);
      window.removeEventListener('incomeAdded', loadDashboard);
    };
  }, []);

  const loadDashboard = () => {
    const now = new Date();
    const currentMonth = calculateMonthlyForecast(now.getFullYear(), now.getMonth());
    const nextMonth = calculateMonthlyForecast(now.getFullYear(), now.getMonth() + 1);

    const subs = storage.subscriptions.getAll().filter(s => !s.canceledDate);
    const totalSubs = subs.reduce((acc, s) => acc + parseFloat(s.amount || 0), 0);

    const expenses = storage.expenses.getAll();
    const totalExpenses = expenses.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);

    // Calculate year expenses (current year)
    const currentYear = now.getFullYear();
    const yearExpenses = expenses
      .filter(e => new Date(e.date).getFullYear() === currentYear)
      .reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);

    // Calculate month incomes (using expanded incomes)
    const expandedIncomes = storage.incomes.getExpandedIncomes();
    const targetDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthIncomes = expandedIncomes
      .filter(i => {
        const iDate = new Date(i.date);
        return iDate >= targetDate && iDate < nextMonthDate;
      })
      .reduce((acc, i) => acc + parseFloat(i.amount || 0), 0);

    // Calculate month expenses
    const monthExpenses = expenses
      .filter(e => {
        const eDate = new Date(e.date);
        return eDate >= targetDate && eDate < nextMonthDate;
      })
      .reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);

    // Calculate paid vs pending
    const today = new Date();
    let paid = 0;
    let pending = 0;

    expenses.forEach(e => {
      const eDate = new Date(e.date);
      if (eDate <= today) {
        paid += parseFloat(e.amount || 0);
      } else {
        pending += parseFloat(e.amount || 0);
      }
    });

    setExpensesSummary({
      paid,
      pending,
      total: totalExpenses
    });

    setDashboard({
      currentMonth,
      nextMonth,
      totalExpenses,
      yearExpenses,
      totalSubscriptions: totalSubs,
      monthIncomes,
      monthBalance: monthIncomes - (monthExpenses + currentMonth.subscriptions + currentMonth.annual)
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
    const categoryMap = {};
    const categories = storage.categories.getAll();
    
    categories.forEach(cat => {
      categoryMap[cat.name] = cat;
    });

    for (let i = -11; i <= 0; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      const targetDate = new Date(d.getFullYear(), d.getMonth(), 1);
      const nextMonthDate = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      
      const f = calculateMonthlyForecast(d.getFullYear(), d.getMonth());
      
      // Find the top category for this month
      const expenses = storage.expenses.getAll().filter(e => {
        const eDate = new Date(e.date);
        return eDate >= targetDate && eDate < nextMonthDate;
      });
      
      let topCategory = 'Alimentação';
      let maxAmount = 0;
      
      expenses.forEach(e => {
        if (parseFloat(e.amount || 0) > maxAmount) {
          maxAmount = parseFloat(e.amount || 0);
          topCategory = e.category;
        }
      });
      
      const topCategoryColor = categoryMap[topCategory]?.color || '#3B82F6';
      
      data.push({
        month: d.toLocaleDateString('pt-BR', { month: 'short' }),
        Total: f.total,
        color: topCategoryColor
      });
    }
    return data;
  };

  const getDashboardChargesSummary = () => {
    const expenses = storage.expenses.getAll();
    const subscriptions = storage.subscriptions.getAll();
    const chargesData = JSON.parse(localStorage.getItem('charges')) || {};
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let totalAmount = 0;
    let paidAmount = 0;
    
    // Calculate charges from shared expenses
    expenses.forEach(expense => {
      if (expense.isShared && expense.sharedWith && expense.sharedWith.length > 0) {
        const expenseDate = new Date(expense.date);
        const expenseMonth = expenseDate.getMonth();
        const expenseYear = expenseDate.getFullYear();
        
        // Only count if month has passed or is current
        if (expenseYear < currentYear || (expenseYear === currentYear && expenseMonth <= currentMonth)) {
          const amountPerPerson = parseFloat(expense.amount) / expense.sharedWith.length;
          
          expense.sharedWith.forEach(person => {
            if (!person.isMe) {
              const chargeKey = `${expenseYear}-${expenseMonth}-${person.name}-${expense.id}`;
              totalAmount += amountPerPerson;
              
              if (chargesData[chargeKey]?.paid) {
                paidAmount += amountPerPerson;
              }
            }
          });
        }
      }
    });
    
    // Calculate charges from shared subscriptions
    subscriptions.forEach(sub => {
      if (sub.isShared && sub.sharedWith && sub.sharedWith.length > 0) {
        const subStartDate = new Date(sub.startDate);
        const subStartMonth = subStartDate.getMonth();
        const subStartYear = subStartDate.getFullYear();
        
        // Only count if month has passed or is current
        if (subStartYear < currentYear || (subStartYear === currentYear && subStartMonth <= currentMonth)) {
          const amountPerPerson = parseFloat(sub.amount) / sub.sharedWith.length;
          
          sub.sharedWith.forEach(person => {
            if (!person.isMe) {
              const chargeKey = `${subStartYear}-${subStartMonth}-${person.name}-${sub.id}`;
              totalAmount += amountPerPerson;
              
              if (chargesData[chargeKey]?.paid) {
                paidAmount += amountPerPerson;
              }
            }
          });
        }
      }
    });
    
    return {
      totalAmount,
      paidAmount,
      pendingAmount: totalAmount - paidAmount
    };
  };

  if (!dashboard.currentMonth) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Main Cards */}
      <div className="space-y-4">
        {/* First Row - Mês Atual spanning 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-md p-6 relative overflow-hidden">
            <DollarSign size={120} className="absolute -bottom-8 -right-8 opacity-10" />
            <div className="relative z-10">
              <p className="text-sm opacity-90 mb-1">Mês Atual</p>
              <p className="text-3xl font-bold">R$ {dashboard.currentMonth.total.toFixed(2)}</p>
              <p className="text-xs opacity-75 mt-2">Despesas totais</p>
            </div>
          </div>
        </div>

        {/* Second Row - Other main cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-md p-6 relative overflow-hidden">
            <TrendingDown size={120} className="absolute -bottom-8 -right-8 opacity-10" />
            <div className="relative z-10">
              <p className="text-sm opacity-90 mb-1">Próximo Mês</p>
              <p className="text-3xl font-bold">R$ {dashboard.nextMonth.total.toFixed(2)}</p>
              <p className="text-xs opacity-75 mt-2">Despesas previstas</p>
            </div>
          </div>

          <div 
            onClick={() => setExpensesModalOpen(true)}
            className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition-all relative overflow-hidden"
          >
            <Zap size={120} className="absolute -bottom-8 -right-8 opacity-10" />
            <div className="relative z-10">
              <p className="text-sm opacity-90 mb-1">Gastos este Ano</p>
              <p className="text-3xl font-bold">R$ {dashboard.yearExpenses.toFixed(2)}</p>
              <p className="text-xs opacity-75 mt-2">Clique para detalhes</p>
            </div>
          </div>

          <div 
            onClick={() => setSubscriptionsModalOpen(true)}
            className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition-all relative overflow-hidden"
          >
            <DollarSign size={120} className="absolute -bottom-8 -right-8 opacity-10" />
            <div className="relative z-10">
              <p className="text-sm opacity-90 mb-1">Assinaturas</p>
              <p className="text-3xl font-bold">R$ {dashboard.totalSubscriptions.toFixed(2)}</p>
              <p className="text-xs opacity-75 mt-2">Clique para detalhes</p>
            </div>
          </div>
        </div>

        {/* Third Row - Balance and Additional Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-lg shadow-md p-6 relative overflow-hidden">
            <DollarSign size={120} className="absolute -bottom-8 -right-8 opacity-10" />
            <div className="relative z-10">
              <p className="text-sm opacity-90 mb-1">Gastos Variáveis</p>
              <p className="text-3xl font-bold">R$ {dashboard.currentMonth.expenses.toFixed(2)}</p>
              <p className="text-xs opacity-75 mt-2">Do mês atual</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-lg shadow-md p-6 relative overflow-hidden">
            <DollarSign size={120} className="absolute -bottom-8 -right-8 opacity-10" />
            <div className="relative z-10">
              <p className="text-sm opacity-90 mb-1">Recebido (Mês)</p>
              <p className="text-3xl font-bold">R$ {dashboard.monthIncomes.toFixed(2)}</p>
              <p className="text-xs opacity-75 mt-2">Rendas e entradas</p>
            </div>
          </div>

          <div className={`bg-gradient-to-br ${dashboard.monthBalance >= 0 ? 'from-teal-500 to-teal-600' : 'from-red-500 to-red-600'} text-white rounded-lg shadow-md p-6 relative overflow-hidden`}>
            <DollarSign size={120} className="absolute -bottom-8 -right-8 opacity-10" />
            <div className="relative z-10">
              <p className="text-sm opacity-90 mb-1">Sobra do Mês</p>
              <p className="text-3xl font-bold">{dashboard.monthBalance >= 0 ? '+' : ''} R$ {Math.abs(dashboard.monthBalance).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charges Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Resumo de Cobranças</h3>
        <p className="text-sm text-gray-600 mb-4">Valores que as pessoas precisam pagar para você (até o mês atual)</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-4">
            <p className="text-sm opacity-90 mb-1">Pendente</p>
            <p className="text-2xl font-bold">{getDashboardChargesSummary().pendingAmount.toFixed(2)}</p>
            <p className="text-xs opacity-75 mt-1">Aguardando pagamento</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4">
            <p className="text-sm opacity-90 mb-1">Já Recebido</p>
            <p className="text-2xl font-bold">{getDashboardChargesSummary().paidAmount.toFixed(2)}</p>
            <p className="text-xs opacity-75 mt-1">Cobranças recebidas</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4">
            <p className="text-sm opacity-90 mb-1">Total a Receber</p>
            <p className="text-2xl font-bold">{getDashboardChargesSummary().totalAmount.toFixed(2)}</p>
            <p className="text-xs opacity-75 mt-1">Até o momento</p>
          </div>
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
              <Bar dataKey="Total">
                {getMonthlyChart().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
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
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={20} className="text-indigo-600" />
            <h4 className="font-bold text-indigo-900">Dica</h4>
          </div>
          <p className="text-sm text-indigo-800">
            Use o formulário de gastos para registrar todas as suas despesas variáveis. 
            As assinaturas e anuidades aparecem automaticamente na previsão.
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-md p-6 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Settings size={20} className="text-green-600" />
            <h4 className="font-bold text-green-900">Personalização</h4>
          </div>
          <p className="text-sm text-green-800">
            Todos os seus dados são armazenados localmente no seu dispositivo. 
            Use a aba Relatórios para exportar seus dados em JSON ou CSV.
          </p>
        </div>
      </div>

      {/* Expenses Modal */}
      {expensesModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-800">Resumo de Gastos</h3>
              <button
                onClick={() => setExpensesModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-green-700 font-medium mb-1">Já Pago</p>
                <p className="text-3xl font-bold text-green-600">R$ {expensesSummary.paid.toFixed(2)}</p>
                <p className="text-xs text-green-600 mt-1">Gastos até hoje</p>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                <p className="text-sm text-orange-700 font-medium mb-1">A Pagar</p>
                <p className="text-3xl font-bold text-orange-600">R$ {expensesSummary.pending.toFixed(2)}</p>
                <p className="text-xs text-orange-600 mt-1">Gastos futuros</p>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                <p className="text-sm text-purple-700 font-medium mb-1">Total</p>
                <p className="text-3xl font-bold text-purple-600">R$ {expensesSummary.total.toFixed(2)}</p>
                <p className="text-xs text-purple-600 mt-1">Todos os gastos registrados</p>
              </div>
            </div>

            <button
              onClick={() => setExpensesModalOpen(false)}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Subscriptions Modal */}
      {subscriptionsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-800">Detalhes de Assinaturas</h3>
              <button
                onClick={() => setSubscriptionsModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-700 font-medium mb-1">Mensalidades</p>
                <p className="text-3xl font-bold text-blue-600">R$ {dashboard.currentMonth.subscriptions.toFixed(2)}</p>
                <p className="text-xs text-blue-600 mt-1">Recorrências mensais</p>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                <p className="text-sm text-orange-700 font-medium mb-1">Anuidades (mês)</p>
                <p className="text-3xl font-bold text-orange-600">R$ {dashboard.currentMonth.annual.toFixed(2)}</p>
                <p className="text-xs text-orange-600 mt-1">Anuidades divididas por 12</p>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                <p className="text-sm text-purple-700 font-medium mb-1">Total Mensal</p>
                <p className="text-3xl font-bold text-purple-600">R$ {(dashboard.currentMonth.subscriptions + dashboard.currentMonth.annual).toFixed(2)}</p>
                <p className="text-xs text-purple-600 mt-1">Mensalidades + Anuidades</p>
              </div>
            </div>

            <button
              onClick={() => setSubscriptionsModalOpen(false)}
              className="w-full mt-6 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
