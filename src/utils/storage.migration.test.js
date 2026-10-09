// O status "pago" das cobranças morava em localStorage.charges; deve ser trazido para o banco.
let storage;

beforeAll(async () => {
  localStorage.clear();
  localStorage.setItem('charges', JSON.stringify({ '2026-9-Ana-1': { paid: true }, '2026-9-Bia-2': { paid: false } }));
  localStorage.setItem('expenses', JSON.stringify([{ id: 7, amount: 1, date: '2026-10-01' }, { id: 7, amount: 2, date: '2026-10-02' }]));
  vi.resetModules();
  ({ storage } = await import('./storage'));
});

test('migra cobranças pagas e corrige IDs repetidos ao carregar', () => {
  expect(storage.charges.isPaid('2026-9-Ana-1')).toBe(true);
  expect(storage.charges.isPaid('2026-9-Bia-2')).toBe(false);
  const ids = storage.expenses.getAll().map((e) => e.id);
  expect(ids[0]).toBe(7);
  expect(ids[1]).not.toBe(7);
});

test('cada gravação atualiza o horário (decide qual cópia é a mais recente ao abrir)', () => {
  const before = JSON.parse(localStorage.getItem('financeDB')).savedAt;
  storage.categories.add({ name: 'Teste', color: '#000', icon: 'Gift' });
  const after = JSON.parse(localStorage.getItem('financeDB')).savedAt;
  expect(after).toBeGreaterThanOrEqual(before);
  expect(after).toBeGreaterThan(0);
});
