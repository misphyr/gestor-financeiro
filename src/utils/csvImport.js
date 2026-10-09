import { addMonths, parseLocalDate, toDateString } from './date';

// Importação da fatura do cartão Nubank (CSV com colunas date,title,amount).

// ---------- Leitura do CSV ----------

// CSV com aspas: campos entre "..." podem ter vírgulas e "" representa uma aspa.
export const parseCSVRows = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
};

// "12,34" → 12.34 · "- 2.500,00" → -2500 · "12.34" → 12.34 (formato antigo)
export const parseAmount = (raw) => {
  const s = String(raw || '').replace(/\s/g, '').replace(/^R\$/, '');
  if (!s) return NaN;
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  return Number(normalized);
};

const toCents = (v) => Math.round(v * 100);

// ---------- Nomes e categorias ----------

const INSTALLMENT_RE = /\s*-\s*Parcela\s+(\d+)\s*\/\s*(\d+)\s*$/i;

const MERCHANTS = [
  [/uber\s*\*?\s*one/i, 'Uber One'],
  [/uber\s*\*?\s*trip|uberrides|\buber\b/i, 'Uber'],
  [/ifood/i, 'iFood'],
  [/99\s*(app|pop|taxi)/i, '99'],
  [/epicgames|epic games/i, 'Epic Games'],
  [/steam/i, 'Steam'],
  [/xsolla/i, 'Xsolla (jogos)'],
  [/nuuvem/i, 'Nuuvem'],
  [/crunchyroll/i, 'Crunchyroll'],
  [/youtub/i, 'YouTube Premium'],
  [/google one/i, 'Google One'],
  [/amazonprime|prime video/i, 'Amazon Prime'],
  [/netflix/i, 'Netflix'],
  [/spotify/i, 'Spotify'],
  [/disney/i, 'Disney+'],
  [/amazon/i, 'Amazon'],
  [/mercadoli|mercado\s*\*\s*mercadol/i, 'Mercado Livre'],
  [/aliexpress/i, 'AliExpress'],
  [/temu/i, 'Temu'],
  [/shein/i, 'Shein'],
  [/mcdonald/i, "McDonald's"],
  [/iof de compra internacional/i, 'IOF compra internacional'],
  [/discord.*nitro/i, 'Discord Nitro'],
  [/discord/i, 'Discord'],
  [/anthropic|claude/i, 'Claude (Anthropic)'],
  [/proton/i, 'Proton'],
  [/battle\.?net/i, 'Battle.net'],
  [/raia|drogasil/i, 'Droga Raia'],
  [/kfc/i, 'KFC'],
  [/samsung/i, 'Samsung'],
  [/wellhub|gympass/i, 'Wellhub'],
  [/havan/i, 'Havan']
];

// Prefixos de maquininha/intermediador que aparecem antes do nome da loja.
const PREFIX_RE = /^(dl|ebn|pag|mp|ec|jim\.com|nuv|wl|pb|gnt|app|pp|sumup|stone|mercado|amazonmktplc|htm|zp|ifd|casar)\s*\*\s*/i;

export const cleanTitle = (raw) => {
  const match = raw.match(INSTALLMENT_RE);
  const base = (match ? raw.replace(INSTALLMENT_RE, '') : raw).trim();
  const known = MERCHANTS.find(([re]) => re.test(base));
  const title = known ? known[1] : base.replace(PREFIX_RE, '').replace(/\s{2,}/g, ' ').trim() || base;
  return {
    base,
    title,
    installment: match ? { current: Number(match[1]), total: Number(match[2]) } : null
  };
};

// Regras por palavra-chave. Cada regra lista categorias candidatas em ordem;
// usa a primeira que existir no app do usuário.
const CATEGORY_RULES = [
  [/beauty|spa\b|sal[aã]o|barbe|est[eé]tica|manicure/i, ['Beleza', 'Cuidados pessoais']],
  [/uber|\b99\b|posto|combust|shell|ipiranga|estaciona|sem parar|ped[aá]gio|metr[oô]|[oô]nibus/i, ['Transporte']],
  [/farm[aá]c|drogari|droga\s|raia|drogasil|wellhub|gympass|academia|cl[ií]nica|hospital|laborat|dentist/i, ['Saúde']],
  [/steam|epic games|xsolla|nuuvem|battle\.net|playstation|xbox|nintendo|discord|jogos/i, ['Jogos', 'Games', 'Lazer']],
  [/claude|anthropic|proton|chatgpt|openai|google one|icloud|microsoft 365|dropbox|plano nucel/i, ['Assinaturas', 'Tecnologia']],
  [/crunchyroll|youtube|netflix|spotify|disney|amazon prime|hbo|globoplay|deezer/i, ['Assinaturas', 'Streaming', 'Lazer']],
  [/cinema|ingresso|show|teatro|parque/i, ['Lazer']],
  [/ifood|kfc|lanche|mcdonald|burger|pizza|a[cç]a[ií]|espetinho|restaurante|padaria|supermerc|mercado(?! livre)|coffee|caf[eé]|churras|sushi|bar\b|lanchonete|hortifruti|a[cç]ougue/i, ['Alimentação', 'Comida']],
  [/curso|udemy|alura|escola|faculdade|livraria/i, ['Educação']],
  [/amazon|mercado livre|aliexpress|temu|shein|havan|magalu|americanas|loja|store|modas/i, ['Compras']],
  [/iof/i, ['Impostos e taxas', 'Taxas', 'Outras']]
];

const SUBSCRIPTION_HINT = /anuidade|yearly|uber one|nitro|claude|anthropic|proton|chatgpt|google one|youtube premium|crunchyroll|amazon prime|netflix|spotify|disney|hbo|globoplay|deezer|icloud|apple\.com|wellhub|plano nucel|paramount/i;

export const suggestCategory = (title, { history = [], categoryNames = [] } = {}) => {
  const lower = title.toLowerCase();
  const fromHistory = history.find((h) => h.description.toLowerCase() === lower);
  if (fromHistory && categoryNames.includes(fromHistory.category)) {
    return { category: fromHistory.category, source: 'history' };
  }
  let wanted = null;
  for (const [re, candidates] of CATEGORY_RULES) {
    if (re.test(title)) {
      const found = candidates.find((c) => categoryNames.includes(c));
      if (found) return { category: found, source: 'rule' };
      wanted = wanted || candidates[0];
    }
  }
  const fallback = categoryNames.includes('Outras') ? 'Outras' : categoryNames[0];
  // wanted: categoria que a regra usaria se existisse (o app sugere criá-la)
  return { category: fallback, source: null, wanted };
};

// ---------- Duplicados ----------

// Referência estável de um lançamento da fatura, guardada no gasto importado.
// Parcela: mesma compra em faturas diferentes tem a mesma 1ª parcela (mês), valor e nº de parcelas.
const installmentRef = (base, total, cents, originalDate) =>
  `p|${base.toLowerCase()}|${total}|${cents}|${originalDate.slice(0, 7)}`;
const singleRef = (base, date, cents) => `s|${base.toLowerCase()}|${date}|${cents}`;

// Para gastos sem importRef (lançados à mão ou pela versão antiga), compara pelos dados.
const legacyRefs = (e) => {
  const cents = toCents(parseFloat(e.amount) || 0);
  const desc = (e.description || '').toLowerCase().trim();
  if ((e.totalInstallments || 1) > 1) {
    if ((e.installmentNumber || 1) !== 1) return [];
    const orig = e.originalDate || e.date;
    return [`p|${desc}|${e.totalInstallments}|${cents}|${orig.slice(0, 7)}`];
  }
  return [`s|${desc}|${e.date}|${cents}`];
};

// O valor da parcela pode variar alguns centavos entre faturas (o Nubank põe o
// resto da divisão na 1ª parcela: ex. 30,02 e depois 29,99). Parcelas casam com essa folga.
const INSTALLMENT_CENTS_TOLERANCE = 10;

// Separa "p|loja|5|4562|2026-06" em chave sem centavos ("p|loja|5|2026-06") e centavos.
const splitInstallmentRef = (ref) => {
  const parts = ref.split('|');
  const month = parts.pop();
  const cents = Number(parts.pop());
  return { key: `${parts.join('|')}|${month}`, cents };
};

const existingRefIndex = (expenses) => {
  const singles = new Map(); // ref exato -> quantidade
  const installments = new Map(); // chave sem centavos -> lista de centavos (uma por compra)
  const add = (ref) => {
    if (ref.startsWith('p|')) {
      const { key, cents } = splitInstallmentRef(ref);
      if (!installments.has(key)) installments.set(key, []);
      installments.get(key).push(cents);
    } else {
      singles.set(ref, (singles.get(ref) || 0) + 1);
    }
  };
  expenses.forEach((e) => {
    if (e.importRef) {
      if ((e.installmentNumber || 1) === 1) add(e.importRef);
    } else {
      legacyRefs(e).forEach(add);
    }
  });
  return { singles, installments };
};

// ---------- Montagem da lista para revisão ----------

export const detectFormat = (header) => {
  const h = header.map((c) => c.trim().toLowerCase());
  if (h[0] === 'date' && h[1] === 'title' && h[2] === 'amount') return 'nubank-card';
  if (h.includes('data') && h.includes('valor') && h.some((c) => c.startsWith('descri'))) return 'nubank-account';
  return 'unknown';
};

// ---------- Extrato da conta (Data,Valor,Identificador,Descrição) ----------

const PARTICLES = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
const titleCase = (s) => s.toLowerCase().split(/\s+/).filter(Boolean)
  .map((w, i) => (i > 0 && PARTICLES.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
  .join(' ');

const GATEWAYS = [
  [/ebanx/i, 'EBANX (pagamento online)'],
  [/dlocal/i, 'dLocal (pagamento online)'],
  [/mercado ?pago/i, 'Mercado Pago'],
  [/pagseguro|pagbank/i, 'PagBank'],
  [/picpay/i, 'PicPay']
];

// Quem está do outro lado: "Transferência enviada pelo Pix - Maria Souza - •••.111… - BANCO…" → "Maria Souza".
export const accountCounterparty = (description) => {
  const parts = description.split(' - ').map((p) => p.trim());
  const name = parts.length > 1 ? parts[1] : parts[0];
  const gateway = GATEWAYS.find(([re]) => re.test(name));
  return gateway ? gateway[1] : titleCase(name);
};

const ACCOUNT_SKIPS = [
  [/^pagamento de fatura/i, 'Pagamento da fatura do cartão (as compras vêm pela importação da fatura)'],
  [/\bRDB\b|aplica[cç][aã]o|resgate|caixinha|rendimento/i, 'Aplicação ou resgate de investimento']
];

const brDateToIso = (s) => {
  const m = String(s || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

const buildAccountItems = (rows, { expenses, incomes, ownAccounts, personAliases, history, categoryNames }) => {
  const header = rows[0].map((c) => c.trim().toLowerCase());
  const col = (name) => header.findIndex((c) => c.startsWith(name));
  const [iDate, iValue, iId, iDesc] = [col('data'), col('valor'), col('identificador'), col('descri')];

  const importedRefs = new Set([...expenses, ...incomes].map((e) => e.importRef).filter(Boolean));
  const own = new Set(ownAccounts.map((n) => n.toLowerCase()));
  // Lançamentos feitos à mão que provavelmente são a mesma movimentação (mesmo dia e valor).
  const manualSpends = expenses.filter((e) => !e.importRef && e.paidWith === 'other');
  const manualIncomes = incomes.filter((i) => !i.importRef && !i.isRecurring);
  const used = new Set();
  const findManual = (list, date, cents) => {
    const hit = list.find((e) => !used.has(e) && e.date === date && toCents(parseFloat(e.amount) || 0) === cents);
    if (hit) used.add(hit);
    return hit;
  };

  return rows.slice(1).map((cols, index) => {
    const id = `row-${index}`;
    const raw = (cols[iDesc] || '').trim();
    const date = brDateToIso(cols[iDate]);
    const value = parseAmount(cols[iValue]);
    const uuid = (cols[iId] || '').trim();
    if (!date || Number.isNaN(value)) {
      return { id, raw, date: date || '', amount: value, skip: 'Linha com data ou valor inválido', included: false };
    }
    const amount = Math.abs(value);
    const cents = toCents(amount);
    const kind = value < 0 ? 'spend' : 'earn';
    const title = accountCounterparty(raw);
    const base = {
      id, raw, date, amount, total: amount, kind, title, account: true,
      originalDate: date, importRef: `c|${uuid || `${date}|${cents}|${raw.toLowerCase()}`}`, included: true
    };

    const skip = ACCOUNT_SKIPS.find(([re]) => re.test(raw));
    if (skip) return { ...base, importRef: null, skip: skip[1], included: false };
    if (value === 0) return { ...base, importRef: null, skip: 'Valor zerado', included: false };
    if (importedRefs.has(base.importRef)) return { ...base, duplicate: true, skip: 'Já importado antes', included: false };
    if (own.has(title.toLowerCase())) return { ...base, ownAccount: true, skip: 'Transferência entre suas contas', included: false };

    if (kind === 'earn') {
      // Quem já foi marcado como reembolso antes (ex.: "Maria Souza …" = Ana) vem sugerido.
      const reimburses = personAliases[title.toLowerCase()] || null;
      const item = { ...base, category: 'Entrada', incomeType: 'other', reimburses };
      // Salário já cadastrado como renda recorrente: o depósito contaria duas vezes.
      const recurring = incomes.filter((i) => i.isRecurring && i.generatedFromRecurring && i.date.slice(0, 7) === date.slice(0, 7)
        && Math.abs((parseFloat(i.amount) || 0) - amount) <= amount * 0.1);
      if (recurring.length) return { ...item, skip: `Parece a renda recorrente "${recurring[0].description || 'Entrada'}" (já cadastrada)`, included: false };
      if (findManual(manualIncomes, date, cents)) return { ...item, skip: 'Parece já lançado à mão', included: false };
      return item;
    }

    const { category, source, wanted } = suggestCategory(title, { history, categoryNames });
    const item = { ...base, category, categorySource: source, wantedCategory: wanted, installment: null, paidWith: 'other' };
    if (findManual(manualSpends, date, cents)) return { ...item, skip: 'Parece já lançado à mão', included: false };
    return item;
  });
};

export const buildImportItems = (text, { expenses = [], subscriptions = [], incomes = [], ownAccounts = [], personAliases = {}, history = [], categoryNames = [] } = {}) => {
  const rows = parseCSVRows(text);
  if (!rows.length) return { error: 'O arquivo está vazio.' };
  const format = detectFormat(rows[0]);
  if (format === 'nubank-account') {
    return { format, items: buildAccountItems(rows, { expenses, incomes, ownAccounts, personAliases, history, categoryNames }) };
  }
  if (format === 'unknown') {
    return { error: 'Não reconheci o formato. Use o CSV da fatura do cartão Nubank (colunas date, title, amount).' };
  }

  // Cada gasto existente só "absorve" um lançamento da fatura: duas compras iguais
  // na mesma fatura entram as duas.
  const existing = existingRefIndex(expenses);
  const consume = (keys) => {
    const key = keys.find((k) => (existing.singles.get(k) || 0) > 0);
    if (!key) return false;
    existing.singles.set(key, existing.singles.get(key) - 1);
    return true;
  };
  const consumeInstallment = (refs) => {
    for (const ref of refs) {
      const { key, cents } = splitInstallmentRef(ref);
      const list = existing.installments.get(key);
      if (!list || !list.length) continue;
      let best = -1;
      list.forEach((c, i) => {
        const diff = Math.abs(c - cents);
        if (diff <= INSTALLMENT_CENTS_TOLERANCE && (best === -1 || diff < Math.abs(list[best] - cents))) best = i;
      });
      if (best !== -1) { list.splice(best, 1); return true; }
    }
    return false;
  };
  const activeSubs = subscriptions.filter((s) => !s.canceledDate);

  const items = rows.slice(1).map((cols, index) => {
    const date = (cols[0] || '').trim();
    const raw = (cols[1] || '').trim();
    const value = parseAmount(cols[2]);
    const id = `row-${index}`;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parseLocalDate(date).getTime()) || Number.isNaN(value)) {
      return { id, raw, date, amount: value, skip: 'Linha com data ou valor inválido', included: false };
    }
    if (value < 0) {
      const reason = /pagamento/i.test(raw) ? 'Pagamento da fatura' : 'Estorno ou crédito';
      return { id, raw, title: raw, date, amount: Math.abs(value), skip: reason, included: false };
    }
    if (value === 0) return { id, raw, title: raw, date, amount: 0, skip: 'Valor zerado', included: false };

    const { base, title, installment } = cleanTitle(raw);
    const cents = toCents(value);
    const { category, source, wanted } = suggestCategory(title, { history, categoryNames });
    const item = { id, raw, base, title, date, amount: value, category, categorySource: source, wantedCategory: wanted, installment: null, included: true };

    if (installment && installment.total > 1) {
      const originalDate = toDateString(addMonths(parseLocalDate(date), -(installment.current - 1)));
      item.installment = installment;
      item.originalDate = originalDate;
      item.total = (cents * installment.total) / 100;
      item.importRef = installmentRef(base, installment.total, cents, originalDate);
      // As parcelas seguintes vêm datadas pelo ciclo da fatura, então o mês da 1ª parcela
      // calculado pode variar 1 mês entre faturas: aceita o mês vizinho.
      const keys = [];
      [0, -1, 1].forEach((shift) => {
        const month = toDateString(addMonths(parseLocalDate(originalDate), shift));
        keys.push(installmentRef(base, installment.total, cents, month));
        keys.push(installmentRef(title, installment.total, cents, month));
      });
      item.duplicate = consumeInstallment(keys);
    } else {
      item.originalDate = date;
      item.total = value;
      item.importRef = singleRef(base, date, cents);
      item.duplicate = consume([item.importRef, `s|${title.toLowerCase()}|${date}|${cents}`, `s|${base.toLowerCase()}|${date}|${cents}`]);
      const sub = activeSubs.find((s) => {
        const name = (s.name || '').toLowerCase().trim();
        const t = title.toLowerCase();
        return name.length >= 4 && (t.includes(name) || name.includes(t));
      });
      if (sub) item.subscription = sub.name;
      // "Nitroyearly", "anual": provável assinatura anual.
      else if (SUBSCRIPTION_HINT.test(raw) || SUBSCRIPTION_HINT.test(title)) {
        item.looksLikeSubscription = /yearly|annual|anual|anuidade/i.test(raw) ? 'annual' : 'monthly';
      }
    }

    if (item.duplicate) { item.included = false; item.skip = 'Já importado antes'; }
    else if (item.subscription) { item.included = false; item.skip = `Já cadastrada como assinatura (${item.subscription})`; }
    return item;
  });

  return { format, items };
};

// Converte os itens marcados em gastos para storage.expenses.addMany.
export const itemsToExpenses = (items, batchId) => items
  .filter((i) => i.included && !i.asSubscription && i.kind !== 'earn')
  .map((i) => ({
    amount: i.total,
    category: i.category,
    description: i.title,
    date: i.originalDate,
    installments: i.installment ? i.installment.total : 1,
    importRef: i.importRef,
    importBatch: batchId,
    person: i.person || null,
    ...(i.paidWith === 'other' ? { paidWith: 'other' } : {})
  }));

// Entradas do extrato da conta para storage.incomes.addMany.
export const itemsToIncomes = (items, batchId) => items
  .filter((i) => i.included && i.kind === 'earn')
  .map((i) => ({
    amount: i.amount,
    type: i.incomeType || 'other',
    // Reembolso entra como entrada (equilibra o gasto que já contou no seu mês) e dá baixa nas cobranças.
    description: i.reimburses ? `Reembolso de ${i.reimburses}` : i.title,
    date: i.date,
    isRecurring: false,
    importRef: i.importRef,
    importBatch: batchId
  }));
