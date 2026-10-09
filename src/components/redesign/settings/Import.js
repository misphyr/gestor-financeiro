import React, { useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Circle, MinusCircle, Upload } from 'lucide-react';
import { storage } from '../../../utils/storage';
import { formatDateBR } from '../../../utils/date';
import { cardConfig, categoriesByUse, descriptionHistory, formatBRL, guessClosingDay, knownBuyers, knownPeople, pendingCharges, settleCharges } from '../../../utils/finance';
import { accountCounterparty, buildImportItems, itemsToExpenses, itemsToIncomes } from '../../../utils/csvImport';
import { BuyerPicker, ConfirmButton, Sheet } from '../ui';

const NEW_CATEGORY_LOOK = {
  Compras: { color: '#3B82F6', icon: 'ShoppingCart' },
  Beleza: { color: '#EC4899', icon: 'Heart' },
  Jogos: { color: '#8B5CF6', icon: 'Gamepad2' },
  Assinaturas: { color: '#14B8A6', icon: 'Monitor' }
};

const lastImport = () => {
  const batches = {};
  storage.expenses.getAll().forEach((e) => {
    if (!e.importBatch) return;
    batches[e.importBatch] = batches[e.importBatch] || { id: e.importBatch, ids: [], purchases: 0 };
    batches[e.importBatch].ids.push(e.id);
    if ((e.installmentNumber || 1) === 1) batches[e.importBatch].purchases++;
  });
  const subs = storage.subscriptions.getAll().filter((s) => s.importBatch);
  const incomes = storage.incomes.getAll().filter((i) => i.importBatch);
  [...subs, ...incomes].forEach((s) => {
    batches[s.importBatch] = batches[s.importBatch] || { id: s.importBatch, ids: [], purchases: 0 };
    batches[s.importBatch].purchases++;
  });
  const latest = Object.values(batches).sort((a, b) => (a.id < b.id ? 1 : -1))[0];
  if (!latest) return null;
  const time = Number(latest.id.replace('imp-', ''));
  return {
    ...latest,
    date: Number.isFinite(time) ? new Date(time) : null,
    subIds: subs.filter((s) => s.importBatch === latest.id).map((s) => s.id),
    incomeIds: incomes.filter((i) => i.importBatch === latest.id).map((i) => i.id)
  };
};

const INCOME_TYPES = [['salary', 'Salário'], ['bonus', 'Bônus'], ['other', 'Outro']];

function IncomeTypeChips({ value, onChange }) {
  return (
    <div>
      <span className="gf-label">Tipo da entrada</span>
      <div className="gf-chips">
        {INCOME_TYPES.map(([id, label]) => (
          <button type="button" key={id} className="gf-chip" aria-pressed={value === id} onClick={() => onChange(id)}>{label}</button>
        ))}
      </div>
    </div>
  );
}

// Dinheiro indo/vindo de outra conta sua (ex.: Banco do Brasil → Nubank) não é gasto nem renda.
function OwnAccountToggle({ checked, name, onChange }) {
  return (
    <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 3 }} />
      <span>
        É transferência entre minhas contas
        <span className="gf-note" style={{ display: 'block', margin: 0 }}>
          Não importa e, nas próximas vezes, deixa de fora sozinho o que vier de "{name}".
        </span>
      </span>
    </label>
  );
}

// Pix recebido que devolve o dinheiro de cobranças (ex.: alguém devolvendo o que comprou no seu cartão).
function ReimburseChips({ value, onChange }) {
  const pending = pendingCharges();
  const names = [...new Set([...pending.map((p) => p.name), ...knownBuyers(), ...knownPeople()])];
  if (value && !names.includes(value)) names.push(value);
  if (!names.length) return null;
  const owed = (name) => pending.find((p) => p.name === name)?.amount || 0;
  return (
    <div>
      <span className="gf-label">É reembolso de alguém?</span>
      <div className="gf-chips">
        <button type="button" className="gf-chip" aria-pressed={value === null} onClick={() => onChange(null)}>Não</button>
        {names.map((name) => (
          <button type="button" key={name} className="gf-chip" aria-pressed={value === name} onClick={() => onChange(name)}>
            {name}{owed(name) ? ` · deve ${formatBRL(owed(name))}` : ''}
          </button>
        ))}
      </div>
      {value && <div className="gf-hint">Dá baixa nas cobranças mais antigas de {value} até este valor.</div>}
    </div>
  );
}

function ItemSheet({ item, sameTitleCount, categories, buyerNames, onClose, onSave }) {
  const [draft, setDraft] = useState(() => ({
    title: item.title,
    category: item.category,
    included: item.included,
    asSubscription: item.asSubscription === true ? 'monthly' : item.asSubscription || false,
    person: item.person || null,
    incomeType: item.incomeType || 'other',
    reimburses: item.reimburses || null,
    ownAccount: Boolean(item.ownAccount),
    applyAll: true
  }));
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const earn = item.kind === 'earn';

  return (
    <Sheet label="Ajustar lançamento" onClose={onClose}>
      <h2 className="gf-section-title" style={{ margin: 0 }}>
        <span style={earn ? { color: 'var(--earn)' } : undefined}>{earn ? '+ ' : ''}{formatBRL(item.amount)}</span>
        <small>{formatDateBR(item.date)}{item.installment ? ` · parcela ${item.installment.current}/${item.installment.total}` : ''}</small>
      </h2>
      <p className="gf-note" style={{ marginTop: -8 }}>{item.account ? 'No extrato' : 'Na fatura'}: {item.raw}</p>
      <div className="gf-seg">
        <button type="button" aria-pressed={draft.included} onClick={() => set({ included: true, ownAccount: false })}>Importar</button>
        <button type="button" aria-pressed={!draft.included} onClick={() => set({ included: false })}>Não importar</button>
      </div>
      {item.account && (
        <OwnAccountToggle
          checked={draft.ownAccount}
          name={item.title}
          onChange={(ownAccount) => set({ ownAccount, included: ownAccount ? false : draft.included })}
        />
      )}
      <div>
        <label className="gf-label" htmlFor="imp-title">Descrição</label>
        <input id="imp-title" className="gf-input" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
      </div>
      {earn ? (
        <>
          <IncomeTypeChips value={draft.incomeType} onChange={(incomeType) => set({ incomeType })} />
          <ReimburseChips value={draft.reimburses} onChange={(reimburses) => set({ reimburses })} />
        </>
      ) : (<>
      <div>
        <span className="gf-label">Categoria</span>
        <div className="gf-chips">
          {categories.map((c) => (
            <button type="button" key={c.id} className="gf-chip" aria-pressed={draft.category === c.name} onClick={() => set({ category: c.name })}>
              <span className="dot" style={{ background: c.color }} />{c.name}
            </button>
          ))}
        </div>
        {sameTitleCount > 1 && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, fontSize: 14 }}>
            <input type="checkbox" checked={draft.applyAll} onChange={(e) => set({ applyAll: e.target.checked })} />
            Usar esta categoria nos {sameTitleCount} lançamentos "{item.title}"
          </label>
        )}
      </div>
      <div>
        <span className="gf-label">Quem comprou</span>
        <BuyerPicker idPrefix="imp-buyer" value={draft.person} extraNames={buyerNames} onChange={(person) => set({ person })} />
      </div>
      {!item.installment && !item.account && (
        <div>
          <span className="gf-label">Gasto ou assinatura?</span>
          <div className="gf-chips">
            <button type="button" className="gf-chip" aria-pressed={!draft.asSubscription} onClick={() => set({ asSubscription: false })}>Gasto avulso</button>
            <button type="button" className="gf-chip" aria-pressed={draft.asSubscription === 'monthly'} onClick={() => set({ asSubscription: 'monthly' })}>Assinatura mensal</button>
            <button type="button" className="gf-chip" aria-pressed={draft.asSubscription === 'annual'} onClick={() => set({ asSubscription: 'annual' })}>Assinatura anual</button>
          </div>
          {draft.asSubscription && (
            <div className="gf-hint">
              {draft.asSubscription === 'annual'
                ? `Vira uma anuidade de ${formatBRL(item.amount)} cobrada todo ano em ${formatDateBR(item.date).slice(0, 5)}`
                : `Vira uma assinatura de ${formatBRL(item.amount)} por mês, a partir de ${formatDateBR(item.date)}`}
            </div>
          )}
        </div>
      )}
      </>)}
      <div className="gf-sheet-actions">
        <button type="button" className="gf-btn-primary" onClick={() => onSave(draft)}>Pronto</button>
      </div>
    </Sheet>
  );
}

function ItemRow({ item, colorOf, onToggle, onOpen }) {
  const skipped = !item.included;
  return (
    <div className="gf-tx" style={{ gridTemplateColumns: '28px 1fr auto', opacity: skipped ? 0.6 : 1 }}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={item.included ? 'Não importar' : 'Importar'}
        aria-pressed={item.included}
        style={{ border: 0, background: 'none', padding: 0, color: item.included ? 'var(--accent)' : 'var(--ink-3)', display: 'grid', placeItems: 'center' }}
        disabled={!item.importRef}
      >
        {item.included ? <Check size={22} strokeWidth={2.6} /> : <Circle size={20} />}
      </button>
      <button type="button" onClick={onOpen} disabled={!item.importRef} style={{ border: 0, background: 'none', padding: 0, textAlign: 'left', minWidth: 0, color: 'inherit' }}>
        <div className="gf-tx-title">{item.title || item.raw}</div>
        <div className="gf-tx-meta">
          <span>{formatDateBR(item.date)}</span>
          {item.category && !item.skip && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span className="dot" style={{ width: 7, height: 7, borderRadius: '50%', background: colorOf(item.category), display: 'inline-block' }} />
              {item.category}
            </span>
          )}
          {item.installment && <span className="gf-pill is-inst">{item.installment.current}/{item.installment.total}</span>}
          {item.person && <span className="gf-pill is-person">{item.person}</span>}
          {item.reimburses && <span className="gf-pill is-person">reembolso de {item.reimburses}</span>}
          {item.asSubscription && <span className="gf-pill is-fixed">vira assinatura {item.asSubscription === 'annual' ? 'anual' : 'mensal'}</span>}
          {!item.asSubscription && item.looksLikeSubscription && item.included && <span className="gf-pill">parece assinatura{item.looksLikeSubscription === 'annual' ? ' anual' : ''}</span>}
          {item.skip && <span>{item.skip}</span>}
        </div>
      </button>
      <div className={`gf-tx-amt ${item.kind === 'earn' ? 'earn' : ''}`} style={{ textAlign: 'right' }}>
        {item.kind === 'earn' ? '+ ' : ''}{formatBRL(item.amount)}
        {item.installment && <div className="gf-tx-meta" style={{ justifyContent: 'flex-end' }}>total {formatBRL(item.total)}</div>}
      </div>
    </div>
  );
}

const toggleStyle = (on) => ({
  border: 0, background: 'none', padding: 0, display: 'grid', placeItems: 'center',
  color: on ? 'var(--accent)' : 'var(--ink-3)'
});

// Lançamentos com o mesmo nome viram uma linha só (ex.: 46 corridas de Uber).
const groupByTitle = (list) => {
  const groups = [];
  const byTitle = new Map();
  list.forEach((i) => {
    // Entradas e saídas da mesma pessoa (Pix recebido x enviado) ficam em grupos separados.
    const key = `${i.kind || 'spend'}|${(i.title || i.raw).toLowerCase()}`;
    if (!byTitle.has(key)) {
      const g = { key, title: i.title || i.raw, kind: i.kind || 'spend', account: Boolean(i.account), items: [] };
      byTitle.set(key, g);
      groups.push(g);
    }
    byTitle.get(key).items.push(i);
  });
  return groups;
};

const common = (values) => (values.every((v) => v === values[0]) ? values[0] : undefined);

function GroupRow({ group, expanded, colorOf, onToggle, onOpen, onExpand }) {
  const { items } = group;
  const on = items.filter((i) => i.included).length;
  const state = on === items.length ? 'all' : on === 0 ? 'none' : 'some';
  const category = common(items.map((i) => i.category));
  const people = [...new Set(items.map((i) => i.person).filter(Boolean))];
  const total = items.filter((i) => i.included || state === 'none').reduce((a, i) => a + i.amount, 0);
  return (
    <div className="gf-tx" style={{ gridTemplateColumns: '28px 1fr auto 28px', opacity: state === 'none' ? 0.6 : 1 }}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={state === 'all' ? `Não importar nenhum "${group.title}"` : `Importar todos "${group.title}"`}
        aria-pressed={state === 'all' ? true : state === 'none' ? false : 'mixed'}
        style={toggleStyle(state !== 'none')}
      >
        {state === 'all' ? <Check size={22} strokeWidth={2.6} /> : state === 'some' ? <MinusCircle size={20} /> : <Circle size={20} />}
      </button>
      <button type="button" onClick={onOpen} style={{ border: 0, background: 'none', padding: 0, textAlign: 'left', minWidth: 0, color: 'inherit' }}>
        <div className="gf-tx-title">{group.title}</div>
        <div className="gf-tx-meta">
          <span>{state === 'some' ? `${on} de ${items.length} marcados` : `${items.length} lançamentos`}</span>
          {group.kind === 'earn' ? <span>Entrada</span> : category ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span className="dot" style={{ width: 7, height: 7, borderRadius: '50%', background: colorOf(category), display: 'inline-block' }} />
              {category}
            </span>
          ) : <span>várias categorias</span>}
          {people.map((p) => <span key={p} className="gf-pill is-person">{p}</span>)}
          {common(items.map((i) => i.skip)) && <span>{items[0].skip}</span>}
        </div>
      </button>
      <div className={`gf-tx-amt ${group.kind === 'earn' ? 'earn' : ''}`}>{group.kind === 'earn' ? '+ ' : ''}{formatBRL(total)}</div>
      <button
        type="button"
        onClick={onExpand}
        aria-expanded={expanded}
        aria-label={expanded ? 'Esconder lançamentos' : 'Ver lançamentos um por um'}
        style={toggleStyle(false)}
      >
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
    </div>
  );
}

function GroupSheet({ group, categories, buyerNames, onClose, onSave }) {
  const { items } = group;
  const [draft, setDraft] = useState(() => ({
    title: group.title,
    category: common(items.map((i) => i.category)),
    person: common(items.map((i) => i.person || null)),
    included: common(items.map((i) => i.included)),
    incomeType: common(items.map((i) => i.incomeType || 'other')),
    reimburses: common(items.map((i) => i.reimburses || null)),
    ownAccount: items.every((i) => i.ownAccount)
  }));
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const total = items.reduce((a, i) => a + i.amount, 0);
  const earn = group.kind === 'earn';

  return (
    <Sheet label={`Ajustar todos "${group.title}"`} onClose={onClose}>
      <h2 className="gf-section-title" style={{ margin: 0 }}>
        {items.length} lançamentos
        <small>{formatBRL(total)} no total</small>
      </h2>
      <p className="gf-note" style={{ marginTop: -8 }}>O que você escolher aqui vale para todos. Para mudar só um, use a seta e toque nele.</p>
      <div className="gf-seg">
        <button type="button" aria-pressed={draft.included === true} onClick={() => set({ included: true, ownAccount: false })}>Importar todos</button>
        <button type="button" aria-pressed={draft.included === false} onClick={() => set({ included: false })}>Não importar</button>
      </div>
      {group.account && (
        <OwnAccountToggle
          checked={draft.ownAccount}
          name={group.title}
          onChange={(ownAccount) => set({ ownAccount, included: ownAccount ? false : draft.included })}
        />
      )}
      <div>
        <label className="gf-label" htmlFor="grp-title">Descrição</label>
        <input id="grp-title" className="gf-input" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
      </div>
      {earn ? (
        <>
          <IncomeTypeChips value={draft.incomeType} onChange={(incomeType) => set({ incomeType })} />
          <ReimburseChips value={draft.reimburses} onChange={(reimburses) => set({ reimburses })} />
        </>
      ) : (<>
      <div>
        <span className="gf-label">Categoria{draft.category === undefined ? ' (hoje estão em categorias diferentes)' : ''}</span>
        <div className="gf-chips">
          {categories.map((c) => (
            <button type="button" key={c.id} className="gf-chip" aria-pressed={draft.category === c.name} onClick={() => set({ category: c.name })}>
              <span className="dot" style={{ background: c.color }} />{c.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="gf-label">Quem comprou{draft.person === undefined ? ' (hoje está misturado)' : ''}</span>
        <BuyerPicker
          idPrefix="grp-buyer"
          value={draft.person}
          extraNames={buyerNames}
          onChange={(person) => set({ person })}
        />
      </div>
      </>)}
      <div className="gf-sheet-actions">
        <button type="button" className="gf-btn-primary" onClick={() => onSave(draft)}>Aplicar aos {items.length}</button>
      </div>
    </Sheet>
  );
}

export default function Import({ onToast, onOpenSettings }) {
  const fileRef = useRef(null);
  const [items, setItems] = useState(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [view, setView] = useState('import');
  const [editingId, setEditingId] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [, setRefresh] = useState(0);
  const categories = categoriesByUse();
  const categoryNames = categories.map((c) => c.name);
  const colorOf = (name) => categories.find((c) => c.name === name)?.color || '#7d8a85';
  const previous = items ? null : lastImport();

  const load = (text, name) => {
    const result = buildImportItems(text, {
      expenses: storage.expenses.getAll(),
      subscriptions: storage.subscriptions.getAll(),
      incomes: storage.incomes.getExpandedIncomes(),
      ownAccounts: storage.settings.get().ownAccounts || [],
      personAliases: storage.settings.get().personAliases || {},
      history: descriptionHistory(),
      categoryNames
    });
    if (result.error) { setError(result.error); setItems(null); return; }
    setError('');
    setFileName(name);
    setItems(result.items);
    setView('import');
    window.scrollTo(0, 0);
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => load(String(reader.result), file.name);
    reader.onerror = () => setError('Não consegui ler o arquivo. Tente de novo.');
    reader.readAsText(file, 'UTF-8');
  };

  const update = (id, patch) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const included = useMemo(() => (items || []).filter((i) => i.included), [items]);
  const skipped = (items || []).filter((i) => !i.included);
  const total = included.filter((i) => i.kind !== 'earn').reduce((a, i) => a + i.amount, 0);
  const totalIn = included.filter((i) => i.kind === 'earn').reduce((a, i) => a + i.amount, 0);
  const isAccount = (items || []).some((i) => i.account);

  // Categorias que as regras usariam se existissem (ex.: "Compras" para lojas).
  const missing = {};
  included.forEach((i) => {
    if (i.wantedCategory && i.categorySource === null && !categoryNames.includes(i.wantedCategory)) {
      missing[i.wantedCategory] = (missing[i.wantedCategory] || 0) + 1;
    }
  });
  const missingList = Object.entries(missing).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);

  const createCategory = (name) => {
    const look = NEW_CATEGORY_LOOK[name] || { color: '#6B7280', icon: 'MoreHorizontal' };
    storage.categories.add({ name, ...look });
    window.dispatchEvent(new Event('categoryAdded'));
    setItems((list) => list.map((i) => (i.wantedCategory === name && i.categorySource === null
      ? { ...i, category: name, categorySource: 'rule' }
      : i)));
    setRefresh((n) => n + 1);
    onToast(`Categoria "${name}" criada e aplicada`);
  };

  // Sugere configurar o cartão: fechamento pelas parcelas antigas; vencimento pelo nome
  // do arquivo do Nubank (Nubank_AAAA-MM-DD.csv traz a data de vencimento).
  const guessedClosing = !cardConfig() && items ? guessClosingDay(items) : null;
  const dueMatch = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
  const cardSuggestion = guessedClosing
    ? { closingDay: guessedClosing, dueDay: dueMatch ? Number(dueMatch[3]) : null }
    : null;
  const applyCardSuggestion = () => {
    if (!cardSuggestion.dueDay) { onOpenSettings?.('card'); return; }
    storage.settings.update({ card: { closingDay: cardSuggestion.closingDay, dueDay: cardSuggestion.dueDay }, viewMode: 'statement' });
    window.dispatchEvent(new Event('expenseAdded'));
    setRefresh((n) => n + 1);
    onToast('Meses organizados pela fatura. Dá para mudar em Ajustes → Cartão e fatura');
  };

  const editing = items?.find((i) => i.id === editingId);

  const saveItem = (draft) => {
    const sameTitle = editing.title;
    setItems((list) => list.map((i) => {
      if (i.id === editing.id) {
        return {
          ...i,
          title: draft.title.trim() || i.title,
          category: draft.category,
          categorySource: 'manual',
          included: draft.included,
          asSubscription: draft.asSubscription,
          person: draft.person,
          incomeType: draft.incomeType,
          reimburses: draft.reimburses,
          ownAccount: draft.ownAccount
        };
      }
      if (draft.applyAll && i.title === sameTitle && !i.skip) return { ...i, category: draft.category, categorySource: 'manual' };
      return i;
    }));
    setEditingId(null);
  };

  // Marcar o grupo só inclui lançamentos novos; já importados e assinaturas
  // cadastradas continuam de fora (dá para incluir um por um).
  const toggleGroup = (group) => {
    const ids = new Set(group.items.map((i) => i.id));
    const allOn = group.items.every((i) => i.included);
    setItems((list) => list.map((i) => (ids.has(i.id) ? { ...i, included: allOn ? false : !i.skip } : i)));
  };

  const saveGroup = (draft) => {
    const ids = new Set(editingGroup.items.map((i) => i.id));
    setItems((list) => list.map((i) => {
      if (!ids.has(i.id)) return i;
      const next = { ...i, title: draft.title.trim() || i.title };
      if (draft.category !== undefined) { next.category = draft.category; next.categorySource = 'manual'; }
      if (draft.person !== undefined) next.person = draft.person;
      if (draft.incomeType !== undefined) next.incomeType = draft.incomeType;
      if (draft.reimburses !== undefined) next.reimburses = draft.reimburses;
      if (draft.included === true) next.included = !i.skip;
      if (draft.included === false) next.included = false;
      next.ownAccount = draft.ownAccount;
      if (draft.ownAccount) next.included = false;
      return next;
    }));
    setEditingGroup(null);
  };

  const toggleExpanded = (key) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const runImport = () => {
    const batch = `imp-${Date.now()}`;
    const expenses = itemsToExpenses(items, batch);
    storage.expenses.addMany(expenses);
    const incomes = itemsToIncomes(items, batch);
    // Reembolsos: dá baixa nas cobranças (mais antigas primeiro) e lembra quem é quem no extrato.
    const reimbursed = included.filter((i) => i.kind === 'earn' && i.reimburses)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    let settledCount = 0;
    reimbursed.forEach((i) => { settledCount += settleCharges(i.reimburses, i.amount).count; });
    if (reimbursed.length) {
      const aliases = { ...(storage.settings.get().personAliases || {}) };
      reimbursed.forEach((i) => { aliases[accountCounterparty(i.raw).toLowerCase()] = i.reimburses; });
      storage.settings.update({ personAliases: aliases });
    }
    if (incomes.length) storage.incomes.addMany(incomes);
    const subs = included.filter((i) => i.asSubscription);
    subs.forEach((i) => storage.subscriptions.add({
      name: i.title, amount: i.amount, frequency: i.asSubscription === 'annual' ? 'annual' : 'monthly', category: i.category, startDate: i.date, importBatch: batch
    }));
    // Contas próprias marcadas: as próximas importações já deixam de fora.
    const own = [...new Set(items.filter((i) => i.ownAccount && i.title).map((i) => i.title))];
    if (own.length) {
      const saved = storage.settings.get().ownAccounts || [];
      storage.settings.update({ ownAccounts: [...new Set([...saved, ...own])] });
    }
    window.dispatchEvent(new Event('expenseAdded'));
    if (incomes.length) window.dispatchEvent(new Event('incomeAdded'));
    if (subs.length) window.dispatchEvent(new Event('subscriptionAdded'));
    setItems(null);
    onToast(`${expenses.length + incomes.length + subs.length} lançamentos importados`
      + (settledCount ? ` · ${settledCount} ${settledCount === 1 ? 'cobrança quitada' : 'cobranças quitadas'}` : ''));
  };

  const undo = (batch) => {
    storage.expenses.deleteMany(batch.ids);
    storage.incomes.deleteMany(batch.incomeIds);
    batch.subIds.forEach((id) => storage.subscriptions.delete(id));
    window.dispatchEvent(new Event('expenseAdded'));
    window.dispatchEvent(new Event('incomeAdded'));
    window.dispatchEvent(new Event('subscriptionAdded'));
    setRefresh((n) => n + 1);
    onToast('Importação desfeita');
  };

  if (!items) {
    return (
      <div className="gf-stack">
        <section className="gf-card gf-stack-sm">
          <h2 className="gf-section-title" style={{ margin: 0 }}>Fatura do cartão ou extrato da conta Nubank</h2>
          <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: 14 }}>
            Exporte em CSV pelo app do Nubank e escolha o arquivo aqui. O app reconhece sozinho se é a fatura
            do cartão ou o extrato da conta. Antes de gravar, você revisa tudo: nomes, categorias e o que entra ou não.
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--ink-2)', fontSize: 13, display: 'grid', gap: 4 }}>
            <li>Fatura: parcelas viram compras parceladas completas.</li>
            <li>Extrato: Pix enviados viram gastos (Pix) e recebidos viram entradas.</li>
            <li>Pagamento da fatura, estornos e aplicações ficam de fora.</li>
            <li>O que já foi importado antes é reconhecido e não entra de novo.</li>
          </ul>
          <button type="button" className="gf-btn-primary" onClick={() => fileRef.current?.click()} style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
            <Upload size={18} /> Escolher arquivo CSV
          </button>
          <input ref={fileRef} id="imp-file" type="file" accept=".csv,text/csv,text/plain" onChange={onFile} hidden />
          {error && <p className="gf-error" role="alert">{error}</p>}
        </section>

        {previous && (
          <section className="gf-card gf-stack-sm">
            <h2 className="gf-section-title" style={{ margin: 0 }}>
              Última importação
              <small>{previous.date ? formatDateBR(`${previous.date.getFullYear()}-${String(previous.date.getMonth() + 1).padStart(2, '0')}-${String(previous.date.getDate()).padStart(2, '0')}`) : ''}</small>
            </h2>
            <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: 14 }}>{previous.purchases} lançamentos. Se algo deu errado, dá para desfazer tudo de uma vez.</p>
            <ConfirmButton label="Desfazer última importação" confirmLabel="Toque de novo para apagar esses lançamentos" onConfirm={() => undo(previous)} />
          </section>
        )}
      </div>
    );
  }

  // "Para importar": grupos dos lançamentos novos que têm ao menos um marcado
  // (os desmarcados do grupo aparecem esmaecidos ao expandir).
  // "Ficam de fora": só o que não vai ser importado.
  const groups = view === 'import'
    ? groupByTitle(items.filter((i) => !i.skip)).filter((g) => g.items.some((i) => i.included))
    : groupByTitle(skipped);
  const renderItem = (i, nested) => (
    <div key={i.id} style={nested ? { paddingLeft: 28 } : undefined}>
      <ItemRow
        item={i}
        colorOf={colorOf}
        onToggle={() => update(i.id, { included: !i.included })}
        onOpen={() => setEditingId(i.id)}
      />
    </div>
  );

  return (
    <div className="gf-stack">
      <section className="gf-card gf-hero">
        <div>
          <div className="gf-hero-label">{isAccount ? 'Extrato da conta' : 'Fatura do cartão'} · {fileName}</div>
          <div className="gf-hero-value">{formatBRL(total)}</div>
        </div>
        <div className="gf-hero-sub">
          {isAccount && <>Saídas a importar. Entradas: <b style={{ color: 'var(--earn)' }}>+ {formatBRL(totalIn)}</b>. </>}
          {included.length} para importar · {skipped.length} ficam de fora. Toque num nome para ajustar todos iguais de uma vez; a seta mostra um por um.
        </div>
      </section>

      {cardSuggestion && (
        <section className="gf-card gf-owed">
          <p>
            Pelas parcelas, sua fatura fecha no <b>dia {cardSuggestion.closingDay}</b>
            {cardSuggestion.dueDay ? <> e vence no <b>dia {cardSuggestion.dueDay}</b></> : null}.
            Quer ver os meses pela fatura, para o total bater com o Nubank?
          </p>
          <button type="button" className="gf-btn-ghost" onClick={applyCardSuggestion}>
            {cardSuggestion.dueDay ? 'Usar' : 'Configurar'}
          </button>
        </section>
      )}

      {missingList.map(([name, count]) => (
        <section className="gf-card gf-owed" key={name}>
          <p>Criar a categoria <b>{name}</b> para {count} lançamentos que hoje iriam para "Outras"?</p>
          <button type="button" className="gf-btn-ghost" onClick={() => createCategory(name)}>Criar</button>
        </section>
      ))}

      <div className="gf-chips">
        <button type="button" className="gf-chip" aria-pressed={view === 'import'} onClick={() => setView('import')}>Para importar ({included.length})</button>
        <button type="button" className="gf-chip" aria-pressed={view === 'skipped'} onClick={() => setView('skipped')}>Ficam de fora ({skipped.length})</button>
      </div>

      <section className="gf-card">
        <div className="gf-plain-list">
          {groups.length
            ? groups.map((g) => (g.items.length === 1
              ? renderItem(g.items[0], false)
              : (
                <div key={g.key}>
                  <GroupRow
                    group={g}
                    expanded={expanded.has(g.key)}
                    colorOf={colorOf}
                    onToggle={() => toggleGroup(g)}
                    onOpen={() => setEditingGroup(g)}
                    onExpand={() => toggleExpanded(g.key)}
                  />
                  {expanded.has(g.key) && g.items.map((i) => renderItem(i, true))}
                </div>
              )))
            : <p className="gf-empty">{view === 'import' ? 'Nada marcado para importar.' : 'Nada ficou de fora.'}</p>}
        </div>
      </section>

      <div className="gf-sheet-actions" style={{ bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))', background: 'var(--bg)', boxShadow: '0 -8px 16px var(--bg)', paddingTop: 8 }}>
        <button type="button" className="gf-btn-primary" disabled={!included.length} onClick={runImport}>
          Importar {included.length} lançamentos
        </button>
        <button type="button" className="gf-btn-ghost" onClick={() => setItems(null)} style={{ padding: 10 }}>Cancelar</button>
      </div>

      {editing && (
        <ItemSheet
          item={editing}
          sameTitleCount={items.filter((i) => i.title === editing.title && !i.skip).length}
          categories={categories}
          buyerNames={[...new Set(items.map((i) => i.person).filter(Boolean))]}
          onClose={() => setEditingId(null)}
          onSave={saveItem}
        />
      )}

      {editingGroup && (
        <GroupSheet
          group={editingGroup}
          categories={categories}
          buyerNames={[...new Set(items.map((i) => i.person).filter(Boolean))]}
          onClose={() => setEditingGroup(null)}
          onSave={saveGroup}
        />
      )}
    </div>
  );
}
