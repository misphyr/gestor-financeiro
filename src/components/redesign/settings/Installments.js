import React, { useState } from 'react';
import { storage } from '../../../utils/storage';
import { addMonths, formatDateBR, parseLocalDate, toDateString } from '../../../utils/date';
import { categoriesByUse, formatBRL, installmentGroupKey, installmentPurchases } from '../../../utils/finance';
import { getIconComponent } from '../../../utils/icons';
import { BuyerPicker, ConfirmButton, MoneyInput, Sheet } from '../ui';

const notify = () => window.dispatchEvent(new Event('expenseAdded'));

// Acha a compra (todas as parcelas) a que um gasto pertence.
export const purchaseOf = (expense) => installmentPurchases().find((p) => p.key === installmentGroupKey(expense));

export function InstallmentSheet({ purchase, onClose, onDone }) {
  const categories = categoriesByUse();
  const [form, setForm] = useState(() => ({
    description: purchase.description,
    cents: Math.round(purchase.total * 100),
    count: purchase.count,
    firstDate: purchase.firstDate,
    category: purchase.category,
    person: purchase.person || null
  }));
  const [error, setError] = useState('');
  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setError(''); };

  const save = () => {
    if (!form.description.trim()) { setError('Escreva uma descrição.'); return; }
    if (!form.cents) { setError('Digite o valor total.'); return; }
    if (!form.firstDate) { setError('Escolha a data da 1ª parcela.'); return; }
    const template = purchase.items[0];
    const description = form.description.trim();

    if (form.count !== purchase.items.length) {
      // Mudou o número de parcelas: recria a compra do zero.
      purchase.items.forEach((e) => storage.expenses.delete(e.id));
      storage.expenses.add({
        amount: form.cents / 100,
        category: form.category,
        description,
        date: form.firstDate,
        installments: form.count,
        person: form.person,
        isShared: template.isShared || false,
        sharedWith: template.sharedWith || []
      });
    } else {
      const base = Math.floor(form.cents / form.count);
      const rest = form.cents - base * form.count;
      const first = parseLocalDate(form.firstDate);
      purchase.items.forEach((e, index) => {
        const n = (e.installmentNumber || index + 1) - 1;
        storage.expenses.update(e.id, {
          amount: (base + (index < rest ? 1 : 0)) / 100,
          date: toDateString(addMonths(first, n)),
          originalDate: form.firstDate,
          category: form.category,
          description,
          person: form.person
        });
      });
    }
    notify();
    onDone('Compra atualizada');
  };

  const remove = () => {
    purchase.items.forEach((e) => storage.expenses.delete(e.id));
    notify();
    onDone(`${purchase.items.length} parcelas excluídas`);
  };

  return (
    <Sheet label="Editar compra parcelada" onClose={onClose}>
      <h2 className="gf-section-title" style={{ margin: 0 }}>
        Editar compra parcelada <small>{purchase.paidCount} de {purchase.count} pagas</small>
      </h2>
      <div>
        <label className="gf-label" htmlFor="inst-desc">Descrição</label>
        <input id="inst-desc" className="gf-input" value={form.description} onChange={(e) => set({ description: e.target.value })} />
      </div>
      <div>
        <label className="gf-label" htmlFor="inst-total">Valor total da compra</label>
        <MoneyInput id="inst-total" cents={form.cents} onChange={(cents) => set({ cents })} />
      </div>
      <div>
        <span className="gf-label">Parcelas</span>
        <div className="gf-stepper">
          <button type="button" aria-label="Menos parcelas" onClick={() => set({ count: Math.max(2, form.count - 1) })}>−</button>
          <b>{form.count}x</b>
          <button type="button" aria-label="Mais parcelas" onClick={() => set({ count: Math.min(48, form.count + 1) })}>+</button>
          <span>{form.cents ? `de ${formatBRL(form.cents / 100 / form.count)}` : ''}</span>
        </div>
        {form.count !== purchase.items.length && (
          <div className="gf-hint">As parcelas serão recriadas. Cobranças já marcadas como recebidas desta compra voltam para pendente.</div>
        )}
      </div>
      <div>
        <label className="gf-label" htmlFor="inst-first">Data da 1ª parcela</label>
        <input id="inst-first" className="gf-input" type="date" value={form.firstDate} onChange={(e) => set({ firstDate: e.target.value })} />
      </div>
      <div>
        <span className="gf-label">Categoria</span>
        <div className="gf-chips">
          {categories.map((c) => (
            <button type="button" key={c.id} className="gf-chip" aria-pressed={form.category === c.name} onClick={() => set({ category: c.name })}>
              <span className="dot" style={{ background: c.color }} />{c.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="gf-label">Quem comprou</span>
        <BuyerPicker idPrefix="inst-buyer" value={form.person} onChange={(person) => set({ person })} />
      </div>
      <div className="gf-sheet-actions">
        {error && <p className="gf-error" role="alert">{error}</p>}
        <button type="button" className="gf-btn-primary" onClick={save}>Salvar alterações</button>
        <ConfirmButton label={`Excluir as ${purchase.items.length} parcelas`} onConfirm={remove} />
      </div>
    </Sheet>
  );
}

function PurchaseRow({ p, onSelect }) {
  const cat = storage.categories.getAll().find((c) => c.name === p.category);
  const Icon = getIconComponent(cat?.icon || 'MoreHorizontal');
  const color = cat?.color || '#7d8a85';
  const done = p.remaining === 0;
  return (
    <button type="button" className="gf-tx" onClick={() => onSelect(p)} style={{ alignItems: 'start' }}>
      <div className="gf-tx-icon" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
        <Icon size={18} />
      </div>
      <div className="gf-tx-main" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="gf-tx-title">{p.description}</div>
        <div className="gf-tx-meta">
          <span>{p.count}x de {formatBRL(p.total / p.count)}</span>
          {p.person && <span className="gf-pill is-person">{p.person}</span>}
          {p.shared && <span className="gf-pill">dividida</span>}
        </div>
        <div className="gf-budget-bar" style={{ height: 6 }} aria-label={`${p.paidCount} de ${p.count} parcelas pagas`}>
          <span style={{ width: `${(p.paidCount / p.count) * 100}%`, background: done ? 'var(--earn)' : 'var(--inst)' }} />
        </div>
        <div className="gf-tx-meta">
          <span>{done ? 'Quitada' : `${p.paidCount} de ${p.count} pagas · próxima ${formatDateBR(p.nextDate)}`}</span>
        </div>
      </div>
      <div className="gf-tx-amt" style={{ textAlign: 'right' }}>
        {done ? formatBRL(p.total) : formatBRL(p.remaining)}
        <div className="gf-tx-meta" style={{ justifyContent: 'flex-end' }}>{done ? 'total' : 'falta'}</div>
      </div>
    </button>
  );
}

export default function Installments({ onToast }) {
  const [editing, setEditing] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const purchases = installmentPurchases();
  const open = purchases.filter((p) => p.remaining > 0);
  const done = purchases.filter((p) => p.remaining === 0);
  const remaining = open.reduce((acc, p) => acc + p.remaining, 0);
  const lastDate = open.map((p) => p.items[p.items.length - 1].date).sort().pop();

  return (
    <div className="gf-stack">
      <section className="gf-card gf-hero">
        <div>
          <div className="gf-hero-label">Falta pagar em parcelas</div>
          <div className="gf-hero-value">{formatBRL(remaining)}</div>
        </div>
        <div className="gf-hero-sub">
          {open.length
            ? `${open.length} ${open.length === 1 ? 'compra' : 'compras'} em andamento · última parcela em ${formatDateBR(lastDate)}`
            : 'Nenhuma compra parcelada em andamento.'}
        </div>
      </section>

      <section className="gf-card">
        <h2 className="gf-section-title">Em andamento <small>toque para editar a compra</small></h2>
        <div className="gf-plain-list">
          {open.length
            ? open.map((p) => <PurchaseRow key={p.key} p={p} onSelect={setEditing} />)
            : <p className="gf-empty">Para parcelar, use "Mais opções" no botão +.</p>}
        </div>
      </section>

      {done.length > 0 && (
        <section className="gf-card">
          <h2 className="gf-section-title">
            Quitadas <small>{done.length}</small>
            <button type="button" className="gf-btn-ghost" aria-expanded={showDone} onClick={() => setShowDone(!showDone)}>
              {showDone ? 'Esconder' : 'Mostrar'}
            </button>
          </h2>
          {showDone && (
            <div className="gf-plain-list">
              {done.map((p) => <PurchaseRow key={p.key} p={p} onSelect={setEditing} />)}
            </div>
          )}
        </section>
      )}

      {editing && (
        <InstallmentSheet
          purchase={editing}
          onClose={() => setEditing(null)}
          onDone={(msg) => { setEditing(null); onToast(msg); }}
        />
      )}
    </div>
  );
}
