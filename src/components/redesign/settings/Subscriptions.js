import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { storage, newId } from '../../../utils/storage';
import { formatDateBR, parseLocalDate, todayString } from '../../../utils/date';
import { categoriesByUse, formatBRL, isAnnual, MONTHS, nextCharge } from '../../../utils/finance';
import { getIconComponent } from '../../../utils/icons';
import { ConfirmButton, MoneyInput, PeoplePicker, Sheet, namesFromSharedWith, sharedWithFrom } from '../ui';

const notify = () => window.dispatchEvent(new Event('subscriptionAdded'));

function SubscriptionSheet({ sub, onClose, onDone }) {
  const categories = categoriesByUse();
  const [form, setForm] = useState(() => ({
    name: sub?.name || '',
    cents: sub ? Math.round((parseFloat(sub.amount) || 0) * 100) : 0,
    frequency: sub?.frequency || 'monthly',
    category: sub?.category || 'Outras',
    startDate: sub?.startDate || todayString(),
    people: namesFromSharedWith(sub?.sharedWith)
  }));
  const [error, setError] = useState('');
  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setError(''); };

  const save = () => {
    if (!form.name.trim()) { setError('Dê um nome, como "Netflix" ou "Aluguel".'); return; }
    if (!form.cents) { setError('Digite o valor.'); return; }
    const data = {
      name: form.name.trim(),
      amount: form.cents / 100,
      frequency: form.frequency,
      category: form.category,
      startDate: form.startDate,
      isShared: form.people.length > 0,
      sharedWith: sharedWithFrom(form.people, newId)
    };
    if (sub) storage.subscriptions.update(sub.id, data);
    else storage.subscriptions.add(data);
    notify();
    onDone(sub ? 'Assinatura atualizada' : 'Assinatura adicionada');
  };

  const setCanceled = (canceledDate) => {
    storage.subscriptions.update(sub.id, { canceledDate });
    notify();
    onDone(canceledDate ? 'Assinatura cancelada a partir de hoje' : 'Assinatura reativada');
  };

  const remove = () => {
    storage.subscriptions.delete(sub.id);
    notify();
    onDone('Assinatura excluída');
  };

  return (
    <Sheet label={sub ? 'Editar assinatura' : 'Nova assinatura'} onClose={onClose}>
      <h2 className="gf-section-title" style={{ margin: 0 }}>{sub ? 'Editar assinatura' : 'Nova assinatura ou conta fixa'}</h2>
      <div>
        <label className="gf-label" htmlFor="sub-name">Nome</label>
        <input id="sub-name" className="gf-input" placeholder="Netflix, aluguel, academia…" value={form.name} onChange={(e) => set({ name: e.target.value })} />
      </div>
      <div>
        <label className="gf-label" htmlFor="sub-amount">Valor</label>
        <MoneyInput id="sub-amount" cents={form.cents} onChange={(cents) => set({ cents })} />
      </div>
      <div>
        <span className="gf-label">Cobrança</span>
        <div className="gf-chips">
          <button type="button" className="gf-chip" aria-pressed={form.frequency === 'monthly'} onClick={() => set({ frequency: 'monthly' })}>Todo mês</button>
          <button type="button" className="gf-chip" aria-pressed={form.frequency === 'annual'} onClick={() => set({ frequency: 'annual' })}>Uma vez por ano</button>
        </div>
        {form.frequency === 'annual' && form.startDate && (
          <div className="gf-hint">
            Cobrada inteira{form.cents > 0 ? ` (${formatBRL(form.cents / 100)})` : ''} todo ano em {MONTHS[parseLocalDate(form.startDate).getMonth()].toLowerCase()}, no dia {parseLocalDate(form.startDate).getDate()}
          </div>
        )}
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
        <label className="gf-label" htmlFor="sub-start">{form.frequency === 'annual' ? 'Data de uma cobrança (define o dia e o mês da renovação)' : 'Começou em'}</label>
        <input id="sub-start" className="gf-input" type="date" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} />
      </div>
      <div>
        <span className="gf-label">Dividir com</span>
        <PeoplePicker selected={form.people} onChange={(people) => set({ people })} />
        {form.people.length > 0 && form.cents > 0 && (
          <div className="gf-hint">Cada pessoa te deve {formatBRL(form.cents / 100 / (form.people.length + 1))} por cobrança</div>
        )}
      </div>
      <div className="gf-sheet-actions">
        {error && <p className="gf-error" role="alert">{error}</p>}
        <button type="button" className="gf-btn-primary" onClick={save}>{sub ? 'Salvar alterações' : 'Adicionar'}</button>
        {sub && (sub.canceledDate
          ? <button type="button" className="gf-btn-danger" style={{ color: 'var(--accent)' }} onClick={() => setCanceled(null)}>Reativar assinatura</button>
          : <ConfirmButton label="Cancelar a partir de hoje" onConfirm={() => setCanceled(todayString())} />)}
        {sub && <ConfirmButton label="Excluir (some também dos meses passados)" onConfirm={remove} />}
      </div>
    </Sheet>
  );
}

function SubscriptionRow({ sub, onSelect }) {
  const cat = storage.categories.getAll().find((c) => c.name === sub.category);
  const Icon = getIconComponent(cat?.icon || 'MoreHorizontal');
  const color = cat?.color || '#7d8a85';
  const annual = isAnnual(sub);
  const people = namesFromSharedWith(sub.sharedWith);
  const next = !sub.canceledDate && nextCharge(sub);
  return (
    <button type="button" className="gf-tx" onClick={() => onSelect(sub)}>
      <div className="gf-tx-icon" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
        <Icon size={18} />
      </div>
      <div className="gf-tx-main">
        <div className="gf-tx-title">{sub.name}</div>
        <div className="gf-tx-meta">
          <span>{annual ? `Anual${next ? ` · renova em ${formatDateBR(next)}` : ''}` : `Mensal · dia ${parseLocalDate(sub.startDate).getDate()}`}</span>
          {people.length > 0 && <span className="gf-pill">dividido com {people.join(', ')}</span>}
          {sub.canceledDate && <span>cancelada em {formatDateBR(sub.canceledDate)}</span>}
        </div>
      </div>
      <div className="gf-tx-amt">
        {formatBRL(sub.amount)}
        <div className="gf-tx-meta" style={{ justifyContent: 'flex-end' }}>{annual ? 'por ano' : 'por mês'}</div>
      </div>
    </button>
  );
}

export default function Subscriptions({ onToast }) {
  const [editing, setEditing] = useState(undefined); // undefined = fechado, null = nova
  const all = storage.subscriptions.getAll();
  const active = all.filter((s) => !s.canceledDate).sort((a, b) => b.amount - a.amount);
  const canceled = all.filter((s) => s.canceledDate);
  const monthly = active.filter((s) => !isAnnual(s));
  const annual = active.filter(isAnnual)
    .map((s) => ({ sub: s, next: nextCharge(s) }))
    .sort((a, b) => ((a.next || '9') < (b.next || '9') ? -1 : 1));
  const perMonth = monthly.reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0);
  const perYear = annual.reduce((acc, a) => acc + (parseFloat(a.sub.amount) || 0), 0);

  return (
    <div className="gf-stack">
      <section className="gf-card gf-hero">
        <div>
          <div className="gf-hero-label">Assinaturas mensais</div>
          <div className="gf-hero-value">{formatBRL(perMonth)}<span style={{ fontSize: 16, color: 'var(--ink-3)' }}> /mês</span></div>
        </div>
        <div className="gf-hero-sub">
          {monthly.length} {monthly.length === 1 ? 'mensal' : 'mensais'}
          {annual.length > 0 && ` · ${annual.length} ${annual.length === 1 ? 'anual' : 'anuais'} somando ${formatBRL(perYear)} por ano, cobrada${annual.length === 1 ? '' : 's'} inteira${annual.length === 1 ? '' : 's'} no mês de renovação`}
        </div>
        {annual[0]?.next && (
          <div className="gf-owed" style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '10px 12px' }}>
            <p>Próxima anuidade: <b>{annual[0].sub.name}</b>, <b>{formatBRL(annual[0].sub.amount)}</b> em {formatDateBR(annual[0].next)}</p>
          </div>
        )}
      </section>

      <button type="button" className="gf-btn-primary" onClick={() => setEditing(null)} style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
        <Plus size={18} /> Nova assinatura ou conta fixa
      </button>

      <section className="gf-card">
        <h2 className="gf-section-title">Mensais <small>toque para editar</small></h2>
        <div className="gf-plain-list">
          {monthly.length
            ? monthly.map((s) => <SubscriptionRow key={s.id} sub={s} onSelect={setEditing} />)
            : <p className="gf-empty">Nenhuma assinatura mensal.</p>}
        </div>
      </section>

      <section className="gf-card">
        <h2 className="gf-section-title">Anuais <small>pela próxima renovação</small></h2>
        <div className="gf-plain-list">
          {annual.length
            ? annual.map(({ sub }) => <SubscriptionRow key={sub.id} sub={sub} onSelect={setEditing} />)
            : <p className="gf-empty">Anuidade do cartão, Amazon Prime anual, IPVA… cadastre com "Uma vez por ano".</p>}
        </div>
      </section>

      {canceled.length > 0 && (
        <section className="gf-card">
          <h2 className="gf-section-title">Canceladas</h2>
          <div className="gf-plain-list">
            {canceled.map((s) => <SubscriptionRow key={s.id} sub={s} onSelect={setEditing} />)}
          </div>
        </section>
      )}

      {editing !== undefined && (
        <SubscriptionSheet
          sub={editing}
          onClose={() => setEditing(undefined)}
          onDone={(msg) => { setEditing(undefined); onToast(msg); }}
        />
      )}
    </div>
  );
}
