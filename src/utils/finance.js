import { storage } from './storage';
import { addMonths, parseLocalDate, toDateString } from './date';

// Cálculos usados pelas telas novas (Início, Previsão, Lançamentos e cadastro rápido).

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatBRL = (value) => BRL.format(Number(value) || 0);

export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const amountOf = (item) => parseFloat(item.amount) || 0;
const sameMonth = (dateStr, year, month) => {
  const d = parseLocalDate(dateStr);
  return d.getFullYear() === year && d.getMonth() === month;
};
const dayInMonth = (year, month, day) => {
  const last = new Date(year, month + 1, 0).getDate();
  return toDateString(new Date(year, month, Math.min(day, last)));
};

export const isInstallment = (expense) => (expense.totalInstallments || 1) > 1;

// Assinatura conta no mês se começou antes do fim dele e não foi cancelada antes do início.
const subscriptionActive = (sub, year, month) => {
  const start = parseLocalDate(sub.startDate);
  const monthStart = new Date(year, month, 1);
  const nextMonth = new Date(year, month + 1, 1);
  if (start >= nextMonth) return false;
  if (sub.canceledDate && parseLocalDate(sub.canceledDate) <= monthStart) return false;
  return true;
};

// Anuidade é cobrada inteira uma vez por ano, no mês da data de início.
export const isAnnual = (sub) => sub.frequency === 'annual';
const chargedInMonth = (sub, year, month) =>
  subscriptionActive(sub, year, month) && (!isAnnual(sub) || parseLocalDate(sub.startDate).getMonth() === month);

// Próxima cobrança de uma assinatura a partir de hoje (null se cancelada antes dela).
export const nextCharge = (sub, today = new Date()) => {
  const start = parseLocalDate(sub.startDate);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const step = isAnnual(sub) ? 12 : 1;
  let d = start;
  for (let i = 0; d < t; i += step) d = addMonths(start, i);
  if (sub.canceledDate && parseLocalDate(sub.canceledDate) <= d) return null;
  return toDateString(d);
};

// ---------- Fatura do cartão ----------
// Com o cartão configurado (dia de fechamento e vencimento) e a visão "por fatura" ligada,
// o "mês" de um gasto no cartão é o mês em que vence a fatura dele. Compras a partir do
// dia de fechamento entram na fatura seguinte.

export const cardConfig = () => {
  const card = storage.settings.get().card;
  return card && card.closingDay >= 1 && card.dueDay >= 1 ? card : null;
};
export const viewMode = () => (cardConfig() && storage.settings.get().viewMode === 'statement' ? 'statement' : 'calendar');

const lastDayOf = (y, m) => new Date(y, m + 1, 0).getDate();
const closingOf = (y, m, card) => {
  const first = new Date(y, m, 1);
  return new Date(first.getFullYear(), first.getMonth(), Math.min(card.closingDay, lastDayOf(first.getFullYear(), first.getMonth())));
};
// Vence no mês seguinte ao fechamento quando o dia do vencimento é antes do fechamento (ex.: fecha 30, vence 7).
const dueShift = (card) => (card.dueDay <= card.closingDay ? 1 : 0);

// Mês (vencimento) da fatura em que uma compra entra.
export const statementOf = (dateStr, card = cardConfig()) => {
  const d = parseLocalDate(dateStr);
  const closesNextMonth = d >= closingOf(d.getFullYear(), d.getMonth(), card);
  const due = new Date(d.getFullYear(), d.getMonth() + (closesNextMonth ? 1 : 0) + dueShift(card), 1);
  return { year: due.getFullYear(), month: due.getMonth() };
};

// Período de compras da fatura que vence em (year, month): do fechamento anterior até a véspera do fechamento.
export const statementRange = (year, month, card = cardConfig()) => {
  const closeMonth = month - dueShift(card);
  const close = closingOf(year, closeMonth, card);
  const prevClose = closingOf(year, closeMonth - 1, card);
  const end = new Date(close.getFullYear(), close.getMonth(), close.getDate() - 1);
  const due = new Date(year, month, Math.min(card.dueDay, lastDayOf(year, month)));
  return { start: toDateString(prevClose), end: toDateString(end), close: toDateString(close), due: toDateString(due) };
};

// Mês que o app abre como "atual": a fatura aberta hoje, ou o mês do calendário.
export const currentPeriod = (today = new Date()) => (viewMode() === 'statement'
  ? statementOf(toDateString(today))
  : { year: today.getFullYear(), month: today.getMonth() });

const onCard = (e) => e.paidWith !== 'other';

// Lista de lançamentos do mês: gastos, assinaturas (como itens fixos) e entradas.
// mode: 'calendar' (data da compra) ou 'statement' (fatura); o padrão segue a configuração.
export const monthEntries = (year, month, { mode = viewMode() } = {}) => {
  const entries = [];
  const range = mode === 'statement' ? statementRange(year, month) : null;
  const inPeriod = (e) => (range && onCard(e)
    ? e.date >= range.start && e.date <= range.end
    : sameMonth(e.date, year, month));

  storage.expenses.getAll()
    .filter(inPeriod)
    .forEach((e) => entries.push({
      key: `e-${e.id}`,
      source: 'expense',
      id: e.id,
      kind: 'spend',
      title: e.description || e.category,
      category: e.category,
      amount: amountOf(e),
      date: e.date,
      installment: isInstallment(e) ? [e.installmentNumber, e.totalInstallments] : null,
      shared: e.isShared && e.sharedWith?.length ? e.sharedWith.filter((p) => !p.isMe).map((p) => p.name) : null,
      person: e.person || null,
      raw: e
    }));

  // Assinaturas: no modo fatura, as cobranças dos meses do calendário que caem no período.
  const subMonths = range
    ? [parseLocalDate(range.start), parseLocalDate(range.end)].map((d) => [d.getFullYear(), d.getMonth()])
      .filter(([y, m], i, arr) => i === 0 || y !== arr[0][0] || m !== arr[0][1])
    : [[year, month]];
  storage.subscriptions.getAll().forEach((s) => {
    subMonths.forEach(([y, m]) => {
      if (!chargedInMonth(s, y, m)) return;
      const date = dayInMonth(y, m, parseLocalDate(s.startDate).getDate());
      if (range && (date < range.start || date > range.end)) return;
      entries.push({
        key: `s-${s.id}-${date}`,
        source: 'subscription',
        id: s.id,
        kind: 'spend',
        title: s.name,
        category: s.category || 'Outras',
        amount: amountOf(s),
        date,
        fixed: isAnnual(s) ? 'anual' : 'fixo',
        raw: s
      });
    });
  });

  storage.incomes.getExpandedIncomes()
    .filter((i) => sameMonth(i.date, year, month))
    .forEach((i) => entries.push({
      key: `i-${i.id}-${i.date}`,
      source: 'income',
      id: i.id,
      kind: 'earn',
      title: i.description || 'Entrada',
      category: 'Entrada',
      amount: amountOf(i),
      date: i.date,
      fixed: i.generatedFromRecurring ? 'recorrente' : null,
      raw: i
    }));

  return entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
};

const variableTotal = (year, month) => monthEntries(year, month)
  .filter((e) => e.source === 'expense' && !e.installment)
  .reduce((acc, e) => acc + e.amount, 0);

// Média dos gastos variáveis dos 3 meses (ou faturas) completos anteriores ao atual.
export const averageVariable = (today = new Date()) => {
  const current = currentPeriod(today);
  let sum = 0;
  for (let i = 1; i <= 3; i++) {
    const d = new Date(current.year, current.month - i, 1);
    sum += variableTotal(d.getFullYear(), d.getMonth());
  }
  return sum / 3;
};

export const monthSummary = (year, month, today = new Date()) => {
  const entries = monthEntries(year, month);
  const current = currentPeriod(today);
  const spend = entries.filter((e) => e.kind === 'spend');
  const variable = spend.filter((e) => e.source === 'expense' && !e.installment).reduce((a, e) => a + e.amount, 0);
  const installments = spend.filter((e) => e.installment).reduce((a, e) => a + e.amount, 0);
  const fixed = spend.filter((e) => e.source === 'subscription').reduce((a, e) => a + e.amount, 0);
  const income = entries.filter((e) => e.kind === 'earn').reduce((a, e) => a + e.amount, 0);
  const future = year > current.year || (year === current.year && month > current.month);
  const estimate = future ? Math.max(averageVariable(today) - variable, 0) : 0;
  const total = variable + installments + fixed + estimate;

  const byCategory = {};
  spend.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });

  return {
    entries,
    variable,
    installments,
    fixed,
    income,
    estimate,
    total,
    left: income - total,
    future,
    categories: Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  };
};

// Cobranças (parte de outras pessoas em gastos divididos) até o mês atual.
// A chave segue o formato antigo de Charges.js para manter o que já foi marcado como pago.
// Compras marcadas com "Quem comprou: <pessoa>" viram cobrança do valor inteiro (dá para desligar).
export const chargeBuyersEnabled = () => storage.settings.get().chargeBuyers !== false;

export const allCharges = (today = new Date()) => {
  const charges = [];
  const isFuture = (d) => d.getFullYear() > today.getFullYear() || (d.getFullYear() === today.getFullYear() && d.getMonth() > today.getMonth());
  const visit = (item, dateStr, description, source) => {
    if (!item.isShared || !item.sharedWith?.length) return;
    const d = parseLocalDate(dateStr);
    if (isFuture(d)) return;
    const share = amountOf(item) / item.sharedWith.length;
    item.sharedWith.filter((p) => !p.isMe && p.name?.trim()).forEach((p) => {
      const key = `${d.getFullYear()}-${d.getMonth()}-${p.name}-${item.id}`;
      charges.push({ key, person: p.name.trim(), description, amount: share, date: dateStr, source, paid: storage.charges.isPaid(key) });
    });
  };
  const chargeBuyers = chargeBuyersEnabled();
  storage.expenses.getAll().forEach((e) => {
    const description = e.description || e.category;
    if (e.isShared) { visit(e, e.date, description, 'expense'); return; }
    if (!chargeBuyers || !e.person?.trim()) return;
    const d = parseLocalDate(e.date);
    if (isFuture(d)) return;
    const key = `${d.getFullYear()}-${d.getMonth()}-${e.person.trim()}-${e.id}`;
    charges.push({
      key,
      person: e.person.trim(),
      description: isInstallment(e) ? `${description} (${e.installmentNumber}/${e.totalInstallments})` : description,
      amount: amountOf(e),
      date: e.date,
      source: 'buyer',
      paid: storage.charges.isPaid(key)
    });
  });
  storage.subscriptions.getAll().forEach((s) => {
    if (!s.isShared || !s.startDate) return;
    const start = parseLocalDate(s.startDate);
    const step = s.frequency === 'annual' ? 12 : 1;
    for (let i = 0; ; i += step) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      if (d > today) break;
      if (!subscriptionActive(s, d.getFullYear(), d.getMonth())) break;
      visit(s, dayInMonth(d.getFullYear(), d.getMonth(), start.getDate()), s.name, 'subscription');
    }
  });
  return charges.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
};

export const pendingCharges = (today = new Date()) => {
  const byPerson = {};
  allCharges(today).filter((c) => !c.paid).forEach((c) => {
    byPerson[c.person] = byPerson[c.person] || { name: c.person, amount: 0, items: [] };
    byPerson[c.person].amount += c.amount;
    byPerson[c.person].items.push(c.description);
  });
  return Object.values(byPerson).sort((a, b) => b.amount - a.amount);
};

// Histórico de descrições com a categoria mais usada para cada uma.
export const descriptionHistory = () => {
  const map = {};
  storage.expenses.getAll().forEach((e, index) => {
    const desc = (e.description || '').trim();
    if (!desc) return;
    const key = desc.toLowerCase();
    map[key] = map[key] || { description: desc, count: 0, last: 0, categories: {} };
    map[key].count++;
    map[key].last = Math.max(map[key].last, index);
    map[key].categories[e.category] = (map[key].categories[e.category] || 0) + 1;
  });
  return Object.values(map)
    .map((h) => ({ ...h, category: Object.entries(h.categories).sort((a, b) => b[1] - a[1])[0][0] }))
    .sort((a, b) => b.count - a.count || b.last - a.last);
};

export const categoriesByUse = () => {
  const counts = {};
  storage.expenses.getAll().forEach((e) => { counts[e.category] = (counts[e.category] || 0) + 1; });
  return [...storage.categories.getAll()].sort((a, b) => (counts[b.name] || 0) - (counts[a.name] || 0));
};

export const knownPeople = () => {
  const names = new Set();
  [...storage.expenses.getAll(), ...storage.subscriptions.getAll()].forEach((item) => {
    (item.sharedWith || []).forEach((p) => { if (!p.isMe && p.name?.trim()) names.add(p.name.trim()); });
  });
  return [...names];
};

// Lançamentos entre duas datas 'AAAA-MM-DD' (inclusive), juntando os meses do intervalo.
export const periodEntries = (startStr, endStr) => {
  const start = parseLocalDate(startStr);
  const end = parseLocalDate(endStr);
  const entries = [];
  for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    monthEntries(d.getFullYear(), d.getMonth(), { mode: 'calendar' }).forEach((e) => {
      if (e.date >= startStr && e.date <= endStr) entries.push(e);
    });
  }
  return entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
};

// Parcelas da mesma compra: mesma data da 1ª parcela, descrição e número de parcelas.
export const installmentGroupKey = (e) => `${e.originalDate || e.date}|${e.description || ''}|${e.totalInstallments}`;

export const installmentPurchases = (today = new Date()) => {
  const todayStr = toDateString(today);
  const groups = {};
  storage.expenses.getAll().filter(isInstallment).forEach((e) => {
    const key = installmentGroupKey(e);
    groups[key] = groups[key] || { key, items: [] };
    groups[key].items.push(e);
  });
  return Object.values(groups).map((g) => {
    const items = [...g.items].sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));
    const first = items[0];
    const total = items.reduce((acc, e) => acc + amountOf(e), 0);
    const paid = items.filter((e) => e.date <= todayStr);
    const upcoming = items.filter((e) => e.date > todayStr);
    return {
      key: g.key,
      items,
      description: first.description || first.category,
      category: first.category,
      firstDate: first.originalDate || first.date,
      count: first.totalInstallments,
      total,
      paidCount: paid.length,
      remaining: upcoming.reduce((acc, e) => acc + amountOf(e), 0),
      nextDate: upcoming[0]?.date || null,
      shared: Boolean(first.isShared),
      person: first.person || null
    };
  }).sort((a, b) => (b.remaining > 0) - (a.remaining > 0) || (a.firstDate < b.firstDate ? 1 : -1));
};

// Pessoas marcadas em "Quem comprou" (o padrão, sem marcação, é o próprio usuário).
export const knownBuyers = () => {
  const names = new Set();
  storage.expenses.getAll().forEach((e) => { if (e.person?.trim()) names.add(e.person.trim()); });
  return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'));
};

export const ME = 'Eu';
export const buyerOf = (entry) => entry.person || ME;

// Anuidades que renovam nos próximos `days` dias, da mais próxima para a mais distante.
export const upcomingAnnual = (today = new Date(), days = 60) => {
  const limit = toDateString(new Date(today.getFullYear(), today.getMonth(), today.getDate() + days));
  return storage.subscriptions.getAll()
    .filter((s) => isAnnual(s) && !s.canceledDate)
    .map((s) => ({ sub: s, date: nextCharge(s, today) }))
    .filter((x) => x.date && x.date <= limit)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
};

// Dia de fechamento provável a partir de uma fatura importada: as parcelas antigas
// (2/6, 5/5…) vêm todas datadas no dia em que o ciclo começou.
export const guessClosingDay = (items) => {
  const counts = {};
  items.filter((i) => i.installment && i.installment.current > 1 && i.date)
    .forEach((i) => { const day = parseLocalDate(i.date).getDate(); counts[day] = (counts[day] || 0) + 1; });
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 3 ? Number(best[0]) : null;
};

// Dá baixa nas cobranças pendentes de uma pessoa, das mais antigas para as mais novas,
// até o valor recebido. Cobranças não são quitadas pela metade: o que não couber fica pendente.
export const settleCharges = (person, amount, today = new Date()) => {
  const pending = allCharges(today)
    .filter((c) => !c.paid && c.person === person)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const keys = [];
  let used = 0;
  for (const c of pending) {
    if (used + c.amount > amount + 0.005) break;
    used += c.amount;
    keys.push(c.key);
  }
  if (keys.length) storage.charges.setPaid(keys, true);
  return { count: keys.length, used, left: amount - used, stillPending: pending.length - keys.length };
};
