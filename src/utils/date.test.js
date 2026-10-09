import { parseLocalDate, toDateString, addMonths, formatDateBR } from './date';
import { storage } from './storage';
import { monthSummary } from './finance';

// Rode com TZ=America/Sao_Paulo para reproduzir o fuso do usuário.

describe('date helpers', () => {
  test('parseLocalDate mantém o dia no fuso local', () => {
    const d = parseLocalDate('2026-10-01');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 1]);
  });

  test('toDateString usa o fuso local, não UTC', () => {
    expect(toDateString(new Date(2026, 9, 1, 23, 30))).toBe('2026-10-01');
  });

  test('addMonths limita ao último dia do mês', () => {
    expect(toDateString(addMonths(parseLocalDate('2026-01-31'), 1))).toBe('2026-02-28');
    expect(toDateString(addMonths(parseLocalDate('2026-10-15'), 3))).toBe('2027-01-15');
  });

  test('formatDateBR não volta um dia', () => {
    expect(formatDateBR('2026-10-01')).toBe('01/10/2026');
  });
});

describe('storage com datas locais', () => {
  test('gasto no dia 1º conta no próprio mês', () => {
    storage.expenses.add({ amount: 100, category: 'Outras', description: 'teste', date: '2026-10-01' });
    expect(monthSummary(2026, 9).variable).toBe(100);
    expect(monthSummary(2026, 8).variable).toBe(0);
  });

  test('parcelas mantêm o dia da compra', () => {
    const created = storage.expenses.add({
      amount: 300, category: 'Outras', description: 'parcelado', date: '2026-10-15', installments: 3
    });
    expect(created.map(e => e.date)).toEqual(['2026-10-15', '2026-11-15', '2026-12-15']);
    expect(created[0].originalDate).toBe('2026-10-15');
  });

  test('renda recorrente começa no mês da baseDate', () => {
    storage.incomes.add({ amount: 5000, type: 'salary', isRecurring: true, frequency: 'monthly', baseDate: '2026-10-01' });
    const recurring = storage.incomes.getExpandedIncomes().filter(i => i.generatedFromRecurring);
    expect(recurring[0].date).toBe('2026-10-01');
    expect(recurring[1].date).toBe('2026-11-01');
  });
});
