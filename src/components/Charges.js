import React, { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { DollarSign, Check, AlertCircle } from 'lucide-react';

export default function Charges() {
  const [charges, setCharges] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => {
    loadCharges();
    window.addEventListener('expenseAdded', loadCharges);
    window.addEventListener('subscriptionAdded', loadCharges);
    return () => {
      window.removeEventListener('expenseAdded', loadCharges);
      window.removeEventListener('subscriptionAdded', loadCharges);
    };
  }, []);

  const loadCharges = () => {
    // Get all shared expenses and subscriptions
    const expenses = storage.expenses.getAll();
    const subscriptions = storage.subscriptions.getAll();
    
    // Calculate charges from shared expenses
    const expenseCharges = {};
    
    expenses.forEach(expense => {
      if (expense.isShared && expense.sharedWith && expense.sharedWith.length > 0) {
        const expenseDate = new Date(expense.date);
        const expenseMonth = expenseDate.getMonth();
        const expenseYear = expenseDate.getFullYear();
        const monthKey = `${expenseYear}-${expenseMonth}`;
        
        const amountPerPerson = parseFloat(expense.amount) / expense.sharedWith.length;
        
        // Create a charge for each person who needs to pay
        expense.sharedWith.forEach(person => {
          if (!person.isMe) {
            const chargeKey = `${monthKey}-${person.name}-${expense.id}`;
            if (!expenseCharges[chargeKey]) {
              expenseCharges[chargeKey] = {
                id: chargeKey,
                date: expense.date,
                month: expenseMonth,
                year: expenseYear,
                monthKey,
                description: expense.description || `Divisão: ${expense.category}`,
                amount: amountPerPerson,
                person: person.name,
                type: 'expense',
                paid: false,
                originalId: expense.id
              };
            }
          }
        });
      }
    });

    // Calculate charges from shared subscriptions
    subscriptions.forEach(sub => {
      if (sub.isShared && sub.sharedWith && sub.sharedWith.length > 0) {
        // Only include if subscription is active or was active in this month
        const subStartDate = new Date(sub.startDate);
        const subStartMonth = subStartDate.getMonth();
        const subStartYear = subStartDate.getFullYear();
        
        // Generate charges for the subscription active month
        const amountPerPerson = parseFloat(sub.amount) / sub.sharedWith.length;
        
        sub.sharedWith.forEach(person => {
          if (!person.isMe) {
            const chargeKey = `${subStartYear}-${subStartMonth}-${person.name}-${sub.id}`;
            if (!expenseCharges[chargeKey]) {
              expenseCharges[chargeKey] = {
                id: chargeKey,
                date: sub.startDate,
                month: subStartMonth,
                year: subStartYear,
                monthKey: `${subStartYear}-${subStartMonth}`,
                description: `${sub.name} (${sub.frequency === 'monthly' ? 'Mensal' : 'Anual'})`,
                amount: amountPerPerson,
                person: person.name,
                type: 'subscription',
                paid: false,
                originalId: sub.id
              };
            }
          }
        });
      }
    });

    // Check for existing paid status in localStorage
    const chargesData = JSON.parse(localStorage.getItem('charges')) || {};
    
    const chargesArray = Object.values(expenseCharges).map(charge => ({
      ...charge,
      paid: chargesData[charge.id]?.paid || false
    }));

    setCharges(chargesArray);
  };

  const toggleChargePaid = (chargeId) => {
    const charge = charges.find(c => c.id === chargeId);
    if (charge) {
      const updatedCharge = { ...charge, paid: !charge.paid };
      
      // Save to localStorage
      const chargesData = JSON.parse(localStorage.getItem('charges')) || {};
      chargesData[chargeId] = { paid: updatedCharge.paid };
      localStorage.setItem('charges', JSON.stringify(chargesData));
      
      setCharges(charges.map(c => c.id === chargeId ? updatedCharge : c));
    }
  };

  // Filter charges by selected month and year
  const filteredCharges = charges.filter(
    c => c.month === selectedMonth && c.year === selectedYear
  );

  // Calculate months with pending charges
  const monthsWithPending = {};
  charges.forEach(charge => {
    if (!charge.paid) {
      const key = `${charge.year}-${charge.month}`;
      if (!monthsWithPending[key]) {
        monthsWithPending[key] = {
          year: charge.year,
          month: charge.month,
          pending: 0
        };
      }
      monthsWithPending[key].pending += charge.amount;
    }
  });

  const pendingMonths = Object.values(monthsWithPending)
    .filter(monthData => {
      // Only show months that have already passed (including current month)
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      // If year is in the past, include it
      if (monthData.year < currentYear) return true;
      
      // If year is current and month is before or equal to today's month, include it
      if (monthData.year === currentYear && monthData.month <= currentMonth) return true;
      
      return false;
    })
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

  // Filter charges only for past months (including current month) for summary cards
  const pastCharges = charges.filter(charge => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // If year is in the past, include it
    if (charge.year < currentYear) return true;
    
    // If year is current and month is before or equal to today's month, include it
    if (charge.year === currentYear && charge.month <= currentMonth) return true;
    
    return false;
  });

  // Calculate totals only for past months
  const totalAllPrice = pastCharges.reduce((sum, c) => sum + c.amount, 0);
  const paidAllPrice = pastCharges.filter(c => c.paid).reduce((sum, c) => sum + c.amount, 0);
  const pendingAllPrice = totalAllPrice - paidAllPrice;

  // Group by person
  const chargesByPerson = {};
  filteredCharges.forEach(charge => {
    if (!chargesByPerson[charge.person]) {
      chargesByPerson[charge.person] = [];
    }
    chargesByPerson[charge.person].push(charge);
  });

  const totalByPerson = {};
  Object.entries(chargesByPerson).forEach(([person, personCharges]) => {
    totalByPerson[person] = personCharges.reduce((sum, c) => sum + c.amount, 0);
  });

  const grandTotal = Object.values(totalByPerson).reduce((sum, total) => sum + total, 0);
  const paidTotal = filteredCharges
    .filter(c => c.paid)
    .reduce((sum, c) => sum + c.amount, 0);
  const pendingTotal = grandTotal - paidTotal;

  return (
    <div className="w-full space-y-6">
      {/* Header */}

      {/* Summary Cards (Overall) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-2">Pendente</p>
          <p className="text-3xl font-bold">R$ {pendingAllPrice.toFixed(2)}</p>
          <p className="text-xs opacity-75 mt-2">Aguardando pagamento</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-2">Já Recebido</p>
          <p className="text-3xl font-bold">R$ {paidAllPrice.toFixed(2)}</p>
          <p className="text-xs opacity-75 mt-2">Até o mês atual</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-md p-6">
          <p className="text-sm opacity-90 mb-2">Total a Receber</p>
          <p className="text-3xl font-bold">R$ {totalAllPrice.toFixed(2)}</p>
          <p className="text-xs opacity-75 mt-2">Até o mês atual</p>
        </div>
      </div>

      {/* Months with Pending Charges */}
      {pendingMonths.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertCircle size={20} className="text-orange-600" />
            Meses com Pendências
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {pendingMonths.map((monthData) => {
              const isCurrent = 
                monthData.month === selectedMonth && 
                monthData.year === selectedYear;
              
              return (
                <button
                  key={`${monthData.year}-${monthData.month}`}
                  onClick={() => {
                    setSelectedMonth(monthData.month);
                    setSelectedYear(monthData.year);
                  }}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isCurrent
                      ? 'border-orange-500 bg-orange-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50'
                  }`}
                >
                  <p className="font-medium text-gray-800">
                    {months[monthData.month]} {monthData.year}
                  </p>
                  <p className="text-sm text-orange-600 font-bold mt-1">
                    Pendente: R$ {monthData.pending.toFixed(2)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          Detalhes de {months[selectedMonth]} / {selectedYear}
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mês
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ano
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 rounded-md p-3 flex flex-col justify-center">
            <p className="text-xs text-blue-600">A Receber</p>
            <p className="text-lg font-bold text-blue-700">R$ {pendingTotal.toFixed(2)}</p>
          </div>

          <div className="bg-green-50 rounded-md p-3 flex flex-col justify-center">
            <p className="text-xs text-green-600">Já Recebido</p>
            <p className="text-lg font-bold text-green-700">R$ {paidTotal.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Charges by Person */}
      {Object.keys(chargesByPerson).length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <DollarSign size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Nenhuma cobrança para este período</p>
        </div>
      ) : (
        Object.entries(chargesByPerson).map(([person, personCharges]) => {
          const personTotal = totalByPerson[person];
          const personPaidTotal = personCharges
            .filter(c => c.paid)
            .reduce((sum, c) => sum + c.amount, 0);
          const personPending = personTotal - personPaidTotal;

          return (
            <div key={person} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{person}</h3>
                  <p className="text-sm text-gray-600">
                    {personCharges.length} {personCharges.length === 1 ? 'lançamento' : 'lançamentos'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600 mb-1">Total</p>
                  <p className="text-2xl font-bold text-gray-900">R$ {personTotal.toFixed(2)}</p>
                  <p className={`text-sm font-medium mt-1 ${personPending > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {personPending > 0 
                      ? `R$ ${personPending.toFixed(2)} pendente` 
                      : 'Tudo pago ✓'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                {personCharges.map(charge => (
                  <div
                    key={charge.id}
                    onClick={() => toggleChargePaid(charge.id)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      charge.paid
                        ? 'bg-green-50 opacity-60'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex-1">
                      <p className={`font-medium ${charge.paid ? 'line-through text-gray-600' : 'text-gray-800'}`}>
                        {charge.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(charge.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-lg ${charge.paid ? 'text-gray-600' : 'text-gray-900'}`}>
                        R$ {charge.amount.toFixed(2)}
                      </span>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          charge.paid
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 hover:border-blue-500'
                        }`}
                      >
                        {charge.paid && <Check size={16} className="text-white" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
