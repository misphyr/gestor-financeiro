// Funções de armazenamento local
export const storage = {
  expenses: {
    getAll: () => JSON.parse(localStorage.getItem('expenses')) || [],
    add: (expense) => {
      const expenses = storage.expenses.getAll();
      const installments = expense.installments || 1;
      const baseDate = new Date(expense.date);
      const totalAmount = parseFloat(expense.amount);
      const installmentAmount = totalAmount / installments;
      const createdExpenses = [];

      // Create an entry for each installment
      for (let i = 0; i < installments; i++) {
        const installmentDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate());
        const newExpense = {
          id: Date.now() + i, // Unique ID for each installment
          amount: installmentAmount,
          category: expense.category,
          description: expense.description,
          date: installmentDate.toISOString().split('T')[0],
          installmentNumber: i + 1,
          totalInstallments: installments,
          originalDate: new Date(expense.date).toISOString().split('T')[0]
        };
        expenses.push(newExpense);
        createdExpenses.push(newExpense);
      }

      localStorage.setItem('expenses', JSON.stringify(expenses));
      return createdExpenses;
    },
    delete: (id) => {
      const expenses = storage.expenses.getAll().filter(e => e.id !== id);
      localStorage.setItem('expenses', JSON.stringify(expenses));
    },
    update: (id, updates) => {
      const expenses = storage.expenses.getAll();
      const index = expenses.findIndex(e => e.id === id);
      if (index !== -1) {
        expenses[index] = { ...expenses[index], ...updates };
        localStorage.setItem('expenses', JSON.stringify(expenses));
      }
    }
  },

  subscriptions: {
    getAll: () => JSON.parse(localStorage.getItem('subscriptions')) || [],
    add: (subscription) => {
      const subs = storage.subscriptions.getAll();
      const newSub = {
        id: Date.now(),
        ...subscription,
        startDate: subscription.startDate || new Date().toISOString().split('T')[0],
        canceledDate: null
      };
      subs.push(newSub);
      localStorage.setItem('subscriptions', JSON.stringify(subs));
      return newSub;
    },
    delete: (id) => {
      const subs = storage.subscriptions.getAll().filter(s => s.id !== id);
      localStorage.setItem('subscriptions', JSON.stringify(subs));
    },
    update: (id, updates) => {
      const subs = storage.subscriptions.getAll();
      const index = subs.findIndex(s => s.id === id);
      if (index !== -1) {
        subs[index] = { ...subs[index], ...updates };
        localStorage.setItem('subscriptions', JSON.stringify(subs));
      }
    }
  },

  categories: {
    getAll: () => {
      const defaults = [
        { id: 1, name: 'Alimentação', color: '#10B981', icon: 'Utensils' },
        { id: 2, name: 'Transporte', color: '#06B6D4', icon: 'Car' },
        { id: 3, name: 'Saúde', color: '#10B981', icon: 'Heart' },
        { id: 4, name: 'Lazer', color: '#F59E0B', icon: 'Gamepad2' },
        { id: 5, name: 'Educação', color: '#8B5CF6', icon: 'BookOpen' },
        { id: 6, name: 'Outras', color: '#6B7280', icon: 'MoreHorizontal' }
      ];
      return JSON.parse(localStorage.getItem('categories')) || defaults;
    },
    add: (category) => {
      const cats = storage.categories.getAll();
      const newCat = {
        id: Date.now(),
        ...category
      };
      cats.push(newCat);
      localStorage.setItem('categories', JSON.stringify(cats));
      return newCat;
    },
    delete: (id) => {
      const cats = storage.categories.getAll().filter(c => c.id !== id);
      localStorage.setItem('categories', JSON.stringify(cats));
    },
    update: (id, updates) => {
      const cats = storage.categories.getAll();
      const index = cats.findIndex(c => c.id === id);
      if (index !== -1) {
        cats[index] = { ...cats[index], ...updates };
        localStorage.setItem('categories', JSON.stringify(cats));
      }
    }
  }
};

export const calculateMonthlyForecast = (year, month) => {
  const expenses = storage.expenses.getAll();
  const subscriptions = storage.subscriptions.getAll();

  const targetDate = new Date(year, month, 1);
  const nextMonthDate = new Date(year, month + 1, 1);

  // Gastos do mês atual
  const monthExpenses = expenses.filter(e => {
    const eDate = new Date(e.date);
    return eDate >= targetDate && eDate < nextMonthDate;
  });

  // Assinaturas mensais - considera startDate e canceledDate
  const monthlySubsTotal = subscriptions
    .filter(s => {
      if (s.frequency !== 'monthly') return false;
      const startDate = new Date(s.startDate);
      const cancelDate = s.canceledDate ? new Date(s.canceledDate) : null;
      
      // Conta se começou antes ou durante este mês
      if (startDate >= nextMonthDate) return false;
      // Conta se não foi cancelada ou se foi cancelada depois que o mês começou
      if (cancelDate && cancelDate <= targetDate) return false;
      
      return true;
    })
    .reduce((acc, s) => acc + parseFloat(s.amount || 0), 0);

  // Anuidades (divididas por 12) - considera startDate e canceledDate
  const annualSubsTotal = subscriptions
    .filter(s => {
      if (s.frequency !== 'annual') return false;
      const startDate = new Date(s.startDate);
      const cancelDate = s.canceledDate ? new Date(s.canceledDate) : null;
      
      // Conta se começou antes ou durante este mês
      if (startDate >= nextMonthDate) return false;
      // Conta se não foi cancelada ou se foi cancelada depois que o mês começou
      if (cancelDate && cancelDate <= targetDate) return false;
      
      return true;
    })
    .reduce((acc, s) => acc + (parseFloat(s.amount || 0) / 12), 0);

  // Gastos variáveis do mês
  const monthExpensesTotal = monthExpenses
    .reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);

  return {
    expenses: monthExpensesTotal,
    subscriptions: monthlySubsTotal,
    annual: annualSubsTotal,
    total: monthExpensesTotal + monthlySubsTotal + annualSubsTotal
  };
};

export const getExpensestByCategory = () => {
  const expenses = storage.expenses.getAll();
  const result = {};

  expenses.forEach(e => {
    if (!result[e.category]) {
      result[e.category] = 0;
    }
    result[e.category] += parseFloat(e.amount || 0);
  });

  return result;
};
