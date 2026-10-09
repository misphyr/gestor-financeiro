import fs from 'fs';
import { buildImportItems, cleanTitle, itemsToExpenses, itemsToIncomes, parseAmount, parseCSVRows } from './csvImport';

const CATEGORIES = ['Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Outras'];

// Formato da fatura do cartão Nubank (2026). Lojas e valores são fictícios.
const SAMPLE = [
  'date,title,amount',
  '2026-07-23,"Estorno de ""Loja Exemplo"" (Exemplo)","- 49,90"',
  '2026-07-23,Padaria Pao Quente,"32,50"',
  '2026-07-23,Dl*Uberrides,"18,40"',
  '2026-07-22,Dl *Uberrides,"22,10"',
  '2026-07-22,Google One,"9,99"',
  '2026-07-19,Nuv*Loja Teste - Parcela 1/3,"100,00"',
  '2026-07-18,IOF de compra internacional,"1,20"',
  '2026-07-17,Mcdonald S,"45,90"',
  '2026-07-03,Pagamento recebido,"- 2.500,00"',
  '2026-06-30,Nuuvem *Nuuvem - Parcela 5/6,"20,00"',
  '2026-06-30,Nuuvem *Nuuvem - Parcela 5/6,"20,00"',
  '2026-06-30,Mp *Loja Modelo - Parcela 7/8,"125,00"'
].join('\n');

test('lê campos com aspas, vírgulas e aspas duplicadas', () => {
  const rows = parseCSVRows(SAMPLE);
  expect(rows[1]).toEqual(['2026-07-23', 'Estorno de "Loja Exemplo" (Exemplo)', '- 49,90']);
  expect(rows).toHaveLength(13);
});

test('valores no formato brasileiro e no antigo', () => {
  expect(parseAmount('12,34')).toBe(12.34);
  expect(parseAmount('- 2.500,00')).toBe(-2500);
  expect(parseAmount('1.234,56')).toBe(1234.56);
  expect(parseAmount('12.34')).toBe(12.34);
});

test('limpa nomes da fatura e separa a parcela', () => {
  expect(cleanTitle('Dl *Uberrides').title).toBe('Uber');
  expect(cleanTitle('Dl*Uberrides').title).toBe('Uber');
  expect(cleanTitle('Uber Uber *Trip Help.U').title).toBe('Uber');
  expect(cleanTitle('Dl*Google Youtub').title).toBe('YouTube Premium');
  expect(cleanTitle('Jim.Com* Acai Tropical').title).toBe('Acai Tropical');
  expect(cleanTitle('Mp *Loja Modelo - Parcela 7/8')).toEqual({ base: 'Mp *Loja Modelo', title: 'Loja Modelo', installment: { current: 7, total: 8 } });
});

describe('montagem da importação', () => {
  const { items } = buildImportItems(SAMPLE, { categoryNames: CATEGORIES });
  const byRaw = (raw) => items.filter((i) => i.raw === raw);

  test('ignora estorno e pagamento da fatura', () => {
    expect(byRaw('Pagamento recebido')[0].skip).toBe('Pagamento da fatura');
    expect(items[0].skip).toBe('Estorno ou crédito');
    expect(items.filter((i) => i.included)).toHaveLength(10);
  });

  test('parcela: total, data da 1ª parcela e duas compras iguais na mesma fatura', () => {
    const loja = byRaw('Mp *Loja Modelo - Parcela 7/8')[0];
    expect(loja.total).toBeCloseTo(1000);
    expect(loja.originalDate).toBe('2025-12-30');
    const nuuvem = byRaw('Nuuvem *Nuuvem - Parcela 5/6');
    expect(nuuvem.every((i) => i.included && !i.duplicate)).toBe(true);
  });

  test('sugere categorias por palavra-chave', () => {
    expect(byRaw('Dl*Uberrides')[0].category).toBe('Transporte');
    expect(byRaw('Mcdonald S')[0].category).toBe('Alimentação');
    expect(byRaw('Google One')[0].looksLikeSubscription).toBe('monthly');
  });

  test('reimportar a mesma fatura marca tudo como já importado', () => {
    const imported = itemsToExpenses(items, 'b1').flatMap((e) => {
      const n = e.installments;
      return Array.from({ length: n }, (_, k) => ({ ...e, amount: e.amount / n, installmentNumber: k + 1, totalInstallments: n }));
    });
    const again = buildImportItems(SAMPLE, { expenses: imported, categoryNames: CATEGORIES }).items;
    expect(again.filter((i) => i.included)).toHaveLength(0);
    expect(again.filter((i) => i.duplicate)).toHaveLength(10);
  });

  test('próxima fatura: parcela seguinte datada pelo ciclo não duplica a compra', () => {
    const imported = itemsToExpenses(items, 'b1').map((e) => ({ ...e, installmentNumber: 1, totalInstallments: e.installments }));
    const next = 'date,title,amount\n2026-07-30,Nuv*Loja Teste - Parcela 2/3,"100,00"\n2026-07-30,Nuuvem *Nuuvem - Parcela 6/6,"20,00"';
    const result = buildImportItems(next, { expenses: imported, categoryNames: CATEGORIES }).items;
    expect(result.map((i) => i.duplicate)).toEqual([true, true]);
  });

  test('gasto que já é assinatura cadastrada não entra de novo', () => {
    const res = buildImportItems(SAMPLE, { subscriptions: [{ name: 'Google One', amount: 9.99 }], categoryNames: CATEGORIES }).items;
    const google = res.find((i) => i.raw === 'Google One');
    expect(google.included).toBe(false);
    expect(google.skip).toMatch(/assinatura/);
  });
});

test('arquivo desconhecido dá mensagem clara', () => {
  expect(buildImportItems(['Data,Valor,Identificador,Descrição', '01/07/2026,-10,abc,Pix'].join('\n')).format).toBe('nubank-account');
  expect(buildImportItems('a,b\n1,2').error).toMatch(/Não reconheci/);
});

// Opcional: CSV_SAMPLE=caminho/do/arquivo.csv para conferir uma fatura real (não fica no projeto).
(process.env.CSV_SAMPLE ? test : test.skip)('resumo de uma fatura real', () => {
  const { items } = buildImportItems(fs.readFileSync(process.env.CSV_SAMPLE, 'utf8'), { categoryNames: CATEGORIES });
  const included = items.filter((i) => i.included);
  const total = included.reduce((a, i) => a + i.amount, 0);
  const cats = {};
  included.forEach((i) => { cats[i.category] = (cats[i.category] || 0) + 1; });
  const titles = {};
  included.forEach((i) => { titles[i.title] = (titles[i.title] || 0) + 1; });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    linhas: items.length,
    importar: included.length,
    ignorados: items.filter((i) => i.skip).map((i) => `${i.raw}: ${i.skip}`),
    parcelados: included.filter((i) => i.installment).length,
    totalNaFatura: total.toFixed(2),
    categorias: cats,
    nomes: Object.entries(titles).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} (${n})`)
  }, null, 1));
  expect(included.length).toBeGreaterThan(0);
});

test('quem comprou passa da revisão para o gasto importado', () => {
  const { items } = buildImportItems(SAMPLE, { categoryNames: CATEGORIES });
  const marked = items.map((i) => (i.raw === 'Mcdonald S' ? { ...i, person: 'Carla' } : i));
  const expenses = itemsToExpenses(marked, 'b2');
  expect(expenses.find((e) => e.description === "McDonald's").person).toBe('Carla');
  expect(expenses.find((e) => e.description === 'Uber').person).toBe(null);
});

describe('casos vistos em faturas reais (com dados trocados)', () => {
  test('parcela com centavos diferentes entre faturas não duplica', () => {
    const aug = buildImportItems('date,title,amount\n2026-06-30,Jim.Com* Loja Exemplo - Parcela 1/5,"30,02"', { categoryNames: CATEGORIES }).items;
    const saved = itemsToExpenses(aug, 'a').map((e) => ({ ...e, installmentNumber: 1, totalInstallments: 5 }));
    const nov = buildImportItems('date,title,amount\n2026-09-30,Jim.Com* Loja Exemplo - Parcela 4/5,"29,99"', { expenses: saved, categoryNames: CATEGORIES }).items;
    expect(nov[0].duplicate).toBe(true);
  });

  test('nomes e assinaturas novos', () => {
    expect(cleanTitle('Uber *One Membership U').title).toBe('Uber One');
    expect(cleanTitle('Htm*Pousada Exemplo - Parcela 1/4').title).toBe('Pousada Exemplo');
    expect(cleanTitle('Ifd*Raia Drogasil').title).toBe('Droga Raia');
    const { items } = buildImportItems([
      'date,title,amount',
      '2026-10-09,Discord* Nitroyearly:P,"199,90"',
      '2026-10-09,Anthropic* Claude Sub,"110,00"',
      '2026-10-02,Uber *One Membership U,"19,90"',
      '2026-10-04,Ifd*Raia Drogasil,"12,90"'
    ].join('\n'), { categoryNames: CATEGORIES });
    expect(items[0].looksLikeSubscription).toBe('annual');
    expect(items[1].looksLikeSubscription).toBe('monthly');
    expect(items[1].category).toBe('Outras'); // "Assinaturas"/"Tecnologia" não existem: sugere criar
    expect(items[1].wantedCategory).toBe('Assinaturas');
    expect(items[2].looksLikeSubscription).toBe('monthly');
    expect(items[3].category).toBe('Saúde');
  });
});

describe('extrato da conta Nubank', () => {
  const ACCOUNT = [
    'Data,Valor,Identificador,Descrição',
    '01/09/2026,-40.00,id-1,Transferência enviada pelo Pix - Maria Souza Lima - •••.111.222-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 1-0',
    '04/09/2026,850.00,id-2,Transferência Recebida - FULANO DE TAL - •••.333.444-•• - BCO DO BRASIL S.A. (0001) Agência: 50 Conta: 2-3',
    '22/09/2026,-39.90,id-3,Transferência enviada pelo Pix - EBANX - 13.236.697/0001-46 - EBANX IP LTDA. (0383) Agência: 1 Conta: 3-5',
    '27/09/2026,-300.00,id-4,Pagamento de fatura',
    '30/09/2026,1000.00,id-5,Resgate RDB',
    '30/09/2026,5000.00,id-6,Transferência Recebida - EMPRESA XYZ LTDA - 00.000.000/0001-00 - BANCO (0001) Agência: 1 Conta: 9-9'
  ].join('\n');
  const build = (opts = {}) => buildImportItems(ACCOUNT, { categoryNames: CATEGORIES, ...opts });

  test('reconhece o formato e classifica cada linha', () => {
    const { format, items } = build();
    expect(format).toBe('nubank-account');
    const byId = Object.fromEntries(items.map((i) => [i.importRef || i.raw, i]));
    expect(byId['c|id-1']).toMatchObject({ kind: 'spend', title: 'Maria Souza Lima', amount: 40, date: '2026-09-01', paidWith: 'other', included: true });
    expect(byId['c|id-2']).toMatchObject({ kind: 'earn', title: 'Fulano de Tal', amount: 850, included: true });
    expect(byId['c|id-3'].title).toBe('EBANX (pagamento online)');
    expect(items.find((i) => i.raw === 'Pagamento de fatura').skip).toMatch(/fatura do cartão/);
    expect(items.find((i) => i.raw === 'Resgate RDB').skip).toMatch(/investimento/);
  });

  test('gastos viram Pix e entradas viram entradas', () => {
    const { items } = build();
    const expenses = itemsToExpenses(items, 'b');
    const incomes = itemsToIncomes(items, 'b');
    expect(expenses.map((e) => e.description)).toEqual(['Maria Souza Lima', 'EBANX (pagamento online)']);
    expect(expenses.every((e) => e.paidWith === 'other')).toBe(true);
    expect(incomes.map((i) => [i.description, i.amount])).toEqual([['Fulano de Tal', 850], ['Empresa Xyz Ltda', 5000]]);
  });

  test('reimportar não duplica (Identificador do Nubank)', () => {
    const { items } = build();
    const saved = [...itemsToExpenses(items, 'b')];
    const savedIncomes = itemsToIncomes(items, 'b');
    const again = build({ expenses: saved, incomes: savedIncomes }).items;
    expect(again.filter((i) => i.included)).toHaveLength(0);
    expect(again.filter((i) => i.duplicate)).toHaveLength(4);
  });

  test('transferência entre as próprias contas e salário já cadastrado ficam de fora', () => {
    const salary = { isRecurring: true, generatedFromRecurring: true, description: 'Salário', amount: 5000, date: '2026-09-05' };
    const { items } = build({ ownAccounts: ['Fulano de Tal'], incomes: [salary] });
    expect(items.find((i) => i.importRef === 'c|id-2')).toMatchObject({ ownAccount: true, included: false });
    expect(items.find((i) => i.importRef === 'c|id-6').skip).toMatch(/renda recorrente "Salário"/);
  });

  test('Pix já lançado à mão no mesmo dia e valor fica de fora', () => {
    const manual = [{ description: 'Presente', amount: 40, date: '2026-09-01', paidWith: 'other' }];
    expect(build({ expenses: manual }).items.find((i) => i.importRef === 'c|id-1').skip).toBe('Parece já lançado à mão');
  });
});

test('extrato: quem já foi marcado como reembolso vem sugerido', () => {
  const csv = ['Data,Valor,Identificador,Descrição', '30/09/2026,300.00,id-9,Transferência Recebida - Maria Souza Lima - •••.111.222-•• - NU PAGAMENTOS'].join('\n');
  const { items } = buildImportItems(csv, { personAliases: { 'maria souza lima': 'Carla' } });
  expect(items[0].reimburses).toBe('Carla');
  expect(itemsToIncomes(items, 'b')[0].description).toBe('Reembolso de Carla');
});
