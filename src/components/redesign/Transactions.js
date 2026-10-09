import React, { useState } from 'react';
import { storage } from '../../utils/storage';
import { buyerOf, ME, monthEntries, statementRange, viewMode } from '../../utils/finance';
import { formatDateBR } from '../../utils/date';
import { GroupedTxList } from './TxList';

export default function Transactions({ year, month, onSelect }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(null);
  const [buyer, setBuyer] = useState(null);

  const all = monthEntries(year, month);
  const statement = viewMode() === 'statement' ? statementRange(year, month) : null;
  const q = query.trim().toLowerCase();
  const entries = all.filter((e) =>
    (!q || e.title.toLowerCase().includes(q)) && (!category || e.category === category) &&
    (!buyer || (e.kind === 'spend' && buyerOf(e) === buyer))
  );
  const usedCategories = [...new Set(all.map((e) => e.category))];
  const buyers = [...new Set(all.filter((e) => e.person).map((e) => e.person))];
  const colorOf = (name) => (name === 'Entrada'
    ? 'var(--earn)'
    : storage.categories.getAll().find((c) => c.name === name)?.color || '#7d8a85');

  return (
    <div className="gf-stack-sm">
      {statement && (
        <p className="gf-note" style={{ margin: 0 }}>
          Fatura que vence em {formatDateBR(statement.due)}: compras de {formatDateBR(statement.start)} a {formatDateBR(statement.end)}
        </p>
      )}
      <input
        id="tx-search"
        className="gf-search"
        type="search"
        placeholder="Buscar lançamento"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {usedCategories.length > 1 && (
        <div className="gf-chips">
          {usedCategories.map((name) => (
            <button
              key={name}
              type="button"
              className="gf-chip"
              aria-pressed={category === name}
              onClick={() => setCategory(category === name ? null : name)}
            >
              <span className="dot" style={{ background: colorOf(name) }} />{name}
            </button>
          ))}
        </div>
      )}
      {buyers.length > 0 && (
        <div className="gf-chips" aria-label="Filtrar por quem comprou">
          {[ME, ...buyers].map((name) => (
            <button
              key={name}
              type="button"
              className="gf-chip"
              aria-pressed={buyer === name}
              onClick={() => setBuyer(buyer === name ? null : name)}
            >
              {name === ME ? 'Comprado por mim' : name}
            </button>
          ))}
        </div>
      )}
      <section className="gf-card">
        <GroupedTxList entries={entries} onSelect={onSelect} />
      </section>
      <p className="gf-note">Toque num gasto para editar ou excluir.</p>
    </div>
  );
}
