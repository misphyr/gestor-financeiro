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
          originalDate: new Date(expense.date).toISOString().split('T')[0],
          isShared: expense.isShared || false,
          sharedWith: expense.sharedWith || []
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
  },

  incomes: {
    getAll: () => JSON.parse(localStorage.getItem('incomes')) || [],
    add: (income) => {
      const incomes = storage.incomes.getAll();
      const newIncome = {
        id: Date.now(),
        amount: parseFloat(income.amount),
        type: income.type, // 'salary', 'bonus', 'other', or 'recurring'
        description: income.description || '',
        date: income.date || new Date().toISOString().split('T')[0],
        isRecurring: income.isRecurring || false,
        frequency: income.frequency || null, // 'monthly' or 'annual' if recurring
        baseDate: income.baseDate || new Date().toISOString().split('T')[0], // Data de início da recorrência
        lastEditDate: new Date().toISOString().split('T')[0] // Para controlar edições futuras
      };
      incomes.push(newIncome);
      localStorage.setItem('incomes', JSON.stringify(incomes));
      return newIncome;
    },
    delete: (id) => {
      const incomes = storage.incomes.getAll().filter(i => i.id !== id);
      localStorage.setItem('incomes', JSON.stringify(incomes));
    },
    update: (id, updates) => {
      const incomes = storage.incomes.getAll();
      const index = incomes.findIndex(i => i.id === id);
      if (index !== -1) {
        incomes[index] = { ...incomes[index], ...updates, lastEditDate: new Date().toISOString().split('T')[0] };
        localStorage.setItem('incomes', JSON.stringify(incomes));
      }
    },
    getExpandedIncomes: () => {
      // Retorna todas as entradas expandidas (rendas recorrentes expandidas em entradas mensais)
      const incomes = storage.incomes.getAll();
      const expanded = [];
      
      incomes.forEach(income => {
        if (income.isRecurring) {
          const baseDate = new Date(income.baseDate);
          // Gera entradas para 24 meses (12 passados + 12 futuros)
          for (let i = -12; i <= 12; i++) {
            const genDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
            const genDateStr = genDate.toISOString().split('T')[0];
            
            expanded.push({
              ...income,
              date: genDateStr,
              generatedFromRecurring: true,
              recurringId: income.id
            });
          }
        } else {
          expanded.push({ ...income, generatedFromRecurring: false });
        }
      });
      
      return expanded;
    }
  }
};

export const calculateMonthlyForecast = (year, month) => {
  const expenses = storage.expenses.getAll();
  const subscriptions = storage.subscriptions.getAll();
  const incomes = storage.incomes.getExpandedIncomes();

  const targetDate = new Date(year, month, 1);
  const nextMonthDate = new Date(year, month + 1, 1);

  // Gastos do mês atual
  const monthExpenses = expenses.filter(e => {
    const eDate = new Date(e.date);
    return eDate >= targetDate && eDate < nextMonthDate;
  });

  // Entradas do mês atual
  const monthIncomes = incomes.filter(i => {
    const iDate = new Date(i.date);
    return iDate >= targetDate && iDate < nextMonthDate;
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

  // Entradas totais do mês
  const monthIncomesTotal = monthIncomes
    .reduce((acc, i) => acc + parseFloat(i.amount || 0), 0);

  return {
    expenses: monthExpensesTotal,
    subscriptions: monthlySubsTotal,
    annual: annualSubsTotal,
    incomes: monthIncomesTotal,
    total: monthExpensesTotal + monthlySubsTotal + annualSubsTotal,
    balance: monthIncomesTotal - (monthExpensesTotal + monthlySubsTotal + annualSubsTotal)
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
