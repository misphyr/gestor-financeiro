import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { storage } from '../../../utils/storage';
import { AVAILABLE_COLORS, AVAILABLE_ICONS, getIconComponent } from '../../../utils/icons';
import { ConfirmButton, Sheet } from '../ui';

const notify = () => window.dispatchEvent(new Event('categoryAdded'));

const usageOf = (name) =>
  storage.expenses.getAll().filter((e) => e.category === name).length +
  storage.subscriptions.getAll().filter((s) => s.category === name).length;

function CategorySheet({ category, onClose, onDone }) {
  const [form, setForm] = useState(() => ({
    name: category?.name || '',
    color: category?.color || AVAILABLE_COLORS[0].name,
    icon: category?.icon || 'ShoppingCart'
  }));
  const [error, setError] = useState('');
  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setError(''); };
  const uses = category ? usageOf(category.name) : 0;

  const save = () => {
    const name = form.name.trim();
    if (!name) { setError('Dê um nome para a categoria.'); return; }
    const clash = storage.categories.getAll().some((c) => c.id !== category?.id && c.name.toLowerCase() === name.toLowerCase());
    if (clash) { setError(`Já existe uma categoria "${name}".`); return; }
    if (category) storage.categories.rename(category.id, { name, color: form.color, icon: form.icon });
    else storage.categories.add({ name, color: form.color, icon: form.icon });
    notify();
    onDone(category ? 'Categoria atualizada' : 'Categoria criada');
  };

  const remove = () => {
    storage.categories.delete(category.id);
    notify();
    onDone('Categoria excluída');
  };

  const Preview = getIconComponent(form.icon);

  return (
    <Sheet label={category ? 'Editar categoria' : 'Nova categoria'} onClose={onClose}>
      <h2 className="gf-section-title" style={{ margin: 0 }}>{category ? 'Editar categoria' : 'Nova categoria'}</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
        <div className="gf-tx-icon" style={{ width: 46, height: 46, background: `color-mix(in srgb, ${form.color} 16%, transparent)`, color: form.color }}>
          <Preview size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <label className="gf-label" htmlFor="cat-name">Nome</label>
          <input id="cat-name" className="gf-input" placeholder="Pets, Streaming…" value={form.name} onChange={(e) => set({ name: e.target.value })} />
        </div>
      </div>
      {category && uses > 0 && form.name.trim() && form.name.trim() !== category.name && (
        <div className="gf-hint" style={{ marginTop: -6 }}>Os {uses} lançamentos desta categoria passam a usar o novo nome.</div>
      )}
      <div>
        <span className="gf-label">Cor</span>
        <div className="gf-chips">
          {AVAILABLE_COLORS.map((c) => (
            <button
              type="button"
              key={c.name}
              aria-label={c.label}
              aria-pressed={form.color === c.name}
              onClick={() => set({ color: c.name })}
              style={{
                width: 34, height: 34, borderRadius: '50%', background: c.name, cursor: 'pointer',
                border: form.color === c.name ? '3px solid var(--ink)' : '3px solid transparent'
              }}
            />
          ))}
        </div>
      </div>
      <div>
        <span className="gf-label">Ícone</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: 6 }}>
          {AVAILABLE_ICONS.map(({ name, label, icon: Icon }) => (
            <button
              type="button"
              key={name}
              title={label}
              aria-label={label}
              aria-pressed={form.icon === name}
              onClick={() => set({ icon: name })}
              style={{
                height: 44, borderRadius: 10, display: 'grid', placeItems: 'center', cursor: 'pointer',
                border: '1px solid var(--line)',
                background: form.icon === name ? 'var(--accent-soft)' : 'var(--surface)',
                color: form.icon === name ? 'var(--accent)' : 'var(--ink-2)'
              }}
            >
              <Icon size={20} />
            </button>
          ))}
        </div>
      </div>
      <div className="gf-sheet-actions">
        {error && <p className="gf-error" role="alert">{error}</p>}
        <button type="button" className="gf-btn-primary" onClick={save}>{category ? 'Salvar alterações' : 'Criar categoria'}</button>
        {category && (uses === 0
          ? <ConfirmButton label="Excluir categoria" onConfirm={remove} />
          : <p className="gf-note" style={{ textAlign: 'center', margin: 0 }}>Não dá para excluir: está em uso em {uses} lançamentos.</p>)}
      </div>
    </Sheet>
  );
}

export default function Categories({ onToast }) {
  const [editing, setEditing] = useState(undefined);
  const categories = storage.categories.getAll();

  return (
    <div className="gf-stack">
      <button type="button" className="gf-btn-primary" onClick={() => setEditing(null)} style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
        <Plus size={18} /> Nova categoria
      </button>
      <section className="gf-card">
        <div className="gf-plain-list">
          {categories.map((c) => {
            const Icon = getIconComponent(c.icon);
            const uses = usageOf(c.name);
            return (
              <button type="button" className="gf-tx" key={c.id} onClick={() => setEditing(c)}>
                <div className="gf-tx-icon" style={{ background: `color-mix(in srgb, ${c.color} 16%, transparent)`, color: c.color }}>
                  <Icon size={18} />
                </div>
                <div className="gf-tx-main">
                  <div className="gf-tx-title">{c.name}</div>
                  <div className="gf-tx-meta"><span>{uses ? `${uses} lançamentos` : 'sem uso'}</span></div>
                </div>
                <span />
              </button>
            );
          })}
        </div>
      </section>
      {editing !== undefined && (
        <CategorySheet
          category={editing}
          onClose={() => setEditing(undefined)}
          onDone={(msg) => { setEditing(undefined); onToast(msg); }}
        />
      )}
    </div>
  );
}
