import { storage, newId } from './storage';
import { monthSummary, descriptionHistory, pendingCharges, allCharges, formatBRL, installmentPurchases, periodEntries, monthEntries, buyerOf, knownBuyers, ME, nextCharge, upcomingAnnual, settleCharges } from './finance';

// Datas fixas: "hoje" é 15/10/2026.
const TODAY = new Date(2026, 9, 15);

beforeAll(() => {
  storage.subscriptions.add({ name: 'Netflix', amount: 50, frequency: 'monthly', category: 'Lazer', startDate: '2026-01-10' });
  storage.subscriptions.add({ name: 'Anuidade', amount: 120, frequency: 'annual', category: 'Outras', startDate: '2026-01-10' });
  storage.incomes.add({ amount: 5000, type: 'salary', description: 'Salário', isRecurring: true, frequency: 'monthly', baseDate: '2025-01-05' });
  storage.expenses.add({ amount: 300, category: 'Alimentação', description: 'Mercado', date: '2026-10-02' });
  storage.expenses.add({ amount: 600, category: 'Outras', description: 'Notebook', date: '2026-10-10', installments: 3 });
  storage.expenses.add({ amount: 90, category: 'Alimentação', description: 'mercado', date: '2026-09-02' });
  storage.expenses.add({
    amount: 100, category: 'Lazer', description: 'Pizza', date: '2026-10-05', isShared: true,
    sharedWith: [{ id: 1, name: 'Eu', isMe: true }, { id: 2, name: 'Ana', isMe: false }]
  });
});

test('newId nunca repete, mesmo em sequência rápida', () => {
  const ids = Array.from({ length: 1000 }, () => newId());
  expect(new Set(ids).size).toBe(1000);
});

test('parcelas criadas juntas têm IDs diferentes', () => {
  const ids = storage.expenses.getAll().map((e) => e.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test('resumo do mês separa fixos, parcelas e variáveis', () => {
  const s = monthSummary(2026, 9, TODAY);
  expect(s.variable).toBe(400);
  expect(s.installments).toBe(200);
  expect(s.fixed).toBe(50); // anuidade (janeiro) não entra em outubro
  expect(s.income).toBe(5000);
  expect(s.estimate).toBe(0);
  expect(s.left).toBe(5000 - 650);
});

test('renda recorrente continua aparecendo além de 12 meses do início', () => {
  expect(monthSummary(2027, 3, TODAY).income).toBe(5000);
});

test('mês futuro usa a média dos variáveis como estimativa', () => {
  const s = monthSummary(2026, 10, TODAY);
  expect(s.installments).toBe(200);
  expect(s.estimate).toBe(30); // (0 + 90 + 0) / 3
});

test('histórico agrupa descrições sem diferenciar maiúsculas', () => {
  const mercado = descriptionHistory().find((h) => h.description.toLowerCase() === 'mercado');
  expect(mercado.count).toBe(2);
  expect(mercado.category).toBe('Alimentação');
});

test('cobranças pendentes somam a parte de cada pessoa', () => {
  expect(pendingCharges(TODAY)).toEqual([{ name: 'Ana', amount: 50, items: ['Pizza'] }]);
});

test('moeda no formato brasileiro', () => {
  expect(formatBRL(1322.2).replace(/\s/g, ' ')).toBe('R$ 1.322,20');
});

describe('cobranças', () => {
  test('assinatura dividida gera uma cobrança por mês ativo', () => {
    storage.subscriptions.add({
      name: 'Spotify Família', amount: 30, frequency: 'monthly', category: 'Lazer', startDate: '2026-08-20',
      isShared: true, sharedWith: [{ id: 1, name: 'Eu', isMe: true }, { id: 2, name: 'Bruno', isMe: false }]
    });
    const bruno = allCharges(TODAY).filter((c) => c.person === 'Bruno');
    expect(bruno.map((c) => c.date)).toEqual(['2026-10-20', '2026-09-20', '2026-08-20']);
    expect(bruno[0].amount).toBe(15);
  });

  test('marcar como recebido tira da lista de pendentes e pode ser desfeito', () => {
    const pizza = allCharges(TODAY).find((c) => c.description === 'Pizza');
    storage.charges.setPaid([pizza.key], true);
    expect(pendingCharges(TODAY).find((p) => p.name === 'Ana')).toBeUndefined();
    storage.charges.setPaid([pizza.key], false);
    expect(pendingCharges(TODAY).find((p) => p.name === 'Ana').amount).toBe(50);
  });
});

test('renomear categoria atualiza gastos e assinaturas', () => {
  const lazer = storage.categories.getAll().find((c) => c.name === 'Lazer');
  storage.categories.rename(lazer.id, { name: 'Diversão' });
  expect(storage.expenses.getAll().some((e) => e.category === 'Lazer')).toBe(false);
  expect(storage.expenses.getAll().find((e) => e.description === 'Pizza').category).toBe('Diversão');
  expect(storage.subscriptions.getAll().find((s) => s.name === 'Netflix').category).toBe('Diversão');
});

describe('compras parceladas e períodos', () => {
  test('agrupa parcelas da mesma compra e calcula quanto falta', () => {
    const notebook = installmentPurchases(TODAY).find((p) => p.description === 'Notebook');
    expect(notebook.count).toBe(3);
    expect(notebook.total).toBe(600);
    expect(notebook.paidCount).toBe(1);
    expect(notebook.remaining).toBe(400);
    expect(notebook.nextDate).toBe('2026-11-10');
  });

  test('lançamentos de um período respeitam as datas inclusive', () => {
    const entries = periodEntries('2026-10-02', '2026-10-05');
    expect(entries.map((e) => `${e.date} ${e.title}`).sort()).toEqual(['2026-10-02 Mercado', '2026-10-05 Pizza', '2026-10-05 Salário']);
  });
});

describe('quem comprou', () => {
  test('pessoa vai para todas as parcelas e aparece nos lançamentos', () => {
    storage.expenses.add({ amount: 300, category: 'Outras', description: 'Tênis', date: '2026-10-08', installments: 3, person: 'Carla' });
    const parcels = storage.expenses.getAll().filter((e) => e.description === 'Tênis');
    expect(parcels.map((e) => e.person)).toEqual(['Carla', 'Carla', 'Carla']);
    const entry = monthEntries(2026, 9).find((e) => e.title === 'Tênis');
    expect(buyerOf(entry)).toBe('Carla');
    expect(buyerOf(monthEntries(2026, 9).find((e) => e.title === 'Mercado'))).toBe(ME);
    expect(knownBuyers()).toEqual(['Carla']);
  });

  test('compra parcelada guarda quem comprou', () => {
    expect(installmentPurchases(TODAY).find((p) => p.description === 'Tênis').person).toBe('Carla');
  });
});

describe('assinatura anual', () => {
  test('entra inteira só no mês de renovação', () => {
    // janeiro: Netflix (50) + Spotify Família (30) + anuidade cheia (120)
    expect(monthSummary(2027, 0, TODAY).fixed).toBe(50 + 30 + 120);
    expect(monthSummary(2026, 11, TODAY).fixed).toBe(50 + 30);
    const jan = monthEntries(2027, 0).find((e) => e.title === 'Anuidade');
    expect(jan.amount).toBe(120);
    expect(jan.fixed).toBe('anual');
    expect(jan.date).toBe('2027-01-10');
  });

  test('próxima cobrança e aviso de anuidade chegando', () => {
    const anuidade = storage.subscriptions.getAll().find((s) => s.name === 'Anuidade');
    expect(nextCharge(anuidade, TODAY)).toBe('2027-01-10');
    expect(upcomingAnnual(TODAY, 60)).toHaveLength(0);
    expect(upcomingAnnual(TODAY, 90).map((x) => x.sub.name)).toEqual(['Anuidade']);
  });

  test('cancelada antes da renovação não é cobrada', () => {
    const sub = storage.subscriptions.add({ name: 'Revista', amount: 200, frequency: 'annual', category: 'Outras', startDate: '2025-11-20' });
    expect(monthEntries(2026, 10).some((e) => e.title === 'Revista')).toBe(true);
    storage.subscriptions.update(sub.id, { canceledDate: '2026-10-15' });
    expect(monthEntries(2026, 10).some((e) => e.title === 'Revista')).toBe(false);
    expect(nextCharge({ ...sub, canceledDate: '2026-10-15' }, TODAY)).toBe(null);
  });

  test('renda anual entra inteira uma vez por ano', () => {
    storage.incomes.add({ amount: 3000, type: 'recurring', description: '13º', isRecurring: true, frequency: 'annual', baseDate: '2025-12-20' });
    expect(monthSummary(2026, 11, TODAY).income).toBe(5000 + 3000);
    expect(monthSummary(2026, 10, TODAY).income).toBe(5000);
  });
});

describe('cobrança do que outra pessoa comprou', () => {
  const OCT = new Date(2026, 9, 20);
  beforeAll(() => {
    storage.expenses.addMany([
      { amount: 80, category: 'Outras', description: 'Farmácia da Bia', date: '2026-08-10', person: 'Bia' },
      { amount: 120, category: 'Outras', description: 'Sapato da Bia', date: '2026-09-05', person: 'Bia' },
      { amount: 300, category: 'Outras', description: 'Celular da Bia', date: '2026-09-20', installments: 3, person: 'Bia' }
    ]);
  });
  afterEach(() => storage.settings.update({ chargeBuyers: true }));

  test('cada compra (ou parcela já vencida) vira cobrança do valor inteiro', () => {
    const bia = allCharges(OCT).filter((c) => c.person === 'Bia');
    expect(bia.map((c) => [c.date, c.amount, c.source])).toEqual([
      ['2026-10-20', 100, 'buyer'],
      ['2026-09-20', 100, 'buyer'],
      ['2026-09-05', 120, 'buyer'],
      ['2026-08-10', 80, 'buyer']
    ]);
    expect(bia[0].description).toBe('Celular da Bia (2/3)');
  });

  test('dá para desligar', () => {
    storage.settings.update({ chargeBuyers: false });
    expect(allCharges(OCT).some((c) => c.person === 'Bia')).toBe(false);
  });

  test('reembolso quita das mais antigas até o valor, sem quitar pela metade', () => {
    const result = settleCharges('Bia', 250, OCT); // 80 + 120 cabem; a parcela de 100 não cabe nos 50 que sobram
    expect(result).toMatchObject({ count: 2, used: 200, stillPending: 2 });
    expect(result.left).toBeCloseTo(50);
    expect(pendingCharges(OCT).find((p) => p.name === 'Bia').amount).toBe(200);
  });
});
