import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Delete } from 'lucide-react';
import { storage, newId } from '../../utils/storage';
import { todayString, toDateString } from '../../utils/date';
import { cardConfig, categoriesByUse, descriptionHistory, formatBRL } from '../../utils/finance';
import { BuyerPicker, PeoplePicker, sharedWithFrom } from './ui';

const INCOME_TYPES = [
  { id: 'salary', label: 'Salário' },
  { id: 'bonus', label: 'Bônus' },
  { id: 'other', label: 'Outro' }
];
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'];
const MAX_CENTS = 99999999999;

const yesterdayString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateString(d);
};

const initialDraft = (editing) => {
  if (editing) {
    const date = editing.date;
    return {
      kind: 'spend',
      cents: Math.round((parseFloat(editing.amount) || 0) * 100),
      description: editing.description || '',
      category: editing.category,
      categoryAuto: false,
      dateMode: date === todayString() ? 'today' : date === yesterdayString() ? 'yesterday' : 'other',
      otherDate: date,
      more: false,
      installments: 1,
      people: [],
      person: editing.person || null,
      paidWith: editing.paidWith === 'other' ? 'other' : 'card'
    };
  }
  return {
    kind: 'spend',
    cents: 0,
    description: '',
    category: null,
    categoryAuto: false,
    dateMode: 'today',
    otherDate: todayString(),
    more: false,
    installments: 1,
    people: [],
    person: null,
    paidWith: 'card'
  };
};

const appendDigits = (cents, digits) => {
  const next = Number(`${cents || ''}${digits}`);
  return next > MAX_CENTS ? cents : next;
};

export default function QuickAdd({ editing, onClose, onSaved, onEditPurchase }) {
  const [draft, setDraft] = useState(() => initialDraft(editing));
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const descRef = useRef(null);

  const history = useMemo(() => descriptionHistory(), []);
  const categories = useMemo(() => categoriesByUse(), []);

  const update = (patch) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError('');
    setConfirmDelete(null);
  };

  // Teclado físico (computador): números e backspace digitam o valor.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (/^[0-9]$/.test(e.key)) setDraft((d) => ({ ...d, cents: appendDigits(d.cents, e.key) }));
      if (e.key === 'Backspace') setDraft((d) => ({ ...d, cents: Math.floor(d.cents / 10) }));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const amount = draft.cents / 100;
  const isSpend = draft.kind === 'spend';
  const q = draft.description.trim().toLowerCase();
  const suggestions = isSpend
    ? (q ? history.filter((h) => h.description.toLowerCase().startsWith(q) && h.description.toLowerCase() !== q) : history).slice(0, 5)
    : [];
  const colorOf = (name) => categories.find((c) => c.name === name)?.color || '#7d8a85';
  const splitCount = draft.people.length + 1;

  const onDescription = (value) => {
    const match = history.find((h) => h.description.toLowerCase() === value.trim().toLowerCase());
    setDraft((d) => {
      const next = { ...d, description: value };
      if (d.kind === 'spend' && match && (!d.category || d.categoryAuto)) {
        next.category = match.category;
        next.categoryAuto = true;
      } else if (!match && d.categoryAuto) {
        next.category = null;
        next.categoryAuto = false;
      }
      return next;
    });
    setError('');
  };

  const pressKey = (key) => {
    if (key === 'del') update({ cents: Math.floor(draft.cents / 10) });
    else update({ cents: appendDigits(draft.cents, key) });
  };

  const dateValue = draft.dateMode === 'today' ? todayString() : draft.dateMode === 'yesterday' ? yesterdayString() : draft.otherDate;

  const save = () => {
    if (!draft.cents) { setError('Digite o valor.'); return; }
    if (isSpend && !draft.description.trim()) { setError('Escreva uma descrição para encontrar o gasto depois.'); descRef.current?.focus(); return; }
    if (!draft.category) { setError(isSpend ? 'Escolha uma categoria.' : 'Escolha o tipo da entrada.'); return; }
    if (!dateValue) { setError('Escolha a data.'); return; }

    if (editing) {
      storage.expenses.update(editing.id, {
        amount,
        description: draft.description.trim(),
        category: draft.category,
        date: dateValue,
        person: draft.person,
        paidWith: draft.paidWith === 'other' ? 'other' : null
      });
      // Quem comprou vale para a compra inteira, não só para esta parcela.
      siblings.filter((e) => e.id !== editing.id && (e.person || null) !== draft.person)
        .forEach((e) => storage.expenses.update(e.id, { person: draft.person }));
      window.dispatchEvent(new Event('expenseAdded'));
      onSaved('Gasto atualizado', dateValue, { calendar: draft.paidWith === 'other' });
      return;
    }

    if (isSpend) {
      const shared = draft.people.length > 0;
      storage.expenses.add({
        amount,
        category: draft.category,
        description: draft.description.trim(),
        date: dateValue,
        installments: draft.installments,
        person: draft.person,
        paidWith: draft.paidWith === 'other' ? 'other' : undefined,
        isShared: shared,
        sharedWith: shared
          ? sharedWithFrom(draft.people, newId)
          : []
      });
      window.dispatchEvent(new Event('expenseAdded'));
      onSaved(draft.installments > 1 ? `Gasto salvo em ${draft.installments}x` : `Gasto de ${formatBRL(amount)} salvo`, dateValue, { calendar: draft.paidWith === 'other' });
    } else {
      const type = INCOME_TYPES.find((t) => t.id === draft.category);
      storage.incomes.add({
        amount,
        type: draft.category,
        description: draft.description.trim() || type.label,
        date: dateValue,
        isRecurring: false
      });
      window.dispatchEvent(new Event('incomeAdded'));
      onSaved(`Entrada de ${formatBRL(amount)} salva`, dateValue, { calendar: true });
    }
  };

  // Parcelas do mesmo gasto: mesma regra de agrupamento da lista antiga.
  const siblings = editing && (editing.totalInstallments || 1) > 1
    ? storage.expenses.getAll().filter((e) =>
      (e.originalDate || e.date) === (editing.originalDate || editing.date) &&
      e.description === editing.description &&
      e.totalInstallments === editing.totalInstallments)
    : [];

  const remove = (all) => {
    const mode = all ? 'all' : 'one';
    if (confirmDelete !== mode) { setConfirmDelete(mode); return; }
    (all ? siblings : [editing]).forEach((e) => storage.expenses.delete(e.id));
    window.dispatchEvent(new Event('expenseAdded'));
    onSaved(all ? `${siblings.length} parcelas excluídas` : 'Gasto excluído', editing.date);
  };

  return (
    <>
      <div className="gf-scrim" onClick={onClose} />
      <div className="gf-sheet" role="dialog" aria-modal="true" aria-label={editing ? 'Editar gasto' : 'Novo lançamento'}>
        <div className="gf-grabber" />

        {editing ? (
          <h2 className="gf-section-title" style={{ margin: 0 }}>
            Editar gasto
            {editing.totalInstallments > 1 && <small>parcela {editing.installmentNumber}/{editing.totalInstallments}</small>}
          </h2>
        ) : (
          <div className="gf-seg">
            <button type="button" aria-pressed={isSpend} onClick={() => update({ kind: 'spend', category: null, categoryAuto: false, more: false, installments: 1, people: [] })}>Gasto</button>
            <button type="button" aria-pressed={!isSpend} onClick={() => update({ kind: 'earn', category: 'salary', categoryAuto: false, more: false, installments: 1, people: [] })}>Entrada</button>
          </div>
        )}

        <div className={`gf-amount ${draft.cents ? draft.kind : 'zero'}`} aria-live="polite">{formatBRL(amount)}</div>
        <div className="gf-keypad" aria-label="Teclado numérico">
          {KEYS.map((k) => <button type="button" key={k} onClick={() => pressKey(k)}>{k}</button>)}
          <button type="button" aria-label="Apagar" onClick={() => pressKey('del')}><Delete size={20} style={{ margin: '0 auto' }} /></button>
        </div>

        <div>
          <label className="gf-label" htmlFor="qa-description">Descrição</label>
          <input
            ref={descRef}
            id="qa-description"
            className="gf-input"
            autoComplete="off"
            placeholder={isSpend ? 'Mercado, Uber, farmácia…' : 'Salário, freela…'}
            value={draft.description}
            onChange={(e) => onDescription(e.target.value)}
          />
          {suggestions.length > 0 && (
            <div className="gf-suggest">
              {suggestions.map((h) => (
                <button
                  type="button"
                  key={h.description}
                  className="gf-chip"
                  onClick={() => update({ description: h.description, category: h.category, categoryAuto: true })}
                >
                  <span className="dot" style={{ background: colorOf(h.category) }} />{h.description}
                </button>
              ))}
            </div>
          )}
          {draft.categoryAuto && <div className="gf-hint">Categoria sugerida pelo seu histórico: {draft.category}</div>}
        </div>

        <div>
          <span className="gf-label">{isSpend ? 'Categoria' : 'Tipo'}</span>
          <div className="gf-chips">
            {isSpend
              ? categories.map((c) => (
                <button type="button" key={c.id} className="gf-chip" aria-pressed={draft.category === c.name} onClick={() => update({ category: c.name, categoryAuto: false })}>
                  <span className="dot" style={{ background: c.color }} />{c.name}
                </button>
              ))
              : INCOME_TYPES.map((t) => (
                <button type="button" key={t.id} className="gf-chip" aria-pressed={draft.category === t.id} onClick={() => update({ category: t.id })}>
                  {t.label}
                </button>
              ))}
          </div>
        </div>

        <div>
          <span className="gf-label">Data</span>
          <div className="gf-chips">
            <button type="button" className="gf-chip" aria-pressed={draft.dateMode === 'today'} onClick={() => update({ dateMode: 'today' })}>Hoje</button>
            <button type="button" className="gf-chip" aria-pressed={draft.dateMode === 'yesterday'} onClick={() => update({ dateMode: 'yesterday' })}>Ontem</button>
            <button type="button" className="gf-chip" aria-pressed={draft.dateMode === 'other'} onClick={() => update({ dateMode: 'other' })}>Outra data</button>
          </div>
          {draft.dateMode === 'other' && (
            <input id="qa-date" className="gf-input" style={{ marginTop: 8 }} type="date" value={draft.otherDate} onChange={(e) => update({ otherDate: e.target.value })} />
          )}
        </div>

        {isSpend && (
          <div>
            {cardConfig() && (
              <div style={{ marginBottom: 14 }}>
                <span className="gf-label">Pago com</span>
                <div className="gf-chips">
                  <button type="button" className="gf-chip" aria-pressed={draft.paidWith !== 'other'} onClick={() => update({ paidWith: 'card' })}>Cartão</button>
                  <button type="button" className="gf-chip" aria-pressed={draft.paidWith === 'other'} onClick={() => update({ paidWith: 'other' })}>Pix ou dinheiro</button>
                </div>
              </div>
            )}
            <span className="gf-label">Quem comprou</span>
            <BuyerPicker idPrefix="qa-buyer" value={draft.person} onChange={(person) => update({ person })} />
          </div>
        )}

        {isSpend && !editing && (
          <>
            <button type="button" className="gf-link" aria-expanded={draft.more} onClick={() => update({ more: !draft.more })}>
              {draft.more ? 'Menos opções' : 'Mais opções: parcelar ou dividir'}
            </button>
            {draft.more && (
              <div className="gf-more">
                <div>
                  <span className="gf-label">Parcelas</span>
                  <div className="gf-stepper">
                    <button type="button" aria-label="Menos parcelas" onClick={() => update({ installments: Math.max(1, draft.installments - 1) })}>−</button>
                    <b>{draft.installments}x</b>
                    <button type="button" aria-label="Mais parcelas" onClick={() => update({ installments: Math.min(24, draft.installments + 1) })}>+</button>
                    <span>{draft.installments > 1 && amount ? `${draft.installments}x de ${formatBRL(amount / draft.installments)}` : 'à vista'}</span>
                  </div>
                </div>
                <div>
                  <span className="gf-label">Dividir com</span>
                  <PeoplePicker selected={draft.people} onChange={(people) => update({ people })} />
                  {draft.people.length > 0 && amount > 0 && (
                    <div className="gf-hint">
                      Dividido em {splitCount}: sua parte é {formatBRL(amount / splitCount)} e cada pessoa te deve {formatBRL(amount / splitCount)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <div className="gf-sheet-actions">
          {error && <p className="gf-error" role="alert">{error}</p>}
          <button type="button" className="gf-btn-primary" disabled={!draft.cents} onClick={save}>
            {!draft.cents ? 'Digite o valor' : editing ? 'Salvar alterações' : `Salvar ${isSpend ? 'gasto' : 'entrada'} de ${formatBRL(amount)}`}
          </button>
          {editing && (
            <>
              {siblings.length > 1 && onEditPurchase && (
                <button type="button" className="gf-btn-danger" style={{ color: 'var(--accent)' }} onClick={() => onEditPurchase(editing)}>
                  Editar a compra inteira ({siblings.length} parcelas)
                </button>
              )}
              <button type="button" className="gf-btn-danger" onClick={() => remove(false)}>
                {confirmDelete === 'one' ? 'Toque de novo para excluir' : siblings.length > 1 ? 'Excluir só esta parcela' : 'Excluir gasto'}
              </button>
              {siblings.length > 1 && (
                <button type="button" className="gf-btn-danger" onClick={() => remove(true)}>
                  {confirmDelete === 'all' ? 'Toque de novo para excluir' : `Excluir as ${siblings.length} parcelas`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
