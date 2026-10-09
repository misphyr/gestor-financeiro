import React, { useState } from 'react';
import { ArrowDownLeft, Plus } from 'lucide-react';
import { storage } from '../../../utils/storage';
import { formatDateBR, todayString } from '../../../utils/date';
import { formatBRL } from '../../../utils/finance';
import { ConfirmButton, MoneyInput, Sheet } from '../ui';

const TYPES = [
  { id: 'salary', label: 'Salário' },
  { id: 'bonus', label: 'Bônus' },
  { id: 'other', label: 'Outro' }
];
const notify = () => window.dispatchEvent(new Event('incomeAdded'));

function IncomeSheet({ income, onClose, onDone }) {
  const [form, setForm] = useState(() => ({
    description: income?.description || '',
    cents: income ? Math.round((parseFloat(income.amount) || 0) * 100) : 0,
    repeat: income ? (income.isRecurring ? income.frequency || 'monthly' : 'once') : 'monthly',
    type: income && income.type !== 'recurring' ? income.type : 'salary',
    date: income ? (income.isRecurring ? income.baseDate : income.date) || todayString() : todayString()
  }));
  const [error, setError] = useState('');
  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setError(''); };
  const recurring = form.repeat !== 'once';

  const save = () => {
    if (!form.cents) { setError('Digite o valor.'); return; }
    if (!form.date) { setError('Escolha a data.'); return; }
    const data = {
      amount: form.cents / 100,
      description: form.description.trim() || (recurring ? 'Renda recorrente' : TYPES.find((t) => t.id === form.type).label),
      type: recurring ? 'recurring' : form.type,
      isRecurring: recurring,
      frequency: recurring ? form.repeat : null,
      baseDate: recurring ? form.date : null,
      date: recurring ? (income?.date || todayString()) : form.date
    };
    if (income) storage.incomes.update(income.id, data);
    else storage.incomes.add(data);
    notify();
    onDone(income ? 'Entrada atualizada' : 'Entrada adicionada');
  };

  const remove = () => {
    storage.incomes.delete(income.id);
    notify();
    onDone('Entrada excluída');
  };

  return (
    <Sheet label={income ? 'Editar entrada' : 'Nova entrada'} onClose={onClose}>
      <h2 className="gf-section-title" style={{ margin: 0 }}>{income ? 'Editar entrada' : 'Nova entrada'}</h2>
      <div>
        <label className="gf-label" htmlFor="inc-desc">Descrição</label>
        <input id="inc-desc" className="gf-input" placeholder="Salário, freela, aluguel recebido…" value={form.description} onChange={(e) => set({ description: e.target.value })} />
      </div>
      <div>
        <label className="gf-label" htmlFor="inc-amount">Valor</label>
        <MoneyInput id="inc-amount" cents={form.cents} onChange={(cents) => set({ cents })} />
      </div>
      <div>
        <span className="gf-label">Repete?</span>
        <div className="gf-chips">
          <button type="button" className="gf-chip" aria-pressed={form.repeat === 'monthly'} onClick={() => set({ repeat: 'monthly' })}>Todo mês</button>
          <button type="button" className="gf-chip" aria-pressed={form.repeat === 'annual'} onClick={() => set({ repeat: 'annual' })}>Uma vez por ano</button>
          <button type="button" className="gf-chip" aria-pressed={form.repeat === 'once'} onClick={() => set({ repeat: 'once' })}>Só uma vez</button>
        </div>
      </div>
      {!recurring && (
        <div>
          <span className="gf-label">Tipo</span>
          <div className="gf-chips">
            {TYPES.map((t) => (
              <button type="button" key={t.id} className="gf-chip" aria-pressed={form.type === t.id} onClick={() => set({ type: t.id })}>{t.label}</button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className="gf-label" htmlFor="inc-date">{recurring ? 'Começou em' : 'Data'}</label>
        <input id="inc-date" className="gf-input" type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
        {recurring && (
          <div className="gf-hint">
            {form.repeat === 'annual'
              ? 'Entra inteira uma vez por ano, no dia e mês desta data.'
              : 'Aparece em todos os meses a partir desta data.'}
          </div>
        )}
      </div>
      <div className="gf-sheet-actions">
        {error && <p className="gf-error" role="alert">{error}</p>}
        <button type="button" className="gf-btn-primary" onClick={save}>{income ? 'Salvar alterações' : 'Adicionar'}</button>
        {income && <ConfirmButton label="Excluir entrada" onConfirm={remove} />}
      </div>
    </Sheet>
  );
}

function IncomeRow({ income, onSelect }) {
  const meta = income.isRecurring
    ? `${income.frequency === 'annual' ? 'Todo ano' : 'Todo mês'} · desde ${formatDateBR(income.baseDate)}`
    : formatDateBR(income.date);
  return (
    <button type="button" className="gf-tx" onClick={() => onSelect(income)}>
      <div className="gf-tx-icon" style={{ background: 'color-mix(in srgb, var(--earn) 16%, transparent)', color: 'var(--earn)' }}>
        <ArrowDownLeft size={18} />
      </div>
      <div className="gf-tx-main">
        <div className="gf-tx-title">{income.description || 'Entrada'}</div>
        <div className="gf-tx-meta"><span>{meta}</span></div>
      </div>
      <div className="gf-tx-amt earn">+ {formatBRL(income.amount)}</div>
    </button>
  );
}

export default function Incomes({ onToast }) {
  const [editing, setEditing] = useState(undefined);
  const all = storage.incomes.getAll();
  const recurring = all.filter((i) => i.isRecurring);
  const single = all.filter((i) => !i.isRecurring).sort((a, b) => (a.date < b.date ? 1 : -1));
  const monthly = recurring.filter((i) => i.frequency !== 'annual').reduce((acc, i) => acc + (parseFloat(i.amount) || 0), 0);
  const yearly = recurring.filter((i) => i.frequency === 'annual');
  const yearlyTotal = yearly.reduce((acc, i) => acc + (parseFloat(i.amount) || 0), 0);

  return (
    <div className="gf-stack">
      <section className="gf-card gf-hero">
        <div>
          <div className="gf-hero-label">Renda recorrente por mês</div>
          <div className="gf-hero-value" style={{ color: 'var(--earn)' }}>{formatBRL(monthly)}</div>
        </div>
        <div className="gf-hero-sub">
          {yearly.length > 0 && `Mais ${formatBRL(yearlyTotal)} por ano em entradas anuais (como 13º), que entram inteiras no mês delas. `}
          Entradas avulsas (freela, reembolso) também podem ser lançadas pelo botão +
        </div>
      </section>

      <button type="button" className="gf-btn-primary" onClick={() => setEditing(null)} style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
        <Plus size={18} /> Nova entrada
      </button>

      <section className="gf-card">
        <h2 className="gf-section-title">Recorrentes <small>toque para editar</small></h2>
        <div className="gf-plain-list">
          {recurring.length
            ? recurring.map((i) => <IncomeRow key={i.id} income={i} onSelect={setEditing} />)
            : <p className="gf-empty">Cadastre seu salário aqui para a previsão ficar completa.</p>}
        </div>
      </section>

      {single.length > 0 && (
        <section className="gf-card">
          <h2 className="gf-section-title">Avulsas <small>{single.length}</small></h2>
          <div className="gf-plain-list">
            {single.slice(0, 30).map((i) => <IncomeRow key={i.id} income={i} onSelect={setEditing} />)}
          </div>
        </section>
      )}

      {editing !== undefined && (
        <IncomeSheet
          income={editing}
          onClose={() => setEditing(undefined)}
          onDone={(msg) => { setEditing(undefined); onToast(msg); }}
        />
      )}
    </div>
  );
}
