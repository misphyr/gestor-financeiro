import { storage } from './storage';
import { currentPeriod, guessClosingDay, monthEntries, monthSummary, statementOf, statementRange, viewMode } from './finance';

// Cartão Nubank do usuário: fecha dia 30, vence dia 7.
const CARD = { closingDay: 30, dueDay: 7 };

describe('regras da fatura', () => {
  test('compra no dia do fechamento entra na fatura seguinte', () => {
    expect(statementOf('2026-09-29', CARD)).toEqual({ year: 2026, month: 9 }); // vence 07/10
    expect(statementOf('2026-09-30', CARD)).toEqual({ year: 2026, month: 10 }); // vence 07/11
    expect(statementOf('2026-10-09', CARD)).toEqual({ year: 2026, month: 10 });
    expect(statementOf('2026-10-30', CARD)).toEqual({ year: 2026, month: 11 });
  });

  test('período da fatura de novembro', () => {
    expect(statementRange(2026, 10, CARD)).toEqual({ start: '2026-09-30', end: '2026-10-29', close: '2026-10-30', due: '2026-11-07' });
  });

  test('fechamento dia 30 em fevereiro usa o último dia do mês', () => {
    expect(statementRange(2027, 2, CARD)).toEqual({ start: '2027-01-30', end: '2027-02-27', close: '2027-02-28', due: '2027-03-07' });
    expect(statementOf('2027-02-28', CARD)).toEqual({ year: 2027, month: 3 });
  });

  test('vencimento depois do fechamento no mesmo mês', () => {
    const card = { closingDay: 3, dueDay: 10 };
    expect(statementOf('2026-10-02', card)).toEqual({ year: 2026, month: 9 });
    expect(statementOf('2026-10-03', card)).toEqual({ year: 2026, month: 10 });
  });

  test('descobre o dia de fechamento pelas parcelas antigas da fatura', () => {
    const items = [1, 2, 3, 4].map((n) => ({ date: '2026-09-30', installment: { current: n + 1, total: 6 } }));
    expect(guessClosingDay([...items, { date: '2026-10-09', installment: { current: 1, total: 2 } }])).toBe(30);
    expect(guessClosingDay(items.slice(0, 2))).toBe(null);
  });
});

describe('visão por fatura', () => {
  const TODAY = new Date(2026, 9, 9);
  beforeAll(() => {
    storage.expenses.addMany([
      { amount: 30, category: 'Alimentação', description: 'Padaria Pao Quente', date: '2026-09-30' },
      { amount: 58, category: 'Alimentação', description: "McDonald's", date: '2026-10-09' },
      { amount: 50, category: 'Alimentação', description: 'Feira', date: '2026-10-09', paidWith: 'other' },
      { amount: 80, category: 'Outras', description: 'Loja', date: '2026-10-30' }
    ]);
    storage.subscriptions.add({ name: 'Spotify', amount: 21.9, frequency: 'monthly', category: 'Lazer', startDate: '2026-01-31' });
    storage.incomes.add({ amount: 5000, type: 'salary', description: 'Salário', isRecurring: true, frequency: 'monthly', baseDate: '2026-01-05' });
  });
  afterEach(() => storage.settings.update({ viewMode: 'calendar' }));

  test('sem cartão configurado continua por data da compra', () => {
    expect(viewMode()).toBe('calendar');
    expect(currentPeriod(TODAY)).toEqual({ year: 2026, month: 9 });
  });

  test('com a visão por fatura, novembro tem as compras de 30/09 a 29/10', () => {
    storage.settings.update({ card: CARD, viewMode: 'statement' });
    expect(currentPeriod(TODAY)).toEqual({ year: 2026, month: 10 });
    // Spotify cobra todo dia 31 (30 em setembro): a de 30/09 entra; a de 31/10 vai para a fatura de dezembro.
    const spend = monthEntries(2026, 10).filter((e) => e.kind === 'spend').map((e) => `${e.date} ${e.title}`).sort();
    expect(spend).toEqual(['2026-09-30 Padaria Pao Quente', '2026-09-30 Spotify', "2026-10-09 McDonald's"]);
    expect(monthEntries(2026, 11).some((e) => e.title === 'Loja')).toBe(true);
    // Pix/dinheiro fica no mês do calendário (outubro), não na fatura
    expect(monthEntries(2026, 9).some((e) => e.title === 'Feira')).toBe(true);
    expect(monthEntries(2026, 10).some((e) => e.title === 'Feira')).toBe(false);
    // Entradas seguem o calendário: novembro tem o salário de 05/11
    expect(monthSummary(2026, 10, TODAY).income).toBe(5000);
    expect(monthEntries(2026, 10).find((e) => e.kind === 'earn').date).toBe('2026-11-05');
  });
});
