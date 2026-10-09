import { Capacitor } from '@capacitor/core';
import { addMonths, parseLocalDate, toDateString, todayString } from './date';

// Banco local (SQLite no mobile nativo + fallback localStorage)
const DB_KEY = 'financeDB';
const DB_VERSION = 1;
const SQLITE_DB_NAME = 'finance_db';
const SQLITE_TABLE = 'app_kv';

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Alimentação', color: '#10B981', icon: 'Utensils' },
  { id: 2, name: 'Transporte', color: '#06B6D4', icon: 'Car' },
  { id: 3, name: 'Saúde', color: '#10B981', icon: 'Heart' },
  { id: 4, name: 'Lazer', color: '#F59E0B', icon: 'Gamepad2' },
  { id: 5, name: 'Educação', color: '#8B5CF6', icon: 'BookOpen' },
  { id: 6, name: 'Outras', color: '#6B7280', icon: 'MoreHorizontal' }
];

const parseJson = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

// IDs numéricos e crescentes: Date.now() sozinho repete quando vários itens
// são criados no mesmo milissegundo (parcelas, importação em lote).
let lastId = 0;
export const newId = () => {
  const now = Date.now();
  lastId = now > lastId ? now : lastId + 1;
  return lastId;
};

// Corrige IDs repetidos gravados por versões antigas (mantém o primeiro).
const dedupeIds = (items) => {
  const seen = new Set();
  return items.map((item) => {
    if (item?.id == null || seen.has(item.id)) {
      const fixed = { ...item, id: newId() };
      seen.add(fixed.id);
      return fixed;
    }
    seen.add(item.id);
    return item;
  });
};

const normalizeDb = (db) => ({
  version: DB_VERSION,
  // Momento da última gravação: ao abrir, vale a cópia mais recente (SQLite ou local).
  savedAt: typeof db?.savedAt === 'number' ? db.savedAt : 0,
  expenses: Array.isArray(db?.expenses) ? dedupeIds(db.expenses) : [],
  subscriptions: Array.isArray(db?.subscriptions) ? dedupeIds(db.subscriptions) : [],
  categories: Array.isArray(db?.categories) ? db.categories : [...DEFAULT_CATEGORIES],
  incomes: Array.isArray(db?.incomes) ? dedupeIds(db.incomes) : [],
  chargesPaid: db?.chargesPaid && typeof db.chargesPaid === 'object' ? db.chargesPaid : migrateChargesPaid(),
  settings: db?.settings && typeof db.settings === 'object' ? db.settings : {}
});

// Antes o status "pago" das cobranças ficava só em localStorage.charges ({ chave: { paid } }).
function migrateChargesPaid() {
  const legacy = parseJson(localStorage.getItem('charges'), {});
  const paid = {};
  Object.entries(legacy || {}).forEach(([key, value]) => {
    if (value?.paid) paid[key] = true;
  });
  return paid;
}

const saveLocalDb = (db) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
};

const migrateLegacyData = () => {
  const migrated = {
    version: DB_VERSION,
    expenses: parseJson(localStorage.getItem('expenses'), []),
    subscriptions: parseJson(localStorage.getItem('subscriptions'), []),
    categories: parseJson(localStorage.getItem('categories'), [...DEFAULT_CATEGORIES]),
    incomes: parseJson(localStorage.getItem('incomes'), [])
  };

  return normalizeDb(migrated);
};

const loadLocalDb = () => {
  const current = parseJson(localStorage.getItem(DB_KEY), null);

  if (current && typeof current === 'object') {
    return normalizeDb(current);
  }

  const migratedDb = migrateLegacyData();
  saveLocalDb(migratedDb);
  return migratedDb;
};

let inMemoryDb = loadLocalDb();
let backend = 'localstorage';
let sqliteDb = null;
let initPromise = null;
let isInitialized = false;

const isNativePlatform = () => {
  try {
    return Capacitor.getPlatform() !== 'web';
  } catch {
    return false;
  }
};

const initSqliteConnection = async () => {
  if (!isNativePlatform()) return null;

  const { SQLiteConnection, CapacitorSQLite } = await import('@capacitor-community/sqlite');
  const sqlite = new SQLiteConnection(CapacitorSQLite);

  const consistency = await sqlite.checkConnectionsConsistency();
  const hasConnection = await sqlite.isConnection(SQLITE_DB_NAME, false);

  let db;
  if (consistency.result && hasConnection.result) {
    db = await sqlite.retrieveConnection(SQLITE_DB_NAME, false);
  } else {
    db = await sqlite.createConnection(SQLITE_DB_NAME, false, 'no-encryption', 1, false);
  }

  await db.open();
  await db.execute(
    `CREATE TABLE IF NOT EXISTS ${SQLITE_TABLE} (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`
  );

  return db;
};

const loadDbFromSqlite = async () => {
  if (!sqliteDb) return null;

  const result = await sqliteDb.query(
    `SELECT value FROM ${SQLITE_TABLE} WHERE key = ? LIMIT 1;`,
    [DB_KEY]
  );

  const value = result?.values?.[0]?.value;
  return parseJson(value, null);
};

const saveDbToSqlite = async (db) => {
  if (!sqliteDb) return;

  await sqliteDb.run(
    `INSERT OR REPLACE INTO ${SQLITE_TABLE} (key, value) VALUES (?, ?);`,
    [DB_KEY, JSON.stringify(db)]
  );
};

// Avisa a interface (uma vez por sessão) quando o banco do aparelho falha.
// Se acontecer antes de a tela existir (ao abrir o app), fica pendente até ela perguntar.
let storageErrorReported = false;
let pendingStorageError = false;
const reportStorageError = (error) => {
  if (storageErrorReported || typeof window === 'undefined') return;
  storageErrorReported = true;
  pendingStorageError = true;
  window.dispatchEvent(new CustomEvent('storageError', { detail: String(error?.message || error) }));
};
export const takePendingStorageError = () => {
  const pending = pendingStorageError;
  pendingStorageError = false;
  return pending;
};

const persistDb = (db) => {
  const normalized = normalizeDb({ ...db, savedAt: Date.now() });
  inMemoryDb = normalized;

  // Sempre salva local como cópia de segurança do SQLite.
  try {
    saveLocalDb(normalized);
  } catch (error) {
    reportStorageError(error); // ex.: localStorage cheio
  }

  // Se o SQLite falhar, a cópia local fica mais nova (savedAt) e é usada ao reabrir;
  // a próxima gravação tenta o SQLite de novo.
  if (backend === 'sqlite' && sqliteDb) {
    saveDbToSqlite(normalized).catch(reportStorageError);
  }

  return normalized;
};

export const initStorage = async () => {
  if (isInitialized) return inMemoryDb;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    inMemoryDb = loadLocalDb();

    if (isNativePlatform()) {
      try {
        sqliteDb = await initSqliteConnection();
        const sqliteData = await loadDbFromSqlite();

        // Usa a cópia mais recente: se uma gravação no SQLite falhou, a local está à frente.
        if (sqliteData && typeof sqliteData === 'object') {
          const fromSqlite = normalizeDb(sqliteData);
          if (fromSqlite.savedAt >= inMemoryDb.savedAt) inMemoryDb = fromSqlite;
        }

        backend = 'sqlite';
      } catch (error) {
        backend = 'localstorage';
        reportStorageError(error);
      }
    }

    persistDb(inMemoryDb);
    isInitialized = true;
    return inMemoryDb;
  })().finally(() => {
    initPromise = null;
  });

  return initPromise;
};

const readCollection = (collection) => inMemoryDb[collection];

// Um gasto parcelado vira uma entrada por mês; o total é dividido em centavos
// (as primeiras parcelas levam o centavo que sobra).
const buildInstallments = (expense) => {
  const installments = expense.installments || 1;
  const baseDate = parseLocalDate(expense.date);
  const totalCents = Math.round(parseFloat(expense.amount) * 100);
  const baseCents = Math.floor(totalCents / installments);
  const rest = totalCents - baseCents * installments;
  const extra = {};
  if (expense.importRef) extra.importRef = expense.importRef;
  if (expense.importBatch) extra.importBatch = expense.importBatch;
  if (expense.person) extra.person = expense.person;
  if (expense.paidWith) extra.paidWith = expense.paidWith;

  return Array.from({ length: installments }, (_, i) => ({
    id: newId(),
    amount: (baseCents + (i < rest ? 1 : 0)) / 100,
    category: expense.category,
    description: expense.description,
    date: toDateString(addMonths(baseDate, i)),
    installmentNumber: i + 1,
    totalInstallments: installments,
    originalDate: toDateString(baseDate),
    isShared: expense.isShared || false,
    sharedWith: expense.sharedWith || [],
    ...extra
  }));
};

const writeCollection = (collection, updater) => {
  const currentDb = inMemoryDb;
  const nextValue = updater([...currentDb[collection]]);
  const nextDb = { ...currentDb, [collection]: nextValue };
  persistDb(nextDb);
  return nextValue;
};

export const storage = {
  // Preferências do app. card: { closingDay, dueDay }; viewMode: 'calendar' | 'statement'
  settings: {
    get: () => inMemoryDb.settings,
    update: (patch) => persistDb({ ...inMemoryDb, settings: { ...inMemoryDb.settings, ...patch } })
  },

  charges: {
    isPaid: (key) => Boolean(inMemoryDb.chargesPaid[key]),
    setPaid: (keys, paid) => {
      const next = { ...inMemoryDb.chargesPaid };
      [].concat(keys).forEach((key) => {
        if (paid) next[key] = true;
        else delete next[key];
      });
      persistDb({ ...inMemoryDb, chargesPaid: next });
    }
  },

  expenses: {
    getAll: () => readCollection('expenses'),
    add: (expense) => storage.expenses.addMany([expense]),
    // Grava vários gastos de uma vez (uma escrita só). Cada um vira N parcelas.
    addMany: (list) => {
      const created = list.flatMap(buildInstallments);
      writeCollection('expenses', (expenses) => [...expenses, ...created]);
      return created;
    },
    deleteMany: (ids) => {
      const remove = new Set(ids);
      writeCollection('expenses', (expenses) => expenses.filter((e) => !remove.has(e.id)));
    },
    delete: (id) => {
      writeCollection('expenses', (expenses) => expenses.filter(e => e.id !== id));
    },
    update: (id, updates) => {
      writeCollection('expenses', (expenses) => {
        const index = expenses.findIndex(e => e.id === id);
        if (index !== -1) {
          expenses[index] = { ...expenses[index], ...updates };
        }
        return expenses;
      });
    }
  },

  subscriptions: {
    getAll: () => readCollection('subscriptions'),
    add: (subscription) => {
      const subs = storage.subscriptions.getAll();
      const newSub = {
        id: newId(),
        ...subscription,
        startDate: subscription.startDate || todayString(),
        canceledDate: null
      };
      subs.push(newSub);
      writeCollection('subscriptions', () => subs);
      return newSub;
    },
    delete: (id) => {
      writeCollection('subscriptions', (subs) => subs.filter(s => s.id !== id));
    },
    update: (id, updates) => {
      writeCollection('subscriptions', (subs) => {
        const index = subs.findIndex(s => s.id === id);
        if (index !== -1) {
          subs[index] = { ...subs[index], ...updates };
        }
        return subs;
      });
    }
  },

  categories: {
    getAll: () => readCollection('categories'),
    add: (category) => {
      const cats = storage.categories.getAll();
      const newCat = {
        id: newId(),
        ...category
      };
      cats.push(newCat);
      writeCollection('categories', () => cats);
      return newCat;
    },
    delete: (id) => {
      writeCollection('categories', (cats) => cats.filter(c => c.id !== id));
    },
    update: (id, updates) => {
      writeCollection('categories', (cats) => {
        const index = cats.findIndex(c => c.id === id);
        if (index !== -1) {
          cats[index] = { ...cats[index], ...updates };
        }
        return cats;
      });
    },
    // Gastos e assinaturas guardam o nome da categoria, então renomear precisa propagar.
    rename: (id, updates) => {
      const current = inMemoryDb.categories.find((c) => c.id === id);
      if (!current) return;
      const oldName = current.name;
      const newName = updates.name ?? oldName;
      const swap = (items) => items.map((item) => (item.category === oldName ? { ...item, category: newName } : item));
      persistDb({
        ...inMemoryDb,
        categories: inMemoryDb.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        expenses: oldName === newName ? inMemoryDb.expenses : swap(inMemoryDb.expenses),
        subscriptions: oldName === newName ? inMemoryDb.subscriptions : swap(inMemoryDb.subscriptions)
      });
    }
  },

  incomes: {
    getAll: () => readCollection('incomes'),
    add: (income) => storage.incomes.addMany([income])[0],
    // Grava várias entradas de uma vez (importação do extrato).
    addMany: (list) => {
      const created = list.map((income) => {
        const newIncome = {
          id: newId(),
          amount: parseFloat(income.amount),
          type: income.type, // 'salary', 'bonus', 'other', or 'recurring'
          description: income.description || '',
          date: income.date || todayString(),
          isRecurring: income.isRecurring || false,
          frequency: income.frequency || null, // 'monthly' or 'annual' if recurring
          baseDate: income.baseDate || todayString(), // Data de início da recorrência
          lastEditDate: todayString() // Para controlar edições futuras
        };
        if (income.importRef) newIncome.importRef = income.importRef;
        if (income.importBatch) newIncome.importBatch = income.importBatch;
        return newIncome;
      });
      writeCollection('incomes', (incomes) => [...incomes, ...created]);
      return created;
    },
    delete: (id) => {
      writeCollection('incomes', (incomes) => incomes.filter(i => i.id !== id));
    },
    deleteMany: (ids) => {
      const remove = new Set(ids);
      writeCollection('incomes', (incomes) => incomes.filter((i) => !remove.has(i.id)));
    },
    update: (id, updates) => {
      writeCollection('incomes', (incomes) => {
        const index = incomes.findIndex(i => i.id === id);
        if (index !== -1) {
          incomes[index] = { ...incomes[index], ...updates, lastEditDate: todayString() };
        }
        return incomes;
      });
    },
    getExpandedIncomes: () => {
      // Retorna todas as entradas expandidas (rendas recorrentes expandidas em entradas mensais)
      const incomes = storage.incomes.getAll();
      const expanded = [];
      
      incomes.forEach(income => {
        if (income.isRecurring) {
          const baseDate = parseLocalDate(income.baseDate);
          // Gera do mês de início até 24 meses à frente de hoje
          const now = new Date();
          const step = income.frequency === 'annual' ? 12 : 1;
          const months = (now.getFullYear() - baseDate.getFullYear()) * 12 + now.getMonth() - baseDate.getMonth() + 24;
          for (let i = 0; i <= months; i += step) {
            const genDate = addMonths(baseDate, i);
            const genDateStr = toDateString(genDate);
            
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
